import { Router } from "express";
import { listDivisions } from "../controllers/division.controller.js";

const router = Router();

router.get("/", listDivisions);

export default router;
