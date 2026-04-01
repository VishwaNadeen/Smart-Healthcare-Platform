const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { sendOtpEmail } = require("./emailService");

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const hashOtp = (otp) => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || "otp_secret";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
};

const setOtp = (user, field, otp) => {
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user[field] = {
    codeHash: hashOtp(otp),
    expiresAt,
    attempts: 0,
  };
};

const clearOtp = (user, field) => {
  user[field] = {
    codeHash: "",
    expiresAt: undefined,
    attempts: 0,
  };
};

const verifyOtp = (user, field, otp) => {
  const data = user[field];

  if (!data || !data.codeHash || !data.expiresAt) {
    throw new Error("OTP not requested");
  }

  if (data.expiresAt.getTime() < Date.now()) {
    throw new Error("OTP expired");
  }

  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("OTP attempts exceeded");
  }

  const isMatch = hashOtp(otp) === data.codeHash;
  if (!isMatch) {
    data.attempts += 1;
  }

  return isMatch;
};

const deliverOtp = async ({ user, otp, purpose }) => {
  await sendOtpEmail({
    to: user.email,
    username: user.username,
    otp,
    purpose,
    expiresInMinutes: OTP_TTL_MINUTES,
  });
};

const normalizeUsername = (username) =>
  String(username || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeIdentifier = (identifier) => String(identifier || "").trim();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const ensureDoctorCanLogin = async (user) => {
  if (!user || user.role !== "doctor") {
    return;
  }

  if (user.doctorApprovalStatus === "approved") {
    return;
  }

  if (user.doctorApprovalStatus === "rejected") {
    throw new Error("Your doctor account was rejected by admin. Please contact support.");
  }

  throw new Error("Your doctor account is pending admin approval");
};

const buildUniqueUsername = async (username) => {
  const baseUsername = normalizeUsername(username);

  if (!baseUsername) {
    throw new Error("Username is required");
  }

  let candidate = baseUsername;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${baseUsername} ${suffix}`;
  }

  return candidate;
};

const findUserByIdentifier = async (identifier) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  return User.findOne({
    $or: [
      { email: normalizedIdentifier.toLowerCase() },
      { username: normalizedIdentifier },
    ],
  });
};

const registerUser = async ({ username, email, password, role }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw new Error("Username is required");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const uniqueUsername = await buildUniqueUsername(normalizedUsername);

  const user = await User.create({
    username: uniqueUsername,
    email: normalizedEmail,
    password: hashedPassword,
    role,
    doctorApprovalStatus: role === "doctor" ? "pending" : undefined,
    isEmailVerified: false,
  });

  return user;
};

const requestEmailVerificationOtp = async ({ email }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isEmailVerified) {
    return {
      alreadyVerified: true,
      expiresInMinutes: OTP_TTL_MINUTES,
    };
  }

  const otp = generateOtp();
  setOtp(user, "otpVerify", otp);
  await user.save();
  await deliverOtp({ user, otp, purpose: "verify-email" });

  return {
    alreadyVerified: false,
    expiresInMinutes: OTP_TTL_MINUTES,
  };
};

const verifyEmailOtp = async ({ email, otp }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isEmailVerified) {
    return {
      alreadyVerified: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  const isValid = verifyOtp(user, "otpVerify", otp);

  if (!isValid) {
    await user.save();
    throw new Error("Invalid OTP");
  }

  clearOtp(user, "otpVerify");
  user.isEmailVerified = true;
  await user.save();

  return {
    alreadyVerified: false,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
};

const ensureAdminUser = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return null;
  }

  const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const adminUser = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        username: ADMIN_USERNAME,
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return adminUser;
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new Error("Invalid email or password");
  }

  if (!user.isEmailVerified) {
    throw new Error("Please verify your email before logging in");
  }

  await ensureDoctorCanLogin(user);

  const token = generateToken(user);
  user.tokens.push({ token });
  await user.save();

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    token,
  };
};

const logoutUser = async (userId, token) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  user.tokens = user.tokens.filter((item) => item.token !== token);
  await user.save();
};

const deleteUserAccount = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new Error("User not found");
  }
};

const deleteUserByEmail = async (email) => {
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const user = await User.findOneAndDelete({ email: normalizedEmail });

  return {
    deleted: Boolean(user),
  };
};

const updateDoctorApprovalStatus = async ({ authUserId, doctorApprovalStatus }) => {
  const normalizedStatus = String(doctorApprovalStatus || "").trim().toLowerCase();

  if (!authUserId) {
    throw new Error("authUserId is required");
  }

  if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
    throw new Error("doctorApprovalStatus must be pending, approved or rejected");
  }

  const user = await User.findById(authUserId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "doctor") {
    throw new Error("Approval status can only be updated for doctor accounts");
  }

  user.doctorApprovalStatus = normalizedStatus;
  await user.save();

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    doctorApprovalStatus: user.doctorApprovalStatus,
  };
};

const requestLoginOtp = async ({ identifier, role }) => {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw new Error("User not found");
  }

  if (role && user.role !== role) {
    throw new Error(`This account is not registered as ${role}`);
  }

  if (!user.isEmailVerified) {
    throw new Error("Please verify your email before logging in");
  }

  await ensureDoctorCanLogin(user);

  const otp = generateOtp();
  setOtp(user, "otpLogin", otp);
  await user.save();
  await deliverOtp({ user, otp, purpose: "login" });

  return {
    otp: process.env.NODE_ENV === "production" ? undefined : otp,
    expiresInMinutes: OTP_TTL_MINUTES,
  };
};

const verifyLoginOtp = async ({ identifier, otp, role }) => {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw new Error("User not found");
  }

  if (role && user.role !== role) {
    throw new Error(`This account is not registered as ${role}`);
  }

  const isValid = verifyOtp(user, "otpLogin", otp);
  if (!isValid) {
    await user.save();
    throw new Error("Invalid OTP");
  }

  clearOtp(user, "otpLogin");
  await ensureDoctorCanLogin(user);

  const token = generateToken(user);
  user.tokens.push({ token });
  await user.save();

  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

const requestPasswordResetOtp = async ({ identifier }) => {
  const normalizedEmail = normalizeEmail(identifier);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error("No auth account found with this email");
  }

  const otp = generateOtp();
  setOtp(user, "otpReset", otp);
  await user.save();
  await deliverOtp({ user, otp, purpose: "reset" });

  return {
    expiresInMinutes: OTP_TTL_MINUTES,
  };
};

const resetPasswordWithOtp = async ({ identifier, otp, newPassword }) => {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw new Error("User not found");
  }

  const isValid = verifyOtp(user, "otpReset", otp);
  if (!isValid) {
    await user.save();
    throw new Error("Invalid OTP");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  clearOtp(user, "otpReset");
  await user.save();
};

const verifyCurrentUserPassword = async ({ userId, password }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordMatch = await bcrypt.compare(String(password || ""), user.password);

  if (!isPasswordMatch) {
    throw new Error("Incorrect password");
  }

  return {
    verified: true,
  };
};

const getUserStats = async () => {
  const [totalUsers, doctorCount, patientCount, adminCount] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "doctor" }),
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "admin" }),
  ]);

  return {
    totalUsers,
    doctorCount,
    patientCount,
    adminCount,
  };
};

module.exports = {
  registerUser,
  loginUser,
  ensureAdminUser,
  logoutUser,
  deleteUserAccount,
  deleteUserByEmail,
  updateDoctorApprovalStatus,
  requestEmailVerificationOtp,
  verifyEmailOtp,
  requestLoginOtp,
  verifyLoginOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyCurrentUserPassword,
  getUserStats,
};
