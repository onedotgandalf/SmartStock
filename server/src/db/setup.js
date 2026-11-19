// npm run db:setup
// Creates all tables (schema.sql) and fills them with sample data (seed.js).
// WARNING: this deletes any existing SmartStock data. Use it in development.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool, withTransaction } from "../config/db.js";
import { seed, DEMO_PASSWORD } from "./seed.js";

const here = dirname(fileURLToPath(import.meta.url));

try {
  console.log("Creating tables...");
  const schema = await readFile(join(here, "schema.sql"), "utf8");
  await pool.query(schema);

  console.log("Adding sample data (this takes a few seconds)...");
  const counts = await withTransaction(client => seed(client));

  console.log(`\n✅ Database ready: ${counts.sales} sales, ${counts.purchases} purchase orders, ` +
    `${counts.movements} stock movements, ${counts.expenses} expenses.\n`);
  console.log("Demo logins (password for all: " + DEMO_PASSWORD + ")");
  console.table([
    { role: "Admin",     email: "admin@smartstock.demo" },
    { role: "Manager",   email: "manager@smartstock.demo" },
    { role: "Cashier",   email: "cashier@smartstock.demo" },
    { role: "Warehouse", email: "warehouse@smartstock.demo" }
  ]);
} catch (err) {
  console.error("\n❌ Database setup failed:", err.message);
  if (err.code === "3D000") console.error("   The database does not exist yet. Create it first: CREATE DATABASE smartstock;");
  if (err.code === "28P01") console.error("   Wrong PostgreSQL password. Check DATABASE_URL in server/.env");
  if (err.code === "ECONNREFUSED") console.error("   PostgreSQL is not running, or the host/port in DATABASE_URL is wrong.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
