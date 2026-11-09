-- ==============================================================================
-- SCHEMA DEFINITION: BÁNH CUỐN THANH HÓA POS
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLES
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT 'Tầng 1',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Bánh Cuốn',
  kitchen_station TEXT NOT NULL DEFAULT 'Bếp tráng'
    CHECK (kitchen_station IN ('Bếp tráng', 'Bếp nướng', 'Bếp pha chế')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the kitchen assignment to existing installations and classify legacy menu rows once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'menu_items'
      AND column_name = 'kitchen_station'
  ) THEN
    ALTER TABLE public.menu_items
      ADD COLUMN kitchen_station TEXT NOT NULL DEFAULT 'Bếp tráng'
      CHECK (kitchen_station IN ('Bếp tráng', 'Bếp nướng', 'Bếp pha chế'));

    UPDATE public.menu_items
    SET kitchen_station = 'Bếp pha chế'
    WHERE category = 'Đồ Uống';

    UPDATE public.menu_items
    SET kitchen_station = 'Bếp nướng'
    WHERE category <> 'Bánh Cuốn'
      AND (
        name ILIKE '%nướng%'
        OR name ILIKE '%nem chua rán%'
        OR name ILIKE '%chả lụa%'
        OR name ILIKE '%chả quế%'
      );
  END IF;
END $$;

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  points INT NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 4. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'served', 'completed', 'cancelled')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'vietqr')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 5. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Nguyên liệu tươi', 'Gia vị / Đồ khô', 'Điện / Nước / Gas', 'Mặt bằng', 'Khác')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6B. FINANCE (THU CHI CÁ NHÂN: VÍ, KHOẢN MỤC THU/CHI, GIAO DỊCH)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL DEFAULT 0,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- Migrate cài đặt cũ: bỏ nhóm chi, thêm cột type cho khoản mục
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'finance_categories' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.finance_categories
      ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'
      CHECK (type IN ('income', 'expense'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE public.transactions DROP COLUMN group_id;
  END IF;

  DROP TABLE IF EXISTS public.expense_groups;
END $$;

-- 7. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 8. STAFF
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE REALTIME
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- Disable RLS or set public access for simple POS operations
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to tables" ON tables FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to staff" ON staff FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'Public full access to wallets') THEN
    CREATE POLICY "Public full access to wallets" ON wallets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_categories' AND policyname = 'Public full access to finance_categories') THEN
    CREATE POLICY "Public full access to finance_categories" ON finance_categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Public full access to transactions') THEN
    CREATE POLICY "Public full access to transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- 6C. PRINT QUEUE (Hàng đợi in - cho phép in qua LAN từ điện thoại, kể cả 4G)
-- ==============================================================================
-- Điện thoại ghi 1 dòng vào bảng này (HTTPS, không bị trình duyệt chặn),
-- Print Server trên máy tính tiền quét mỗi 2 giây rồi đẩy sang máy in LAN.
CREATE TABLE IF NOT EXISTS print_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL,                 -- 'bill' | 'kot'
  printer_ip text,                        -- địa chỉ IP máy in LAN
  printer_port integer DEFAULT 9100,
  payload jsonb NOT NULL,                 -- { order, settings, kitchenTickets }
  status text DEFAULT 'pending',          -- 'pending' | 'processing' | 'done' | 'error'
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status_created ON print_jobs (status, created_at);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'print_jobs' AND policyname = 'Public full access to print_jobs') THEN
    CREATE POLICY "Public full access to print_jobs" ON print_jobs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- SEED INITIAL DATA
-- ==============================================================================
-- Tables
INSERT INTO tables (name, zone, status, display_order) VALUES
('🛍️ Mang Về 01', 'Takeaway', 'available', 1),
('🛍️ Mang Về 02', 'Takeaway', 'available', 2),
('🛍️ Mang Về 03', 'Takeaway', 'available', 3),
('Bàn 01', 'Tầng 1', 'available', 10),
('Bàn 02', 'Tầng 1', 'available', 11),
('Bàn 03', 'Tầng 1', 'available', 12),
('Bàn 04', 'Tầng 1', 'available', 13),
('Bàn 05', 'Tầng 1', 'available', 14),
('Bàn 06', 'Tầng 1', 'available', 15),
('Bàn Ngoài 01', 'Ngoài trời', 'available', 20),
('Bàn Ngoài 02', 'Ngoài trời', 'available', 21)
ON CONFLICT DO NOTHING;

-- Menu Items
INSERT INTO menu_items (name, price, category, kitchen_station, is_available) VALUES
('Bánh Cuốn Nóng Thịt Mộc Nhĩ', 30000, 'Bánh Cuốn', 'Bếp tráng', true),
('Bánh Cuốn Chả Nướng Thanh Hóa', 40000, 'Bánh Cuốn', 'Bếp tráng', true),
('Bánh Cuốn Chả Quế Hà Nội', 35000, 'Bánh Cuốn', 'Bếp tráng', true),
('Bánh Cuốn Trứng Hấp Lòng Đào', 35000, 'Bánh Cuốn', 'Bếp tráng', true),
('Bánh Cuốn Đặc Biệt (Chả + Trứng)', 50000, 'Bánh Cuốn', 'Bếp tráng', true),
('Bánh Cuốn Chay Nấm Hương', 25000, 'Bánh Cuốn', 'Bếp tráng', true),
('Chả Nướng Thanh Hóa (Xiên thêm)', 15000, 'Đồ Ăn Kèm', 'Bếp nướng', true),
('Chả Lụa / Chả Quế (Miếng thêm)', 10000, 'Đồ Ăn Kèm', 'Bếp nướng', true),
('Trứng Gà Hấp Lòng Đào (Thêm)', 8000, 'Đồ Ăn Kèm', 'Bếp tráng', true),
('Hành Phi Giòn Tự Làm (Bát con)', 5000, 'Đồ Ăn Kèm', 'Bếp tráng', true),
('Nem Chua Rán Giòn (4 cây)', 25000, 'Đồ Ăn Kèm', 'Bếp nướng', true),
('Trà Đá Thơm Mát', 5000, 'Đồ Uống', 'Bếp pha chế', true),
('Sữa Đậu Nành Tươi Nóng/Lạnh', 12000, 'Đồ Uống', 'Bếp pha chế', true),
('Nước Mía Tươi Tắc', 15000, 'Đồ Uống', 'Bếp pha chế', true),
('Nước Ngọt Lon (Coca/Pepsi)', 15000, 'Đồ Uống', 'Bếp pha chế', true)
ON CONFLICT DO NOTHING;

-- Settings
INSERT INTO system_settings (key, value) VALUES
('store_info', '{"name": "BÁNH CUỐN THANH HÓA", "address": "128 Nguyễn Trãi, TP. Thanh Hóa", "phone": "0988.123.456", "slogan": "Đặc sản gia truyền - Tráng tay nóng hổi", "footer_note": "Cảm ơn & Hẹn gặp lại quý khách!"}'::jsonb),
('vietqr_config', '{"bank_id": "MB", "account_no": "0988123456", "account_name": "NGUYEN VAN A", "template": "compact2"}'::jsonb),
('print_config', '{"paper_size": "58mm", "auto_print_bill": true, "auto_print_kot": false, "show_qr_on_bill": true, "show_loyalty_on_bill": true}'::jsonb),
('loyalty_config', '{"earn_rate": 10000, "redeem_rate": 100, "enabled": true}'::jsonb),
('password_recovery', '{"recipient_email": "", "emailjs_service_id": "", "emailjs_template_id": "", "emailjs_public_key": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Staff
INSERT INTO staff (full_name, username, password, role) VALUES
('Chủ Quán (Admin)', 'admin', '111111', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Finance: Ví / Khoản mục thu-chi (dùng ID cố định để giao dịch tham chiếu được)
INSERT INTO wallets (id, name) VALUES
('11111111-1111-1111-1111-111111111101', '💵 Tiền mặt'),
('11111111-1111-1111-1111-111111111102', '🏦 Ngân hàng')
ON CONFLICT DO NOTHING;

INSERT INTO finance_categories (id, name, type) VALUES
('22222222-2222-2222-2222-222222222201', 'Bán hàng', 'income'),
('22222222-2222-2222-2222-222222222206', 'Thu khác', 'income'),
('22222222-2222-2222-2222-222222222202', 'Nguyên liệu', 'expense'),
('22222222-2222-2222-2222-222222222203', 'Lương nhân viên', 'expense'),
('22222222-2222-2222-2222-222222222204', 'Điện / Nước / Gas', 'expense'),
('22222222-2222-2222-2222-222222222205', 'Khác', 'expense')
ON CONFLICT DO NOTHING;
