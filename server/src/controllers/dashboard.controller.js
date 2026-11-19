import { z } from "zod";
import { query } from "../config/db.js";
import { ALL_BRANCH_ROLES, branchScope } from "../middleware/auth.js";

export const dashboardQuerySchema = z.object({
  warehouseId: z.coerce.number().int().positive().optional()
});

// In every query below, $1 is the branch id, or NULL for "all branches":
//   ($1::int IS NULL OR s.warehouse_id = $1)
// Only completed sales count (voided sales are ignored).

// GET /api/dashboard/summary?warehouseId=1
export async function getSummary(req, res) {
  const wid = branchScope(req, req.valid.query.warehouseId);
  const canSeeFinance = ALL_BRANCH_ROLES.includes(req.user.role);
  const p = [wid];

  const [today, month, lastMonth, products, lowStock, lowCount, recent, daily, top, byBranch, expenses] = await Promise.all([
    // Today and yesterday
    query(`
      SELECT COALESCE(SUM(total) FILTER (WHERE created_at::date = CURRENT_DATE), 0)     AS revenue,
             COUNT(*)           FILTER (WHERE created_at::date = CURRENT_DATE)          AS orders,
             COALESCE(SUM(total) FILTER (WHERE created_at::date = CURRENT_DATE - 1), 0) AS yesterday_revenue
        FROM sales s
       WHERE status = 'completed' AND created_at >= CURRENT_DATE - 1
         AND ($1::int IS NULL OR s.warehouse_id = $1)`, p),

    // This month: revenue and cost of goods sold
    query(`
      SELECT COALESCE(SUM(s.total), 0) AS revenue,
             COUNT(*)                  AS orders,
             COALESCE(SUM((SELECT SUM(si.unit_cost * si.quantity) FROM sale_items si WHERE si.sale_id = s.id)), 0) AS cogs
        FROM sales s
       WHERE s.status = 'completed' AND s.created_at >= date_trunc('month', CURRENT_DATE)
         AND ($1::int IS NULL OR s.warehouse_id = $1)`, p),

    // Last month, same number of days, to compare fairly
    query(`
      SELECT COALESCE(SUM(total), 0) AS revenue
        FROM sales s
       WHERE status = 'completed'
         AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
         AND created_at <  date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + (NOW() - date_trunc('month', NOW()))
         AND ($1::int IS NULL OR s.warehouse_id = $1)`, p),

    query(`SELECT COUNT(*) AS total FROM products WHERE is_active`),

    // Products at or below their reorder level (low-stock alerts)
    query(`
      SELECT p.id, p.code, p.name, p.reorder_level, w.name AS warehouse, i.quantity
        FROM inventory i
        JOIN products p   ON p.id = i.product_id AND p.is_active
        JOIN warehouses w ON w.id = i.warehouse_id
       WHERE i.quantity <= p.reorder_level
         AND ($1::int IS NULL OR i.warehouse_id = $1)
       ORDER BY i.quantity::float / NULLIF(p.reorder_level, 0) NULLS LAST, p.name
       LIMIT 8`, p),
    query(`
      SELECT COUNT(*) AS count
        FROM inventory i JOIN products p ON p.id = i.product_id AND p.is_active
       WHERE i.quantity <= p.reorder_level AND ($1::int IS NULL OR i.warehouse_id = $1)`, p),

    // Recent transactions
    query(`
      SELECT s.id, s.invoice_no, s.total, s.created_at,
             COALESCE(c.name, 'Walk-in customer') AS customer,
             w.name AS warehouse,
             (SELECT string_agg(DISTINCT pm.method, ', ') FROM payments pm WHERE pm.sale_id = s.id) AS methods,
             (SELECT SUM(quantity) FROM sale_items si WHERE si.sale_id = s.id) AS items
        FROM sales s
        JOIN warehouses w ON w.id = s.warehouse_id
        LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.status = 'completed' AND ($1::int IS NULL OR s.warehouse_id = $1)
       ORDER BY s.created_at DESC
       LIMIT 8`, p),

    // Revenue per day for the last 30 days (days with no sales show 0)
    query(`
      SELECT d::date AS date,
             COALESCE(SUM(s.total), 0) AS revenue,
             COUNT(s.id)               AS orders
        FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, INTERVAL '1 day') d
        LEFT JOIN sales s
               ON s.created_at::date = d::date AND s.status = 'completed'
              AND ($1::int IS NULL OR s.warehouse_id = $1)
       GROUP BY d ORDER BY d`, p),

    // Best-selling products this month
    query(`
      SELECT p.id, p.code, p.name, SUM(si.quantity) AS quantity, SUM(si.line_total) AS revenue
        FROM sale_items si
        JOIN sales s    ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
       WHERE s.status = 'completed' AND s.created_at >= date_trunc('month', CURRENT_DATE)
         AND ($1::int IS NULL OR s.warehouse_id = $1)
       GROUP BY p.id ORDER BY revenue DESC
       LIMIT 5`, p),

    // Revenue per branch this month
    query(`
      SELECT w.id, w.name, COALESCE(SUM(s.total), 0) AS revenue
        FROM warehouses w
        LEFT JOIN sales s ON s.warehouse_id = w.id AND s.status = 'completed'
                         AND s.created_at >= date_trunc('month', CURRENT_DATE)
       WHERE w.type = 'shop' AND ($1::int IS NULL OR w.id = $1)
       GROUP BY w.id ORDER BY w.id`, p),

    // Expenses this month (company-wide expenses only count when viewing all branches)
    query(`
      SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
       WHERE expense_date >= date_trunc('month', CURRENT_DATE)
         AND (($1::int IS NULL) OR warehouse_id = $1)`, p)
  ]);

  const m = month.rows[0];
  const grossProfit = m.revenue - m.cogs;
  const expenseTotal = expenses.rows[0].total;

  res.json({
    branchId: wid,
    today: {
      revenue: today.rows[0].revenue,
      orders: today.rows[0].orders,
      yesterdayRevenue: today.rows[0].yesterday_revenue
    },
    month: {
      revenue: m.revenue,
      orders: m.orders,
      lastMonthRevenueToDate: lastMonth.rows[0].revenue,
      // Profit and expenses are only shown to admins and managers
      grossProfit: canSeeFinance ? grossProfit : null,
      expenses: canSeeFinance ? expenseTotal : null,
      netProfit: canSeeFinance ? grossProfit - expenseTotal : null
    },
    products: { total: products.rows[0].total },
    lowStock: { count: lowCount.rows[0].count, items: lowStock.rows },
    recentSales: recent.rows,
    dailyRevenue: daily.rows,
    topProducts: top.rows,
    revenueByBranch: byBranch.rows
  });
}
