import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";

// Integration test memanggil API sungguhan yang terhubung ke project Supabase
// KHUSUS TEST (server/.env.test). Test membuat dan mengubah data, jadi tidak
// boleh diarahkan ke database production. Lihat docs/testing.md.

const SERVER_DIR = path.resolve(import.meta.dirname, "../..");
const TEST_ENV_FILE = path.join(SERVER_DIR, ".env.test");
const APP_ENV_FILE = path.join(SERVER_DIR, ".env");
const SUPABASE_KEYS = [
  "SUPABASE_PROJECT_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export const ROLES = ["SUPER_ADMIN", "MANAGER_DIVISION", "STAFF", "TECHNICIAN"];

function readEnvFile(file) {
  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : null;
}

function loadTestEnv() {
  const testVars = readEnvFile(TEST_ENV_FILE);
  if (!testVars) {
    return { ready: false, reason: "server/.env.test tidak ditemukan" };
  }

  if (testVars.TEST_TARGET_IS_TEST_PROJECT !== "yes") {
    return {
      ready: false,
      reason: "TEST_TARGET_IS_TEST_PROJECT=yes belum diisi di server/.env.test",
    };
  }

  const appVars = readEnvFile(APP_ENV_FILE);
  if (
    appVars?.SUPABASE_PROJECT_URL &&
    appVars.SUPABASE_PROJECT_URL === testVars.SUPABASE_PROJECT_URL
  ) {
    throw new Error(
      "server/.env.test menunjuk project Supabase yang sama dengan server/.env. Pakai project khusus test.",
    );
  }

  const missing = [
    "SUPABASE_PROJECT_URL",
    "SUPABASE_ANON_KEY",
    ...ROLES.flatMap((role) => [`TEST_${role}_EMAIL`, `TEST_${role}_PASSWORD`]),
  ].filter((key) => !testVars[key]);
  if (missing.length > 0) {
    return { ready: false, reason: `variabel kosong: ${missing.join(", ")}` };
  }

  // Semua variabel Supabase diisi dari .env.test (kosong bila tidak ada) agar
  // dotenv di src/config/env.js tidak melengkapinya dari server/.env.
  for (const key of SUPABASE_KEYS) process.env[key] = testVars[key] ?? "";
  for (const [key, value] of Object.entries(testVars)) {
    if (key.startsWith("TEST_")) process.env[key] = value;
  }

  return { ready: true, reason: null };
}

export const testEnv = loadTestEnv();

if (!testEnv.ready) {
  console.warn(`[integration] dilewati: ${testEnv.reason}`);
}

export const hasServiceRole = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Diimpor dinamis SETELAH env test dipasang.
export async function createTestApp() {
  const { createApp } = await import("../../src/app.js");
  return createApp();
}

function anonClient(accessToken) {
  return createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(accessToken && {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      }),
    },
  );
}

export async function signIn(email, password) {
  const { data, error } = await anonClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`Login ${email} gagal: ${error.message}`);
  return data.session.access_token;
}

export function signInRole(role) {
  return signIn(
    process.env[`TEST_${role}_EMAIL`],
    process.env[`TEST_${role}_PASSWORD`],
  );
}

// Supabase client dengan token user: dipakai untuk menguji RLS/trigger secara
// langsung, seperti yang bisa dilakukan siapa pun yang memegang anon key.
export function directClient(accessToken) {
  return anonClient(accessToken);
}

// api(app, token).get("/api/...") dengan header Authorization.
export function api(app, token) {
  const withAuth = (req) =>
    token ? req.set("Authorization", `Bearer ${token}`) : req;
  return {
    get: (url) => withAuth(request(app).get(url)),
    post: (url, body) => withAuth(request(app).post(url)).send(body ?? {}),
    patch: (url, body) => withAuth(request(app).patch(url)).send(body ?? {}),
    delete: (url) => withAuth(request(app).delete(url)),
  };
}

// Penanda unik per run agar data uji mudah dikenali di project test.
export const RUN_ID = `it-${Date.now().toString(36)}`;
