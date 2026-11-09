import { LayoutGrid, UtensilsCrossed, Users, Receipt, BarChart3, Settings, UserCog, Grid2X2, History } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Navigation({ activeTab, onSelectTab, activeOrdersCount = 0 }) {
  const { currentUser, isAdmin, isManager } = useAuth();

  const allTabs = [
    {
      id: 'pos',
      label: 'Bán Hàng',
      icon: LayoutGrid,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      visible: true,
    },
    {
      id: 'history',
      label: 'Lịch Sử',
      icon: History,
      visible: true,
    },
    {
      id: 'menu',
      label: 'Thực Đơn',
      icon: UtensilsCrossed,
      visible: true,
    },
    {
      id: 'customers',
      label: 'Khách Hàng',
      icon: Users,
      visible: true,
    },
    {
      id: 'tables',
      label: 'Bàn Ăn',
      icon: Grid2X2,
      visible: isManager,
    },
    {
      id: 'expenses',
      label: 'Chi Phí',
      icon: Receipt,
      visible: isManager,
    },
    {
      id: 'reports',
      label: 'Báo Cáo',
      icon: BarChart3,
      visible: isManager,
    },
    {
      id: 'staff',
      label: 'Nhân Viên',
      icon: UserCog,
      visible: isAdmin,
    },
    {
      id: 'settings',
      label: 'Cài Đặt',
      icon: Settings,
      visible: isAdmin,
    },
  ];

  const visibleTabs = allTabs.filter((t) => t.visible);

  // Bottom bar only shows the 4 main tabs; the rest go into the drawer menu (Header)
  const mainTabIds = ['pos', 'menu', 'customers', 'tables'];
  const bottomTabs = visibleTabs.filter((t) => mainTabIds.includes(t.id));

  return (
    <>
      {/* Mobile Bottom Bar (Screen < 768px) */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-1 pb-safe">
        <div className="flex items-center justify-around overflow-x-auto no-scrollbar py-1">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-red-600 font-bold'
                    : 'text-slate-500 hover:text-slate-700 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-white">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-[62px]">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-4 h-0.5 bg-red-600 rounded-full mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop / Tablet Sub-header Navigation (Screen >= 768px) */}
      <nav className="no-print hidden md:block bg-slate-50 border-b border-slate-200 px-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 py-1.5 overflow-x-auto no-scrollbar">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-2 bg-red-800 text-white text-[9px] font-black px-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
