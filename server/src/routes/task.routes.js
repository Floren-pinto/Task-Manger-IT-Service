import { Router } from "express";
import { listTasks } from "../controllers/task.controller.js";

const router = Router();

router.get("/", listTasks);

export default router;
