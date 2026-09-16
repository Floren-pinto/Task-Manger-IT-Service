import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachProfile } from "../middleware/attachProfile.middleware.js";
import taskRoutes from "./task.routes.js";
import notificationRoutes from "./notification.route.js";

const router = Router();

router.use("/auth", requireAuth, attachProfile, authRoutes);

router.use("/tasks", requireAuth, attachProfile, taskRoutes);

router.use("/notifications", requireAuth, notificationRoutes);

export default router;
