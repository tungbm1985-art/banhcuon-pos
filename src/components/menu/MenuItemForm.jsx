import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useDialog } from '../../contexts/DialogContext';
import {
  DEFAULT_KITCHEN_STATION,
  getDefaultKitchenStation,
  KITCHEN_STATIONS,
} from '../../utils/kitchenStations';

export default function MenuItemForm({
  isOpen,
  onClose,
  initialData = null,
  categories = [],
  onSave,
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Bánh Cuốn');
  const [kitchenStation, setKitchenStation] = useState(DEFAULT_KITCHEN_STATION);
  const [isAvailable, setIsAvailable] = useState(true);
  const [customCategory, setCustomCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useDialog();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPrice(initialData.price?.toString() || '');
      setCategory(initialData.category || 'Bánh Cuốn');
      setKitchenStation(
        initialData.kitchen_station || getDefaultKitchenStation(initialData)
      );
      setIsAvailable(initialData.is_available !== false);
    } else {
      setName('');
      setPrice('');
      setCategory(categories[0] || 'Bánh Cuốn');
      setKitchenStation(
        getDefaultKitchenStation({ category: categories[0] || 'Bánh Cuốn' })
      );
      setIsAvailable(true);
      setCustomCategory('');
    }
  }, [initialData, isOpen, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCategory = category === '__new__' ? customCategory.trim() : category;
    if (!finalCategory) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        name: name.trim(),
        price: Number(price) || 0,
        category: finalCategory,
        kitchen_station: kitchenStation,
        is_available: isAvailable,
      });
      onClose();
    } catch (err) {
      showAlert('Lỗi khi lưu món: ' + err.message, { variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Chỉnh Sửa Món' : 'Thêm Món Mới'}
      subtitle="Quản lý thực đơn Bánh Cuốn Thanh Hóa"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Tên món ăn / thức uống *
          </label>
          <input
            type="text"
            required
            placeholder="VD: Bánh Cuốn Trứng Hấp Lòng Đào..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Giá bán (VNĐ) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="1000"
            placeholder="VD: 35000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Nhóm thực đơn / Danh mục *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 bg-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__new__">+ Thêm nhóm mới...</option>
          </select>
        </div>

        {category === '__new__' && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên nhóm mới
            </label>
            <input
              type="text"
              required
              placeholder="VD: Tráng miệng, Trà giải nhiệt..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Bếp phụ trách *
          </label>
          <select
            required
            value={kitchenStation}
            onChange={(e) => setKitchenStation(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 bg-white"
          >
            {KITCHEN_STATIONS.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-sm font-bold text-slate-800 block">
              Trạng thái phục vụ
            </span>
            <span className="text-xs text-slate-500">
              {isAvailable ? 'Đang còn hàng phục vụ khách' : 'Tạm thời hết hàng'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md active:scale-95"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu Món'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
