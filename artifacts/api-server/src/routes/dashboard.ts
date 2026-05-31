import { Router, type IRouter } from "express";
import { desc, gte, sql, eq } from "drizzle-orm";
import { db, filesTable, foldersTable, usersTable, logsTable } from "@workspace/db";
import { requireAuth } from "./auth";
import { usersTable as users, filesTable as files } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [[{ totalFiles }], [{ totalFolders }], [{ totalUsers }], [{ totalSize }]] = await Promise.all([
    db.select({ totalFiles: sql<number>`count(*)::int` }).from(filesTable),
    db.select({ totalFolders: sql<number>`count(*)::int` }).from(foldersTable),
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ totalSize: sql<number>`coalesce(sum(size), 0)::int` }).from(filesTable),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [{ uploadedToday }] = await db
    .select({ uploadedToday: sql<number>`count(*)::int` })
    .from(filesTable)
    .where(gte(filesTable.createdAt, today));

  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ recentUploads }] = await db
    .select({ recentUploads: sql<number>`count(*)::int` })
    .from(filesTable)
    .where(gte(filesTable.createdAt, lastWeek));

  res.json({ totalFiles, totalFolders, totalUsers, totalSize, uploadedToday, recentUploads });
});

router.get("/dashboard/recent-files", requireAuth, async (_req, res): Promise<void> => {
  const recentFiles = await db
    .select()
    .from(filesTable)
    .orderBy(desc(filesTable.createdAt))
    .limit(10);

  const enriched = await Promise.all(
    recentFiles.map(async (f) => {
      const [uploader] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, f.uploadedBy));
      return { ...f, uploaderName: uploader?.name || null };
    })
  );

  res.json(enriched);
});

router.get("/dashboard/recent-activity", requireAuth, async (_req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(logsTable)
    .orderBy(desc(logsTable.createdAt))
    .limit(20);

  const enriched = await Promise.all(
    logs.map(async (log) => {
      const [user] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, log.userId));
      let fileName = null;
      let folderName = null;
      if (log.fileId) {
        const [file] = await db.select({ name: filesTable.name }).from(filesTable).where(eq(filesTable.id, log.fileId));
        fileName = file?.name || null;
      }
      if (log.folderId) {
        const [folder] = await db.select({ name: foldersTable.name }).from(foldersTable).where(eq(foldersTable.id, log.folderId));
        folderName = folder?.name || null;
      }
      return { ...log, userName: user?.name || null, fileName, folderName };
    })
  );

  res.json(enriched);
});

export default router;
