import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { filesTable } from "./files";
import { foldersTable } from "./folders";

export const actionEnum = pgEnum("log_action", [
  "upload",
  "download",
  "delete",
  "login",
  "logout",
  "create_folder",
  "delete_folder",
  "create_user",
  "delete_user",
  "block_user",
]);

export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  action: actionEnum("action").notNull(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fileId: integer("file_id").references(() => filesTable.id, { onDelete: "set null" }),
  folderId: integer("folder_id").references(() => foldersTable.id, { onDelete: "set null" }),
  meta: text("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Log = typeof logsTable.$inferSelect;
