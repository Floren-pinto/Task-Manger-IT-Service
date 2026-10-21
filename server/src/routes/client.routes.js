import { Router } from "express";
import {
  listClients,
  getClientDetail,
  createClient,
  updateClient,
} from "../controllers/client.controller.js";

const router = Router();

router.get("/", listClients);
router.get("/:clientId", getClientDetail);
router.post("/", createClient);
router.patch("/:clientId", updateClient);

export default router;
