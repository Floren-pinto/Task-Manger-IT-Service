import { api } from "../api/api.js";

export const getNotifications = async (params = {}) => {
  const response = await api.get("/notifications", { params });
  const result = response.data?.data;

  if (!Array.isArray(result?.notifications))
    throw new Error("Format respons daftar notifikasi tidak valid.");

  return result;
};

export const getUnreadCount = async () => {
  const response = await api.get("/notifications/unread-count");
  const unreadCount = Number(response.data?.data?.unreadCount);

  if (!Number.isFinite(unreadCount))
    throw new Error("Format respons jumlah notifikasi tidak valid.");

  return unreadCount;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}`);
  return response.data?.data?.notification;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch("/notifications/read-all");
  return response.data?.data;
};
