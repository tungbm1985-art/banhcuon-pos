# Sửa lỗi mã đơn POS — bản giao cho tool viết app

App: Bánh Cuốn Thanh Hóa - Mobile POS — https://bcthpos.vercel.app/ — dữ liệu trên Supabase.
Quán bán từ khoảng 06:15 sáng; đối chiếu doanh thu theo ngày đang bị lệch vì 2 lỗi dưới đây.
Ranh giới: mọi đơn test chỉ tạo trong giao diện app, KHÔNG thao tác thẳng vào Supabase.

## Bảo vệ dữ liệu — BẮT BUỘC, làm trước khi sửa

Dữ liệu đơn hàng nằm trên Supabase, tách riêng với code trên Vercel — sửa và đẩy code mới không được làm mất hay chồng dữ liệu. Cụ thể:

1. **Sao lưu trước khi sửa:** xuất toàn bộ các bảng trên Supabase (đơn hàng, chi tiết đơn, thực đơn, cài đặt, khách hàng nếu có) ra file (CSV/SQL) hoặc dùng tính năng sao lưu của Supabase. Giữ file sao lưu cho tới khi nghiệm thu xong.
2. **Không xoá, không sửa dữ liệu cũ:** không xoá bảng, không xoá cột, không reset cơ sở dữ liệu, không chạy lại dữ liệu mẫu (seed). Đơn đã tạo giữ nguyên mã và nội dung — luật mới chỉ áp cho đơn tạo từ sau khi sửa.
3. **Cảnh báo cặp đơn trùng có sẵn:** trong dữ liệu hiện đã có 2 đơn trùng mã BC-261111-001 (tạo 12:36 và 15:06 ngày 11/11/2026). Khi thêm ràng buộc duy nhất (unique constraint) cho cột mã đơn, Supabase có thể báo lỗi vì cặp trùng này. Gặp trường hợp đó: **DỪNG LẠI và báo chủ quán, tuyệt đối không tự xoá hay tự đổi mã đơn cũ để "dọn" dữ liệu.** Cách xử lý sẽ do chủ quán quyết (ví dụ: giữ nguyên 2 đơn cũ, cơ chế sinh mã mới ở máy chủ tự đảm bảo không trùng thêm).
4. **Đối chiếu sau khi sửa:** đếm số đơn trước và sau khi sửa phải khớp nhau; doanh thu tổng không đổi.

## Lỗi 1 — Mã đơn lấy ngày theo giờ UTC, không phải giờ Việt Nam

**Hiện tượng đã kiểm chứng (sáng 12/11/2026):**
- Đơn tạo 06:11–06:56 giờ VN mang mã BC-261111-038 đến BC-261111-072 (nối tiếp số thứ tự của ngày 11/11, tiền tố ngày vẫn là 11/11).
- Đơn tạo 07:01 giờ VN mang mã BC-261112-001 (ngày chuyển sang 12/11, số thứ tự về lại 001).

**Nguyên nhân:** app tính "ngày" theo giờ UTC — ngày của app đổi lúc 07:00 giờ VN (00:00 UTC), không phải 00:00 giờ VN.

**Hệ quả:** khoảng 45 phút đầu mỗi buổi sáng (trước 07:00), toàn bộ đơn bị ghi mã của ngày hôm trước; đến 07:00 mới nhảy sang mã ngày mới và đánh số lại từ 001. Đối chiếu doanh thu theo ngày bị lệch đúng khúc đầu buổi.

**Cách sửa:** khi sinh mã đơn, lấy ngày theo múi giờ Asia/Ho_Chi_Minh (UTC+7). Ngày của mã đơn đổi lúc 00:00 giờ VN.

## Lỗi 2 — Mã đơn có thể bị trùng

**Hiện tượng đã kiểm chứng (11/11/2026):** hai đơn cùng mã BC-261111-001 — một đơn lúc 12:36, một đơn lúc 15:06.

**Nguyên nhân khả dĩ nhất:** app đếm số thứ tự theo dữ liệu đã tải trên từng thiết bị/phiên; máy chưa đồng bộ kịp thì tưởng ngày đó chưa có đơn nào nên đánh lại từ 001. Đã loại trừ giả thuyết tách dãy số theo hình thức thanh toán: đơn VietQR và đơn tiền mặt trong một phiên đã đồng bộ chạy nối tiếp chung (036, 037).

**Cách sửa:** sinh mã đơn ở phía máy chủ (ví dụ Supabase function/RPC), dùng dãy số nguyên tử theo từng ngày (giờ VN), và đặt ràng buộc duy nhất (unique constraint) trên cột mã đơn để trùng mã không thể ghi được — nếu trùng thì tự sinh lại thay vì ghi đè.

## Lỗi 3 (phụ) — sau mỗi lần thanh toán phải tải lại trang

Sau mỗi lần thanh toán xong phải tải lại trang mới tạo được đơn tiếp theo; hộp thoại thanh toán hiện chậm. Kiểm tra và sửa cùng đợt (có thể liên quan đến việc state sau thanh toán không được reset).

## Lỗi 4 — Header bị tai thỏ / thanh trạng thái iOS che khi mở app từ màn hình chính (bổ sung 13/11/2026)

**Hiện tượng (chủ quán báo 13/11/2026):**
- Mở app bằng Safari trên iOS: bình thường, bấm được mọi nút trên header.
- Lưu app ra màn hình chính rồi mở như web app (chế độ standalone): phần header trên cùng bị che — có máy bị tai thỏ (notch) lấp, có máy bị chồng với thanh trạng thái trên cùng của iOS — các nút trên header không bấm được.
- Trên máy Samsung (Android): dùng bình thường, không lỗi.

**Nguyên nhân:** ở chế độ standalone, iOS cho trang web tràn lên sát mép trên, nằm dưới tai thỏ và thanh trạng thái; app chưa chừa vùng an toàn (safe area) cho header nên nội dung header bị vùng đó đè lên. Mở bằng Safari không lỗi vì Safari tự chừa phần trên.

**Cách sửa:**
- Thêm `viewport-fit=cover` vào thẻ meta viewport.
- Header thêm khoảng đệm trên theo vùng an toàn: `padding-top: env(safe-area-inset-top)` (cộng với đệm sẵn có), để toàn bộ nút bấm của header nằm dưới tai thỏ/thanh trạng thái, bấm được; nền của header vẫn kéo dài tới sát mép trên cho đẹp.
- Rà lại thẻ meta `apple-mobile-web-app-status-bar-style` cho hợp với cách đệm ở trên.
- Yêu cầu của chủ quán: header trên iOS phải "rộng ra" — đủ thoáng để không nút nào bị che.

## Tiêu chí nghiệm thu

1. Tạo đơn lúc 06:30 giờ VN: mã đơn mang ngày hôm đó (không phải ngày hôm trước), số thứ tự nối tiếp.
2. Tạo 2 đơn cùng lúc trên 2 máy khác nhau: mã đơn khác nhau, không trùng.
3. Tạo đơn liên tiếp không cần tải lại trang; hộp thoại thanh toán hiện ngay.
4. Đơn cũ đã tạo trước khi sửa không bị đổi mã.
5. Mở app từ màn hình chính trên iPhone có tai thỏ: header hiện đầy đủ, mọi nút trên header bấm được, không bị tai thỏ hay thanh trạng thái che; mở bằng Safari và trên Android vẫn bình thường như trước.
