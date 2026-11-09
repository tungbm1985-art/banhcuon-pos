import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOrdersHistory } from '../../services/db';
import { formatVND, formatDateTime } from '../../utils/formatters';
import { History, Printer, Search, ChevronDown, ChevronUp, Receipt } from 'lucide-react';

function localDateKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfRange(filter) {
  const now = new Date();
  if (filter === 'today') return localDateKey(now.toISOString());
  if (filter === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return localDateKey(start.toISOString());
  }
  if (filter === 'month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return null;
}

const STATUS_LABEL = {
  completed: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  pending: 'Đang phục vụ',
  served: 'Đã ra món',
};

export default function OrderHistory({ onReprintBill }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('today');
  const [status, setStatus] = useState('completed');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getOrdersHistory({ status: 'all' });
      setOrders(list || []);
    } catch (err) {
      console.error('Failed to load order history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const from = startOfRange(range);
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== 'all' && order.status !== status) return false;
      if (from && localDateKey(order.completed_at || order.created_at) < from) return false;
      if (!q) return true;
      const tableName = order.tables?.name || '';
      const customer = order.customers?.full_name || '';
      const phone = order.customers?.phone || '';
      const haystack = `${order.order_number} ${tableName} ${customer} ${phone}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, range, status, query]);

  const totalShown = filtered.reduce((sum, order) => {
    if (order.status !== 'completed') return sum;
    return sum + (Number(order.total_amount) || 0);
  }, 0);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight flex items-center gap-2">
            <History className="w-5 h-5 text-red-600" />
            Lịch Sử Đơn Hàng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem lại đơn đã thanh toán, món, số lượng và in lại hóa đơn
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="self-start px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700"
        >
          Tải lại
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'today', label: 'Hôm nay' },
          { id: 'week', label: '7 ngày' },
          { id: 'month', label: 'Tháng này' },
          { id: 'all', label: 'Tất cả' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              range === item.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'completed', label: 'Đã thanh toán' },
          { id: 'cancelled', label: 'Đã hủy' },
          { id: 'pending', label: 'Đang mở' },
          { id: 'all', label: 'Mọi trạng thái' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatus(item.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              status === item.id ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm mã đơn, bàn, tên hoặc SĐT khách..."
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{filtered.length} đơn</span>
        <span>
          Doanh thu trong danh sách: <strong className="text-slate-800">{formatVND(totalShown)}</strong>
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {loading && <div className="p-8 text-center text-sm text-slate-400">Đang tải lịch sử đơn...</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Chưa có đơn nào trong bộ lọc này</p>
            <p className="text-xs mt-1">Đơn hiện ở đây sau khi thanh toán hoặc hủy</p>
          </div>
        )}

        {!loading &&
          filtered.map((order) => {
            const open = openId === order.id;
            const tableName = order.tables?.name || (order.order_type === 'takeaway' ? 'Mang về' : 'Bàn');
            const items = order.order_items || [];
            return (
              <div key={order.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="w-full text-left p-3.5 hover:bg-slate-50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900">{order.order_number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {tableName} · {formatDateTime(order.completed_at || order.created_at)}
                      {order.customers?.full_name ? ` · ${order.customers.full_name}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-red-600 text-sm">{formatVND(order.total_amount)}</div>
                    <div className="text-[10px] text-slate-400 uppercase">
                      {order.payment_method === 'vietqr' ? 'VietQR' : order.status === 'completed' ? 'Tiền mặt' : ''}
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />
                  )}
                </button>

                {open && (
                  <div className="px-3.5 pb-3.5 space-y-2">
                    <div className="rounded-xl border border-slate-100 divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <div key={item.id || idx} className="px-3 py-2 flex items-start justify-between gap-3 text-sm">
                          <div>
                            <div className="font-semibold text-slate-800">{item.item_name}</div>
                            {item.notes && <div className="text-[11px] text-amber-700">Ghi chú: {item.notes}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black">x{item.quantity}</div>
                            <div className="text-[11px] text-slate-400">
                              {formatVND(Number(item.unit_price) * Number(item.quantity))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="px-3 py-3 text-xs text-slate-400">Đơn không còn dòng món</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>Giảm giá: {formatVND(order.discount || 0)}</span>
                      <span className="font-bold text-slate-800">Tổng: {formatVND(order.total_amount)}</span>
                    </div>

                    {order.notes && (
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">Ghi chú: {order.notes}</div>
                    )}

                    {order.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => onReprintBill(order)}
                        className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        In lại hóa đơn
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
