import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ROLES,
  RUN_ID,
  api,
  createTestApp,
  directClient,
  signInRole,
  testEnv,
} from "./testEnv.js";

// Alur utama per role terhadap API + RLS sungguhan. Test berjalan berurutan
// dan berbagi data (client -> asset -> task -> status -> laporan).
describe.skipIf(!testEnv.ready)("RBAC & alur utama (Supabase test)", () => {
  let app;
  const token = {};
  const profile = {};
  const created = { clientIds: [], assetIds: [], taskIds: [] };
  let clientId;
  let assetId;
  let taskId;

  const as = (role) => api(app, token[role]);

  beforeAll(async () => {
    app = await createTestApp();

    for (const role of ROLES) {
      token[role] = await signInRole(role);
      const res = await as(role).get("/api/auth/me");
      if (res.status !== 200 || res.body.data?.role !== role) {
        throw new Error(
          `Akun TEST_${role} harus aktif dengan role ${role} (dapat ${res.status} ${res.body.data?.role ?? res.body.message})`,
        );
      }
      profile[role] = res.body.data;
    }

    if (!profile.TECHNICIAN.division_id) {
      throw new Error("Akun TEST_TECHNICIAN harus punya division_id");
    }
  });

  afterAll(async () => {
    // Soft delete data uji (tidak ada endpoint hard delete).
    const manager = as("MANAGER_DIVISION");
    for (const id of created.taskIds) {
      await manager.patch(`/api/tasks/${id}`, { deleted: true });
    }
    for (const id of created.assetIds) {
      await manager.patch(`/api/assets/${id}`, { deleted: true });
    }
    for (const id of created.clientIds) {
      await manager.patch(`/api/clients/${id}`, { deleted: true });
    }
  });

  describe("autentikasi", () => {
    it("menolak request tanpa token", async () => {
      const res = await api(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("clients & assets", () => {
    it("STAFF membuat client dan asset", async () => {
      const clientRes = await as("STAFF").post("/api/clients", {
        name: `Client ${RUN_ID}`,
        contact: "08123456789",
        address: "Jl. Test No. 1",
        serviceType: "Jaringan",
      });
      expect(clientRes.status).toBe(201);
      clientId = clientRes.body.data.id;
      created.clientIds.push(clientId);

      const assetRes = await as("STAFF").post("/api/assets", {
        name: `Router ${RUN_ID}`,
        type: "Router",
        clientId,
      });
      expect(assetRes.status).toBe(201);
      assetId = assetRes.body.data.id;
      created.assetIds.push(assetId);
    });

    it("menolak field wajib yang dikirim kosong", async () => {
      const res = await as("STAFF").patch(`/api/clients/${clientId}`, {
        name: "  ",
      });
      expect(res.status).toBe(400);
    });

    it("TECHNICIAN tidak boleh membuat asset (API & RLS)", async () => {
      const res = await as("TECHNICIAN").post("/api/assets", {
        name: "Asset teknisi",
        type: "PC",
        clientId,
      });
      expect(res.status).toBe(403);

      const { error } = await directClient(token.TECHNICIAN)
        .from("assets")
        .insert({
          id: crypto.randomUUID(),
          name: "Asset langsung",
          type: "PC",
          client_id: clientId,
        });
      expect(error).not.toBeNull();
    });

    it("STAFF tidak boleh mengarsip asset; MANAGER boleh arsip & pulihkan", async () => {
      const staffRes = await as("STAFF").patch(`/api/assets/${assetId}`, {
        deleted: true,
      });
      expect(staffRes.status).toBe(403);

      const archiveRes = await as("MANAGER_DIVISION").patch(
        `/api/assets/${assetId}`,
        { deleted: true },
      );
      expect(archiveRes.status).toBe(200);

      const restoreRes = await as("MANAGER_DIVISION").patch(
        `/api/assets/${assetId}`,
        { deleted: false },
      );
      expect(restoreRes.status).toBe(200);
    });
  });

  describe("task, status, dan laporan", () => {
    it("TECHNICIAN tidak boleh membuat task", async () => {
      const res = await as("TECHNICIAN").post("/api/tasks", {
        title: "Task teknisi",
        description: "Tidak boleh",
        divisionId: profile.TECHNICIAN.division_id,
        clientId,
      });
      expect(res.status).toBe(403);
    });

    it("menolak asset milik client lain", async () => {
      const otherClient = await as("STAFF").post("/api/clients", {
        name: `Client lain ${RUN_ID}`,
        contact: "0800",
        address: "Jl. Lain",
        serviceType: "PC",
      });
      created.clientIds.push(otherClient.body.data.id);
      const otherAsset = await as("STAFF").post("/api/assets", {
        name: `PC lain ${RUN_ID}`,
        type: "PC",
        clientId: otherClient.body.data.id,
      });
      created.assetIds.push(otherAsset.body.data.id);

      const res = await as("STAFF").post("/api/tasks", {
        title: "Task asset salah",
        description: "Asset bukan milik client",
        divisionId: profile.TECHNICIAN.division_id,
        clientId,
        assetId: otherAsset.body.data.id,
      });
      expect(res.status).toBe(400);
    });

    it("STAFF membuat task atas namanya sendiri", async () => {
      const res = await as("STAFF").post("/api/tasks", {
        title: `Task ${RUN_ID}`,
        description: "Perbaiki router kantor",
        divisionId: profile.TECHNICIAN.division_id,
        clientId,
        assetId,
        priority: "HIGH",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.created_by_id).toBe(profile.STAFF.id);
      taskId = res.body.data.id;
      created.taskIds.push(taskId);
    });

    it("RLS menolak task dengan pembuat palsu", async () => {
      const { error } = await directClient(token.STAFF)
        .from("tasks")
        .insert({
          id: crypto.randomUUID(),
          title: "Pembuat palsu",
          description: "created_by_id bukan user login",
          division_id: profile.TECHNICIAN.division_id,
          client_id: clientId,
          created_by_id: profile.TECHNICIAN.id,
        });
      expect(error).not.toBeNull();
    });

    it("STAFF menugaskan teknisi dan teknisi menerima notifikasi", async () => {
      const res = await as("STAFF").post(`/api/tasks/${taskId}/assignments`, {
        userId: profile.TECHNICIAN.id,
      });
      expect(res.status).toBe(201);

      const notifications = await as("TECHNICIAN").get(
        "/api/notifications?limit=100",
      );
      const assignment = notifications.body.data.notifications.filter(
        (n) => n.related_task_id === taskId && n.type === "ASSIGNMENT",
      );
      expect(assignment.length).toBeGreaterThan(0);
    });

    it("STAFF tidak boleh mengubah status", async () => {
      const res = await as("STAFF").patch(`/api/tasks/${taskId}/status`, {
        newStatus: "IN_PROGRESS",
      });
      expect(res.status).toBe(403);
    });

    it("TECHNICIAN mengubah status lewat RPC; status sama ditolak", async () => {
      const res = await as("TECHNICIAN").patch(`/api/tasks/${taskId}/status`, {
        newStatus: "IN_PROGRESS",
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("IN_PROGRESS");

      const again = await as("TECHNICIAN").patch(
        `/api/tasks/${taskId}/status`,
        { newStatus: "IN_PROGRESS" },
      );
      expect(again.status).toBe(400);
    });

    it("status tidak bisa diubah langsung dan riwayat tidak bisa dipalsukan", async () => {
      const client = directClient(token.TECHNICIAN);

      const { error: updateError } = await client
        .from("tasks")
        .update({ status: "COMPLETED" })
        .eq("id", taskId);
      expect(updateError?.code).toBe("42501");

      const { error: historyError } = await client
        .from("task_status_history")
        .insert({
          id: crypto.randomUUID(),
          task_id: taskId,
          user_id: profile.MANAGER_DIVISION.id,
          old_status: "IN_PROGRESS",
          new_status: "COMPLETED",
        });
      expect(historyError).not.toBeNull();
    });

    it("laporan hanya bisa dibuat untuk task COMPLETED", async () => {
      const res = await as("TECHNICIAN").post(`/api/tasks/${taskId}/reports`, {
        summary: "Belum selesai",
        actionTaken: "-",
      });
      expect(res.status).toBe(409);
    });

    it("menyelesaikan task mencatat riwayat atas nama teknisi", async () => {
      const res = await as("TECHNICIAN").patch(`/api/tasks/${taskId}/status`, {
        newStatus: "COMPLETED",
      });
      expect(res.status).toBe(200);
      expect(res.body.data.completed_at).not.toBeNull();

      const detail = await as("STAFF").get(`/api/tasks/${taskId}`);
      const histories = detail.body.data.histories;
      expect(histories).toHaveLength(2);
      expect(histories.every((h) => h.user?.id === profile.TECHNICIAN.id)).toBe(
        true,
      );
    });

    it("notifikasi status tidak dikirim ke pelaku", async () => {
      const notifications = await as("TECHNICIAN").get(
        "/api/notifications?limit=100",
      );
      const ownStatusChanges = notifications.body.data.notifications.filter(
        (n) => n.related_task_id === taskId && n.type === "STATUS_CHANGE",
      );
      expect(ownStatusChanges).toHaveLength(0);
    });

    it("manager divisi task menerima notifikasi status", async ({ skip }) => {
      if (profile.MANAGER_DIVISION.division_id !== profile.TECHNICIAN.division_id) {
        skip();
      }
      const notifications = await as("MANAGER_DIVISION").get(
        "/api/notifications?limit=100",
      );
      const statusChanges = notifications.body.data.notifications.filter(
        (n) => n.related_task_id === taskId && n.type === "STATUS_CHANGE",
      );
      expect(statusChanges.length).toBeGreaterThan(0);
    });

    it("TECHNICIAN membuat laporan; pembuat palsu ditolak RLS", async () => {
      const res = await as("TECHNICIAN").post(`/api/tasks/${taskId}/reports`, {
        summary: "Router diganti",
        actionTaken: "Ganti unit dan konfigurasi ulang",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.created_by_id).toBe(profile.TECHNICIAN.id);

      const { error } = await directClient(token.TECHNICIAN)
        .from("service_reports")
        .insert({
          id: crypto.randomUUID(),
          task_id: taskId,
          created_by_id: profile.STAFF.id,
          summary: "Palsu",
          action_taken: "Palsu",
          snapshot_data: {},
        });
      expect(error).not.toBeNull();
    });

    it("riwayat servis & export memfilter per teknisi", async () => {
      const query = `technicianId=${profile.TECHNICIAN.id}&search=${RUN_ID}`;

      const list = await as("STAFF").get(`/api/service-history?${query}`);
      expect(list.status).toBe(200);
      const item = list.body.data.history.find((h) => h.task.id === taskId);
      expect(item).toBeDefined();
      expect(item.technicians.map((t) => t.id)).toContain(profile.TECHNICIAN.id);
      expect(item.report?.summary).toBe("Router diganti");

      const exported = await as("STAFF").get(
        `/api/service-history/export?${query}`,
      );
      expect(exported.status).toBe(200);
      expect(exported.headers["x-export-truncated"]).toBe("false");
      expect(exported.text).toContain(taskId);
    });
  });
});
