import express from "express";
import { getMyProfile, getPublicProfile, updateProfile } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.patch("/me", protect, upload.single("profile_image"), updateProfile);

router.get("/:username", getPublicProfile);

export default router;