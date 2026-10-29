import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Integration test memakai satu project Supabase test bersama; jalankan
    // file satu per satu agar data uji tidak saling bertabrakan.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
