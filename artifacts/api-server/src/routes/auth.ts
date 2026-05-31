import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, logsTable } from "@workspace/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (hash === plain) return true; // временно разрешает пароль plain text из БД
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

async function getBearerToken(req: any): Promise<string | null> {
  const auth = req.headers["authorization"] as string | undefined;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function getUserFromToken(token: string | null) {
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  return user || null;
}

export async function requireAuth(req: any, res: any, next: any) {
  const token = await getBearerToken(req);
  const user = await getUserFromToken(token);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (user.isBlocked) {
    res.status(403).json({ error: "Account blocked" });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isBlocked: user.isBlocked,
    isPremium: user.isPremium,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ error: "Account blocked" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    try {
      await db.insert(logsTable).values({
        action: "login",
        userId: user.id,
      });
    } catch {
      // logs table может отсутствовать — логин не должен падать
    }

    res.json({ user: serializeUser(user), token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  try {
    const rawToken = req.headers["authorization"];
    const token =
      typeof rawToken === "string" && rawToken.startsWith("Bearer ")
        ? rawToken.slice(7)
        : null;

    if (token) {
      const user = await getUserFromToken(token);

      try {
        if (user) {
          await db.insert(logsTable).values({
            action: "logout",
            userId: user.id,
          });
        }
      } catch {
        // ignore missing logs table
      }

      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const rawToken = req.headers["authorization"];
    const token =
      typeof rawToken === "string" && rawToken.startsWith("Bearer ")
        ? rawToken.slice(7)
        : null;

    const user = await getUserFromToken(token);

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json(serializeUser(user));
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export { hashPassword, serializeUser };
export default router;
