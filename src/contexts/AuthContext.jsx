import { createContext, useContext, useState, useEffect } from 'react';
import { authenticateStaff, getStaffList } from '../services/db';

const AuthContext = createContext();

const ROLE_RANKS = {
  admin: 3,
  manager: 2,
  staff: 1,
};

const DEFAULT_ADMIN = {
  id: 's-01',
  full_name: 'Chủ Quán (Admin)',
  username: 'admin',
  role: 'admin',
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('banhcuon_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [staffList, setStaffList] = useState([]);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const list = await getStaffList();
      setStaffList(list);
    } catch (e) {
      console.error('Error loading staff list:', e);
    }
  }

  const login = async (username, password) => {
    const user = await authenticateStaff(username, password);
    if (!user) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu!');
    }
    setCurrentUser(user);
    localStorage.setItem('banhcuon_current_user', JSON.stringify(user));
    return user;
  };

  const switchAccount = (user) => {
    setCurrentUser(user);
    localStorage.setItem('banhcuon_current_user', JSON.stringify(user));
  };

  const logout = () => {
    localStorage.removeItem('banhcuon_current_user');
    // Fallback to staff or prompt login
    setCurrentUser(null);
  };

  // Check if current user has minimum role
  const hasRole = (minimumRole) => {
    if (!currentUser) return false;
    const userRank = ROLE_RANKS[currentUser.role] || 0;
    const requiredRank = ROLE_RANKS[minimumRole] || 0;
    return userRank >= requiredRank;
  };

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager' || isAdmin;
  const isStaff = !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        switchAccount,
        hasRole,
        isAdmin,
        isManager,
        isStaff,
        staffList,
        loadStaff,
        isSwitchingUser,
        setIsSwitchingUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
