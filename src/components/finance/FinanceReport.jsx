import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTransactions } from '../../services/db';
import { formatVND } from '../../utils/formatters';
import { Calendar, TrendingUp, TrendingDown, Scale, Wallet, Tag } from 'lucide-react';

const todayStr = () => new Date().toISOString().slice(0, 10);

function computeRange(filter, customStart, customEnd) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  if (filter === 'today') return { startDate: todayISO, endDate: todayISO };
  if (filter === 'week') {
    const start = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start.setDate(diff);
    return { startDate: start.toISOString().slice(0, 10), endDate: todayISO };
  }
  if (filter === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: todayISO };
  }
  if (filter === 'year') {
    const start = new Date(today.getFullYear(), 0, 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: todayISO };
  }
  return { startDate: customStart, endDate: customEnd };
}

const FILTERS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'year', label: 'Năm nay' },
  { id: 'custom', label: 'Từ ngày - đến ngày' },
];

export default function FinanceReport({ wallets = [], categories = [] }) {
  const [timeFilter, setTimeFilter] = useState('month');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [transactions, setTransactions] = useState([]);

  const { startDate, endDate } = useMemo(
    () => computeRange(timeFilter, customStart, customEnd),
    [timeFilter, customStart, customEnd]
  );

  const loadData = useCallback(async () => {
    try {
      const data = await getTransactions({ startDate, endDate });
      setTransactions(data);
    } catch (e) {
      console.error('Failed to load finance report:', e);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else expense += amt;
    });
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [transactions]);

  // Aggregate income/expense into rows keyed by wallet and category
  const { byWallet, byCategory } = useMemo(() => {
    const wMap = {};
    const cMap = {};

    const upsert = (map, key, label, isIncome, amt) => {
      if (!map[key]) map[key] = { label, income: 0, expense: 0 };
      if (isIncome) map[key].income += amt;
      else map[key].expense += amt;
    };

    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const isIncome = t.type === 'income';

      const wLabel = wallets.find((w) => w.id === t.wallet_id)?.name || 'Không xác định';
      const cLabel = categories.find((c) => c.id === t.category_id)?.name || 'Không có khoản mục';

      upsert(wMap, t.wallet_id || '__none__', wLabel, isIncome, amt);
      upsert(cMap, t.category_id || '__none__', cLabel, isIncome, amt);
    });

    const sortRows = (map) =>
      Object.values(map).sort((a, b) => b.income + b.expense - (a.income + a.expense));

    return { byWallet: sortRows(wMap), byCategory: sortRows(cMap) };
  }, [transactions, wallets, categories]);

  const renderBreakdownCard = (title, icon, rows, showIncome = true) => {
    const Icon = icon;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
            {title}
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.label} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700 truncate">{r.label}</span>
              <div className="text-right shrink-0">
                {showIncome && r.income > 0 && (
                  <span className="text-xs font-bold text-emerald-600 block">
                    +{formatVND(r.income)}
                  </span>
                )}
                {r.expense > 0 && (
                  <span className="text-xs font-bold text-red-600 block">
                    -{formatVND(r.expense)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-400 text-xs">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Time Filter */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTimeFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${
              timeFilter === f.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {timeFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 animate-in fade-in">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Từ:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold"
          />
          <span className="text-xs font-bold text-slate-600">Đến:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold"
          />
        </div>
      )}

      {/* Summary Cards */}
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
            <span className="text-xs font-bold uppercase tracking-wider">Chênh Lệch</span>
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
          <span className="text-[11px] text-slate-400 mt-1 block">= Tổng thu - Tổng chi</span>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderBreakdownCard('Theo Ví', Wallet, byWallet)}
        {renderBreakdownCard('Theo Khoản Mục', Tag, byCategory)}
      </div>

      {/* Transaction count note */}
      <p className="text-center text-[11px] text-slate-400">
        Thống kê từ {transactions.length} giao dịch trong khoảng đã chọn
      </p>
    </div>
  );
}
