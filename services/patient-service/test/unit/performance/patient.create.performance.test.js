const request = require("supertest");
const express = require("express");

jest.mock("../../../src/models/patient", () => ({
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation(async (data) => ({
    _id: "patient123",
    ...data,
  })),
}));

jest.mock("../../../src/services/authService", () => ({
  registerPatientAuth: jest.fn().mockResolvedValue({
    user: { id: "auth123", email: "john@test.com" },
    verificationRequired: true,
    expiresInMinutes: 10,
  }),
  verifyAuthPassword: jest.fn(),
  deleteAuthAccount: jest.fn(),
  deleteAuthAccountByEmail: jest.fn(),
}));

jest.mock("../../../src/config/cloudinary", () => ({
  uploader: {
    destroy: jest.fn(),
    upload_stream: jest.fn(),
  },
}));

jest.mock("streamifier", () => ({
  createReadStream: jest.fn(),
}));

const patientRoutes = require("../../../src/routes/patientRoutes");

const app = express();
app.use(express.json());
app.use("/api/patients", patientRoutes);

describe("add patient performance tests", () => {
  it("should handle 50 add-patient requests quickly", async () => {
    const start = Date.now();

    const promises = Array.from({ length: 50 }, (_, i) =>
      request(app)
        .post("/api/patients")
        .send({
          title: "Mr",
          firstName: "John",
          lastName: "Doe",
          nic: `2000123456${String(i).padStart(2, "0")}`,
          email: `john${i}@test.com`,
          password: "Test@123",
          countryCode: "+94",
          phone: `7712345${String(i).padStart(3, "0")}`,
          birthday: "2000-01-01",
          address: "Colombo",
          country: "Sri Lanka",
        })
    );

    const responses = await Promise.all(promises);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.statusCode).toBe(201);
    });

    expect(duration).toBeLessThan(5000);
  });
});