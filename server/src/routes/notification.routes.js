import { Router } from "express";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  updateIsReadNotification,
} from "../controllers/notification.controller.js";

const router = Router();

router.get("/", listNotifications);
router.get("/unread-count", getUnreadNotificationCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id", updateIsReadNotification);

export default router;
