import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { isUsingSupabase } from '../../services/db';
import { LogOut, RefreshCw, Menu, X, History, BarChart3, Receipt, UserCog, Settings, Wallet } from 'lucide-react';

export default function Header({ onRefresh, activeTab, onSelectTab }) {
  const { currentUser, logout, isAdmin, isManager } = useAuth();
  const { settings } = useSettings();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const usingSupabase = isUsingSupabase();

  // Secondary navigation items (shown in the drawer opened by the hamburger button)
  const drawerItems = [
    { id: 'history', label: 'Lịch Sử', icon: History, visible: true },
    { id: 'reports', label: 'Báo Cáo', icon: BarChart3, visible: isManager },
    { id: 'expenses', label: 'Chi Phí', icon: Receipt, visible: isManager },
    { id: 'staff', label: 'Nhân Viên', icon: UserCog, visible: isAdmin },
    { id: 'settings', label: 'Cài Đặt', icon: Settings, visible: isAdmin },
    { id: 'finance', label: 'Thu Chi Cá Nhân', icon: Wallet, visible: isAdmin },
  ].filter((item) => item.visible);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: '👑 Chủ quán', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'manager':
        return { label: '👔 Quản lý', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { label: '💼 Nhân viên', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
  };

  const currentBadge = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className="no-print sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-amber-500 border-b border-orange-600/30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
        {/* Left: Hamburger menu button & Brand */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all"
            title="Mở menu"
            aria-label="Mở menu"
          >
            <Menu className="w-6 h-6" strokeWidth={2.2} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight text-white drop-shadow-sm">
                {settings.store_info?.name || 'BÁNH CUỐN THANH HÓA'}
              </h1>
              {usingSupabase ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Supabase Realtime
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/90 text-amber-700 border border-amber-200" title="Chưa kết nối Supabase, dữ liệu lưu cục bộ">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Offline/Local
                </span>
              )}
            </div>
            <p className="text-xs text-white/80 hidden sm:block truncate max-w-xs">
              {settings.store_info?.slogan || 'Đặc sản gia truyền - Tráng tay nóng hổi'}
            </p>
          </div>
        </div>

        {/* Right: Refresh & Current User / Role Switcher */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* User selector */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-white/40 bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-white text-orange-600 flex items-center justify-center font-bold text-xs shadow-sm">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight drop-shadow-sm">
                  {currentUser?.full_name || 'Đăng nhập'}
                </div>
                <div className="text-[10px] text-white/80">
                  {currentBadge?.label}
                </div>
              </div>
            </button>

            {/* Backdrop to close menu when clicking anywhere outside */}
            {showUserDropdown && (
              <div
                className="fixed inset-0 z-40 bg-black/10 cursor-pointer"
                onClick={() => setShowUserDropdown(false)}
              />
            )}

            {/* Account details and sign out */}
            {showUserDropdown && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">Tài khoản đang đăng nhập</p>
                  <p className="text-sm font-bold text-slate-800">{currentUser?.full_name}</p>
                  <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${currentBadge?.bg}`}>
                    {currentBadge?.label}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 px-3 pb-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Menu (secondary navigation) */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[80%] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-tr from-red-600 to-amber-500 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                  🥟
                </div>
                <div>
                  <div className="text-sm font-black leading-tight">
                    {settings.store_info?.name || 'BÁNH CUỐN THANH HÓA'}
                  </div>
                  <div className="text-[10px] text-white/80">Danh mục khác</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer items */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Drawer footer */}
            <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-400 text-center">
              {currentUser?.full_name && `Đang đăng nhập: ${currentUser.full_name}`}
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
