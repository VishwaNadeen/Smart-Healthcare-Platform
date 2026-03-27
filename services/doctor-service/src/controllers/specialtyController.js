const Specialty = require("../models/specialtyModel");
const Doctor = require("../models/doctorModel");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createSpecialty = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Specialty name is required" });
    }

    const normalizedName = name.trim();
    const existing = await Specialty.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, "i") },
    });

    if (existing) {
      return res.status(409).json({ message: "Specialty already exists" });
    }

    const specialty = await Specialty.create({
      name: normalizedName,
      description,
      isActive,
    });

    return res.status(201).json(specialty);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create specialty", error: error.message });
  }
};

const getAllSpecialties = async (_req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });
    return res.status(200).json(specialties);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch specialties", error: error.message });
  }
};

const updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const specialty = await Specialty.findById(id);
    if (!specialty) {
      return res.status(404).json({ message: "Specialty not found" });
    }

    const previousName = specialty.name;

    if (name !== undefined) {
      if (typeof name !== "string") {
        return res.status(400).json({ message: "Specialty name must be a string" });
      }

      const normalizedName = name.trim();
      if (!normalizedName) {
        return res.status(400).json({ message: "Specialty name cannot be empty" });
      }

      const existing = await Specialty.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, "i") },
      });

      if (existing) {
        return res.status(409).json({ message: "Specialty already exists" });
      }

      specialty.name = normalizedName;
    }

    if (description !== undefined) {
      specialty.description = description;
    }

    if (isActive !== undefined) {
      specialty.isActive = Boolean(isActive);
    }

    await specialty.save();

    if (name !== undefined && previousName !== specialty.name) {
      await Doctor.updateMany(
        {
          $or: [
            { specializationId: specialty._id },
            { specialization: { $regex: new RegExp(`^${escapeRegExp(previousName)}$`, "i") } },
          ],
        },
        { $set: { specialization: specialty.name } }
      );
    }

    return res.status(200).json(specialty);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update specialty", error: error.message });
  }
};

const deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    const specialty = await Specialty.findById(id);
    if (!specialty) {
      return res.status(404).json({ message: "Specialty not found" });
    }

    const doctorsUsingSpecialty = await Doctor.countDocuments({
      $or: [
        { specializationId: id },
        {
          specialization: {
            $regex: new RegExp(`^${escapeRegExp(specialty.name)}$`, "i"),
          },
        },
      ],
    });
    if (doctorsUsingSpecialty > 0) {
      return res.status(409).json({
        message: "Cannot delete specialty because doctors are assigned to it",
        doctorsUsingSpecialty,
      });
    }

    await Specialty.findByIdAndDelete(id);
    return res.status(200).json({ message: "Specialty deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete specialty", error: error.message });
  }
};

module.exports = {
  createSpecialty,
  getAllSpecialties,
  updateSpecialty,
  deleteSpecialty,
};
