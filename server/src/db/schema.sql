-- ============================================================
-- SmartStock database schema (PostgreSQL 14+)
--
-- Running this file DELETES all SmartStock tables and creates
-- them again, empty. Use it for development only:
--   npm run db:setup   (runs this file and then the sample data)
-- ============================================================

DROP TABLE IF EXISTS
  payments, expenses, expense_categories,
  purchase_items, purchases, sale_items, sales,
  stock_movements, inventory, products, categories,
  customers, suppliers, users, roles, warehouses
CASCADE;

-- ---------- Branches / locations ----------
CREATE TABLE warehouses (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('shop', 'warehouse')),
  address     TEXT,
  phone       VARCHAR(30),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Users and roles ----------
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(30) NOT NULL UNIQUE,      -- admin, manager, cashier, warehouse
  description TEXT
);

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  full_name      VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,          -- bcrypt hash, never the real password
  role_id        INT NOT NULL REFERENCES roles(id),
  warehouse_id   INT REFERENCES warehouses(id),  -- home branch (NULL = all branches)
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role_id);

-- ---------- Products ----------
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(30)  NOT NULL UNIQUE,   -- our own product code, e.g. BEV-001
  barcode         VARCHAR(40)  UNIQUE,            -- EAN-13 printed on the package
  name            VARCHAR(160) NOT NULL,
  description     TEXT,
  category_id     INT REFERENCES categories(id) ON DELETE SET NULL,
  unit            VARCHAR(20)  NOT NULL DEFAULT 'pcs',
  purchase_price  NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
  selling_price   NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  wholesale_price NUMERIC(12,2) CHECK (wholesale_price >= 0),
  reorder_level   INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0), -- low-stock alert below this
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,  -- "deleted" products are hidden, not erased,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- so old sales still show them
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products(LOWER(name));

-- ---------- Stock ----------
-- One row per product per branch: "how many do we have there right now"
CREATE TABLE inventory (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id  INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity      INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),  -- stock can never go negative
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, warehouse_id)
);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);

-- Every change to stock is recorded here (the inventory history).
-- quantity is positive for stock in, negative for stock out.
CREATE TABLE stock_movements (
  id              BIGSERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id),
  warehouse_id    INT NOT NULL REFERENCES warehouses(id),
  type            VARCHAR(20) NOT NULL CHECK (type IN
                    ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'opening')),
  quantity        INT NOT NULL CHECK (quantity <> 0),
  balance_after   INT NOT NULL CHECK (balance_after >= 0),
  reference_type  VARCHAR(20),     -- 'sale', 'purchase', 'transfer'
  reference_id    INT,
  note            TEXT,
  user_id         INT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_movements_warehouse ON stock_movements(warehouse_id, created_at DESC);

-- ---------- People we trade with ----------
CREATE TABLE suppliers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(160) NOT NULL,
  contact_person  VARCHAR(120),
  phone           VARCHAR(30),
  email           VARCHAR(160),
  address         TEXT,
  tax_id          VARCHAR(20),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  type        VARCHAR(20)  NOT NULL DEFAULT 'regular' CHECK (type IN ('regular', 'wholesale')),
  phone       VARCHAR(30),
  email       VARCHAR(160),
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ---------- Sales ----------
CREATE TABLE sales (
  id              SERIAL PRIMARY KEY,
  invoice_no      VARCHAR(30) NOT NULL UNIQUE,     -- e.g. INV-20261120-0007
  customer_id     INT REFERENCES customers(id) ON DELETE SET NULL,  -- NULL = walk-in customer
  warehouse_id    INT NOT NULL REFERENCES warehouses(id),
  user_id         INT NOT NULL REFERENCES users(id),               -- the cashier
  subtotal        NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total           NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  status          VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'void')),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (discount <= subtotal),
  CHECK (total = subtotal - discount)
);
CREATE INDEX idx_sales_created ON sales(created_at DESC);
CREATE INDEX idx_sales_warehouse ON sales(warehouse_id, created_at DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id);

CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),  -- price at the time of sale
  unit_cost   NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),   -- cost at the time, for profit
  line_total  NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ---------- Purchases ----------
CREATE TABLE purchases (
  id              SERIAL PRIMARY KEY,
  po_number       VARCHAR(30) NOT NULL UNIQUE,      -- e.g. PO-20261120-0002
  supplier_id     INT NOT NULL REFERENCES suppliers(id),
  warehouse_id    INT NOT NULL REFERENCES warehouses(id),  -- where the goods will arrive
  user_id         INT NOT NULL REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  total           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  received_at     TIMESTAMPTZ,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_status ON purchases(status);

CREATE TABLE purchase_items (
  id           SERIAL PRIMARY KEY,
  purchase_id  INT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   INT NOT NULL REFERENCES products(id),
  quantity     INT NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  line_total   NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

-- ---------- Money in and out ----------
-- A payment belongs to exactly one sale (money in) or one purchase (money out).
-- A sale can have several payments, e.g. part cash and part PromptPay.
CREATE TABLE payments (
  id           SERIAL PRIMARY KEY,
  sale_id      INT REFERENCES sales(id) ON DELETE CASCADE,
  purchase_id  INT REFERENCES purchases(id) ON DELETE CASCADE,
  method       VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'card', 'promptpay', 'bank_transfer', 'credit')),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reference    VARCHAR(80),
  paid_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      INT REFERENCES users(id),
  CHECK ((sale_id IS NOT NULL) <> (purchase_id IS NOT NULL))
);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_purchase ON payments(purchase_id);

CREATE TABLE expense_categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE expenses (
  id            SERIAL PRIMARY KEY,
  category_id   INT NOT NULL REFERENCES expense_categories(id),
  warehouse_id  INT REFERENCES warehouses(id),       -- which branch spent it (NULL = company-wide)
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description   TEXT NOT NULL,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id       INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
