import { query } from "../config/db.js";
import { ALL_BRANCH_ROLES } from "../middleware/auth.js";

// GET /api/warehouses -> branches this user may see (used by the branch picker)
export async function listWarehouses(req, res) {
  const seeAll = ALL_BRANCH_ROLES.includes(req.user.role) || !req.user.warehouseId;
  const { rows } = await query(
    `SELECT id, name, type, address, phone
       FROM warehouses
      WHERE is_active AND ($1::int IS NULL OR id = $1)
      ORDER BY id`,
    [seeAll ? null : req.user.warehouseId]
  );
  res.json({ warehouses: rows });
}
