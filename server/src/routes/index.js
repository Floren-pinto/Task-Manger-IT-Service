import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/auth", authRoutes);
// router.use("/tasks", taskRoutes);     <- milestone berikutnya
// router.use("/clients", clientRoutes);

export default router;
