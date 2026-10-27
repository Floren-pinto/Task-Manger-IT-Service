import { Router } from "express";
import {
  createTaskReport,
  getTaskReport,
  listTaskReports,
} from "../controllers/serviceReport.controller.js";

// Di-mount di /tasks/:taskId/reports
export const taskReportRoutes = Router({ mergeParams: true });

taskReportRoutes.get("/", listTaskReports);
taskReportRoutes.post("/", createTaskReport);
taskReportRoutes.get("/:reportId", getTaskReport);
