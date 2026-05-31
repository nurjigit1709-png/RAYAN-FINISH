import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, logsTable } from "@workspace/db";
import { requireAuth } from "./auth";
import { hashPassword, serializeUser } from "./auth";
import bcrypt from 'bcryptjs';
import path from "path";
import fs from "fs";
import multer from "multer";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const isProgrammer = (req: any) => req.user?.role === "programmer";

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(serializeUser));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeUser(user));
});

router.post("/users", requireAuth, async (req: any, res): Promise<void> => {
  if (!isProgrammer(req)) { res.status(403).json({ error: "Only programmer can create users" }); return; }
  const { email, name, password, role, isPremium } = req.body;
  if (!email || !name || !password) { res.status(400).json({ error: "Missing fields" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email, name, passwordHash, role: role || "employee", isPremium: isPremium || false,
  }).returning();
  await db.insert(logsTable).values({ action: "create_user", userId: req.user.id });
  res.status(201).json(serializeUser(user));
});

router.patch("/users/:id", requireAuth, async (req: any, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const isSelf = req.user.id === id;
  const isProgr = isProgrammer(req);

  if (!isSelf && !isProgr) { res.status(403).json({ error: "Forbidden" }); return; }

  const { name, email, password, role, isPremium } = req.body;
  const updates: any = {};

  if (isProgr) {
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    if (role) updates.role = role;
    if (isPremium !== undefined) updates.isPremium = isPremium;
  } else {
    if (name) updates.name = name;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeUser(user));
});

router.delete("/users/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (!isProgrammer(req)) { res.status(403).json({ error: "Only programmer can delete users" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await db.insert(logsTable).values({ action: "delete_user", userId: req.user.id });
  res.sendStatus(204);
});

router.patch("/users/:id/block", requireAuth, async (req: any, res): Promise<void> => {
  if (!isProgrammer(req)) { res.status(403).json({ error: "Only programmer can block users" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { isBlocked } = req.body;
  const [user] = await db.update(usersTable).set({ isBlocked }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  if (isBlocked) await db.insert(logsTable).values({ action: "block_user", userId: req.user.id });
  res.json(serializeUser(user));
});

router.post("/users/:id/avatar", requireAuth, upload.single("avatar"), async (req: any, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (req.user.id !== id && !isProgrammer(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  const avatarUrl = `/api/uploads/avatars/${req.file.filename}`;
  const [user] = await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, id)).returning();
  res.json(serializeUser(user));
});

router.get("/uploads/avatars/:filename", (req, res): void => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filePath = path.join(process.cwd(), "uploads", "avatars", raw);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Not found" }); return; }
  res.sendFile(filePath);
});

export default router;
