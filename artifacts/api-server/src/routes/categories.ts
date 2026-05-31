import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.createdAt);
  res.json(categories);
});

router.post("/categories", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, icon } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [cat] = await db.insert(categoriesTable).values({ name, icon: icon || "Folder" }).returning();
  res.status(201).json(cat);
});

router.patch("/categories/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, icon } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (icon) updates.icon = icon;
  const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cat);
});

router.delete("/categories/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.sendStatus(204);
});

export default router;
