import { useState, useEffect } from 'react';
import { getStaffList, createStaff, updateStaff, deleteStaff } from '../../services/db';
import { UserPlus, Shield, UserCog, Trash2, Edit2, Key, CheckCircle, ShieldAlert } from 'lucide-react';
import Modal from '../common/Modal';
import { useDialog } from '../../contexts/DialogContext';

export default function StaffManager() {
  const { showAlert, showConfirm } = useDialog();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getStaffList();
      setStaff(data);
    } catch (e) {
      console.error('Failed to load staff:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setRole('staff');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStaff(s);
    setFullName(s.full_name);
    setUsername(s.username);
    setPassword('');
    setRole(s.role);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;

    if (!editingStaff && !password.trim()) {
      showAlert('Vui lòng nhập mật khẩu cho nhân viên mới!', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const updates = {
          full_name: fullName.trim(),
          role,
        };
        if (password.trim()) {
          updates.password = password.trim();
        }
        await updateStaff(editingStaff.id, updates);
      } else {
        await createStaff({
          full_name: fullName.trim(),
          username: username.trim(),
          password: password.trim(),
          role,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      showAlert('Lỗi: ' + err.message, { variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (s) => {
    if (s.username === 'admin') {
      showAlert('Không thể xóa tài khoản Quản trị viên cấp cao (Admin)!', { variant: 'warning' });
      return;
    }

    const confirmed = await showConfirm(`Bạn có chắc muốn xóa nhân viên "${s.full_name}"?`, {
      variant: 'danger',
      title: 'Xoá nhân viên',
      confirmText: 'Đồng ý xoá',
    });
    if (confirmed) {
      try {
        await deleteStaff(s.id);
        await loadData();
      } catch (err) {
        showAlert(err.message, { variant: 'danger' });
      }
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return { label: '👑 Chủ quán (Admin)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'manager':
        return { label: '👔 Quản lý (Manager)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { label: '💼 Nhân viên (Staff)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Quản Lý Nhân Viên & Phân Quyền (RBAC)
          </h2>
          <p className="text-xs text-slate-500">
            Phân quyền 3 cấp bậc: Chủ quán, Quản lý ca, Nhân viên
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm Nhân Viên</span>
        </button>
      </div>

      {/* Roles explanation card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
          <span className="font-black text-amber-800 flex items-center gap-1">
            👑 Chủ Quán (Admin)
          </span>
          <p className="text-slate-500">Toàn quyền: Bán hàng, Báo cáo, Chi phí, Cài đặt hệ thống, Quản lý nhân viên.</p>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
          <span className="font-black text-blue-800 flex items-center gap-1">
            👔 Quản Lý (Manager)
          </span>
          <p className="text-slate-500">Bán hàng, sửa thực đơn, quản lý bàn, ghi chép chi phí & xem báo cáo doanh thu.</p>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
          <span className="font-black text-emerald-800 flex items-center gap-1">
            💼 Nhân Viên (Staff)
          </span>
          <p className="text-slate-500">Phục vụ kiêm thu ngân: Gọi món, thanh toán bill, tích điểm và bật/tắt nhanh hết hàng.</p>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
        {staff.map((s) => {
          const badge = getRoleBadge(s.role);

          return (
            <div
              key={s.id}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">
                  {s.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {s.full_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-500">
                      @{s.username}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(s)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-90"
                  title="Chỉnh sửa nhân viên"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {s.username !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-90"
                    title="Xóa nhân viên"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingStaff ? 'Sửa Thông Tin Nhân Viên' : 'Thêm Nhân Viên Mới'}
          subtitle="Tài khoản truy cập hệ thống POS"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Họ và tên nhân viên *
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn Cường"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên đăng nhập (Username) *
              </label>
              <input
                type="text"
                required
                disabled={!!editingStaff}
                placeholder="VD: cuongnv"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {editingStaff ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu đăng nhập *'}
              </label>
              <input
                type="password"
                required={!editingStaff}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Vai trò / Phân quyền *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 bg-white"
              >
                <option value="staff">💼 Nhân viên (Staff)</option>
                <option value="manager">👔 Quản lý (Manager)</option>
                <option value="admin">👑 Chủ quán (Admin)</option>
              </select>
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
                {isSubmitting ? 'Đang lưu...' : 'Lưu Tài Khoản'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
