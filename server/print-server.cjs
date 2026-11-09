/**
 * Print Server - Máy chủ in chuyển tiếp cho máy in nhiệt LAN (TCP/IP - ESC/POS)
 *
 * Cách chạy: npm run print-server
 * Port mặc định: 3001
 *
 * Hai chế độ hoạt động song song:
 *  1) HTTP API (khi mở app trên chính máy tính tiền)
 *     POST /test          { ip, port }           -> kiểm tra kết nối máy in
 *     POST /print-bill    { ip, port, order }     -> in hóa đơn
 *     POST /print-kot     { ip, port, order }     -> in phiếu báo bếp (KOT)
 *  2) Hàng đợi in (để in từ điện thoại qua WiFi quán hoặc 4G)
 *     Quét bảng "print_jobs" trên Supabase mỗi 2 giây rồi đẩy sang máy in LAN.
 *     Cần biến môi trường VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (đọc từ .env.local).
 */

const express = require('express');
const cors = require('cors');
const net = require('net');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PRINT_SERVER_PORT || 3001;

/* ---------------- Supabase (hàng đợi in) ---------------- */

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

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (err) {
    console.error('⚠️  Không khởi tạo được Supabase client:', err.message);
  }
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ---------------- ESC/POS helpers ---------------- */

const ESC = '\x1B';
const GS = '\x1D';

// Bỏ dấu tiếng Việt để tương thích mọi máy in nhiệt
function removeVietnameseAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Build ESC/POS buffer from a list of commands
function buildBuffer(lines, options = {}) {
  const cols = options.cols || 32;
  const chunks = [];

  // Init printer
  chunks.push(Buffer.from(`${ESC}@`));
  // Set code page to CP1258 (Vietnamese) - fallback to ASCII if unsupported
  chunks.push(Buffer.from(`${ESC}t\x3A`)); // code page 58 = CP1258 on many printers

  lines.forEach((line) => {
    if (line.type === 'text') {
      if (line.align) chunks.push(Buffer.from(`${ESC}a${String.fromCharCode(line.align)}`));
      if (line.bold) chunks.push(Buffer.from(`${ESC}E\x01`));
      if (line.double) chunks.push(Buffer.from(`${ESC}!\x10`));
      if (line.double) chunks.push(Buffer.from(`${GS}!\x11`));
      const text = line.noStrip ? line.text : removeVietnameseAccents(line.text);
      chunks.push(Buffer.from(text, 'utf8'));
      if (line.double) {
        chunks.push(Buffer.from(`${GS}!\x00`));
        chunks.push(Buffer.from(`${ESC}!\x00`));
      }
      if (line.bold) chunks.push(Buffer.from(`${ESC}E\x00`));
      chunks.push(Buffer.from('\n'));
    } else if (line.type === 'hr') {
      chunks.push(Buffer.from(`${ESC}a\x00`));
      chunks.push(Buffer.from('-'.repeat(cols) + '\n'));
    } else if (line.type === 'blank') {
      chunks.push(Buffer.from('\n'));
    }
  });

  // Feed + cut
  chunks.push(Buffer.from('\n\n\n'));
  chunks.push(Buffer.from(`${GS}V\x00`));

  return Buffer.concat(chunks);
}

/* ---------------- Bill formatter ---------------- */

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

function buildBillLines(order, settings = {}) {
  const lines = [];
  const cols = settings.paper_size === '80mm' ? 48 : 32;

  const storeName = settings.store_info?.name || 'BANH CUON THANH HOA';
  const hotline = settings.store_info?.hotline || '';
  const tableName = order.tables?.name || 'Mang ve';
  const orderNo = order.order_number || '';

  lines.push({ type: 'text', text: storeName, align: 1, bold: true, double: true });
  if (hotline) lines.push({ type: 'text', text: `Hotline: ${hotline}`, align: 1 });
  lines.push({ type: 'text', text: 'HOA DON THANH TOAN', align: 1, bold: true });
  lines.push({ type: 'hr' });
  lines.push({ type: 'text', text: `Ma don: ${orderNo}` });
  lines.push({ type: 'text', text: `Ban: ${tableName}` });
  if (order.created_at) {
    const d = new Date(order.created_at);
    lines.push({ type: 'text', text: `Thoi gian: ${d.toLocaleString('vi-VN')}` });
  }
  lines.push({ type: 'hr' });

  const items = order.order_items || [];
  items.forEach((it) => {
    const name = (it.item_name || '').padEnd(cols - 14).slice(0, cols - 14);
    const qty = String(it.quantity || 1);
    const price = formatMoney(it.unit_price || 0);
    const total = formatMoney((it.quantity || 1) * (it.unit_price || 0));
    lines.push({ type: 'text', text: `${name} x${qty}` });
    lines.push({ type: 'text', text: `  ${price}  =  ${total}`, align: 2 });
    if (it.notes) {
      lines.push({ type: 'text', text: `  - ${it.notes}` });
    }
  });

  lines.push({ type: 'hr' });
  lines.push({ type: 'text', text: `Tong tien: ${formatMoney(order.total_amount || 0)}`, bold: true, align: 2 });
  lines.push({ type: 'text', text: 'Cam on quy khach!', align: 1 });

  return { lines, cols };
}

/* ---------------- KOT formatter ---------------- */

function buildKotLines(order, itemsToPrint, kitchenStation, settings = {}) {
  const lines = [];
  const cols = settings.paper_size === '80mm' ? 48 : 32;
  const tableName = order.tables?.name || 'Mang ve';

  lines.push({ type: 'text', text: 'PHIEU BAO BEP', align: 1, bold: true, double: true });
  lines.push({ type: 'text', text: `BEP: ${kitchenStation}`, align: 1, bold: true });
  lines.push({ type: 'hr' });
  lines.push({ type: 'text', text: `Ban: ${tableName}` });
  lines.push({ type: 'text', text: `Ma don: ${order.order_number || ''}` });
  lines.push({ type: 'hr' });

  itemsToPrint.forEach((it) => {
    const name = (it.item_name || '').padEnd(cols - 6).slice(0, cols - 6);
    const qty = String(it.quantity || 1).padStart(4);
    lines.push({ type: 'text', text: `${name}${qty}`, bold: true });
    if (it.notes) lines.push({ type: 'text', text: `  Ghi chu: ${it.notes}` });
  });

  lines.push({ type: 'hr' });
  lines.push({ type: 'blank' });

  return { lines, cols };
}

/* ---------------- TCP send ---------------- */

function sendToPrinter(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: ip, port }, () => {
      socket.write(buffer, () => {
        socket.end();
        resolve({ success: true });
      });
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Kết nối máy in bị timeout (5s)'));
    });
  });
}

function testConnection(ip, port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: ip, port }, () => {
      socket.end();
      resolve({ success: true, message: `Kết nối thành công đến ${ip}:${port}` });
    });
    socket.on('error', (err) => {
      reject(err);
    });
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Timeout khi kết nối máy in'));
    });
  });
}

/* ---------------- Print queue worker (Supabase) ---------------- */

async function processJob(job) {
  const { job_type, printer_ip, printer_port, payload } = job;
  const port = printer_port || 9100;
  const order = payload?.order || {};
  const settings = payload?.settings || {};

  if (!printer_ip) throw new Error('Thiếu địa chỉ IP máy in trong cấu hình');

  if (job_type === 'bill') {
    const { lines, cols } = buildBillLines(order, settings);
    await sendToPrinter(printer_ip, port, buildBuffer(lines, { cols }));
    return;
  }

  if (job_type === 'kot') {
    const tickets = payload?.kitchenTickets || [];
    if (!tickets.length) throw new Error('Không có món để in');
    for (const ticket of tickets) {
      const { lines, cols } = buildKotLines(
        order,
        ticket.items || [],
        ticket.kitchenStation,
        settings
      );
      await sendToPrinter(printer_ip, port, buildBuffer(lines, { cols }));
    }
    return;
  }

  if (job_type === 'test') {
    await testConnection(printer_ip, port);
    return;
  }

  throw new Error(`Loại lệnh in không hợp lệ: ${job_type}`);
}

let polling = false;
async function pollPrintJobs() {
  if (!supabase || polling) return;
  polling = true;
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('⚠️  Không đọc được hàng đợi in:', error.message);
      return;
    }

    for (const job of data || []) {
      // "Giành" job bằng cách đổi trạng thái sang processing (tránh 2 máy in trùng)
      const { data: claimed } = await supabase
        .from('print_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id)
        .eq('status', 'pending')
        .select();
      if (!claimed || claimed.length === 0) continue;

      try {
        await processJob(job);
        await supabase
          .from('print_jobs')
          .update({ status: 'done', processed_at: new Date().toISOString() })
          .eq('id', job.id);
        console.log(`✅ Đã in lệnh ${job.id} (${job.job_type})`);
      } catch (err) {
        await supabase
          .from('print_jobs')
          .update({
            status: 'error',
            error_message: err.message,
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        console.error(`❌ Lỗi in lệnh ${job.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('⚠️  Lỗi vòng quét hàng đợi:', err.message);
  } finally {
    polling = false;
  }
}

/* ---------------- Routes ---------------- */

app.post('/test', async (req, res) => {
  const { ip, port = 9100 } = req.body || {};
  if (!ip) return res.json({ success: false, error: 'Thiếu địa chỉ IP máy in' });
  try {
    const result = await testConnection(ip, port);
    res.json(result);
  } catch (err) {
    res.json({
      success: false,
      error: `Không kết nối được máy in: ${err.message}`,
    });
  }
});

app.post('/print-bill', async (req, res) => {
  const { ip, port = 9100, order, settings } = req.body || {};
  if (!ip) return res.json({ success: false, error: 'Thiếu địa chỉ IP máy in' });
  if (!order) return res.json({ success: false, error: 'Thiếu dữ liệu đơn hàng' });
  try {
    const { lines, cols } = buildBillLines(order, settings);
    const buffer = buildBuffer(lines, { cols });
    await sendToPrinter(ip, port, buffer);
    res.json({ success: true, message: 'Đã gửi lệnh in hóa đơn' });
  } catch (err) {
    res.json({ success: false, error: `Lỗi in hóa đơn: ${err.message}` });
  }
});

app.post('/print-kot', async (req, res) => {
  const { ip, port = 9100, order, itemsToPrint, kitchenStation, settings } = req.body || {};
  if (!ip) return res.json({ success: false, error: 'Thiếu địa chỉ IP máy in' });
  if (!itemsToPrint || itemsToPrint.length === 0)
    return res.json({ success: false, error: 'Không có món để in' });
  try {
    const { lines, cols } = buildKotLines(order, itemsToPrint, kitchenStation, settings);
    const buffer = buildBuffer(lines, { cols });
    await sendToPrinter(ip, port, buffer);
    res.json({ success: true, message: `Đã gửi lệnh in KOT (${kitchenStation})` });
  } catch (err) {
    res.json({ success: false, error: `Lỗi in KOT: ${err.message}` });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'banhcuon-print-server', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🖨️  Print Server đang chạy tại http://localhost:${PORT}`);
  console.log(`   Endpoints: /test, /print-bill, /print-kot, /health`);

  if (supabase) {
    console.log('☁️  Hàng đợi in Supabase: BẬT (quét mỗi 2 giây)');
    console.log('   -> Điện thoại có thể in qua WiFi quán hoặc 4G');
    setInterval(pollPrintJobs, 2000);
    pollPrintJobs();
  } else {
    console.log('⚠️  Hàng đợi in Supabase: TẮT (thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env.local)');
    console.log('   -> Chỉ in được khi mở app trên chính máy tính tiền');
  }
});
