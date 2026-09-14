import { Router } from "express";
import {
  listTasks,
  createTask,
  assignTask,
  updateTaskStatus,
} from "../controllers/task.controller.js";

const router = Router();

router.get("/", listTasks);
router.post("/", createTask);
router.post("/:taskId/assignments", assignTask);
router.patch("/:taskId/status", updateTaskStatus);

export default router;
