import express from "express";
import { createService, getMyServices, getServices, getSingleService, updateService, deleteService } from "../controllers/service.controller.js";
import { protect } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/", protect, createService);
router.get("/me", protect, getMyServices);
router.get("/", getServices);
router.get("/:id", getSingleService);
router.patch("/:id", protect, updateService);
router.delete("/:id", protect, deleteService);

export default router;