import { formatVND, formatDateTime, getVietQRUrl } from '../../utils/formatters';

export default function BillReceipt({
  order,
  settings,
  cashierName = 'Nhân viên',
  is80mm = false,
}) {
  if (!order) return null;

  const storeInfo = settings?.store_info || {};
  const vietqrConfig = settings?.vietqr_config || {};
  const printConfig = settings?.print_config || {};

  const tableName = order.tables?.name || (order.order_type === 'takeaway' ? '🛍️ Mang Về' : 'Bàn');
  const items = order.order_items || [];
  const showQR =
    printConfig.show_qr_on_bill !== false &&
    vietqrConfig.bank_id &&
    vietqrConfig.account_no &&
    (order.payment_method === 'vietqr' || !order.payment_method);
  const qrUrl = showQR
    ? getVietQRUrl(vietqrConfig, order.total_amount, `${tableName} ${order.order_number}`)
    : null;

  return (
    <div className={is80mm ? 'thermal-receipt-80mm text-black' : 'thermal-receipt text-black'}>
      {/* Header Store Info */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <h2 className="text-sm font-bold uppercase tracking-wide m-0">
          {storeInfo.name || 'BÁNH CUỐN THANH HÓA'}
        </h2>
        <div className="text-[10px]">Hotline: {storeInfo.phone}</div>
      </div>

      {/* Title */}
      <div className="text-center py-2">
        <div className="text-sm font-black uppercase">PHIẾU THANH TOÁN</div>
        <div className="text-[10px] font-mono">Mã: {order.order_number}</div>
      </div>

      {/* Cancelled stamp */}
      {order.status === 'cancelled' && (
        <div className="text-center my-2 py-1 border-2 border-black">
          <div className="text-base font-black tracking-widest">*** ĐÃ HUỶ ***</div>
          {order.cancel_reason && (
            <div className="text-[9px] mt-0.5">Lý do: {order.cancel_reason}</div>
          )}
          {order.cancelled_by && (
            <div className="text-[9px]">Người huỷ: {order.cancelled_by}</div>
          )}
        </div>
      )}

      {/* Meta info */}
      <div className="text-[10px] pb-1 border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Khu vực / Bàn:</span>
          <span className="font-bold">{tableName}</span>
        </div>
        <div className="flex justify-between">
          <span>Thời gian:</span>
          <span>{formatDateTime(order.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Nhân viên:</span>
          <span>{cashierName}</span>
        </div>
      </div>

      {/* Itemized Table */}
      <table className="w-full text-[10px] my-2 border-collapse">
        <thead>
          <tr className="border-b border-dashed border-black text-left">
            <th className="py-1">Món</th>
            <th className="py-1 text-center w-8">SL</th>
            <th className="py-1 text-right">Đ.Giá</th>
            <th className="py-1 text-right">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-dotted border-gray-300">
              <td className="py-1 pr-1 font-medium">
                <div>{item.item_name}</div>
                {item.notes && <div className="text-[9px] italic">({item.notes})</div>}
              </td>
              <td className="py-1 text-center font-bold">{item.quantity}</td>
              <td className="py-1 text-right">{formatVND(item.unit_price)}</td>
              <td className="py-1 text-right font-bold">
                {formatVND(Number(item.unit_price) * Number(item.quantity))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="text-[11px] pt-1 border-t border-dashed border-black space-y-0.5">
        <div className="flex justify-between">
          <span>Tổng tiền món:</span>
          <span>{formatVND(order.subtotal || order.total_amount)}</span>
        </div>

        {order.discount > 0 && (
          <div className="flex justify-between text-red-600 font-medium">
            <span>Giảm giá / Ưu đãi:</span>
            <span>-{formatVND(order.discount)}</span>
          </div>
        )}

        <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
          <span>THANH TOÁN:</span>
          <span>{formatVND(order.total_amount)}</span>
        </div>

        <div className="flex justify-between text-[10px] text-gray-700">
          <span>{order.payment_method ? 'Phương thức:' : 'Trạng thái:'}</span>
          <span className="font-semibold uppercase">
            {order.payment_method
              ? order.payment_method === 'vietqr'
                ? 'Chuyển khoản VietQR'
                : 'Tiền mặt'
              : 'Chưa thanh toán'}
          </span>
        </div>
      </div>

      {/* Dynamic VietQR Code */}
      {qrUrl && (
        <div className="text-center my-2 pt-2 border-t border-dashed border-black">
          <div className="text-[10px] font-bold uppercase mb-1">
            Quét mã VietQR thanh toán
          </div>
          <img
            src={qrUrl}
            alt="VietQR Payment"
            width="144"
            height="144"
            loading="eager"
            decoding="sync"
            className="w-36 h-36 mx-auto object-contain border border-gray-300 rounded p-0.5"
          />
          <div className="text-[9px] mt-1 text-gray-700">
            {vietqrConfig.bank_id} - STK: {vietqrConfig.account_no}
          </div>
          <div className="text-[9px] font-bold uppercase">{vietqrConfig.account_name}</div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-center mt-3 pt-2 border-t border-dashed border-black text-[10px]">
        <div className="italic">{storeInfo.footer_note || 'Cảm ơn quý khách & Hẹn gặp lại!'}</div>
        <div className="text-[8px] text-gray-500 mt-1">Hệ thống POS Bánh Cuốn Thanh Hóa</div>
      </div>
    </div>
  );
}
