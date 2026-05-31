import { db, usersTable, categoriesTable, foldersTable } from "./index";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Check if admin already exists
  const existing = await db.select().from(usersTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded. Skipping.");
    process.exit(0);
  }

  // Create default admin
  const passwordHash = await bcrypt.hash("admin", 10);
  const [admin] = await db.insert(usersTable).values({
    email: "omurbek@rayan.kg",
    name: "Omurbek Rayan",
    passwordHash,
    role: "super_admin",
    isPremium: true,
    isBlocked: false,
  }).returning();
  console.log("Created admin:", admin.email);

  // Create sample users
  const managerHash = await bcrypt.hash("manager123", 10);
  const [manager] = await db.insert(usersTable).values({
    email: "manager@rayan.kg",
    name: "Айгуль Менеджер",
    passwordHash: managerHash,
    role: "manager",
    isPremium: false,
    isBlocked: false,
  }).returning();
  console.log("Created manager:", manager.email);

  const employeeHash = await bcrypt.hash("employee123", 10);
  await db.insert(usersTable).values([
    { email: "aisha@rayan.kg", name: "Айша Садырова", passwordHash: employeeHash, role: "employee", isPremium: false, isBlocked: false },
    { email: "bektur@rayan.kg", name: "Бектур Алиев", passwordHash: employeeHash, role: "employee", isPremium: true, isBlocked: false },
    { email: "nurlan@rayan.kg", name: "Нурлан Токоев", passwordHash: employeeHash, role: "employee", isPremium: false, isBlocked: false },
  ]);
  console.log("Created sample employees");

  // Create default categories
  const cats = await db.insert(categoriesTable).values([
    { name: "Финансы", icon: "DollarSign" },
    { name: "Кадры", icon: "Briefcase" },
    { name: "Контракты", icon: "FileText" },
    { name: "Маркетинг", icon: "Camera" },
    { name: "Обучение", icon: "BookOpen" },
  ]).returning();
  console.log("Created categories:", cats.map((c) => c.name).join(", "));

  // Create sample folders
  const rootFolders = await db.insert(foldersTable).values([
    { name: "Общие документы", parentId: null, categoryId: null },
    { name: "Финансовые отчёты", parentId: null, categoryId: cats[0].id },
    { name: "HR документы", parentId: null, categoryId: cats[1].id },
    { name: "Договоры", parentId: null, categoryId: cats[2].id },
    { name: "Маркетинговые материалы", parentId: null, categoryId: cats[3].id },
    { name: "Обучающие материалы", parentId: null, categoryId: cats[4].id },
  ]).returning();
  console.log("Created root folders:", rootFolders.map((f) => f.name).join(", "));

  // Create sub-folders
  await db.insert(foldersTable).values([
    { name: "2024", parentId: rootFolders[1].id, categoryId: cats[0].id },
    { name: "2025", parentId: rootFolders[1].id, categoryId: cats[0].id },
    { name: "Трудовые договоры", parentId: rootFolders[2].id, categoryId: cats[1].id },
    { name: "Приказы", parentId: rootFolders[2].id, categoryId: cats[1].id },
  ]);
  console.log("Created sub-folders");

  console.log("\nSeed completed!");
  console.log("Admin login: omurbek@rayan.kg / admin");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
