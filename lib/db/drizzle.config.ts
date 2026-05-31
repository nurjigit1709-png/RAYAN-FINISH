import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(process.cwd(), "lib/db/src/schema/index.ts"),
  out: path.join(process.cwd(), "lib/db/drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
