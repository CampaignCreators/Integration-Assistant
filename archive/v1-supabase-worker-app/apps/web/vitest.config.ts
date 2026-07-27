import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*" path mapping in tsconfig.json.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Only plain modules for now. Anything needing React or the Next runtime
    // would want a jsdom environment and the Next test plugin.
    include: ["lib/**/*.test.ts"],
  },
});
