import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, loginSchema, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// At most 10 login attempts per 15 minutes from one IP address,
// so nobody can guess passwords quickly.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." }
});

router.post("/login", loginLimiter, validate({ body: loginSchema }), login);
router.get("/me", authenticate, me);

export default router;
