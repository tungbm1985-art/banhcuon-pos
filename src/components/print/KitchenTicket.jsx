import { formatDateTime } from '../../utils/formatters';

export default function KitchenTicket({
  order,
  is80mm = false,
  itemsToPrint = null,
  kitchenStation = 'Bếp tráng',
}) {
  if (!order) return null;

  // Resolve table name
  const tableName =
    order.tables?.name ||
    (order.order_type === 'takeaway' ? '🛍️ MANG VỀ' : 'BÀN');
  const isTakeaway = order.order_type === 'takeaway' || tableName.includes('Mang Về');
  const items = itemsToPrint || order.order_items || [];
  // kotRound: 1 = first send, 2+ = added more items
  const isAddMore = order.kotRound && order.kotRound > 1;

  return (
    <div className={is80mm ? 'thermal-receipt-80mm text-black' : 'thermal-receipt text-black'}>
      {/* Header */}
      <div className="text-center pb-2 border-b-2 border-black">
        <div className="text-[10px] font-bold tracking-widest uppercase">
          BÁNH CUỐN THANH HÓA
        </div>
        <h1 className="text-sm font-black uppercase tracking-wider my-0.5">
          PHIẾU BÁO BẾP (KOT)
        </h1>
        <div className="text-sm font-black uppercase border-2 border-black inline-block px-2 py-0.5 mt-1">
          {kitchenStation}
        </div>
        {/* Table / Takeaway Highlight */}
        <div className="mt-1">
          <div className="text-lg font-black uppercase bg-black text-white px-2 py-0.5 inline-block rounded">
            {tableName}
          </div>
        </div>
        <div className="text-[9px] font-bold uppercase mt-1">
          {isTakeaway ? '👉 [ ĐƠN MANG VỀ ]' : '👉 [ KHÁCH ĂN TẠI BÀN ]'}
        </div>
        {/* Add-more indicator — only shown on 2nd+ KOT */}
        {order.kotReprint && (
          <div className="mt-1 text-[11px] font-black uppercase border-2 border-black px-2 py-0.5 inline-block">
            IN LẠI TOÀN BỘ
          </div>
        )}
        {isAddMore && !order.kotReprint && (
          <div className="mt-1 text-[11px] font-black uppercase border-2 border-black px-2 py-0.5 inline-block bg-gray-200">
            ⚠️ GỌI THÊM MÓN
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="text-[10px] py-1 border-b border-dashed border-black flex justify-between">
        <div>
          <span>Mã đơn: <strong>{order.order_number}</strong></span>
        </div>
        <div>
          <span>Giờ: {order.created_at ? formatDateTime(order.created_at) : ''}</span>
        </div>
      </div>

      {/* Item List for Chef */}
      <div className="my-2 space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between py-1 border-b border-dotted border-gray-400"
          >
            <div className="flex-1 pr-2">
              <div className="text-xs font-black uppercase leading-tight">
                {item.item_name}
              </div>
              {item.notes && (
                <div className="text-[10px] font-bold text-red-700 italic mt-0.5">
                  👉 Ghi chú: {item.notes}
                </div>
              )}
            </div>
            <div className="text-base font-black text-right w-10 shrink-0">
              x{item.quantity}
            </div>
          </div>
        ))}
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="p-1.5 border border-black rounded text-[10px] my-2 bg-gray-50">
          <div className="font-bold uppercase text-[9px]">Ghi chú toàn đơn:</div>
          <div className="font-semibold text-black">{order.notes}</div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-2 border-t-2 border-black text-[9px] font-bold uppercase">
        --- HẾT PHIẾU {kitchenStation} ---
      </div>
    </div>
  );
}
