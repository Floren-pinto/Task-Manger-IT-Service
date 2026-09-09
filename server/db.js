import { PrismaClient } from "./generated/prisma/index.js";

// Prisma SENGAJA tidak dipakai di dalam route handler.
// RLS via req.supabase adalah satu-satunya sumber otorisasi untuk
// query yang dipicu user. Client ini hanya untuk:
//   - seed script
//   - maintenance/admin script sekali jalan
//   - tooling migrasi
// Jangan import ini di dalam src/routes atau src/middleware.
export const prisma = new PrismaClient();
