import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachProfile } from "../middleware/attachProfile.middleware.js";
import userRoutes from "./user.routes.js";
import taskRoutes from "./task.routes.js";
import notificationRoutes from "./notification.routes.js";
import clientRoutes from "./client.routes.js";
import assetRoutes from "./asset.routes.js";
import divisionRoutes from "./division.routes.js";

const router = Router();

router.use("/auth", requireAuth, attachProfile, authRoutes);

router.use("/users", requireAuth, attachProfile, userRoutes);

router.use("/tasks", requireAuth, attachProfile, taskRoutes);

router.use("/notifications", requireAuth, notificationRoutes);

router.use("/clients", requireAuth, attachProfile, clientRoutes);

router.use("/assets", requireAuth, assetRoutes);

router.use("/divisions", requireAuth, attachProfile, divisionRoutes);

export default router;
