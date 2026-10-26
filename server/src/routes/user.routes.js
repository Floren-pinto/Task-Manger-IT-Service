import { Router } from "express";
import {
  createUser,
  listUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.middleware.js";

const router = Router();

router.get("/", listUsers);
router.post("/", requireSuperAdmin, createUser);
router.patch("/:userId", requireSuperAdmin, updateUser);

export default router;
