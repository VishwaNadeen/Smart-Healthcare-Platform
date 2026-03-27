const express = require("express");
const {
  createSpecialty,
  getAllSpecialties,
  updateSpecialty,
  deleteSpecialty,
} = require("../controllers/specialtyController");
const { requireAdminAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin can create and update the specialty list.
router.post("/", requireAdminAuth, createSpecialty);
router.get("/", getAllSpecialties);
router.put("/:id", requireAdminAuth, updateSpecialty);
router.delete("/:id", requireAdminAuth, deleteSpecialty);

module.exports = router;
