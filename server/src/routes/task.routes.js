import { Router } from "express";
import { listTasks, createTask } from "../controllers/task.controller.js";

const router = Router();

router.get("/", listTasks);
router.post("/", createTask);

export default router;
