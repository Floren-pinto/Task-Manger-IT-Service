import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachProfile } from "../middleware/attachProfile.middleware.js";

const router = Router();

router.use("/auth", requireAuth, attachProfile, authRoutes);
// router.use("/tasks", requireAuth, authRoutes, taskRoutes);     <- milestone berikutnya
// router.use("/clients", clientRoutes);

export default router;
