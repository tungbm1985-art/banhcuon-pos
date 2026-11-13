// ==============================================================================
// XUẤT DỮ LIỆU RA FILE (Excel .xlsx nhiều trang + CSV từng bảng)
// Mục 7 — dùng cho màn Đơn hàng / Kê khai chi phí / Khách hàng / Quản lý dữ liệu
// ==============================================================================

import * as XLSX from 'xlsx';

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const STATUS_LABEL = {
  pending: 'Chờ xử lý',
  served: 'Đã phục vụ',
  completed: 'Đã thanh toán',
  cancelled: 'ĐÃ HUỶ',
};

const PAYMENT_LABEL = {
  cash: 'Tiền mặt',
  vietqr: 'Chuyển khoản VietQR',
};

// Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD
export function getVnToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIME_ZONE }).format(new Date());
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Ngày giờ theo giờ Việt Nam, dạng YYYY-MM-DD HH:mm (đọc/sắp xếp tốt trong Excel)
export function formatVnDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

// Khoảng ngày dùng chung cho các bộ lọc (Hôm nay / Tuần này / Tháng này / Từ ngày - đến ngày)
export function getDateRangeForPreset(preset, customStart, customEnd) {
  const today = getVnToday();
  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'week': {
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=CN .. 6=T7
      const diffToMonday = (dow + 6) % 7;
      return { startDate: addDays(today, -diffToMonday), endDate: today };
    }
    case 'month':
      return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
    case 'custom':
      return { startDate: customStart || undefined, endDate: customEnd || undefined };
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

function orderRow(order) {
  const items = order.order_items || [];
  const itemCount = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const tableName = order.tables?.name || (order.order_type === 'takeaway' ? 'Mang về' : 'Bàn');
  return {
    'Ngày giờ': formatVnDateTime(order.completed_at || order.created_at),
    'Mã đơn': order.order_number || '',
    'Bàn / Loại đơn': tableName,
    'Khu vực': order.tables?.zone || '',
    'Trạng thái': STATUS_LABEL[order.status] || order.status || '',
    'Số món': itemCount,
    'Tạm tính': Number(order.subtotal) || 0,
    'Giảm giá': Number(order.discount) || 0,
    'Thành tiền': Number(order.total_amount) || 0,
    'Hình thức thanh toán': PAYMENT_LABEL[order.payment_method] || '',
    'Điểm đã tích': Number(order.points_earned) || 0,
    'Điểm đã dùng': Number(order.points_redeemed) || 0,
    'Khách hàng': order.customers?.full_name || 'Khách vãng lai',
    'SĐT khách': order.customers?.phone || '',
    'Ghi chú': order.notes || '',
    'Lý do huỷ': order.cancel_reason || '',
    'Người huỷ': order.cancelled_by || '',
  };
}

function orderItemsRows(orders) {
  const rows = [];
  orders.forEach((order) => {
    const tableName = order.tables?.name || (order.order_type === 'takeaway' ? 'Mang về' : 'Bàn');
    (order.order_items || []).forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      rows.push({
        'Mã đơn': order.order_number || '',
        'Ngày giờ': formatVnDateTime(order.completed_at || order.created_at),
        'Bàn / Loại đơn': tableName,
        Món: it.item_name || '',
        'Số lượng': qty,
        'Đơn giá': price,
        'Thành tiền': qty * price,
        'Ghi chú món': it.notes || '',
      });
    });
  });
  return rows;
}

function expenseRows(expenses) {
  return expenses.map((e) => ({
    Ngày: e.expense_date || '',
    'Nội dung chi': e.notes || '',
    'Số tiền': Number(e.amount) || 0,
    'Nhóm chi': e.category || '',
    'Ngày ghi nhận': formatVnDateTime(e.created_at),
  }));
}

function customerRows(customers) {
  return customers.map((c) => ({
    'Họ tên': c.full_name || '',
    'Số điện thoại': c.phone || '',
    'Điểm thưởng': Number(c.points) || 0,
    'Tổng chi tiêu': Number(c.total_spent) || 0,
    'Ngày tạo': formatVnDateTime(c.created_at),
  }));
}

function appendSheet(workbook, name, rows) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

/**
 * Tạo workbook Excel. Chỉ thêm những trang ứng với dữ liệu được truyền vào.
 * @param {{orders?: Array, expenses?: Array, customers?: Array}} data
 */
export function buildExportWorkbook({ orders, expenses, customers } = {}) {
  const wb = XLSX.utils.book_new();

  if (Array.isArray(orders)) {
    appendSheet(wb, 'Đơn hàng', orders.map(orderRow));
    appendSheet(wb, 'Chi tiết món trong đơn', orderItemsRows(orders));
  }
  if (Array.isArray(expenses)) {
    appendSheet(wb, 'Chi phí', expenseRows(expenses));
  }
  if (Array.isArray(customers)) {
    appendSheet(wb, 'Khách hàng', customerRows(customers));
  }

  return wb;
}

export function downloadWorkbook(workbook, filename) {
  XLSX.writeFile(workbook, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(rows, filename) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  // Thêm BOM để Excel đọc đúng tiếng Việt
  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

/**
 * Xuất Excel + CSV cho 1 màn hình.
 * @param {{orders?: Array, expenses?: Array, customers?: Array}} data
 * @param {string} baseName - tên file không kèm phần mở rộng
 */
export function exportDataFiles(data, baseName) {
  const stamp = getVnToday();
  const wb = buildExportWorkbook(data);
  downloadWorkbook(wb, `${baseName}_${stamp}.xlsx`);

  if (Array.isArray(data.orders) && data.orders.length) {
    downloadCsv(data.orders.map(orderRow), `${baseName}_don-hang_${stamp}.csv`);
    const itemRows = orderItemsRows(data.orders);
    if (itemRows.length) {
      downloadCsv(itemRows, `${baseName}_chi-tiet-mon_${stamp}.csv`);
    }
  }
  if (Array.isArray(data.expenses) && data.expenses.length) {
    downloadCsv(expenseRows(data.expenses), `${baseName}_chi-phi_${stamp}.csv`);
  }
  if (Array.isArray(data.customers) && data.customers.length) {
    downloadCsv(customerRows(data.customers), `${baseName}_khach-hang_${stamp}.csv`);
  }
}
