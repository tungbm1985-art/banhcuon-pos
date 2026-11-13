import { useState } from 'react';
import { formatVND } from '../../utils/formatters';
import { Plus, Edit2, Trash2, Grid2X2, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import { useDialog } from '../../contexts/DialogContext';

export default function TableManager({
  tables = [],
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
}) {
  const { showAlert, showConfirm } = useDialog();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [zone, setZone] = useState('Tầng 1');
  const [customZone, setCustomZone] = useState('');
  const [displayOrder, setDisplayOrder] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingZones = Array.from(
    new Set(tables.map((t) => t.zone).filter(Boolean))
  );

  const handleOpenAdd = () => {
    setEditingTable(null);
    setName('');
    setZone(existingZones[0] || 'Tầng 1');
    setCustomZone('');
    setDisplayOrder((tables.length + 1).toString());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTable(t);
    setName(t.name);
    setZone(t.zone || 'Tầng 1');
    setCustomZone('');
    setDisplayOrder(t.display_order?.toString() || '10');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalZone = zone === '__new__' ? customZone.trim() : zone;
    if (!finalZone) return;

    setIsSubmitting(true);
    try {
      if (editingTable) {
        await onUpdateTable(editingTable.id, {
          name: name.trim(),
          zone: finalZone,
          display_order: Number(displayOrder) || 10,
        });
      } else {
        await onCreateTable({
          name: name.trim(),
          zone: finalZone,
          display_order: Number(displayOrder) || 10,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      showAlert('Lỗi lưu bàn: ' + err.message, { variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (t) => {
    if (t.status === 'occupied') {
      showAlert('Không thể xóa bàn đang có khách ngồi hoặc đơn hàng chưa hoàn tất!', {
        variant: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm(`Bạn có chắc muốn xóa bàn "${t.name}"?`, {
      variant: 'danger',
      title: 'Xoá bàn',
      confirmText: 'Đồng ý xoá',
    });
    if (confirmed) {
      try {
        await onDeleteTable(t.id);
      } catch (err) {
        showAlert(err.message, { variant: 'danger' });
      }
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Quản Lý Bàn Ăn & Vị Trí
          </h2>
          <p className="text-xs text-slate-500">
            Thêm mới, sửa tên khu vực hoặc xóa bàn (Bảo vệ an toàn khi bàn đang có khách)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Bàn Mới</span>
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {tables.map((t) => {
          const isOccupied = t.status === 'occupied';

          return (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isOccupied
                  ? 'bg-red-50/70 border-red-300'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Khu vực: {t.zone} (STT: {t.display_order || 0})
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {t.name}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOccupied
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isOccupied ? 'Có khách' : 'Trống'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(t)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-90"
                  title="Sửa bàn"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  disabled={isOccupied}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                  title={isOccupied ? 'Bàn đang có khách, không thể xóa' : 'Xóa bàn'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTable ? 'Chỉnh Sửa Bàn' : 'Thêm Bàn Mới'}
          subtitle="Sơ đồ bàn Bánh Cuốn Thanh Hóa"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên bàn / Ô mang về *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Bàn 07 hoặc 🛍️ Mang Về 05..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Khu vực (Zone) *
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 bg-white"
              >
                {existingZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
                <option value="Takeaway">Takeaway (Mang về)</option>
                <option value="__new__">+ Tạo khu vực mới...</option>
              </select>
            </div>

            {zone === '__new__' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên khu vực mới
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tầng 2, Sân vườn..."
                  value={customZone}
                  onChange={(e) => setCustomZone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
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
                {isSubmitting ? 'Đang lưu...' : 'Lưu Bàn'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
