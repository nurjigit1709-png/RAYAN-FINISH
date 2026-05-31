import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function autoSeed() {
  try {
    const { db, usersTable } = await import("@workspace/db");
    const bcrypt = await import("bcryptjs");
    const existing = await db.select().from(usersTable).limit(1);
    if (existing.length > 0) {
      logger.info("Database already seeded, skipping");
      return;
    }
    logger.info("Seeding database with default admin...");
    const { categoriesTable, foldersTable } = await import("@workspace/db");
    const passwordHash = await bcrypt.hash("admin", 10);
    await db.insert(usersTable).values({
      email: "omurbek@rayan.kg",
      name: "Omurbek Rayan",
      passwordHash,
      role: "super_admin",
      isPremium: true,
      isBlocked: false,
    });
    const managerHash = await bcrypt.hash("manager123", 10);
    await db.insert(usersTable).values({
      email: "manager@rayan.kg",
      name: "Айгуль Менеджер",
      passwordHash: managerHash,
      role: "manager",
      isPremium: false,
      isBlocked: false,
    });
    const empHash = await bcrypt.hash("employee123", 10);
    await db.insert(usersTable).values([
      { email: "aisha@rayan.kg", name: "Айша Садырова", passwordHash: empHash, role: "employee", isPremium: false, isBlocked: false },
      { email: "bektur@rayan.kg", name: "Бектур Алиев", passwordHash: empHash, role: "employee", isPremium: true, isBlocked: false },
      { email: "nurlan@rayan.kg", name: "Нурлан Токоев", passwordHash: empHash, role: "employee", isPremium: false, isBlocked: false },
    ]);
    const cats = await db.insert(categoriesTable).values([
      { name: "Финансы", icon: "DollarSign" },
      { name: "Кадры", icon: "Briefcase" },
      { name: "Контракты", icon: "FileText" },
      { name: "Маркетинг", icon: "Camera" },
      { name: "Обучение", icon: "BookOpen" },
    ]).returning();
    const rootFolders = await db.insert(foldersTable).values([
      { name: "Общие документы", parentId: null, categoryId: null },
      { name: "Финансовые отчёты", parentId: null, categoryId: cats[0].id },
      { name: "HR документы", parentId: null, categoryId: cats[1].id },
      { name: "Договоры", parentId: null, categoryId: cats[2].id },
      { name: "Маркетинговые материалы", parentId: null, categoryId: cats[3].id },
      { name: "Обучающие материалы", parentId: null, categoryId: cats[4].id },
    ]).returning();
    await db.insert(foldersTable).values([
      { name: "2024", parentId: rootFolders[1].id, categoryId: cats[0].id },
      { name: "2025", parentId: rootFolders[1].id, categoryId: cats[0].id },
      { name: "Трудовые договоры", parentId: rootFolders[2].id, categoryId: cats[1].id },
      { name: "Приказы", parentId: rootFolders[2].id, categoryId: cats[1].id },
    ]);
    // Ensure programmer account always exists
    const progHash = await bcrypt.hash("1234", 10);
    await db.insert(usersTable).values({
      email: "prog@rayan.kg",
      name: "Программист",
      passwordHash: progHash,
      role: "programmer",
      isBlocked: false,
      isPremium: false,
    }).onConflictDoNothing();
    logger.info("Database seeded! Admin: omurbek@rayan.kg / admin");
  } catch (err) {
    logger.error({ err }, "Auto-seed failed (will continue startup)");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  await autoSeed();
});
