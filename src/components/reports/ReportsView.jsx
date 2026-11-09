import { useState, useEffect, useMemo, useCallback } from 'react';
import { getOrdersHistory, getExpenses } from '../../services/db';
import { formatVND } from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Award,
  Calendar,
  CreditCard,
  Banknote,
  PieChart,
} from 'lucide-react';

const getInitialDate = () => new Date().toISOString().slice(0, 10);

export default function ReportsView() {
  const [timeFilter, setTimeFilter] = useState('today'); // 'today' | 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState(getInitialDate);
  const [customEnd, setCustomEnd] = useState(getInitialDate);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Compute date range
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (timeFilter === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (timeFilter === 'week') {
      const start = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: todayStr,
      };
    }
    if (timeFilter === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: todayStr,
      };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [timeFilter, customStart, customEnd]);

  const loadReportData = useCallback(async () => {
    try {
      const [allOrders, allExpenses] = await Promise.all([
        getOrdersHistory({ startDate, endDate, status: 'completed' }),
        getExpenses({ startDate, endDate }),
      ]);
      setOrders(allOrders);
      setExpenses(allExpenses);
    } catch (e) {
      console.error('Failed to load report data:', e);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Aggregated calculations
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const netProfit = totalRevenue - totalExpenses;
  const totalOrdersCount = orders.length;

  // Payment methods breakdown
  const paymentStats = useMemo(() => {
    let cash = 0;
    let vietqr = 0;
    orders.forEach((o) => {
      const amt = Number(o.total_amount) || 0;
      if (o.payment_method === 'vietqr') {
        vietqr += amt;
      } else {
        cash += amt;
      }
    });
    return { cash, vietqr };
  }, [orders]);

  // Top selling items ranking
  const topSellingItems = useMemo(() => {
    const itemMap = {};
    orders.forEach((order) => {
      (order.order_items || []).forEach((item) => {
        const name = item.item_name;
        if (!itemMap[name]) {
          itemMap[name] = { name, quantity: 0, revenue: 0 };
        }
        itemMap[name].quantity += Number(item.quantity) || 1;
        itemMap[name].revenue += (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
      });
    });

    return Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  // Max value for visual bar comparison
  const maxFinancial = Math.max(totalRevenue, totalExpenses, 1);
  const revenuePercent = Math.round((totalRevenue / maxFinancial) * 100);
  const expensePercent = Math.round((totalExpenses / maxFinancial) * 100);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Báo Cáo & Thống Kê Doanh Thu
          </h2>
          <p className="text-xs text-slate-500">
            Tổng hợp doanh thu, chi phí, lợi nhuận và xếp hạng món bán chạy
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'month', label: 'Tháng này' },
            { id: 'custom', label: 'Tùy chọn' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${
                timeFilter === item.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {timeFilter === 'custom' && (
        <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 animate-in fade-in">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Từ:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 font-semibold"
          />
          <span className="text-xs font-bold text-slate-600">Đến:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 font-semibold"
          />
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh Thu</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
            {formatVND(totalRevenue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Từ {totalOrdersCount} đơn hoàn tất
          </span>
        </div>

        {/* Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Chi Phí</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600 tracking-tight">
            {formatVND(totalExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.length} khoản chi phí
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Lợi Nhuận Ròng</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netProfit >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${
            netProfit >= 0 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {formatVND(netProfit)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            = Doanh thu - Chi phí
          </span>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Số Đơn Hàng</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {totalOrdersCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Trung bình: {totalOrdersCount > 0 ? formatVND(totalRevenue / totalOrdersCount) : '0đ'}/đơn
          </span>
        </div>
      </div>

      {/* Visual Comparison: Revenue vs Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Financial Balance Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            <span>So Sánh Thu vs Chi</span>
          </h3>

          <div className="space-y-3 pt-1">
            {/* Revenue bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-emerald-700">Doanh thu bán hàng</span>
                <span>{formatVND(totalRevenue)}</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${revenuePercent}%` }}
                />
              </div>
            </div>

            {/* Expense bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-red-600">Tổng chi phí vận hành</span>
                <span>{formatVND(totalExpenses)}</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${expensePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Breakdown summary notes */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-slate-500 block text-[11px]">Tỷ suất lợi nhuận</span>
              <span className="font-bold text-slate-900">
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-slate-500 block text-[11px]">Chi phí / Doanh thu</span>
              <span className="font-bold text-slate-900">
                {totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span>Phương Thức Thanh Toán</span>
          </h3>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Tiền Mặt</span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                {formatVND(paymentStats.cash)}
              </div>
              <span className="text-[10px] text-slate-400">
                {totalRevenue > 0 ? `${Math.round((paymentStats.cash / totalRevenue) * 100)}% tổng thu` : '0%'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>VietQR Chuyển Khoản</span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                {formatVND(paymentStats.vietqr)}
              </div>
              <span className="text-[10px] text-slate-400">
                {totalRevenue > 0 ? `${Math.round((paymentStats.vietqr / totalRevenue) * 100)}% tổng thu` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top-selling Items Ranking List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
              Xếp Hạng Món Bán Chạy (Hỗ trợ chuẩn bị nguyên liệu)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {topSellingItems.length} món đã bán
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {topSellingItems.map((item, idx) => (
            <div
              key={item.name}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-900 shadow-2xs'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-900'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>

                <div className="truncate">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {item.name}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Doanh số: {formatVND(item.revenue)}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm font-black text-red-600">
                  {item.quantity} suất
                </span>
              </div>
            </div>
          ))}

          {topSellingItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Chưa có đơn hàng nào trong khoảng thời gian đã chọn
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
