import { useState, useEffect, useCallback } from 'react';
import {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  getFinanceCategories,
  createFinanceCategory,
  updateFinanceCategory,
  deleteFinanceCategory,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../../services/db';
import { formatVND, formatDate } from '../../utils/formatters';
import Modal from '../common/Modal';
import FinanceReport from './FinanceReport';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Wallet,
  Tag,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  ListFilter,
  PieChart,
  Settings2,
} from 'lucide-react';

const todayStr = () => new Date().toISOString().slice(0, 10);

const SUB_TABS = [
  { id: 'transactions', label: 'Giao Dịch', icon: Receipt },
  { id: 'report', label: 'Báo Cáo', icon: PieChart },
  { id: 'categories', label: 'Danh Mục', icon: Settings2 },
];

// Reusable inline editor for simple name lists (Ví, Khoản mục thu/chi)
function EntityEditor({ title, subtitle, icon: Icon, items, onAdd, onRename, onDelete, placeholder }) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await onAdd(name);
    setNewName('');
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditValue(item.name);
  };

  const saveEdit = async () => {
    const name = editValue.trim();
    if (!name) return;
    await onRename(editId, name);
    setEditId(null);
    setEditValue('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <div>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-slate-400 font-normal">{subtitle}</p>}
        </div>
      </div>

      <div className="p-3 space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {editId === item.id ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-red-400 text-sm font-semibold focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 active:scale-90"
                  title="Lưu"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 active:scale-90"
                  title="Hủy"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 px-3 py-1.5 text-sm font-semibold text-slate-700 truncate">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90"
                  title="Sửa tên"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-90"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-400">Chưa có dữ liệu</p>
        )}
      </div>

      <form onSubmit={handleAdd} className="p-3 pt-0 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm</span>
        </button>
      </form>
    </div>
  );
}

// Category select with a quick "+ Thêm mới" entry at the top of the list
function CategoryPicker({ label, categories, value, onChange, onQuickAdd, placeholder }) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (e) => {
    if (e.target.value === '__new__') {
      setShowNew(true);
      return;
    }
    onChange(e.target.value);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      const created = await onQuickAdd(name);
      setNewName('');
      setShowNew(false);
      if (created?.id) onChange(created.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-bold text-slate-700 block mb-1">{label}</label>
      <select
        value={value}
        onChange={handleSelect}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-hidden focus:border-red-500"
      >
        <option value="__new__">+ Thêm mới khoản mục</option>
        <option value="">-- Không chọn --</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {showNew && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="flex-1 px-3 py-2 rounded-xl border border-red-400 text-sm font-semibold focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs active:scale-95 disabled:opacity-60"
          >
            {isSaving ? '...' : 'Thêm'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNew(false);
              setNewName('');
            }}
            className="px-2.5 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 active:scale-95"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}

export default function FinanceManager() {
  const [subTab, setSubTab] = useState('transactions');

  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Transaction filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [walletFilter, setWalletFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Transaction modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formType, setFormType] = useState('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formWallet, setFormWallet] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(todayStr);
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Khoản mục tách riêng cho thu và chi (bản ghi cũ thiếu type coi như khoản chi)
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const visibleCategories = formType === 'income' ? incomeCategories : expenseCategories;

  const walletName = (id) => wallets.find((w) => w.id === id)?.name || '—';
  const categoryName = (id) => categories.find((c) => c.id === id)?.name || '—';

  const loadRefData = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([getWallets(), getFinanceCategories()]);
      setWallets(w);
      setCategories(c);
    } catch (e) {
      console.error('Failed to load finance reference data:', e);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await getTransactions({
        type: typeFilter,
        wallet_id: walletFilter,
        category_id: categoryFilter,
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
      });
      setTransactions(data);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  }, [typeFilter, walletFilter, categoryFilter, fromDate, toDate]);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const openAdd = () => {
    setEditing(null);
    setFormType('expense');
    setFormAmount('');
    setFormWallet(wallets[0]?.id || '');
    setFormCategory(expenseCategories[0]?.id || '');
    setFormDate(todayStr());
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEdit = (tx) => {
    setEditing(tx);
    setFormType(tx.type || 'expense');
    setFormAmount(tx.amount?.toString() || '');
    setFormWallet(tx.wallet_id || '');
    setFormCategory(tx.category_id || '');
    setFormDate(tx.transaction_date || todayStr());
    setFormNotes(tx.notes || '');
    setIsModalOpen(true);
  };

  const handleFormTypeChange = (type) => {
    setFormType(type);
    const list = type === 'income' ? incomeCategories : expenseCategories;
    setFormCategory(list[0]?.id || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    if (!formWallet) {
      alert('Vui lòng chọn ví!');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      type: formType,
      amount: Number(formAmount),
      wallet_id: formWallet,
      category_id: formCategory || null,
      transaction_date: formDate,
      notes: formNotes.trim(),
    };
    try {
      if (editing) {
        await updateTransaction(editing.id, payload);
      } else {
        await createTransaction(payload);
      }
      setIsModalOpen(false);
      await loadTransactions();
    } catch (err) {
      alert('Lỗi lưu giao dịch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTx = async (tx) => {
    if (confirm(`Xóa giao dịch ${formatVND(tx.amount)} này?`)) {
      try {
        await deleteTransaction(tx.id);
        await loadTransactions();
      } catch (err) {
        alert('Lỗi xóa giao dịch: ' + err.message);
      }
    }
  };

  // --- Entity management handlers ---
  const handleAddWallet = async (name) => {
    await createWallet(name);
    await loadRefData();
  };
  const handleRenameWallet = async (id, name) => {
    await updateWallet(id, name);
    await loadRefData();
  };
  const handleDeleteWallet = async (item) => {
    if (confirm(`Xóa ví "${item.name}"?`)) {
      await deleteWallet(item.id);
      await loadRefData();
    }
  };

  const handleAddIncomeCategory = async (name) => {
    const created = await createFinanceCategory(name, 'income');
    await loadRefData();
    return created;
  };
  const handleAddExpenseCategory = async (name) => {
    const created = await createFinanceCategory(name, 'expense');
    await loadRefData();
    return created;
  };
  const handleRenameCategory = async (id, name) => {
    await updateFinanceCategory(id, name);
    await loadRefData();
  };
  const handleDeleteCategory = async (item) => {
    if (
      confirm(
        `Xóa khoản mục "${item.name}"?\nCác giao dịch cũ vẫn được giữ lại nhưng sẽ không còn khoản mục.`
      )
    ) {
      await deleteFinanceCategory(item.id);
      await loadRefData();
      await loadTransactions();
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Thu Chi Cá Nhân
          </h2>
          <p className="text-xs text-slate-500">
            Theo dõi dòng tiền theo ví và khoản mục thu/chi một cách đơn giản
          </p>
        </div>

        {subTab === 'transactions' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Giao Dịch</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* === TRANSACTIONS TAB === */}
      {subTab === 'transactions' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng Thu</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                {formatVND(totalIncome)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng Chi</span>
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-600 tracking-tight">
                {formatVND(totalExpense)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Số Dư</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  balance >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {formatVND(balance)}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'income', label: 'Khoản thu' },
                { id: 'expense', label: 'Khoản chi' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${
                    typeFilter === t.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={walletFilter}
                onChange={(e) => setWalletFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-hidden focus:border-red-500"
              >
                <option value="all">Tất cả ví</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-hidden focus:border-red-500"
              >
                <option value="all">Tất cả khoản mục</option>
                <option value="__none__">Chưa có khoản mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-hidden focus:border-red-500"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-sm font-black ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatVND(tx.amount)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {walletName(tx.wallet_id)}
                        </span>
                        {tx.category_id && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {categoryName(tx.category_id)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-slate-400">
                          {formatDate(tx.transaction_date)}
                        </span>
                        {tx.notes && (
                          <span className="text-xs text-slate-500 truncate">{tx.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90"
                      title="Sửa giao dịch"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTx(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-90"
                      title="Xóa giao dịch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {transactions.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Chưa có giao dịch nào phù hợp
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* === REPORT TAB === */}
      {subTab === 'report' && <FinanceReport wallets={wallets} categories={categories} />}

      {/* === CATEGORIES TAB === */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <EntityEditor
            title="Ví"
            subtitle="Nơi giữ tiền: tiền mặt, ngân hàng..."
            icon={Wallet}
            items={wallets}
            onAdd={handleAddWallet}
            onRename={handleRenameWallet}
            onDelete={handleDeleteWallet}
            placeholder="Tên ví mới..."
          />
          <EntityEditor
            title="Khoản Mục Thu"
            subtitle="Phân loại các khoản thu"
            icon={Tag}
            items={incomeCategories}
            onAdd={handleAddIncomeCategory}
            onRename={handleRenameCategory}
            onDelete={handleDeleteCategory}
            placeholder="Tên khoản mục thu mới..."
          />
          <EntityEditor
            title="Khoản Mục Chi"
            subtitle="Phân loại các khoản chi"
            icon={Tag}
            items={expenseCategories}
            onAdd={handleAddExpenseCategory}
            onRename={handleRenameCategory}
            onDelete={handleDeleteCategory}
            placeholder="Tên khoản mục chi mới..."
          />
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? 'Sửa Giao Dịch' : 'Thêm Giao Dịch Mới'}
          subtitle="Ghi nhận một khoản thu hoặc khoản chi"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFormTypeChange('income')}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                  formType === 'income'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Khoản Thu
              </button>
              <button
                type="button"
                onClick={() => handleFormTypeChange('expense')}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                  formType === 'expense'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Khoản Chi
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số tiền (VNĐ) *</label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                placeholder="VD: 150000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ví *</label>
              <select
                required
                value={formWallet}
                onChange={(e) => setFormWallet(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-hidden focus:border-red-500"
              >
                <option value="">-- Chọn ví --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <CategoryPicker
              label={formType === 'income' ? 'Khoản mục thu' : 'Khoản mục chi'}
              categories={visibleCategories}
              value={formCategory}
              onChange={setFormCategory}
              onQuickAdd={
                formType === 'income' ? handleAddIncomeCategory : handleAddExpenseCategory
              }
              placeholder={
                formType === 'income' ? 'Tên khoản mục thu mới...' : 'Tên khoản mục chi mới...'
              }
            />

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ngày *</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label>
              <textarea
                rows="2"
                placeholder="VD: Mua nguyên liệu, thu tiền bán hàng..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
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
                {isSubmitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
