import { Router, type IRouter } from "express";
import { eq, isNull, and, sql } from "drizzle-orm";
import { db, foldersTable, filesTable, logsTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/folders", requireAuth, async (req: any, res): Promise<void> => {
  const { parentId, categoryId } = req.query;
  let conditions: any[] = [];
  if (parentId === "null" || parentId === "") {
    conditions.push(isNull(foldersTable.parentId));
  } else if (parentId !== undefined) {
    conditions.push(eq(foldersTable.parentId, parseInt(parentId as string, 10)));
  }
  if (categoryId !== undefined && categoryId !== "null" && categoryId !== "") {
    conditions.push(eq(foldersTable.categoryId, parseInt(categoryId as string, 10)));
  }

  const folders = await db
    .select({
      id: foldersTable.id,
      name: foldersTable.name,
      parentId: foldersTable.parentId,
      categoryId: foldersTable.categoryId,
      createdAt: foldersTable.createdAt,
    })
    .from(foldersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(foldersTable.name);

  const withCounts = await Promise.all(
    folders.map(async (f) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(filesTable)
        .where(eq(filesTable.folderId, f.id));
      return { ...f, fileCount: row?.count ?? 0 };
    })
  );

  res.json(withCounts);
});

router.get("/folders/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [folder] = await db.select().from(foldersTable).where(eq(foldersTable.id, id));
  if (!folder) { res.status(404).json({ error: "Not found" }); return; }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(filesTable)
    .where(eq(filesTable.folderId, id));
  res.json({ ...folder, fileCount: row?.count ?? 0 });
});

router.post("/folders", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, parentId, categoryId } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [folder] = await db.insert(foldersTable).values({
    name,
    parentId: parentId || null,
    categoryId: categoryId || null,
  }).returning();
  await db.insert(logsTable).values({ action: "create_folder", userId: req.user.id, folderId: folder.id });
  res.status(201).json({ ...folder, fileCount: 0 });
});

router.patch("/folders/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") { res.status(403).json({ error: "Forbidden" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, parentId } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (parentId !== undefined) updates.parentId = parentId;
  const [folder] = await db.update(foldersTable).set(updates).where(eq(foldersTable.id, id)).returning();
  if (!folder) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...folder, fileCount: 0 });
});

router.delete("/folders/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") { res.status(403).json({ error: "Forbidden" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.insert(logsTable).values({ action: "delete_folder", userId: req.user.id, folderId: id });
  await db.delete(foldersTable).where(eq(foldersTable.id, id));
  res.sendStatus(204);
});

export default router;
