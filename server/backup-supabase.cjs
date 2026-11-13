/**
 * Sao lưu dữ liệu Supabase ra file (JSON + CSV) trước khi sửa code/schema.
 *
 * Cách chạy: node server/backup-supabase.cjs
 * Kết quả:   backups/<YYYY-MM-DD_HHmmss>/<tên-bảng>.json và .csv
 *
 * Chỉ ĐỌC dữ liệu, không ghi/xoá gì trên Supabase.
 */

const fs = require('fs');
const path = require('path');

/* ---------------- Đọc biến môi trường ---------------- */

function loadEnvFiles() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    try {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      });
    } catch {
      // File không tồn tại -> bỏ qua
    }
  }
  return env;
}

const envVars = loadEnvFiles();
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (kiểm tra file .env.local).');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Các bảng cần sao lưu (đúng theo đề bài: đơn hàng, chi tiết đơn, thực đơn, cài đặt, khách hàng...)
const TABLES = [
  'orders',
  'order_items',
  'tables',
  'menu_items',
  'customers',
  'staff',
  'system_settings',
  'expenses',
  'wallets',
  'finance_categories',
  'transactions',
  'print_jobs',
];

const PAGE_SIZE = 1000;

async function fetchAllRows(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${error.message} (bảng ${table})`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.join(',')];
  rows.forEach((row) => {
    lines.push(columns.map((col) => escape(row[col])).join(','));
  });
  return lines.join('\r\n');
}

async function main() {
  const stamp = new Date()
    .toISOString()
    .replace(/\.\d+Z$/, '')
    .replace('T', '_')
    .replace(/:/g, '');
  const outDir = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`📦 Sao lưu Supabase -> ${outDir}\n`);

  const summary = [];
  for (const table of TABLES) {
    try {
      const rows = await fetchAllRows(table);
      fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf8');
      fs.writeFileSync(path.join(outDir, `${table}.csv`), toCsv(rows), 'utf8');
      summary.push({ table, rows: rows.length, ok: true });
      console.log(`  ✅ ${table.padEnd(20)} ${rows.length} dòng`);
    } catch (err) {
      summary.push({ table, rows: 0, ok: false, error: err.message });
      console.log(`  ⚠️  ${table.padEnd(20)} lỗi: ${err.message}`);
    }
  }

  fs.writeFileSync(
    path.join(outDir, '_summary.json'),
    JSON.stringify({ url: SUPABASE_URL, backup_at: stamp, tables: summary }, null, 2),
    'utf8'
  );

  const failed = summary.filter((s) => !s.ok);
  const ordersCount = summary.find((s) => s.table === 'orders')?.rows ?? 0;
  const itemsCount = summary.find((s) => s.table === 'order_items')?.rows ?? 0;

  console.log('\n----------------------------------------');
  console.log(`Tổng số đơn hàng đã sao lưu : ${ordersCount}`);
  console.log(`Tổng số dòng chi tiết đơn   : ${itemsCount}`);
  if (failed.length > 0) {
    console.log(`Bảng lỗi: ${failed.map((f) => f.table).join(', ')}`);
  }
  console.log(`Thư mục sao lưu: ${outDir}`);
  console.log('----------------------------------------');
  console.log('👉 Giữ nguyên thư mục này tới khi nghiệm thu xong.');
}

main().catch((err) => {
  console.error('❌ Sao lưu thất bại:', err.message);
  process.exit(1);
});
