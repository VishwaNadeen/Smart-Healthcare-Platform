const express = require("express");
const {
  createSpecialty,
  getAllSpecialties,
  updateSpecialty,
  deleteSpecialty,
} = require("../controllers/specialtyController");

const router = express.Router();

// Admin can create and update the specialty list.
router.post("/", createSpecialty);
router.get("/", getAllSpecialties);
router.put("/:id", updateSpecialty);
router.delete("/:id", deleteSpecialty);

module.exports = router;
