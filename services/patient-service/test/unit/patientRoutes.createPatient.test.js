const request = require("supertest");
const express = require("express");

jest.mock("../../src/controllers/patientController", () => ({
  createPatient: jest.fn((req, res) => {
    return res.status(201).json({
      message: "Patient created successfully",
      patient: {
        firstName: req.body.firstName,
        email: req.body.email,
      },
    });
  }),
  getAllPatients: jest.fn((req, res) => res.status(200).json([])),
  getAllPatientsAdmin: jest.fn(),
  getCurrentPatient: jest.fn(),
  getPatientById: jest.fn(),
  getPatientByIdAdmin: jest.fn(),
  getPatientSummaryByAuthUserId: jest.fn(),
  updateCurrentPatient: jest.fn(),
  updatePatientAdmin: jest.fn(),
  updatePatientStatusAdmin: jest.fn(),
  uploadCurrentPatientProfileImage: jest.fn(),
  removeCurrentPatientProfileImage: jest.fn(),
  deleteCurrentPatient: jest.fn(),
  deletePatientAdmin: jest.fn(),
  getPatientByAuthUserIdInternal: jest.fn(),
}));

jest.mock("../../src/middlewares/authMiddleware", () =>
  jest.fn((req, res, next) => next())
);

jest.mock("../../src/middlewares/uploadMiddleware", () => ({
  single: () => (req, res, next) => next(),
}));

const patientRoutes = require("../../src/routes/patientRoutes");

const app = express();
app.use(express.json());
app.use("/api/patients", patientRoutes);

describe("POST /api/patients route tests", () => {
  it("should create patient with valid data", async () => {
    const payload = {
      title: "Mr",
      firstName: "John",
      lastName: "Doe",
      nic: "200012345678",
      email: "john@test.com",
      password: "Test@123",
      countryCode: "+94",
      phone: "771234567",
      birthday: "2000-01-01",
      address: "Colombo",
      country: "Sri Lanka",
    };

    const res = await request(app).post("/api/patients").send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Patient created successfully");
    expect(res.body.patient.firstName).toBe("John");
  });

  it("should fail when required fields are missing", async () => {
    const payload = {
      firstName: "John",
      email: "john@test.com",
    };

    const res = await request(app).post("/api/patients").send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("should fail when email is invalid", async () => {
    const payload = {
      title: "Mr",
      firstName: "John",
      lastName: "Doe",
      nic: "200012345678",
      email: "wrong-email",
      password: "Test@123",
      countryCode: "+94",
      phone: "771234567",
      birthday: "2000-01-01",
      address: "Colombo",
      country: "Sri Lanka",
    };

    const res = await request(app).post("/api/patients").send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("should fail when NIC format is invalid", async () => {
    const payload = {
      title: "Mr",
      firstName: "John",
      lastName: "Doe",
      nic: "1234",
      email: "john@test.com",
      password: "Test@123",
      countryCode: "+94",
      phone: "771234567",
      birthday: "2000-01-01",
      address: "Colombo",
      country: "Sri Lanka",
    };

    const res = await request(app).post("/api/patients").send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });
});