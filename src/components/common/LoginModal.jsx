import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen = true }) {
  const { login, staffList } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu!');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await login(username.trim(), password.trim());
    } catch (err) {
      setError(err.message || 'Sai tên đăng nhập hoặc mật khẩu!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (uname, pwd) => {
    setUsername(uname);
    setPassword(pwd);
    setError('');
    setIsLoading(true);
    try {
      await login(uname, pwd);
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-tr from-red-600 to-amber-600 p-6 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            🥟
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            BÁNH CUỐN THANH HÓA
          </h2>
          <p className="text-xs text-red-100 mt-1">
            Đăng nhập hệ thống Bán hàng & Thu ngân (POS)
          </p>
        </div>

        {/* Form */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Nhập tên đăng nhập..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
            </button>
          </form>

          {/* Quick test accounts for easy trial */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Tài khoản mẫu thử nghiệm nhanh:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', '123')}
                className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 text-center active:scale-95"
              >
                👑 Chủ quán
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('quanly', '123')}
                className="py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200 text-center active:scale-95"
              >
                👔 Quản lý
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('nhanvien', '123')}
                className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 text-center active:scale-95"
              >
                💼 Nhân viên
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
