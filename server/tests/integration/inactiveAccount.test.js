import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  RUN_ID,
  api,
  createTestApp,
  directClient,
  hasServiceRole,
  signIn,
  signInRole,
  testEnv,
} from "./testEnv.js";

// Membuat akun lewat POST /api/users butuh SUPABASE_SERVICE_ROLE_KEY di
// server/.env.test; tanpa itu skenario ini dilewati.
describe.skipIf(!testEnv.ready || !hasServiceRole())(
  "akun nonaktif kehilangan semua akses",
  () => {
    let app;
    let adminToken;
    let userId;
    const email = `${RUN_ID}@${process.env.TEST_EMAIL_DOMAIN || "example.com"}`;
    const password = `Pw-${crypto.randomUUID()}`;

    beforeAll(async () => {
      app = await createTestApp();
      adminToken = await signInRole("SUPER_ADMIN");
    });

    afterAll(async () => {
      if (userId) {
        await api(app, adminToken).patch(`/api/users/${userId}`, {
          deleted: true,
        });
      }
    });

    it("akun baru dari SUPER_ADMIN langsung aktif", async () => {
      const res = await api(app, adminToken).post("/api/users", {
        name: `Staff ${RUN_ID}`,
        email,
        password,
        role: "STAFF",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.is_active).toBe(true);
      userId = res.body.data.id;

      const userToken = await signIn(email, password);
      const me = await api(app, userToken).get("/api/auth/me");
      expect(me.status).toBe(200);
    });

    it("setelah dinonaktifkan: API menolak dan RLS tidak mengembalikan data", async () => {
      const deactivate = await api(app, adminToken).patch(
        `/api/users/${userId}`,
        { isActive: false },
      );
      expect(deactivate.status).toBe(200);

      // Supabase Auth masih menerima login; penolakan terjadi di API & RLS.
      const userToken = await signIn(email, password);

      const me = await api(app, userToken).get("/api/auth/me");
      expect(me.status).toBe(403);
      expect(me.body.message).toBe("Account is inactive");

      const client = directClient(userToken);
      for (const table of ["clients", "assets", "tasks", "divisions"]) {
        const { data, error } = await client.from(table).select("id").limit(1);
        expect(error, table).toBeNull();
        expect(data, table).toEqual([]);
      }
    });
  },
);
