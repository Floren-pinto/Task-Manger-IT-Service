import { Router } from "express";
import {
  exportServiceHistory,
  listServiceHistory,
} from "../controllers/serviceHistory.controller.js";

const router = Router();

router.get("/", listServiceHistory);
router.get("/export", exportServiceHistory);

export default router;
