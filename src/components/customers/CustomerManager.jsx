import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, getOrdersHistory } from '../../services/db';
import { formatVND, formatDateTime } from '../../utils/formatters';
import { exportDataFiles } from '../../utils/exportData';
import { Search, UserPlus, Star, Phone, History, CreditCard, Edit, Check, FileSpreadsheet } from 'lucide-react';
import Modal from '../common/Modal';

export default function CustomerManager({ loyaltyConfig }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const loadData = async (query = '') => {
    try {
      setLoading(true);
      const data = await getCustomers(query);
      setCustomers(data);
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    try {
      const allOrders = await getOrdersHistory({ status: 'completed' });
      const orders = allOrders.filter((o) => o.customer_id === cust.id);
      setCustomerOrders(orders);
    } catch (e) {
      console.error('Failed to load customer orders:', e);
    }
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newPhone.trim() || !newFullName.trim()) return;

    try {
      const created = await createCustomer({
        phone: newPhone.trim(),
        full_name: newFullName.trim(),
      });
      setIsAddModalOpen(false);
      setNewFullName('');
      setNewPhone('');
      await loadData();
      handleSelectCustomer(created);
    } catch (err) {
      alert('Lỗi tạo khách hàng: ' + err.message);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Khách Hàng & Tích Điểm
          </h2>
          <p className="text-xs text-slate-500">
            Tra cứu SĐT, theo dõi lịch sử đơn hàng và điểm tích lũy thành viên
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportDataFiles({ customers }, 'khach-hang')}
            disabled={customers.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel/CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tìm theo tên hoặc số điện thoại..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500"
        />
      </div>

      {/* Customers List & Detail View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Cards Column */}
        <div className="md:col-span-1 space-y-2">
          {customers.map((c) => {
            const isSelected = selectedCustomer?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCustomer(c)}
                className={`w-full text-left p-3 rounded-2xl border transition-all active:scale-98 flex items-center justify-between ${
                  isSelected
                    ? 'bg-red-50 border-red-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {c.full_name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-mono mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{c.points || 0} điểm</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Đã tiêu: {formatVND(c.total_spent || 0)}
                  </div>
                </div>
              </button>
            );
          })}

          {customers.length === 0 && !loading && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
              Không tìm thấy khách hàng nào
            </div>
          )}
        </div>

        {/* Selected Customer Profile & History Column */}
        <div className="md:col-span-2">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Profile Card */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {selectedCustomer.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Số điện thoại: <strong>{selectedCustomer.phone}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Điểm tích lũy
                    </span>
                    <span className="text-lg font-black text-amber-600">
                      ⭐ {selectedCustomer.points || 0}
                    </span>
                  </div>

                  <div className="text-right border-l border-slate-200 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Tổng tiền đã mua
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {formatVND(selectedCustomer.total_spent || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                      Lịch Sử Đơn Hàng ({customerOrders.length})
                    </h4>
                  </div>
                </div>

                <div className="space-y-2">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {order.order_number}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {formatDateTime(order.created_at)}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-1 line-clamp-1">
                          {order.order_items?.map((it) => `${it.quantity}x ${it.item_name}`).join(', ') || 'Chi tiết đơn'}
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span className="text-sm font-black text-red-600 block">
                          {formatVND(order.total_amount)}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {order.payment_method === 'vietqr' ? 'VietQR' : 'Tiền mặt'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {customerOrders.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Khách hàng chưa có lịch sử đơn hàng nào đã hoàn tất
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[220px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
              <Star className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm font-medium">
                Chọn một khách hàng ở danh sách bên trái để xem hồ sơ tích điểm
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Thêm Khách Hàng Mới"
          subtitle="Tích điểm thành viên Bánh Cuốn Thanh Hóa"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateNew} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số điện thoại *
              </label>
              <input
                type="tel"
                required
                placeholder="VD: 0912345678"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Họ và tên khách hàng *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn Nam"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md active:scale-95"
              >
                Thêm Khách Hàng
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
