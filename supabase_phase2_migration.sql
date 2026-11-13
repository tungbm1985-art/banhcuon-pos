-- ==============================================================================
-- MIGRATION ĐỢT 2: BÁNH CUỐN THANH HÓA POS
-- Chạy file này MỘT LẦN trong Supabase SQL Editor (sau migration mã đơn).
-- An toàn khi chạy lại: dùng IF NOT EXISTS.
-- ==============================================================================

-- 1. Bổ sung cột theo dõi điểm thưởng và thông tin huỷ đơn cho bảng orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. Nhật ký xoá dữ liệu năm cũ (Quản lý dữ liệu)
CREATE TABLE IF NOT EXISTS public.data_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  year INTEGER,
  orders_deleted INTEGER DEFAULT 0,
  expenses_deleted INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

ALTER TABLE public.data_deletion_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_deletion_logs'
      AND policyname = 'Public full access to data_deletion_logs'
  ) THEN
    CREATE POLICY "Public full access to data_deletion_logs"
      ON public.data_deletion_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
