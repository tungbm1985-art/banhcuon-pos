import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSystemSettings,
  getAdminAccount,
  updateStaff,
  createPasswordResetCode,
  getPasswordResetRequest,
  clearPasswordResetCode,
  sendResetCodeEmail,
} from '../../services/db';
import {
  LogIn,
  Lock,
  User,
  AlertCircle,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function LoginModal({ isOpen = true }) {
  const { login, staffList, loadStaff } = useAuth();

  const [view, setView] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Khôi phục mật khẩu Chủ quán
  const [recoveryConfig, setRecoveryConfig] = useState(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Luôn lấy danh sách tài khoản mới nhất khi mở màn hình đăng nhập
  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username) {
      setError('Vui lòng chọn tên đăng nhập!');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await login(username, password.trim());
    } catch (err) {
      setError(err.message || 'Sai tên đăng nhập hoặc mật khẩu!');
    } finally {
      setIsLoading(false);
    }
  };

  const openForgot = async () => {
    setError('');
    setSuccessMsg('');
    setRecoveryError('');
    setRecoveryMsg('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setCodeSentTo('');
    setView('forgot');
    try {
      const s = await getSystemSettings();
      setRecoveryConfig(s.password_recovery || null);
    } catch {
      setRecoveryConfig(null);
    }
  };

  const isRecoveryReady = !!(
    recoveryConfig?.recipient_email &&
    recoveryConfig?.emailjs_service_id &&
    recoveryConfig?.emailjs_template_id &&
    recoveryConfig?.emailjs_public_key
  );

  const handleSendCode = async () => {
    if (!isRecoveryReady) return;
    setIsSendingCode(true);
    setRecoveryError('');
    setRecoveryMsg('');
    try {
      const settings = await getSystemSettings();
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await createPasswordResetCode(code, 10);
      await sendResetCodeEmail(recoveryConfig, {
        code,
        storeName: settings.store_info?.name || 'BÁNH CUỐN THANH HÓA',
      });
      setCodeSentTo(recoveryConfig.recipient_email);
      setRecoveryMsg('Đã gửi mã 6 số về email. Mã có hiệu lực 10 phút.');
    } catch (err) {
      setRecoveryError('Không gửi được email: ' + err.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMsg('');

    if (!resetCode.trim()) {
      setRecoveryError('Vui lòng nhập mã xác nhận trong email.');
      return;
    }
    if (newPassword.length < 6) {
      setRecoveryError('Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Hai lần nhập mật khẩu không giống nhau.');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const req = await getPasswordResetRequest();
      if (!req?.code || !req?.expires_at) {
        throw new Error('Chưa có mã xác nhận. Bấm "Gửi mã xác nhận về email" trước.');
      }
      if (new Date(req.expires_at).getTime() < Date.now()) {
        throw new Error('Mã xác nhận đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.');
      }
      if (String(req.code) !== resetCode.trim()) {
        throw new Error('Mã xác nhận không đúng.');
      }

      const admin = await getAdminAccount();
      if (!admin) throw new Error('Không tìm thấy tài khoản Chủ quán.');

      await updateStaff(admin.id, { password: newPassword });
      await clearPasswordResetCode();

      setView('login');
      setPassword('');
      setSuccessMsg('Đổi mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.');
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setIsSubmittingReset(false);
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

        <div className="p-5 sm:p-6 space-y-4">
          {view === 'login' ? (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tên đăng nhập
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white appearance-none"
                    >
                      <option value="">— Chọn tài khoản —</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.username}>
                          {s.full_name} (@{s.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  {staffList.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Chưa tải được danh sách tài khoản. Kiểm tra kết nối Supabase.
                    </p>
                  )}
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
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại đăng nhập
              </button>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                Chức năng này để lấy lại mật khẩu tài khoản <b>Chủ quán</b>. Mã xác nhận 6 số
                sẽ được gửi về email đã cấu hình.
              </div>

              {!isRecoveryReady && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-bold flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Chưa cấu hình email khôi phục. Cần đăng nhập bằng tài khoản Chủ quán rồi vào{' '}
                    <b>Cài đặt → mục 6</b> để thiết lập trước.
                  </span>
                </div>
              )}

              {recoveryMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{recoveryMsg}</span>
                </div>
              )}
              {recoveryError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {isRecoveryReady && !codeSentTo && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSendingCode}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isSendingCode ? 'Đang gửi mã...' : 'Gửi mã xác nhận về email'}</span>
                </button>
              )}

              {codeSentTo && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <p className="text-[11px] text-slate-500">
                    Mã đã gửi tới <b className="text-slate-700">{codeSentTo}</b>. Mở hộp thư và
                    nhập mã bên dưới.
                  </p>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mã xác nhận (6 số)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Nhập mã trong email..."
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold tracking-[0.3em] focus:outline-hidden focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mật khẩu mới (từ 6 ký tự)
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu mới..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nhập lại mật khẩu mới
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isSubmittingReset ? 'Đang đổi mật khẩu...' : 'Đổi Mật Khẩu'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode}
                    className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-60"
                  >
                    {isSendingCode ? 'Đang gửi lại...' : 'Gửi lại mã khác'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
