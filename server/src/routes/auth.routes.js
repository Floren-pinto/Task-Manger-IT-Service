import { Router } from "express";
import { ok } from "../utils/ApiResponse.js";

const router = Router();

// requireAuth + attachProfile sudah dipasang di routes/index.js.
router.get("/me", (req, res) => ok(res, req.profile, "Authenticated"));

export default router;
