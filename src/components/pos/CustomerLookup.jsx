import { useState, useEffect, useMemo, useRef } from 'react';
import { getCustomers, createCustomer, normalizeSearchText } from '../../services/db';
import { Search, UserPlus, Star, X } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { useDialog } from '../../contexts/DialogContext';

export default function CustomerLookup({ selectedCustomer, onSelectCustomer, loyaltyConfig }) {
  const { showAlert } = useDialog();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const boxRef = useRef(null);

  // Tải danh sách khách 1 lần rồi lọc ngay trên máy để gõ tới đâu ra tới đó,
  // không phải chờ mạng mỗi lần bấm phím.
  const loadCustomers = async () => {
    try {
      const list = await getCustomers();
      setCustomers(list || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Đóng danh sách gợi ý khi chạm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setShowAddForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rawQuery = query.trim();
  const normalizedQuery = normalizeSearchText(rawQuery);
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return customers
      .filter(
        (c) =>
          normalizeSearchText(c.full_name).includes(normalizedQuery) ||
          String(c.phone || '').includes(rawQuery)
      )
      .slice(0, 8);
  }, [normalizedQuery, rawQuery, customers]);

  const handleSelect = (cust) => {
    onSelectCustomer(cust);
    setQuery('');
    setShowAddForm(false);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!rawQuery || !newName.trim() || creating) return;
    setCreating(true);
    try {
      const newCust = await createCustomer({
        phone: rawQuery,
        full_name: newName.trim(),
      });
      await loadCustomers();
      onSelectCustomer(newCust);
      setShowAddForm(false);
      setNewName('');
      setQuery('');
    } catch (err) {
      console.error('Error creating customer:', err);
      showAlert('Lỗi tạo khách hàng: ' + err.message, { variant: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  if (selectedCustomer) {
    const points = Number(selectedCustomer.points) || 0;
    return (
      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900">
                  {selectedCustomer.full_name}
                </span>
                <span className="text-xs text-slate-500">({selectedCustomer.phone})</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  ⭐ {points} điểm
                </span>
                <span className="text-slate-400 text-[11px]">
                  (Quy đổi ~{formatVND(points * (Number(loyaltyConfig?.redeem_rate) || 100))})
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectCustomer(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            title="Bỏ chọn khách"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          placeholder="Tìm khách: gõ tên hoặc số điện thoại..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowAddForm(false);
          }}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
        />

        {/* Danh sách gợi ý hiện ngay dưới ô nhập */}
        {rawQuery && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-lg max-h-64 overflow-y-auto">
            {results.length > 0 ? (
              results.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => handleSelect(cust)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {cust.full_name}
                    </div>
                    <div className="text-xs text-slate-500">{cust.phone}</div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    {Number(cust.points) || 0} điểm
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2.5 text-xs text-slate-500">
                Không tìm thấy khách khớp "<strong>{rawQuery}</strong>"
              </div>
            )}

            {/* Tạo khách mới với nội dung đang gõ (thường là SĐT) */}
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(true);
                  setNewName('');
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 border-t border-slate-100"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm khách mới</span>
              </button>
            ) : (
              <form
                onSubmit={handleCreateCustomer}
                className="p-2.5 border-t border-slate-100 space-y-2"
              >
                <div className="text-[11px] text-slate-500">
                  SĐT khách mới: <strong className="text-slate-800">{rawQuery}</strong>
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Họ tên khách mới..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-bold active:scale-95 transition-all"
                >
                  {creating ? 'Đang lưu...' : 'Lưu khách hàng'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
