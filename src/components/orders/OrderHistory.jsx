import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOrdersHistory, verifyAdminPassword } from '../../services/db';
import { formatVND, formatDateTime } from '../../utils/formatters';
import { exportDataFiles } from '../../utils/exportData';
import {
  History,
  Printer,
  Search,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileSpreadsheet,
  Ban,
  XCircle,
  Lock,
} from 'lucide-react';
import Modal from '../common/Modal';

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
  cancelled: 'ĐÃ HUỶ',
  pending: 'Đang phục vụ',
  served: 'Đã ra món',
};

const CANCEL_REASONS = [
  'Bấm nhầm món / bàn',
  'Nhập trùng đơn',
  'Khách đổi ý – hoàn tiền',
  'Đơn test',
  'Lý do khác',
];

export default function OrderHistory({ onReprintBill, onCancelOrder, isAdmin = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('today');
  const [status, setStatus] = useState('completed');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  // Trạng thái hộp thoại huỷ đơn đã thanh toán
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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

  const openCancelModal = (order) => {
    setCancelTarget(order);
    setCancelReason(CANCEL_REASONS[0]);
    setCancelReasonCustom('');
    setCancelPassword('');
    setCancelError('');
    setIsCancelling(false);
  };

  const closeCancelModal = () => {
    if (isCancelling) return;
    setCancelTarget(null);
  };

  const handleConfirmCancel = async () => {
    const reason = cancelReason === 'Lý do khác' ? cancelReasonCustom.trim() : cancelReason;
    if (!reason) {
      setCancelError('Vui lòng chọn hoặc ghi lý do huỷ.');
      return;
    }
    if (!cancelPassword) {
      setCancelError('Vui lòng nhập mật khẩu tài khoản chủ quán.');
      return;
    }

    setIsCancelling(true);
    setCancelError('');
    try {
      const ok = await verifyAdminPassword(cancelPassword);
      if (!ok) {
        setCancelError('Mật khẩu chủ quán không đúng. Đơn chưa bị huỷ.');
        setIsCancelling(false);
        return;
      }
      await onCancelOrder(cancelTarget.id, { reason });
      setCancelTarget(null);
      await load();
    } catch (err) {
      setCancelError(err?.message || 'Không huỷ được đơn.');
      setIsCancelling(false);
    }
  };

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
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => exportDataFiles({ orders: filtered }, 'don-hang')}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700"
          >
            Tải lại
          </button>
        </div>
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
          { id: 'cancelled', label: 'Đơn đã huỷ' },
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
            const isCancelled = order.status === 'cancelled';
            return (
              <div key={order.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="w-full text-left p-3.5 hover:bg-slate-50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black text-sm ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {order.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'cancelled'
                            ? 'bg-red-50 text-red-700'
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
                    <div className={`font-black text-sm ${isCancelled ? 'text-slate-400 line-through' : 'text-red-600'}`}>
                      {formatVND(order.total_amount)}
                    </div>
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
                    {isCancelled && (
                      <div className="rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 space-y-0.5">
                        <div className="font-black">*** ĐÃ HUỶ ***</div>
                        {order.cancel_reason && <div>Lý do: {order.cancel_reason}</div>}
                        <div>
                          Người huỷ: {order.cancelled_by || '—'}
                          {order.cancelled_at ? ` · ${formatDateTime(order.cancelled_at)}` : ''}
                        </div>
                      </div>
                    )}

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

                    {Number(order.points_earned) > 0 && (
                      <div className="text-xs text-slate-500 px-1">Điểm đã tích cho khách: +{order.points_earned}</div>
                    )}
                    {Number(order.points_redeemed) > 0 && (
                      <div className="text-xs text-slate-500 px-1">Điểm khách đã dùng: -{order.points_redeemed}</div>
                    )}

                    {order.notes && (
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">Ghi chú: {order.notes}</div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {(order.status === 'completed' || isCancelled) && (
                        <button
                          type="button"
                          onClick={() => onReprintBill(order)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                            isCancelled ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'
                          }`}
                        >
                          <Printer className="w-4 h-4" />
                          {isCancelled ? 'In lại phiếu (ĐÃ HUỶ)' : 'In lại hóa đơn'}
                        </button>
                      )}

                      {isAdmin && order.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => openCancelModal(order)}
                          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Ban className="w-4 h-4" />
                          Huỷ đơn đã thanh toán
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Hộp thoại huỷ đơn đã thanh toán (chỉ chủ quán) */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={closeCancelModal}
          title="Huỷ Đơn Đã Thanh Toán"
          subtitle={`Đơn ${cancelTarget.order_number} · ${formatVND(cancelTarget.total_amount)}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <div className="font-black flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Đơn sẽ KHÔNG bị xoá khỏi dữ liệu
              </div>
              <p className="mt-1">
                Đơn chuyển sang trạng thái <strong>ĐÃ HUỶ</strong>, bị loại khỏi doanh thu và báo cáo,
                nhưng vẫn mở xem và in lại được. Điểm thưởng của khách sẽ được điều chỉnh lại cho đúng.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Lý do huỷ *</label>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${
                      cancelReason === r ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={r}
                      checked={cancelReason === r}
                      onChange={() => setCancelReason(r)}
                      className="accent-red-600"
                    />
                    {r}
                  </label>
                ))}
              </div>
              {cancelReason === 'Lý do khác' && (
                <textarea
                  rows="2"
                  value={cancelReasonCustom}
                  onChange={(e) => setCancelReasonCustom(e.target.value)}
                  placeholder="Ghi rõ lý do huỷ..."
                  className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-red-500"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Mật khẩu tài khoản chủ quán *
              </label>
              <input
                type="password"
                value={cancelPassword}
                onChange={(e) => setCancelPassword(e.target.value)}
                placeholder="Nhập mật khẩu chủ quán để xác nhận"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            {cancelError && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2">
                {cancelError}
              </div>
            )}

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={isCancelling}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                Không huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-95"
              >
                {isCancelling ? 'Đang xử lý...' : 'Xác nhận huỷ đơn'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
