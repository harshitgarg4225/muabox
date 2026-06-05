import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Deterministic env for crypto/signature tests.
    env: {
      TOKEN_ENCRYPTION_KEY:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      RAZORPAY_KEY_SECRET: "test_secret",
      RAZORPAY_WEBHOOK_SECRET: "test_webhook_secret",
      INSTAGRAM_APP_SECRET: "test_app_secret",
    },
  },
});
