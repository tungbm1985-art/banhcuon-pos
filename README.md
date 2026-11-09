# 🥟 BÁNH CUỐN THANH HÓA - MOBILE-FIRST POS WEB APPLICATION

Hệ thống POS (Point of Sale) chuyên biệt cho quán **Bánh Cuốn Thanh Hóa**, thiết kế theo tiêu chuẩn Mobile-First hỗ trợ thao tác một tay cảm ứng siêu nhanh trên điện thoại/máy tính bảng, tích hợp cơ sở dữ liệu đám mây **Supabase (PostgreSQL, Realtime)**, tạo mã **VietQR** động tự động, tích điểm thành viên và in nhiệt **KOT / Hóa đơn (58mm/80mm)**.

---

## 🚀 CÁC TÍNH NĂNG CHÍNH (8 MODULES)

### 🥟 M1: Bán Hàng & Sơ Đồ Bàn (POS & Table Map)
- **Mã màu trực quan**: 🟢 Bàn trống, 🔴 Có khách / Đang ăn, 🟡 Đơn mang về đang chờ.
- **Khu vực Mang Về cố định trên cùng** (`🛍️ Mang Về 01`, `02`, `03`...) giúp phục vụ khách mang về cấp tốc.
- **Quy trình gọi món mượt mà**:
  - Chạm bàn trống: Mở menu chọn món, ghi chú riêng từng món (ít hành, mắm cay, trứng lòng đào).
  - Chạm bàn có khách: Cập nhật món, gửi phiếu báo bếp (KOT), thanh toán.
  - Tra cứu khách hàng theo SĐT ngay trong đơn để tích điểm & giảm trừ điểm thành viên.
  - **Thanh toán linh hoạt**:
    - **Tiền mặt**: Bàn phím số cảm ứng (Numpad) tính tiền thừa trả khách tự động, nút gợi ý mệnh giá tiền nhanh (50k, 100k, 200k, 500k).
    - **VietQR Chuyển khoản**: Tự sinh mã QR chuẩn VietQR động theo đúng số tiền và thông tin bàn ăn/mã đơn.
    - Thanh toán xong tự động trả bàn về trạng thái Trống và kích hoạt in hóa đơn.

### 📜 M2: Quản Lý Thực Đơn (Menu Management)
- Phân nhóm món khoa học: Bánh Cuốn, Đồ Ăn Kèm, Đồ Uống.
- **Công tắc gạt "Hết hàng" tức thì ngay trên danh sách chính**: Khi tắt, món ăn trên màn hình bán hàng sẽ tự động làm mờ và vô hiệu hóa (không cho bấm chọn).
- Thêm mới, chỉnh sửa giá bán, tên món và xóa món.

### ⭐ M3: Khách Hàng & Tích Điểm (Customer & Loyalty)
- Tra cứu nhanh theo Tên hoặc Số điện thoại.
- Lưu trữ lịch sử toàn bộ các đơn hàng đã mua.
- Cấu hình tỷ lệ tích điểm linh hoạt: Mặc định 10.000đ = 1 điểm; 10 điểm = 1.000đ giảm giá.

### 💰 M4: Kê Khai Chi Phí & Nguyên Liệu (Expenses)
- Ghi nhanh tiền mua thịt nạc, mộc nhĩ, hành phi, gas, điện nước, mặt bằng...
- Phân loại danh mục rõ ràng, chỉnh sửa hoặc xóa chi phí trực tiếp.
- Thống kê tổng chi phí theo ngày / tháng.

### 📊 M5: Báo Cáo & Phân Tích Doanh Thu (Reports & Analytics)
- Thẻ chỉ số tổng quan: Doanh thu, Chi phí, Lợi nhuận ròng, Số lượng đơn hàng.
- Lọc theo thời gian: Hôm nay, Tuần này, Tháng này, hoặc Tùy chọn ngày.
- Biểu đồ so sánh trực quan Doanh thu vs Chi phí & Tỷ trọng thanh toán Tiền mặt vs VietQR.
- **Bảng xếp hạng món bán chạy nhất**: Giúp chủ quán dự trù lượng bột và nguyên liệu cần nhập mỗi ngày.

### 🖨️ M6: Cài Đặt Hệ Thống & In Ấn (Settings & Printing)
- Cài đặt thông tin quán (Tên, địa chỉ, hotline, slogan, lời cảm ơn chân trang).
- Cài đặt tài khoản ngân hàng thụ hưởng mã VietQR (Ngân hàng, STK, Tên chủ TK).
- Cấu hình khổ giấy in nhiệt: **58mm** (máy in bill nhỏ phổ biến) hoặc **80mm**.
- **Mẫu in chuẩn CSS `@media print`**:
  1. **Phiếu Báo Bếp (KOT)**: In to rõ tên bàn/mang về, giờ gọi món, số lượng x1, x2 và ghi chú chi tiết cho thợ tráng bánh.
  2. **Hóa Đơn Tính Tiền (Receipt)**: In thông tin quán, chi tiết từng món, giảm giá, số tiền, điểm tích lũy và **mã VietQR động**.
- Kết nối Supabase Cloud & Đặt lại dữ liệu mẫu cục bộ.

### 👥 M7: Quản Lý Nhân Viên & Phân Quyền (RBAC)
- 3 cấp độ tài khoản:
  - 👑 **Chủ Quán (Admin)**: Toàn quyền truy cập mọi chức năng.
  - 👔 **Quản Lý (Manager)**: Bán hàng, sửa thực đơn, quản lý bàn, ghi chi phí và xem báo cáo.
  - 💼 **Nhân Viên (Staff)**: Phục vụ kiêm thu ngân, chỉ sử dụng màn hình Bán hàng (POS), gọi món, thanh toán, tích điểm khách và bật/tắt nhanh món hết hàng. Các tab nhạy cảm (Báo cáo, Chi phí, Cài đặt, Nhân viên) được ẩn hoàn toàn.

### 🪑 M8: Quản Lý Bàn Ăn (Table Management)
- Thêm mới, chỉnh sửa tên bàn, khu vực (Tầng 1, Ngoài trời, Takeaway), thứ tự hiển thị.
- **Ràng buộc an toàn tuyệt đối**: Khóa nút xóa đối với các bàn đang có khách ngồi hoặc đơn hàng chưa hoàn tất.

---

## 🏗️ KIẾN TRÚC DỰ ÁN (DATA ABSTRACTION LAYER)

Toàn bộ các thao tác dữ liệu đều được đóng gói tại **`src/services/db.js`**, tách biệt hoàn toàn khỏi các UI Components:
```
src/
├── services/
│   ├── supabaseClient.js   # Quản lý kết nối & lưu cấu hình Supabase
│   ├── db.js               # Data Abstraction Layer (Tất cả gọi DB tại đây)
│   └── mockData.js         # Dữ liệu mẫu nguyên bản Bánh Cuốn Thanh Hóa
├── contexts/
│   ├── AuthContext.jsx     # Xác thực nhân viên & phân quyền RBAC
│   └── SettingsContext.jsx # Cài đặt quán, VietQR, in ấn, tích điểm
├── components/
│   ├── common/             # Header, Navigation, Modal, Numpad
│   ├── pos/                # TableMap, MenuSelector, OrderDrawer, CheckoutModal
│   ├── menu/               # MenuManager, MenuItemForm
│   ├── customers/          # CustomerManager
│   ├── tables/             # TableManager
│   ├── expenses/           # ExpenseManager
│   ├── reports/            # ReportsView
│   ├── staff/              # StaffManager
│   ├── settings/           # SettingsView
│   └── print/              # BillReceipt, KitchenTicket (Thermal 58mm/80mm)
└── supabase.sql            # File khởi tạo cấu trúc CSDL PostgreSQL trên Supabase
```

---

## ⚡ HƯỚNG DẪN CHẠY DỰ ÁN

### 1. Cài đặt & Chạy Local
```bash
# Cài đặt thư viện
npm install

# Chạy môi trường phát triển (Dev)
npm run dev

# Mở trình duyệt tại http://localhost:5173
```

*Lưu ý: Ứng dụng đã tích hợp sẵn chế độ Local Fallback với dữ liệu mẫu chuẩn của quán Bánh Cuốn Thanh Hóa, bạn có thể trải nghiệm toàn bộ tính năng bán hàng, in ấn và báo cáo ngay lập tức mà không cần cài đặt database trước.*

### 2. Kết Nối Supabase Cloud Database (Nếu muốn đồng bộ nhiều thiết bị)
1. Đăng ký/đăng nhập [Supabase](https://supabase.com) và tạo một dự án mới (New Project).
2. Vào mục **SQL Editor** trên Supabase, dán toàn bộ nội dung file **`supabase.sql`** và bấm **Run**.
3. Mở ứng dụng POS, chuyển sang tab **Cài Đặt** > mục **5. Kết Nối Supabase Cloud Database**.
4. Dán **Project URL** và **Anon Key** của bạn rồi bấm **Kiểm Tra & Kết Nối Supabase**.
5. Bấm **Tải Dữ Liệu Mẫu Lên Supabase** để khởi tạo danh sách bàn và thực đơn ban đầu.

### 3. Triển khai lên Vercel (1-Click Deployment)
Dự án đã có sẵn cấu hình `vercel.json` và tương thích 100% với Vercel:
```bash
npm run build
```
Đẩy mã nguồn lên GitHub và kết nối với Vercel, ứng dụng sẽ tự động được build và cấp phát tên miền trực tuyến.
