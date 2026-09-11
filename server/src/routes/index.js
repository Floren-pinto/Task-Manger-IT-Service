import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachProfile } from "../middleware/attachProfile.middleware.js";

const router = Router();

router.use("/auth", requireAuth, attachProfile, authRoutes);

import taskRoutes from "./task.routes.js";
router.use("/tasks", requireAuth, attachProfile, taskRoutes);

export default router;
