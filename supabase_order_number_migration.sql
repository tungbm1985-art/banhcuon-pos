-- ==============================================================================
-- MIGRATION: SỬA LỖI MÃ ĐƠN (chạy trong Supabase SQL Editor)
-- ==============================================================================
-- Xử lý 2 lỗi:
--   Lỗi 1: mã đơn lấy ngày theo giờ UTC -> đơn đầu buổi sáng (trước 07:00 giờ VN)
--          bị ghi mã của ngày hôm trước.
--   Lỗi 2: mã đơn có thể trùng vì mỗi máy tự đếm số thứ tự riêng.
--
-- Cách sửa:
--   1) Hàm next_order_number(): sinh mã đơn NGAY TRÊN MÁY CHỦ, dùng dãy số
--      nguyên tử theo từng ngày tính theo múi giờ Asia/Ho_Chi_Minh (UTC+7).
--      Ngày của mã đơn đổi lúc 00:00 giờ VN.
--   2) Ràng buộc duy nhất cho cột mã đơn, CHỈ áp dụng cho đơn tạo từ 00:00 ngày
--      13/11/2026 (giờ VN) trở đi. Đơn cũ giữ nguyên mã và nội dung, không sửa,
--      không xoá.
--
-- An toàn dữ liệu: script này KHÔNG sửa, KHÔNG xoá, KHÔNG chạy lại dữ liệu mẫu.
-- Nó chỉ đọc bảng orders để khởi tạo bộ đếm, và tạo thêm bảng/ hàm/ chỉ mục mới.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. Bảng đếm số thứ tự theo ngày (chỉ hàm next_order_number() được dùng)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_number_counters (
  order_date date PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);

-- Bật RLS và KHÔNG tạo policy: ứng dụng chỉ đọc/ghi được qua hàm bên dưới.
ALTER TABLE order_number_counters ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 2. Hàm sinh mã đơn nguyên tử theo ngày (giờ VN)
--    BC-YYMMDD-NNN, ngày đổi lúc 00:00 giờ Việt Nam.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_seq integer;
BEGIN
  INSERT INTO order_number_counters (order_date, last_seq)
  VALUES (v_today, 1)
  ON CONFLICT (order_date)
  DO UPDATE SET last_seq = order_number_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'BC-' || to_char(v_today, 'YYMMDD') || '-' || lpad(v_seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION next_order_number() TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 3. Khởi tạo bộ đếm từ các mã đơn đã có (CHỈ ĐỌC bảng orders)
--    Để đơn mới nối tiếp số thứ tự hiện tại, không đánh lại từ 001.
-- ------------------------------------------------------------------------------
INSERT INTO order_number_counters (order_date, last_seq)
SELECT to_date(split_part(order_number, '-', 2), 'YYMMDD'),
       max(split_part(order_number, '-', 3)::int)
FROM orders
WHERE order_number ~ '^BC-[0-9]{6}-[0-9]{3,}$'
GROUP BY 1
ON CONFLICT (order_date)
DO UPDATE SET last_seq = GREATEST(order_number_counters.last_seq, EXCLUDED.last_seq);


-- ------------------------------------------------------------------------------
-- 4. Ràng buộc duy nhất cho mã đơn - CHỈ áp cho đơn tạo từ 00:00 ngày 13/11/2026 (giờ VN)
-- ------------------------------------------------------------------------------
-- Lý do phải giới hạn: dữ liệu cũ đang có sẵn 5 nhóm mã trùng
--   BC-261109-001 (x3), BC-261109-002 (x2), BC-261110-001 (x3),
--   BC-261110-002 (x2), BC-261111-001 (x2)
-- nên ràng buộc cho toàn bộ cột sẽ báo lỗi và buộc phải sửa mã đơn cũ.
-- Chủ quán đã chốt: giữ nguyên toàn bộ đơn cũ, chỉ chặn trùng cho đơn mới.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND indexname = 'orders_order_number_unique_from_20261113'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX orders_order_number_unique_from_20261113
        ON orders (order_number)
        WHERE created_at >= '2026-11-13T00:00:00+07:00';
      RAISE NOTICE '✅ Đã tạo ràng buộc duy nhất cho mã đơn (áp dụng cho đơn tạo từ 00:00 ngày 13/11/2026 giờ VN).';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE '⚠️  Không tạo được ràng buộc duy nhất: đã có đơn tạo từ 13/11 trở đi bị trùng mã.';
      RAISE NOTICE '    Máy chủ vẫn sinh mã nguyên tử nên sẽ không sinh thêm mã trùng.';
      RAISE NOTICE '    Cần chủ quán quyết cách xử lý các đơn trùng này rồi chạy lại script.';
    END;
  ELSE
    RAISE NOTICE 'ℹ️  Ràng buộc duy nhất cho mã đơn đã có sẵn, bỏ qua.';
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 5. Kiểm tra kết quả
-- ------------------------------------------------------------------------------
-- Bộ đếm hiện tại theo từng ngày
SELECT order_date, last_seq
FROM order_number_counters
ORDER BY order_date DESC
LIMIT 10;

-- Các cặp mã đơn còn trùng trong dữ liệu cũ (chỉ để xem, không sửa gì)
SELECT order_number, count(*) AS so_don,
       min(created_at) AS don_dau, max(created_at) AS don_cuoi
FROM orders
GROUP BY order_number
HAVING count(*) > 1
ORDER BY order_number;
