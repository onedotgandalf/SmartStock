// Entry point: npm run dev  (or npm start)
import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

try {
  await pool.query("SELECT 1");
  console.log("✅ Connected to PostgreSQL");
} catch (err) {
  console.error("❌ Cannot connect to PostgreSQL:", err.message);
  console.error("   Check that PostgreSQL is running and DATABASE_URL in server/.env is correct.");
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`🚀 SmartStock API running on http://localhost:${env.port}/api`);
});

// Close cleanly when the process is stopped (Ctrl+C or the host shutting down)
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
