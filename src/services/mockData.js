// Initial authentic mock dataset for Bánh Cuốn Thanh Hóa

export const INITIAL_TABLES = [
  { id: 't-takeaway-1', name: '🛍️ Mang Về 01', zone: 'Takeaway', status: 'available', display_order: 1 },
  { id: 't-takeaway-2', name: '🛍️ Mang Về 02', zone: 'Takeaway', status: 'available', display_order: 2 },
  { id: 't-takeaway-3', name: '🛍️ Mang Về 03', zone: 'Takeaway', status: 'available', display_order: 3 },
  { id: 't-01', name: 'Bàn 01', zone: 'Tầng 1', status: 'available', display_order: 10 },
  { id: 't-02', name: 'Bàn 02', zone: 'Tầng 1', status: 'available', display_order: 11 },
  { id: 't-03', name: 'Bàn 03', zone: 'Tầng 1', status: 'available', display_order: 12 },
  { id: 't-04', name: 'Bàn 04', zone: 'Tầng 1', status: 'available', display_order: 13 },
  { id: 't-05', name: 'Bàn 05', zone: 'Tầng 1', status: 'available', display_order: 14 },
  { id: 't-06', name: 'Bàn 06', zone: 'Tầng 1', status: 'available', display_order: 15 },
  { id: 't-out-01', name: 'Bàn Ngoài 01', zone: 'Ngoài trời', status: 'available', display_order: 20 },
  { id: 't-out-02', name: 'Bàn Ngoài 02', zone: 'Ngoài trời', status: 'available', display_order: 21 },
];

export const INITIAL_MENU_ITEMS = [
  { id: 'm-01', name: 'Bánh Cuốn Nóng Thịt Mộc Nhĩ', price: 30000, category: 'Bánh Cuốn', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-02', name: 'Bánh Cuốn Chả Nướng Thanh Hóa', price: 40000, category: 'Bánh Cuốn', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-03', name: 'Bánh Cuốn Chả Quế Hà Nội', price: 35000, category: 'Bánh Cuốn', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-04', name: 'Bánh Cuốn Trứng Hấp Lòng Đào', price: 35000, category: 'Bánh Cuốn', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-05', name: 'Bánh Cuốn Đặc Biệt (Trứng + Chả Nướng)', price: 50000, category: 'Bánh Cuốn', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-06', name: 'Bánh Cuốn Chay Nấm Hương', price: 25000, category: 'Bánh Cuốn', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-07', name: 'Chả Nướng Thanh Hóa (Xiên thêm)', price: 15000, category: 'Đồ Ăn Kèm', kitchen_station: 'Bếp nướng', is_available: true },
  { id: 'm-08', name: 'Chả Lụa / Chả Quế (Miếng thêm)', price: 10000, category: 'Đồ Ăn Kèm', kitchen_station: 'Bếp nướng', is_available: true },
  { id: 'm-09', name: 'Trứng Gà Hấp Lòng Đào (Thêm)', price: 8000, category: 'Đồ Ăn Kèm', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-10', name: 'Hành Phi Giòn Nhà Làm (Bát)', price: 5000, category: 'Đồ Ăn Kèm', kitchen_station: 'Bếp tráng', is_available: true },
  { id: 'm-11', name: 'Nem Chua Rán Giòn (4 cây)', price: 25000, category: 'Đồ Ăn Kèm', kitchen_station: 'Bếp nướng', is_available: true },
  { id: 'm-12', name: 'Trà Đá Thơm Mát', price: 5000, category: 'Đồ Uống', kitchen_station: 'Bếp pha chế', is_available: true },
  { id: 'm-13', name: 'Sữa Đậu Nành Tươi Nóng/Lạnh', price: 12000, category: 'Đồ Uống', kitchen_station: 'Bếp pha chế', is_available: true },
  { id: 'm-14', name: 'Nước Mía Tươi Tắc', price: 15000, category: 'Đồ Uống', kitchen_station: 'Bếp pha chế', is_available: true },
  { id: 'm-15', name: 'Nước Ngọt Lon (Coca/Pepsi)', price: 15000, category: 'Đồ Uống', kitchen_station: 'Bếp pha chế', is_available: true },
];

export const INITIAL_CUSTOMERS = [
  { id: 'c-01', full_name: 'Nguyễn Văn Minh', phone: '0912345678', points: 35, total_spent: 350000 },
  { id: 'c-02', full_name: 'Trần Thị Mai', phone: '0987654321', points: 12, total_spent: 120000 },
  { id: 'c-03', full_name: 'Lê Hoàng Anh', phone: '0905123987', points: 80, total_spent: 800000 },
];

export const INITIAL_STAFF = [
  { id: 's-01', full_name: 'Chủ Quán (Admin)', username: 'admin', password: '111111', role: 'admin' },
];

export const INITIAL_SETTINGS = {
  store_info: {
    name: 'BÁNH CUỐN THANH HÓA',
    address: '128 Nguyễn Trãi, TP. Thanh Hóa',
    phone: '0988.123.456',
    slogan: 'Đặc sản gia truyền - Bánh tráng tay tươi nóng mỗi ngày',
    footer_note: 'Cảm ơn quý khách & Hẹn gặp lại quý khách!',
  },
  vietqr_config: {
    bank_id: 'MB', // MBBank
    account_no: '0988123456',
    account_name: 'NGUYEN VAN A',
    template: 'compact2',
  },
  print_config: {
    paper_size: '58mm',
    auto_print_bill: true,
    auto_print_kot: false,
    show_qr_on_bill: true,
    show_loyalty_on_bill: true,
    // Print mode: 'browser' (window.print) or 'lan' (direct ESC/POS over LAN)
    print_mode: 'browser',
    printer_name: 'Máy in Bill',
    printer_ip: '192.168.1.100',
    printer_port: 9100,
    printer_enabled: false,
  },
  loyalty_config: {
    earn_rate: 10000, // 10,000đ = 1 point
    redeem_rate: 100,  // 1 point = 100đ
    enabled: true,
  },
  password_recovery: {
    recipient_email: '',      // Mail nhận mã khôi phục mật khẩu chủ quán
    emailjs_service_id: '',   // EmailJS > Email Services > Service ID
    emailjs_template_id: '',  // EmailJS > Email Templates > Template ID
    emailjs_public_key: '',   // EmailJS > Account > Public Key
  },
};

// ---- Quản lý thu chi (Finance) ----
export const INITIAL_WALLETS = [
  { id: 'w-cash', name: '💵 Tiền mặt', created_at: new Date().toISOString() },
  { id: 'w-bank', name: '🏦 Ngân hàng', created_at: new Date().toISOString() },
];

export const INITIAL_FINANCE_CATEGORIES = [
  // Khoản mục thu
  { id: 'fc-sales', name: 'Bán hàng', type: 'income', created_at: new Date().toISOString() },
  { id: 'fc-other-income', name: 'Thu khác', type: 'income', created_at: new Date().toISOString() },
  // Khoản mục chi
  { id: 'fc-material', name: 'Nguyên liệu', type: 'expense', created_at: new Date().toISOString() },
  { id: 'fc-salary', name: 'Lương nhân viên', type: 'expense', created_at: new Date().toISOString() },
  { id: 'fc-utilities', name: 'Điện / Nước / Gas', type: 'expense', created_at: new Date().toISOString() },
  { id: 'fc-other', name: 'Khác', type: 'expense', created_at: new Date().toISOString() },
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-01',
    type: 'income',
    amount: 850000,
    wallet_id: 'w-cash',
    category_id: 'fc-sales',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: 'Doanh thu bán hàng trong ngày',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'tx-02',
    type: 'expense',
    amount: 250000,
    wallet_id: 'w-cash',
    category_id: 'fc-material',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: 'Mua bột gạo và nhân bánh',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'tx-03',
    type: 'expense',
    amount: 120000,
    wallet_id: 'w-bank',
    category_id: 'fc-utilities',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: 'Tiền điện tháng này',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const INITIAL_EXPENSES = [
  {
    id: 'exp-01',
    amount: 320000,
    category: 'Nguyên liệu tươi',
    expense_date: new Date().toISOString().split('T')[0],
    notes: 'Thịt lợn nạc vai, mộc nhĩ nấm hương',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'exp-02',
    amount: 150000,
    category: 'Gia vị / Đồ khô',
    expense_date: new Date().toISOString().split('T')[0],
    notes: 'Hành tím phi, nước mắm ngon, tiêu sọ',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'exp-03',
    amount: 80000,
    category: 'Điện / Nước / Gas',
    expense_date: new Date().toISOString().split('T')[0],
    notes: 'Bình gas mini dự phòng',
    created_at: new Date().toISOString(),
  },
];
