import { useState, useEffect } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../../services/db';
import { formatVND, formatDate } from '../../utils/formatters';
import { getDateRangeForPreset, exportDataFiles } from '../../utils/exportData';
import { Plus, Trash2, Edit2, Receipt, FileSpreadsheet } from 'lucide-react';
import Modal from '../common/Modal';

const CATEGORIES = [
  'Nguyên liệu tươi',
  'Gia vị / Đồ khô',
  'Điện / Nước / Gas',
  'Mặt bằng',
  'Khác',
];

const RANGE_PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'all', label: 'Tất cả' },
];

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRangeForPreset(rangePreset, customStart, customEnd);
      const data = await getExpenses({
        category: selectedCategory,
        startDate,
        endDate,
      });
      setExpenses(data);
    } catch (e) {
      console.error('Failed to load expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rangePreset === 'custom' && (!customStart || !customEnd)) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, rangePreset, customStart, customEnd]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setAmount('');
    setCategory(CATEGORIES[0]);
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setAmount(exp.amount?.toString() || '');
    setCategory(exp.category || CATEGORIES[0]);
    setExpenseDate(exp.expense_date || new Date().toISOString().slice(0, 10));
    setNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Vui lòng nhập số tiền chi phí hợp lệ!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount: Number(amount),
          category,
          expense_date: expenseDate,
          notes: notes.trim(),
        });
      } else {
        await createExpense({
          amount: Number(amount),
          category,
          expense_date: expenseDate,
          notes: notes.trim(),
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Lỗi lưu chi phí: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (exp) => {
    if (confirm(`Bạn có chắc muốn xóa chi phí ${formatVND(exp.amount)} (${exp.category})?`)) {
      try {
        await deleteExpense(exp.id);
        await loadData();
      } catch (err) {
        alert('Lỗi xóa chi phí: ' + err.message);
      }
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Kê Khai Chi Phí & Nguyên Liệu
          </h2>
          <p className="text-xs text-slate-500">
            Ghi nhận tiền nhập thịt, bột, mộc nhĩ, điện gas, mặt bằng...
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Ghi Khoản Chi</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white flex items-center justify-between shadow-md">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Tổng chi phí ({expenses.length} khoản chi) ·{' '}
            {rangePreset === 'custom'
              ? `${customStart || '...'} → ${customEnd || '...'}`
              : RANGE_PRESETS.find((p) => p.id === rangePreset)?.label}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
            {formatVND(totalAmount)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-red-400">
          <Receipt className="w-6 h-6" />
        </div>
      </div>

      {/* Filter Row */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
            <button
              onClick={() => setSelectedCategory('Tất cả')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 ${
                selectedCategory === 'Tất cả'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tất cả danh mục
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              exportDataFiles(
                { expenses },
                `chi-phi_${RANGE_PRESETS.find((p) => p.id === rangePreset)?.label || customStart || 'all'}`
              )
            }
            disabled={expenses.length === 0}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold whitespace-nowrap active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>

        {/* Bộ lọc khoảng thời gian */}
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRangePreset(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 ${
                rangePreset === p.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRangePreset('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 ${
              rangePreset === 'custom'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Từ ngày – đến ngày
          </button>
        </div>

        {rangePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            />
            <span className="text-xs text-slate-400">đến</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            />
            {(!customStart || !customEnd) && (
              <span className="text-xs text-amber-600 font-semibold">
                Chọn đủ ngày bắt đầu và kết thúc
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expenses Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">
                    {formatVND(exp.amount)}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {exp.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {formatDate(exp.expense_date)}
                  </span>
                </div>
                {exp.notes && (
                  <p className="text-xs text-slate-600 mt-1 truncate">
                    {exp.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(exp)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90"
                  title="Sửa chi phí"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(exp)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-90"
                  title="Xóa chi phí"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {expenses.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-400 text-sm">
              Chưa có chi phí nào được ghi nhận
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingExpense ? 'Sửa Khoản Chi' : 'Ghi Nhận Khoản Chi Mới'}
          subtitle="Quản lý dòng tiền chi ra của quán"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số tiền chi (VNĐ) *
              </label>
              <input
                type="number"
                required
                min="1000"
                step="1000"
                placeholder="VD: 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Phân loại chi phí *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ngày phát sinh *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ghi chú chi tiết (Nhà cung cấp, mặt hàng...)
              </label>
              <textarea
                rows="2"
                placeholder="VD: 5kg thịt nạc vai xay, 2kg hành phi Hải Phòng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md active:scale-95"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu Chi Phí'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
