import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, logsTable, usersTable, filesTable, foldersTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/logs", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const limit = parseInt((req.query.limit as string) || "100", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;

  let query = db.select().from(logsTable).orderBy(desc(logsTable.createdAt)).limit(limit).offset(offset) as any;
  if (userId) {
    query = db.select().from(logsTable).where(eq(logsTable.userId, userId)).orderBy(desc(logsTable.createdAt)).limit(limit).offset(offset);
  }

  const logs = await query;

  const enriched = await Promise.all(
    logs.map(async (log: any) => {
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, log.userId));
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
