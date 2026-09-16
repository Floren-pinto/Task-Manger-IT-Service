import { Router } from "express";
import {
  listNotifications,
  updateIsReadNotification,
} from "../controllers/notification.controller.js";

const router = Router();

router.get("/", listNotifications);
router.patch("/:notificationId/read", updateIsReadNotification);

export default router;
