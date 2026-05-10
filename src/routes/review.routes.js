import express from "express";
import { createReview, getServiceReviews } from "../controllers/review.controller.js";
import { protect } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/", protect, createReview);

router.get(
  "/service/:id",
  getServiceReviews
);

export default router;