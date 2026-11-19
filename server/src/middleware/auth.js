// Authentication = "who are you?"   (checks the JWT)
// Authorization  = "are you allowed?" (checks the role)
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

// Roles that can see every branch. Other staff only see their own branch.
export const ALL_BRANCH_ROLES = ["admin", "manager"];

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Requires "Authorization: Bearer <token>". Puts the user on req.user.
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Please log in.");

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, "Your session has expired. Please log in again.");
  }

  // Load the user fresh from the database, so a deactivated account or a
  // changed role takes effect immediately, not only when the token expires.
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, u.warehouse_id, u.is_active, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [payload.sub]
  );
  const user = rows[0];
  if (!user || !user.is_active) throw new HttpError(401, "This account is no longer active.");

  req.user = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    warehouseId: user.warehouse_id
  };
  next();
}

// Use after authenticate: authorize("admin", "manager")
export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new HttpError(403, "You don't have permission to do this.");
    }
    next();
  };
}

// Which branch should this request be limited to?
// Admin / manager: the branch they chose (or null = all branches).
// Everyone else: always their own branch, whatever they ask for.
export function branchScope(req, requestedId) {
  if (ALL_BRANCH_ROLES.includes(req.user.role)) return requestedId ?? null;
  return req.user.warehouseId ?? null;
}
