import express from "express";
import {
  submitContactForm,
  getContactInfo,
} from "../controllers/contactController.js";

const router = express.Router();

// POST /api/contact/submit - Submit contact form
router.post("/submit", submitContactForm);

// GET /api/contact/info - Get contact information
router.get("/info", getContactInfo);

export default router;
