import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../config/db.js";
import { signToken } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(200)
});

// Shape of the user object sent to the browser (never includes the password hash)
function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse_name
  };
}

const USER_SQL = `
  SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, u.warehouse_id,
         r.name AS role, w.name AS warehouse_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN warehouses w ON w.id = u.warehouse_id`;

// POST /api/auth/login  { email, password }
export async function login(req, res) {
  const { email, password } = req.valid.body;
  const { rows } = await query(`${USER_SQL} WHERE u.email = $1`, [email]);
  const user = rows[0];

  // Same message for "no such email" and "wrong password", so attackers
  // can't find out which emails have accounts.
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, "Incorrect email or password.");
  if (!user.is_active) throw new HttpError(403, "This account has been deactivated. Please contact an admin.");

  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
  res.json({ token: signToken(user), user: publicUser(user) });
}

// GET /api/auth/me  -> the logged-in user (used when the page reloads)
export async function me(req, res) {
  const { rows } = await query(`${USER_SQL} WHERE u.id = $1`, [req.user.id]);
  res.json({ user: publicUser(rows[0]) });
}
