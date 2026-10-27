import { Router } from "express";
import {
  createTaskReport,
  getServiceReport,
  getTaskReport,
  listTaskReports,
} from "../controllers/serviceReport.controller.js";

// Di-mount di /tasks/:taskId/reports
export const taskReportRoutes = Router({ mergeParams: true });

taskReportRoutes.get("/", listTaskReports);
taskReportRoutes.post("/", createTaskReport);
taskReportRoutes.get("/:reportId", getTaskReport);

// Di-mount di /service-reports
const router = Router();

router.get("/:reportId", getServiceReport);

export default router;
