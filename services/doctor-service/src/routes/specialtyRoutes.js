const express = require("express");
const {
  createSpecialty,
  getAllSpecialties,
  updateSpecialty,
  deleteSpecialty,
} = require("../controllers/specialtyController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin can create and update the specialty list.
router.post("/", requireAuth, createSpecialty);
router.get("/", getAllSpecialties);
router.put("/:id", requireAuth, updateSpecialty);
router.delete("/:id", requireAuth, deleteSpecialty);

module.exports = router;
