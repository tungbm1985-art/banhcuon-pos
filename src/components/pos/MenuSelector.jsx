import { useState, useMemo } from 'react';
import { formatVND } from '../../utils/formatters';
import { Search, Plus, Ban, Check } from 'lucide-react';

export default function MenuSelector({ menuItems = [], cartItems = [], onAddToCart }) {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract categories dynamically
  const categories = useMemo(() => {
    const set = new Set(['Tất cả']);
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Map cart item quantities
  const cartQtyMap = useMemo(() => {
    const map = {};
    cartItems.forEach((ci) => {
      const key = ci.menu_item_id || ci.id;
      map[key] = (map[key] || 0) + ci.quantity;
    });
    return map;
  }, [cartItems]);

  return (
    <div className="flex flex-col h-full">
      {/* Search & Category Pills */}
      <div className="space-y-2 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm nhanh món bánh cuốn, đồ uống..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:outline-hidden focus:border-red-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Menu Items */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-1 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {filteredItems.map((item) => {
            const isAvailable = item.is_available !== false;
            const currentQty = cartQtyMap[item.id] || 0;

            return (
              <button
                key={item.id}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onAddToCart(item)}
                className={`group relative text-left p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between min-h-[96px] active:scale-95 ${
                  !isAvailable
                    ? 'bg-slate-100/80 border-dashed border-slate-300 opacity-60 cursor-not-allowed filter grayscale'
                    : currentQty > 0
                    ? 'bg-red-50/70 border-red-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-xs'
                }`}
              >
                {/* Quantity Badge if in cart */}
                {currentQty > 0 && isAvailable && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {currentQty}
                  </span>
                )}

                {/* Out of Stock Ribbon / Overlay */}
                {!isAvailable && (
                  <div className="absolute inset-0 bg-slate-900/10 rounded-2xl flex items-center justify-center pointer-events-none">
                    <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Hết hàng
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                    {item.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                    {item.name}
                  </h4>
                </div>

                <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs sm:text-sm font-black text-red-600">
                    {formatVND(item.price)}
                  </span>
                  {isAvailable && (
                    <div className="w-6 h-6 rounded-lg bg-red-100 group-hover:bg-red-600 text-red-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm">Không tìm thấy món nào phù hợp</p>
          </div>
        )}
      </div>
    </div>
  );
}
