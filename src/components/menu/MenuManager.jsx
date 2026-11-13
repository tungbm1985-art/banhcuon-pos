import { useState, useMemo } from 'react';
import MenuItemForm from './MenuItemForm';
import { formatVND } from '../../utils/formatters';
import { getDefaultKitchenStation } from '../../utils/kitchenStations';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';

export default function MenuManager({
  menuItems = [],
  onToggleAvailability,
  onSaveMenuItem,
  onDeleteMenuItem,
}) {
  const { isManager } = useAuth();
  const { showConfirm } = useDialog();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Group categories
  const categories = useMemo(() => {
    const set = new Set();
    menuItems.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Grouped items map
  const groupedItems = useMemo(() => {
    const filtered = menuItems.filter((it) => {
      const matchCat = selectedCategory === 'all' || it.category === selectedCategory;
      const matchSearch =
        !search || it.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    const groups = {};
    filtered.forEach((it) => {
      const cat = it.category || 'Khác';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
    return groups;
  }, [menuItems, selectedCategory, search]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(`Bạn có chắc muốn xóa món "${item.name}" khỏi thực đơn?`, {
      variant: 'danger',
      title: 'Xoá món khỏi thực đơn',
      confirmText: 'Đồng ý xoá',
    });
    if (confirmed) {
      onDeleteMenuItem(item.id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Quản Lý Thực Đơn
          </h2>
          <p className="text-xs text-slate-500">
            Bật/tắt nhanh trạng thái hết hàng trực tiếp & chỉnh sửa món
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Món Mới</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm món bánh cuốn, nước uống..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Category Sections */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([categoryName, items]) => (
          <div key={categoryName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            {/* Category header */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                {categoryName}
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {items.length} món
              </span>
            </div>

            {/* Items List */}
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const isAvailable = item.is_available !== false;

                return (
                  <div
                    key={item.id}
                    className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                      !isAvailable ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold truncate ${
                            !isAvailable ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {item.name}
                        </h4>
                        {!isAvailable && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Hết hàng
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-red-600 mt-0.5">
                        {formatVND(item.price)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-1">
                        {item.kitchen_station || getDefaultKitchenStation(item)}
                      </div>
                    </div>

                    {/* Quick "Hết hàng" toggle switch */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                          {isAvailable ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer" title="Bật/tắt nhanh hết hàng">
                          <input
                            type="checkbox"
                            checked={isAvailable}
                            onChange={(e) => onToggleAvailability(item.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {/* Edit / Delete actions for Managers */}
                      {isManager && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90"
                            title="Chỉnh sửa món"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-90"
                            title="Xóa món"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(groupedItems).length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <p className="text-sm">Không tìm thấy món ăn nào!</p>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <MenuItemForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          initialData={editingItem}
          categories={categories}
          onSave={onSaveMenuItem}
        />
      )}
    </div>
  );
}
