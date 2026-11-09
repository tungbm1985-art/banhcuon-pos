import { useState, useMemo } from 'react';
import { formatVND } from '../../utils/formatters';
import { ShoppingBag, Users, Clock, Plus, UtensilsCrossed, CheckCircle2, Trash2 } from 'lucide-react';

export default function TableMap({
  tables = [],
  activeOrders = [],
  onSelectTable,
  onQuickAddTakeaway,
  onDeleteTable,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'dine_in' | 'takeaway'
  const [selectedZone, setSelectedZone] = useState('all');

  // Map active order to table ID
  const activeOrdersByTableId = useMemo(() => {
    const map = {};
    activeOrders.forEach((order) => {
      if (order.table_id) {
        map[order.table_id] = order;
      }
    });
    return map;
  }, [activeOrders]);

  // Extract zones (excluding Takeaway)
  const zones = useMemo(() => {
    const set = new Set();
    tables.forEach((t) => {
      if (t.zone && t.zone !== 'Takeaway') {
        set.add(t.zone);
      }
    });
    return Array.from(set);
  }, [tables]);

  // Separate takeaway slots and dine-in tables
  const takeawayTables = useMemo(() => {
    return tables.filter((t) => t.zone === 'Takeaway');
  }, [tables]);

  const dineInTables = useMemo(() => {
    return tables.filter((t) => t.zone !== 'Takeaway');
  }, [tables]);

  // Filtered dine-in tables
  const filteredDineIn = useMemo(() => {
    return dineInTables.filter((t) => {
      if (selectedZone !== 'all' && t.zone !== selectedZone) return false;
      return true;
    });
  }, [dineInTables, selectedZone]);

  // Calculate statistics
  const totalOccupied = tables.filter((t) => t.status === 'occupied').length;
  const totalAvailable = tables.length - totalOccupied;
  const totalServingRevenue = activeOrders.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Top Quick Status Overview Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Bàn trống</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
            {totalAvailable}
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-slate-500 font-medium">Đang ăn / Bận</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-red-600 mt-0.5">
            {totalOccupied}
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-500 font-medium">Tổng tiền phục vụ</span>
          </div>
          <div className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 truncate">
            {formatVND(totalServingRevenue)}
          </div>
        </div>
      </div>

      {/* FIXED TAKEAWAY SECTION ON TOP */}
      {(filterType === 'all' || filterType === 'takeaway') && takeawayTables.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
                🛍️ Đơn Mang Về (Takeaway Cấp Tốc)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-800 hidden sm:inline">
                {takeawayTables.filter((t) => t.status === 'occupied').length} đang chờ
              </span>
              {onQuickAddTakeaway && (
                <button
                  type="button"
                  onClick={onQuickAddTakeaway}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs active:scale-95 transition-all"
                  title="Thêm nhanh đơn mang về mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm đơn mang về</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
            {takeawayTables.map((t) => {
              const order = activeOrdersByTableId[t.id];
              const isOccupied = t.status === 'occupied';

              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTable(t, order)}
                  className={`group relative p-3 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[92px] ${
                    isOccupied
                      ? 'bg-amber-100 border-amber-300 shadow-xs'
                      : 'bg-white border-amber-200/80 hover:border-amber-400 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-slate-900 truncate pr-1">
                      {t.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isOccupied && takeawayTables.length > 2 && onDeleteTable && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Xóa ô mang về "${t.name}"?`)) {
                              onDeleteTable(t.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-opacity"
                          title="Xóa ô mang về này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </span>
                      )}
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isOccupied ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {isOccupied && order ? (
                    <div className="mt-1">
                      <div className="text-xs font-black text-red-600 truncate">
                        {formatVND(order.total_amount)}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{order.order_items?.length || 0} món</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo đơn mang về</span>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Quick Add Card at the end of takeaway list */}
            {onQuickAddTakeaway && (
              <button
                type="button"
                onClick={onQuickAddTakeaway}
                className="p-3 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-100/40 hover:bg-amber-100/70 text-amber-800 transition-all active:scale-95 flex flex-col items-center justify-center min-h-[92px] text-center"
              >
                <div className="w-7 h-7 rounded-full bg-amber-200/80 flex items-center justify-center text-amber-800 mb-1">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">
                  + Thêm mang về
                </span>
                <span className="text-[10px] text-amber-600">Thêm ô mới</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* DINE-IN FILTER & ZONE PILLS */}
      {(filterType === 'all' || filterType === 'dine_in') && (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedZone('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
                  selectedZone === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tất cả bàn ({dineInTables.length})
              </button>

              {zones.map((zone) => {
                const count = dineInTables.filter((t) => t.zone === zone).length;
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
                      selectedZone === zone
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {zone} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* DINE-IN TABLE GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {filteredDineIn.map((t) => {
              const order = activeOrdersByTableId[t.id];
              const isOccupied = t.status === 'occupied';

              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTable(t, order)}
                  className={`group relative text-left p-3.5 rounded-2xl border-2 transition-all active:scale-95 flex flex-col justify-between min-h-[112px] shadow-2xs ${
                    isOccupied
                      ? 'bg-red-50/80 border-red-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  {/* Status dot / badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.zone}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOccupied ? 'bg-red-600 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                      {isOccupied ? 'Có khách' : 'Trống'}
                    </span>
                  </div>

                  {/* Table Name */}
                  <div className="my-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {t.name}
                    </h3>
                  </div>

                  {/* Table Footer info */}
                  {isOccupied && order ? (
                    <div className="pt-1.5 border-t border-red-200/60">
                      <div className="text-sm font-black text-red-600 truncate">
                        {formatVND(order.total_amount)}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>{order.order_items?.length || 0} món</span>
                        {order.customers && (
                          <span className="truncate max-w-[80px] font-semibold text-slate-700">
                            {order.customers.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Vào bàn / Mở đơn</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filteredDineIn.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Không có bàn nào trong khu vực này</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
