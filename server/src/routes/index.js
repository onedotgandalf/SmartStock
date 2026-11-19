// All API routes in one place. Each new feature adds one line here.
import { Router } from "express";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { listWarehouses } from "../controllers/warehouse.controller.js";
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

// Health check: is the server up, and can it reach the database?
router.get("/health", async (req, res) => {
  await query("SELECT 1");
  res.json({ status: "ok", database: "connected", time: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.get("/warehouses", authenticate, listWarehouses);

export default router;
