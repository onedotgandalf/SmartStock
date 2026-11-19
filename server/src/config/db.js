// PostgreSQL connection pool.
// A "pool" keeps a few connections open and shares them between requests,
// which is much faster than connecting again for every request.
import pg from "pg";
import { env } from "./env.js";

// PostgreSQL returns NUMERIC and BIGINT (e.g. COUNT) as strings to avoid
// losing precision. Our money values are small enough to be safe as JS numbers.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, v => parseFloat(v));
pg.types.setTypeParser(pg.types.builtins.INT8, v => parseInt(v, 10));
// Keep DATE columns as plain "2026-11-20" text. Turning them into JS Date
// objects would shift them by the time zone and show the wrong day.
pg.types.setTypeParser(pg.types.builtins.DATE, v => v);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  // Every connection uses the business time zone, so CURRENT_DATE and
  // created_at::date mean "today in Bangkok", not "today in UTC".
  options: `-c timezone=${env.timezone}`
});

pool.on("error", err => console.error("Unexpected PostgreSQL error:", err));

// Run one query: const { rows } = await query("SELECT ... WHERE id = $1", [id])
export function query(text, params) {
  return pool.query(text, params);
}

// Run several queries as ONE transaction: all succeed, or all are undone.
// Used for anything that changes stock or money.
//
//   await withTransaction(async client => {
//     await client.query("UPDATE inventory ...");
//     await client.query("INSERT INTO stock_movements ...");
//   });
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
