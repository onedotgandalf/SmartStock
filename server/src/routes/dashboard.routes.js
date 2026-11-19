import { Router } from "express";
import { getSummary, dashboardQuerySchema } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Every role can open the dashboard. What they see is limited inside the
// controller: staff see only their branch, and only admins and managers see profit.
router.get("/summary", authenticate, validate({ query: dashboardQuerySchema }), getSummary);

export default router;
