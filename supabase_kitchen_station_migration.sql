-- Run once in the Supabase SQL Editor to add per-menu-item kitchen routing.
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
