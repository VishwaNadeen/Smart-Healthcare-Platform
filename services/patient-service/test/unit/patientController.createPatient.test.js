jest.mock("../../src/models/patient", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../../src/services/authService", () => ({
  registerPatientAuth: jest.fn(),
  verifyAuthPassword: jest.fn(),
  deleteAuthAccount: jest.fn(),
  deleteAuthAccountByEmail: jest.fn(),
}));

jest.mock("../../src/config/cloudinary", () => ({
  uploader: {
    destroy: jest.fn(),
    upload_stream: jest.fn(),
  },
}));

jest.mock("streamifier", () => ({
  createReadStream: jest.fn(),
}));

const Patient = require("../../src/models/patient");
const {
  registerPatientAuth,
  deleteAuthAccountByEmail,
} = require("../../src/services/authService");

const {
  createPatient,
} = require("../../src/controllers/patientController");

const buildMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("createPatient unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create patient successfully", async () => {
    const req = {
      body: {
        title: "Mr",
        firstName: "John",
        lastName: "Doe",
        nic: "200012345678",
        email: "john@test.com",
        password: "Test@123",
        countryCode: "+94",
        phone: "771234567",
        birthday: "2000-01-01",
        gender: "male",
        address: "Colombo",
        country: "Sri Lanka",
      },
    };

    const res = buildMockRes();

    Patient.findOne
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce(null); // nic check

    registerPatientAuth.mockResolvedValue({
      user: { id: "auth123", email: "john@test.com" },
      verificationRequired: true,
      expiresInMinutes: 10,
    });

    Patient.create.mockResolvedValue({
      _id: "patient123",
      authUserId: "auth123",
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
    });

    await createPatient(req, res);

    expect(Patient.findOne).toHaveBeenCalledTimes(2);
    expect(registerPatientAuth).toHaveBeenCalledWith({
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      password: "Test@123",
    });
    expect(Patient.create).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Patient created successfully",
        verificationRequired: true,
        expiresInMinutes: 10,
      })
    );
  });

  it("should return 400 when required fields are missing", async () => {
    const req = {
      body: {
        firstName: "John",
        email: "john@test.com",
      },
    };

    const res = buildMockRes();

    await createPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "All required fields must be provided",
    });
  });

  it("should return 409 when patient already exists by email", async () => {
    const req = {
      body: {
        title: "Mr",
        firstName: "John",
        lastName: "Doe",
        nic: "200012345678",
        email: "john@test.com",
        password: "Test@123",
        countryCode: "+94",
        phone: "771234567",
        birthday: "2000-01-01",
        country: "Sri Lanka",
      },
    };

    const res = buildMockRes();

    Patient.findOne.mockResolvedValueOnce({ _id: "existing1" });

    await createPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Patient already exists with this email",
    });
  });

  it("should return 409 when patient already exists by NIC", async () => {
    const req = {
      body: {
        title: "Mr",
        firstName: "John",
        lastName: "Doe",
        nic: "200012345678",
        email: "john@test.com",
        password: "Test@123",
        countryCode: "+94",
        phone: "771234567",
        birthday: "2000-01-01",
        country: "Sri Lanka",
      },
    };

    const res = buildMockRes();

    Patient.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: "existing2" });

    await createPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Patient already exists with this NIC",
    });
  });

  it("should return error when auth registration fails", async () => {
    const req = {
      body: {
        title: "Mr",
        firstName: "John",
        lastName: "Doe",
        nic: "200012345678",
        email: "john@test.com",
        password: "Test@123",
        countryCode: "+94",
        phone: "771234567",
        birthday: "2000-01-01",
        country: "Sri Lanka",
      },
    };

    const res = buildMockRes();

    Patient.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    registerPatientAuth.mockRejectedValue(new Error("Auth service failed"));

    await createPatient(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Auth service failed",
      error: "Auth service failed",
    });
  });

  it("should rollback auth account if patient create fails after auth registration", async () => {
    const req = {
      body: {
        title: "Mr",
        firstName: "John",
        lastName: "Doe",
        nic: "200012345678",
        email: "john@test.com",
        password: "Test@123",
        countryCode: "+94",
        phone: "771234567",
        birthday: "2000-01-01",
        country: "Sri Lanka",
      },
    };

    const res = buildMockRes();

    Patient.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    registerPatientAuth.mockResolvedValue({
      user: { id: "auth123", email: "john@test.com" },
    });

    Patient.create.mockRejectedValue(new Error("Database create failed"));

    await createPatient(req, res);

    expect(deleteAuthAccountByEmail).toHaveBeenCalledWith("john@test.com");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Database create failed",
      error: "Database create failed",
    });
  });
});