import { Router } from "express";
import {
  listTasks,
  getTaskDetail,
  createTask,
  assignTask,
  updateTask,
  updateTaskStatus,
  createTaskAttachment,
  deleteTaskAttachment,
  listTaskAttachments,
} from "../controllers/task.controller.js";
import { taskReportRoutes } from "./serviceReport.routes.js";

const router = Router();

router.get("/", listTasks);
router.post("/", createTask);

router.get("/:taskId", getTaskDetail);
router.patch("/:taskId", updateTask);

router.post("/:taskId/assignments", assignTask);
router.patch("/:taskId/status", updateTaskStatus);
router.get("/:taskId/attachments", listTaskAttachments);
router.post("/:taskId/attachments", createTaskAttachment);
router.delete("/:taskId/attachments/:attachmentId", deleteTaskAttachment);
router.use("/:taskId/reports", taskReportRoutes);

export default router;
