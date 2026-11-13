import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  getSupabaseCredentials,
} from '../../services/supabaseClient';
import {
  seedInitialDataToSupabase,
  resetLocalData,
  isUsingSupabase,
  isPrintQueueAvailable,
  createPrintJob,
  getPrintJob,
  backupAllData,
  getYearDataSummary,
  deleteYearData,
  getDataDeletionLogs,
  verifyAdminPassword,
  validateBackupFile,
  summarizeBackup,
  restoreAllData,
  getOrdersHistory,
  getExpenses,
  getCustomers,
} from '../../services/db';
import { getVietQRUrl, formatDateTime } from '../../utils/formatters';
import { exportDataFiles } from '../../utils/exportData';
import {
  Store,
  CreditCard,
  Printer,
  Award,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  ExternalLink,
  Wifi,
  Mail,
  HardDriveDownload,
  FileSpreadsheet,
  ShieldAlert,
  Trash2,
  Lock,
  ClipboardList,
  Upload,
} from 'lucide-react';

const COMMON_BANKS = [
  { id: 'MB', name: 'MBBank (Quân Đội)' },
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'ICB', name: 'VietinBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'ACB', name: 'ACB' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'HDB', name: 'HDBank' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'OCB', name: 'OCB' },
  { id: 'VIB', name: 'VIB' },
];

export default function SettingsView({ onTestPrintBill, onTestPrintKOT }) {
  const { settings, updateSetting, refreshSettings } = useSettings();

  // Store Info state
  const [storeInfo, setStoreInfo] = useState(settings.store_info || {});
  // VietQR config state
  const [vietqrConfig, setVietqrConfig] = useState(settings.vietqr_config || {});
  // Print config state
  const [printConfig, setPrintConfig] = useState(settings.print_config || {});
  // Loyalty config state
  const [loyaltyConfig, setLoyaltyConfig] = useState(settings.loyalty_config || {});
  // Password recovery (EmailJS) state
  const [recoveryConfig, setRecoveryConfig] = useState(settings.password_recovery || {});

  // Supabase credentials
  const initialCreds = getSupabaseCredentials() || { url: '', key: '' };
  const [supabaseUrl, setSupabaseUrl] = useState(initialCreds.url || '');
  const [supabaseKey, setSupabaseKey] = useState(initialCreds.key || '');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [printerTestResult, setPrinterTestResult] = useState(null);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  const usingSupabase = isUsingSupabase();

  // ---- Quản lý dữ liệu (Mục 6) ----
  const { currentUser, isAdmin } = useAuth();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const currentYear = new Date().getFullYear();
  const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - i);
  const [deleteYear, setDeleteYear] = useState(currentYear - 1);
  const [yearSummary, setYearSummary] = useState(null);
  const [isCheckingYear, setIsCheckingYear] = useState(false);
  const [yearBackupFile, setYearBackupFile] = useState(null);
  const [isBackingUpYear, setIsBackingUpYear] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState([]);

  // Phục hồi từ file sao lưu (Mục 6 đợt 3)
  const restoreInputRef = useRef(null);
  const [restoreFile, setRestoreFile] = useState(null); // { name, data }
  const [restoreSummary, setRestoreSummary] = useState(null);
  const [restoreBackupFile, setRestoreBackupFile] = useState(null); // tên file sao lưu hiện tại đã tải
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const loadDeletionLogs = async () => {
    try {
      setDeletionLogs(await getDataDeletionLogs());
    } catch (err) {
      console.error('Failed to load deletion logs:', err);
    }
  };

  useEffect(() => {
    loadDeletionLogs();
  }, []);

  const downloadJson = (obj, filename) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Sao lưu toàn bộ dữ liệu và tải về máy
  const handleBackupAll = async () => {
    setIsBackingUp(true);
    try {
      const backup = await backupAllData();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadJson(backup, `sao-luu-toan-bo_${stamp}.json`);
    } catch (err) {
      alert('Lỗi sao lưu dữ liệu: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Xuất toàn bộ dữ liệu ra Excel/CSV
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const [orders, expenses, customers] = await Promise.all([
        getOrdersHistory({ status: 'all' }),
        getExpenses({}),
        getCustomers(),
      ]);
      exportDataFiles({ orders, expenses, customers }, 'toan-bo-du-lieu');
    } catch (err) {
      alert('Lỗi xuất dữ liệu: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Chọn file sao lưu: đọc và kiểm tra định dạng trước, sai thì báo lỗi và không đổi gì.
  const handlePickRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng một file
    if (!file) return;

    setRestoreError('');
    setRestoreSuccess('');
    setRestoreSummary(null);
    setRestoreBackupFile(null);
    setRestorePassword('');

    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('File không đúng định dạng sao lưu (không đọc được nội dung JSON).');
      }
      const check = validateBackupFile(parsed);
      if (!check.ok) throw new Error(check.error);
      setRestoreFile({ name: file.name, data: parsed });
      setRestoreSummary(summarizeBackup(parsed));
    } catch (err) {
      setRestoreFile(null);
      setRestoreError(err.message);
    }
  };

  // Bắt buộc tải bản sao lưu dữ liệu hiện tại trước khi phục hồi.
  const handleBackupBeforeRestore = async () => {
    try {
      const backup = await backupAllData();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const name = `sao-luu-truoc-phuc-hoi_${stamp}.json`;
      downloadJson(backup, name);
      setRestoreBackupFile(name);
      setRestoreError('');
    } catch (err) {
      alert('Lỗi sao lưu dữ liệu hiện tại: ' + err.message);
    }
  };

  const resetRestoreState = () => {
    setRestoreFile(null);
    setRestoreSummary(null);
    setRestoreBackupFile(null);
    setRestorePassword('');
    setRestoreError('');
  };

  const handleRestoreData = async () => {
    setRestoreError('');
    setRestoreSuccess('');
    if (!restoreFile || !restoreSummary) {
      setRestoreError('Vui lòng chọn file sao lưu hợp lệ trước.');
      return;
    }
    if (!restoreBackupFile) {
      setRestoreError('Bắt buộc tải bản sao lưu dữ liệu hiện tại trước khi phục hồi.');
      return;
    }
    if (!restorePassword) {
      setRestoreError('Vui lòng nhập mật khẩu tài khoản chủ quán.');
      return;
    }
    if (
      !confirm(
        'XÁC NHẬN PHỤC HỒI: toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu trong file sao lưu. Thao tác này không thể hoàn tác.'
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const ok = await verifyAdminPassword(restorePassword);
      if (!ok) {
        setRestoreError('Mật khẩu chủ quán không đúng. Không phục hồi.');
        setIsRestoring(false);
        return;
      }
      const result = await restoreAllData(restoreFile.data, {
        restoredBy: currentUser?.full_name || 'admin',
      });
      setRestoreSuccess(
        `Đã phục hồi ${result.orders} đơn hàng, ${result.expenses} chi phí, ${result.customers} khách hàng, ${result.menu_items} món, ${result.tables} bàn. Đang tải lại dữ liệu...`
      );
      resetRestoreState();
      await loadDeletionLogs();
      await refreshSettings();
      setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
      setRestoreError('Lỗi phục hồi dữ liệu: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCheckYear = async () => {
    setIsCheckingYear(true);
    setYearSummary(null);
    setYearBackupFile(null);
    setDeleteError('');
    setDeleteSuccess('');
    try {
      setYearSummary(await getYearDataSummary(deleteYear));
    } catch (err) {
      alert('Lỗi đối chiếu dữ liệu: ' + err.message);
    } finally {
      setIsCheckingYear(false);
    }
  };

  // Tạo bản sao lưu phần dữ liệu sắp xoá và tải về
  const handleBackupYear = async () => {
    setIsBackingUpYear(true);
    try {
      const startDate = `${deleteYear}-01-01`;
      const endDate = `${deleteYear}-12-31`;
      const [orders, expenses] = await Promise.all([
        getOrdersHistory({ status: 'all', startDate, endDate }),
        getExpenses({ startDate, endDate }),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        year: deleteYear,
        orders,
        expenses,
      };
      downloadJson(payload, `sao-luu-nam-${deleteYear}.json`);
      setYearBackupFile(`sao-luu-nam-${deleteYear}.json`);
    } catch (err) {
      alert('Lỗi tạo bản sao lưu: ' + err.message);
    } finally {
      setIsBackingUpYear(false);
    }
  };

  const handleDeleteYear = async () => {
    setDeleteError('');
    setDeleteSuccess('');
    if (!yearSummary) {
      setDeleteError('Vui lòng bấm "Đối chiếu" để xem số liệu năm trước khi xoá.');
      return;
    }
    if (!yearBackupFile) {
      setDeleteError('Bắt buộc tạo bản sao lưu và tải về trước khi xoá.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Vui lòng nhập mật khẩu tài khoản chủ quán.');
      return;
    }
    if (!confirm(`Xoá toàn bộ đơn hàng và chi phí năm ${deleteYear}? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const ok = await verifyAdminPassword(deletePassword);
      if (!ok) {
        setDeleteError('Mật khẩu chủ quán không đúng. Không xoá dữ liệu.');
        setIsDeleting(false);
        return;
      }
      const log = await deleteYearData(deleteYear, { deletedBy: currentUser?.full_name || 'admin' });
      setDeleteSuccess(
        `Đã xoá ${log.orders_deleted} đơn hàng và ${log.expenses_deleted} khoản chi phí của năm ${deleteYear}.`
      );
      setDeletePassword('');
      setYearSummary(null);
      setYearBackupFile(null);
      await loadDeletionLogs();
    } catch (err) {
      setDeleteError('Lỗi xoá dữ liệu: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    try {
      await updateSetting('store_info', storeInfo);
      await updateSetting('vietqr_config', vietqrConfig);
      await updateSetting('print_config', printConfig);
      await updateSetting('loyalty_config', loyaltyConfig);
      await updateSetting('password_recovery', recoveryConfig);
      setSaveSuccessMsg('Đã lưu toàn bộ cài đặt thành công!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      alert('Lỗi lưu cài đặt: ' + err.message);
    }
  };

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert('Vui lòng nhập Supabase Project URL và Anon Key!');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setTestResult(res);
      if (res.success) {
        saveSupabaseCredentials(supabaseUrl, supabaseKey);
        await refreshSettings();
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnectSupabase = () => {
    if (confirm('Ngắt kết nối Supabase và chuyển về chế độ lưu trữ cục bộ (Local)?')) {
      clearSupabaseCredentials();
      setSupabaseUrl('');
      setSupabaseKey('');
      setTestResult(null);
      window.location.reload();
    }
  };

  const handleSeedData = async () => {
    if (!confirm('Khởi tạo dữ liệu mẫu (Tables, Menu, Staff, Settings) lên cơ sở dữ liệu Supabase?')) {
      return;
    }
    setIsSeeding(true);
    try {
      await seedInitialDataToSupabase();
      alert('Đã khởi tạo dữ liệu lên Supabase thành công!');
      window.location.reload();
    } catch (err) {
      alert('Lỗi khởi tạo Supabase: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetLocal = () => {
    if (confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu của Bánh Cuốn Thanh Hóa?')) {
      resetLocalData();
      window.location.reload();
    }
  };

  // Test LAN printer connection.
  // - Có Supabase: gửi lệnh test qua hàng đợi (in được từ điện thoại qua WiFi/4G)
  // - Không có Supabase: gọi thẳng Print Server cục bộ (chỉ đúng khi mở app trên máy tính tiền)
  const handleTestPrinter = async () => {
    if (!printConfig.printer_ip) {
      alert('Vui lòng nhập địa chỉ IP máy in!');
      return;
    }
    const ip = printConfig.printer_ip;
    const port = Number(printConfig.printer_port) || 9100;

    setIsTestingPrinter(true);
    setPrinterTestResult(null);
    try {
      if (isPrintQueueAvailable()) {
        const job = await createPrintJob({ jobType: 'test', printerIp: ip, printerPort: port, payload: {} });
        if (job) {
          // Chờ máy tính tiền xử lý (tối đa ~12 giây)
          for (let i = 0; i < 12; i += 1) {
            await new Promise((r) => setTimeout(r, 1000));
            const row = await getPrintJob(job.id);
            if (row?.status === 'done') {
              setPrinterTestResult({
                success: true,
                message: `Kết nối thành công đến ${ip}:${port} (qua hàng đợi máy tính tiền)`,
              });
              return;
            }
            if (row?.status === 'error') {
              setPrinterTestResult({
                success: false,
                error: `Không kết nối được máy in: ${row.error_message || 'Không xác định'}`,
              });
              return;
            }
          }
          setPrinterTestResult({
            success: false,
            error:
              'Máy tính tiền chưa phản hồi. Kiểm tra máy tính tiền đã chạy "npm run print-server" chưa.',
          });
          return;
        }
      }

      // Dự phòng: gọi Print Server cục bộ
      const res = await fetch('http://localhost:3001/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port }),
      });
      const data = await res.json();
      setPrinterTestResult(data);
    } catch {
      setPrinterTestResult({
        success: false,
        error: 'Không kết nối được với Print Server. Đảm bảo đã chạy lệnh "npm run print-server".',
      });
    } finally {
      setIsTestingPrinter(false);
    }
  };

  // Preview VietQR URL
  const previewQrUrl = getVietQRUrl(vietqrConfig, 95000, 'Ban 01 Don 001');

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Cài Đặt Hệ Thống & Máy In
          </h2>
          <p className="text-xs text-slate-500">
            Thông tin quán, mã VietQR, cấu hình in nhiệt 58mm/80mm và cơ sở dữ liệu Supabase
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Toàn Bộ Cài Đặt</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. THÔNG TIN QUÁN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Store className="w-5 h-5 text-red-600" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            1. Thông Tin Quán (In trên đầu hóa đơn)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên thương hiệu quán *
            </label>
            <input
              type="text"
              value={storeInfo.name || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Khẩu hiệu / Slogan
            </label>
            <input
              type="text"
              value={storeInfo.slogan || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, slogan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Địa chỉ quán
            </label>
            <input
              type="text"
              value={storeInfo.address || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Số điện thoại hotline
            </label>
            <input
              type="text"
              value={storeInfo.phone || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Lời nhắn cuối hóa đơn (Footer note)
            </label>
            <input
              type="text"
              value={storeInfo.footer_note || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, footer_note: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* 2. CẤU HÌNH VIETQR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            2. Cấu Hình Tài Khoản Ngân Hàng Tạo Mã VietQR Tự Động
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ngân hàng thụ hưởng *
              </label>
              <select
                value={vietqrConfig.bank_id || 'MB'}
                onChange={(e) => setVietqrConfig({ ...vietqrConfig, bank_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-red-500 bg-white"
              >
                {COMMON_BANKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số tài khoản nhận tiền *
              </label>
              <input
                type="text"
                placeholder="VD: 0988123456"
                value={vietqrConfig.account_no || ''}
                onChange={(e) => setVietqrConfig({ ...vietqrConfig, account_no: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên chủ tài khoản (Không dấu, viết hoa) *
              </label>
              <input
                type="text"
                placeholder="VD: NGUYEN VAN A"
                value={vietqrConfig.account_name || ''}
                onChange={(e) => setVietqrConfig({ ...vietqrConfig, account_name: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold uppercase focus:outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          {/* Live VietQR Preview */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Xem trước mã VietQR tự sinh
            </span>
            {previewQrUrl ? (
              <img
                src={previewQrUrl}
                alt="VietQR Preview"
                className="w-36 h-36 object-contain rounded-lg border border-slate-200 p-1 bg-white"
              />
            ) : (
              <div className="w-36 h-36 bg-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                Chưa đủ thông tin
              </div>
            )}
            <span className="text-[10px] text-slate-500 mt-1 font-mono">
              Test số tiền: 95.000đ
            </span>
          </div>
        </div>
      </div>

      {/* 3. CẤU HÌNH MÁY IN & MẪU IN (gộp khổ giấy, kết nối LAN, mẫu in) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Printer className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            3. Cấu Hình Máy In & Mẫu In Hóa Đơn
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Khổ giấy máy in bill POS
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintConfig({ ...printConfig, paper_size: '58mm' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    printConfig.paper_size === '58mm' || !printConfig.paper_size
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Khổ nhỏ: 58mm (Phổ biến)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintConfig({ ...printConfig, paper_size: '80mm' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    printConfig.paper_size === '80mm'
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Khổ lớn: 80mm
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printConfig.auto_print_bill !== false}
                  onChange={(e) => setPrintConfig({ ...printConfig, auto_print_bill: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>Tự động mở cửa sổ in hóa đơn khi bấm Hoàn tất thanh toán</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printConfig.show_qr_on_bill !== false}
                  onChange={(e) => setPrintConfig({ ...printConfig, show_qr_on_bill: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>In kèm mã VietQR lên hóa đơn tính tiền</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printConfig.show_loyalty_on_bill !== false}
                  onChange={(e) => setPrintConfig({ ...printConfig, show_loyalty_on_bill: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>In thông tin điểm tích lũy của khách hàng</span>
              </label>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-center space-y-2.5">
            <span className="text-xs font-bold text-slate-700 block">
              Kiểm tra định dạng in trên trình duyệt
            </span>
            <button
              type="button"
              onClick={onTestPrintBill}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs active:scale-95 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>In Thử Nghiệm Hóa Đơn Tính Tiền</span>
            </button>

            <button
              type="button"
              onClick={onTestPrintKOT}
              className="py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs active:scale-95 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span>In Thử Nghiệm Phiếu Báo Bếp (KOT)</span>
            </button>
          </div>
        </div>

        {/* LAN printing subsection */}
        <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Kết Nối Máy In Qua Mạng LAN (TCP/IP)
          </h4>
        </div>

        <p className="text-xs text-slate-500 -mt-1">
          In trực tiếp đến máy in nhiệt qua địa chỉ IP (không cần cửa sổ in của trình duyệt). Cần chạy
          lệnh <code className="bg-slate-100 px-1 rounded">npm run print-server</code> trên máy tính tiền.
          Khi đã kết nối Supabase, lệnh in được gửi qua hàng đợi nên in được từ điện thoại dùng WiFi quán hoặc 4G.
        </p>

        {/* Enable toggle */}
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-900">Bật in trực tiếp qua LAN</span>
            <span className="text-[11px] text-blue-600">(bỏ qua cửa sổ in trình duyệt)</span>
          </div>
          <input
            type="checkbox"
            checked={!!printConfig.printer_enabled}
            onChange={(e) =>
              setPrintConfig({
                ...printConfig,
                printer_enabled: e.target.checked,
                print_mode: e.target.checked ? 'lan' : 'browser',
              })
            }
            className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tên máy in</label>
            <input
              type="text"
              value={printConfig.printer_name || ''}
              onChange={(e) => setPrintConfig({ ...printConfig, printer_name: e.target.value })}
              placeholder="Ví dụ: Máy in Bill 01"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Địa chỉ IP máy in
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={printConfig.printer_ip || ''}
              onChange={(e) => setPrintConfig({ ...printConfig, printer_ip: e.target.value })}
              placeholder="Ví dụ: 192.168.1.100"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Port (mặc định 9100)</label>
            <input
              type="number"
              value={printConfig.printer_port ?? 9100}
              onChange={(e) =>
                setPrintConfig({ ...printConfig, printer_port: Number(e.target.value) })
              }
              placeholder="9100"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleTestPrinter}
              disabled={isTestingPrinter}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs shadow-xs active:scale-95 flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              <span>{isTestingPrinter ? 'Đang kiểm tra...' : 'Kiểm tra kết nối máy in'}</span>
            </button>
          </div>
        </div>

        {/* Printer test result */}
        {printerTestResult && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
              printerTestResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {printerTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {printerTestResult.success ? 'Kết nối máy in thành công!' : 'Kết nối thất bại'}
              </p>
              {printerTestResult.message && <p className="mt-0.5">{printerTestResult.message}</p>}
              {printerTestResult.error && <p className="mt-0.5">{printerTestResult.error}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 4. CHÍNH SÁCH TÍCH ĐIỂM THÀNH VIÊN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            4. Chính Sách Tích Điểm Thành Viên (Loyalty Points)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tỷ lệ tích điểm (Chi bao nhiêu tiền để nhận 1 điểm)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1000"
                value={loyaltyConfig.earn_rate || 10000}
                onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, earn_rate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">đ = 1 điểm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Mặc định: 10.000đ = 1 điểm</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tỷ lệ tiêu điểm (1 điểm quy đổi thành bao nhiêu tiền giảm giá)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="10"
                value={loyaltyConfig.redeem_rate || 100}
                onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, redeem_rate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">đ / điểm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Mặc định: 100đ / điểm (10 điểm = 1.000đ)</p>
          </div>
        </div>
      </div>

      {/* 5. CƠ SỞ DỮ LIỆU SUPABASE CLOUD & REALTIME */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              5. Kết Nối Supabase Cloud Database & Realtime
            </h3>
          </div>
          {usingSupabase ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Đang kết nối Supabase Cloud
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              Đang chạy chế độ Cục bộ (Local/Offline)
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Nhập Project URL và Anon Key từ trang quản trị Supabase của bạn (trong Settings &gt; API).
          Đã có sẵn file cấu trúc SQL <strong>supabase.sql</strong> trong thư mục gốc của dự án.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supabase Project Anon Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:border-red-500"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {testResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kết nối Supabase thành công và đã lưu cấu hình!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Kết nối thất bại: {testResult.error}</span>
                </>
              )}
            </div>
          )}

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isTesting || !supabaseUrl || !supabaseKey}
              onClick={handleTestConnection}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Database className="w-4 h-4" />
              <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm Tra & Kết Nối Supabase'}</span>
            </button>

            {usingSupabase && (
              <>
                <button
                  type="button"
                  disabled={isSeeding}
                  onClick={handleSeedData}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isSeeding ? 'Đang khởi tạo...' : 'Tải Dữ Liệu Mẫu Lên Supabase'}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectSupabase}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition-all"
                >
                  Ngắt kết nối
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleResetLocal}
              className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold active:scale-95 transition-all ml-auto flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt Lại Dữ Liệu Mẫu Cục Bộ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. KHÔI PHỤC MẬT KHẨU CHỦ QUÁN QUA EMAIL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Mail className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            6. Khôi Phục Mật Khẩu Chủ Quán (Qua Email)
          </h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Dùng khi <strong>Chủ quán quên mật khẩu</strong>. Khi bấm &quot;Quên mật khẩu?&quot; ở màn hình đăng nhập,
          app sẽ gửi một mã xác nhận 6 số về email bên dưới. Cần tạo tài khoản miễn phí tại{' '}
          <a
            href="https://www.emailjs.com/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5"
          >
            emailjs.com <ExternalLink className="w-3 h-3" />
          </a>{' '}
          rồi lấy 3 thông số: Service ID, Template ID, Public Key.
          Trong template EmailJS nhớ dùng các biến: <code className="font-mono text-[11px]">{'{{to_email}}'}</code>,{' '}
          <code className="font-mono text-[11px]">{'{{reset_code}}'}</code>,{' '}
          <code className="font-mono text-[11px]">{'{{store_name}}'}</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Email nhận mã khôi phục (email của chủ quán)
            </label>
            <input
              type="email"
              placeholder="chuguan@gmail.com"
              value={recoveryConfig.recipient_email || ''}
              onChange={(e) => setRecoveryConfig({ ...recoveryConfig, recipient_email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">EmailJS Service ID</label>
            <input
              type="text"
              placeholder="service_xxxxxxx"
              value={recoveryConfig.emailjs_service_id || ''}
              onChange={(e) => setRecoveryConfig({ ...recoveryConfig, emailjs_service_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">EmailJS Template ID</label>
            <input
              type="text"
              placeholder="template_xxxxxxx"
              value={recoveryConfig.emailjs_template_id || ''}
              onChange={(e) => setRecoveryConfig({ ...recoveryConfig, emailjs_template_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">EmailJS Public Key</label>
            <input
              type="text"
              placeholder="AbCdEfGhIjKlMnOp"
              value={recoveryConfig.emailjs_public_key || ''}
              onChange={(e) => setRecoveryConfig({ ...recoveryConfig, emailjs_public_key: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {recoveryConfig.recipient_email &&
        recoveryConfig.emailjs_service_id &&
        recoveryConfig.emailjs_template_id &&
        recoveryConfig.emailjs_public_key ? (
          <div className="p-3 rounded-xl border text-xs font-bold flex items-center gap-2 bg-emerald-50 border-emerald-300 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã cấu hình đủ. Chức năng &quot;Quên mật khẩu&quot; đã sẵn sàng hoạt động.</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl border text-xs font-bold flex items-center gap-2 bg-amber-50 border-amber-300 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Cần điền đủ 4 ô trên rồi bấm &quot;Lưu Toàn Bộ Cài Đặt&quot; để bật chức năng quên mật khẩu.</span>
          </div>
        )}
      </div>

      {/* 7. QUẢN LÝ DỮ LIỆU (chỉ chủ quán) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <HardDriveDownload className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              7. Quản Lý Dữ Liệu (Chỉ Chủ Quán)
            </h3>
          </div>

          {/* 7.1 Sao lưu & xuất dữ liệu */}
          <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2.5">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Sao lưu &amp; xuất dữ liệu
            </h4>
            <p className="text-xs text-slate-500">
              Tải một bản sao toàn bộ dữ liệu về máy để cất giữ, hoặc xuất ra Excel/CSV để tự làm báo cáo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBackupAll}
                disabled={isBackingUp}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold active:scale-95 flex items-center gap-1.5"
              >
                <HardDriveDownload className="w-4 h-4" />
                {isBackingUp ? 'Đang sao lưu...' : 'Sao lưu toàn bộ dữ liệu'}
              </button>
              <button
                type="button"
                onClick={handleExportAll}
                disabled={isExporting}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold active:scale-95 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel/CSV toàn bộ'}
              </button>
              <button
                type="button"
                onClick={() => restoreInputRef.current?.click()}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold active:scale-95 flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Phục hồi từ file sao lưu
              </button>
              <input
                ref={restoreInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handlePickRestoreFile}
                className="hidden"
              />
            </div>
          </div>

          {/* 7.1b Phục hồi từ file sao lưu */}
          <div className="rounded-2xl border border-slate-200 p-3.5 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              Phục hồi từ file sao lưu
            </h4>
            <p className="text-xs text-slate-500">
              Nạp lại toàn bộ dữ liệu nghiệp vụ (đơn hàng, chi phí, khách hàng, thực đơn, bàn, cài đặt quán)
              từ file sao lưu do nút &quot;Sao lưu toàn bộ dữ liệu&quot; tạo ra. Tài khoản đăng nhập giữ nguyên.
            </p>

            {restoreError && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2">
                {restoreError}
              </div>
            )}
            {restoreSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2">
                {restoreSuccess}
              </div>
            )}

            {!restoreSummary && (
              <button
                type="button"
                onClick={() => restoreInputRef.current?.click()}
                className="py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold active:scale-95 flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Chọn file sao lưu (.json)
              </button>
            )}

            {restoreSummary && (
              <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-3.5 space-y-3">
                <div className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-xs text-slate-700 space-y-0.5">
                  <div>
                    File: <strong>{restoreFile?.name}</strong>
                  </div>
                  <div>
                    Ngày tạo bản sao lưu:{' '}
                    <strong>
                      {restoreSummary.exported_at ? formatDateTime(restoreSummary.exported_at) : 'Không có trong file'}
                    </strong>
                  </div>
                  <div className="pt-1 font-bold text-slate-800">Nội dung sắp phục hồi:</div>
                  <div>· {restoreSummary.orders} đơn hàng ({restoreSummary.order_items} chi tiết món)</div>
                  <div>· {restoreSummary.expenses} khoản chi phí</div>
                  <div>· {restoreSummary.customers} khách hàng (kèm điểm thưởng)</div>
                  <div>· {restoreSummary.menu_items} món trong thực đơn · {restoreSummary.tables} bàn</div>
                </div>

                <div className="rounded-xl bg-red-600 text-white p-3 text-xs font-bold leading-relaxed">
                  Phục hồi sẽ THAY THẾ TOÀN BỘ dữ liệu hiện tại bằng dữ liệu trong file sao lưu. Mọi đơn hàng,
                  chi phí, thay đổi phát sinh sau ngày sao lưu sẽ BỊ MẤT.
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleBackupBeforeRestore}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold active:scale-95 flex items-center gap-1.5"
                  >
                    <HardDriveDownload className="w-4 h-4" />
                    1. Tải bản sao lưu dữ liệu hiện tại (bắt buộc)
                  </button>
                  {restoreBackupFile && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã tải bản sao lưu hiện tại: {restoreBackupFile}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    2. Mật khẩu tài khoản chủ quán (bắt buộc để phục hồi)
                  </label>
                  <input
                    type="password"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    placeholder="Nhập mật khẩu chủ quán"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreData}
                    disabled={isRestoring}
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold active:scale-95 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isRestoring ? 'Đang phục hồi...' : '3. Phục hồi dữ liệu ngay'}
                  </button>
                  <button
                    type="button"
                    onClick={resetRestoreState}
                    className="py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold active:scale-95"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7.2 Xoá dữ liệu năm cũ */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-3">
            <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Xoá dữ liệu năm cũ (làm nhẹ dữ liệu)
            </h4>
            <p className="text-xs text-slate-600">
              Chỉ xoá <strong>đơn hàng</strong> và <strong>chi phí</strong> của năm được chọn. Giữ nguyên tài khoản
              người dùng, thực đơn, cài đặt, khách hàng và điểm thưởng.
            </p>

            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Chọn năm</label>
                <select
                  value={deleteYear}
                  onChange={(e) => {
                    setDeleteYear(Number(e.target.value));
                    setYearSummary(null);
                    setYearBackupFile(null);
                    setDeleteError('');
                    setDeleteSuccess('');
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCheckYear}
                disabled={isCheckingYear}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold active:scale-95"
              >
                {isCheckingYear ? 'Đang đối chiếu...' : 'Đối chiếu dữ liệu năm'}
              </button>
            </div>

            {yearSummary && (
              <div className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-xs text-slate-700">
                Năm <strong>{yearSummary.year}</strong> có <strong>{yearSummary.orders}</strong> đơn hàng và{' '}
                <strong>{yearSummary.expenses}</strong> khoản chi phí sẽ bị xoá.
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={handleBackupYear}
                disabled={isBackingUpYear}
                className="py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-bold active:scale-95 flex items-center gap-1.5"
              >
                <HardDriveDownload className="w-4 h-4" />
                {isBackingUpYear ? 'Đang tạo bản sao lưu...' : `Tạo bản sao lưu năm ${deleteYear} & tải về`}
              </button>
              {yearBackupFile && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mt-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã tải bản sao lưu: {yearBackupFile}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Mật khẩu tài khoản chủ quán (bắt buộc để xoá)
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Nhập mật khẩu chủ quán"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {deleteError && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2">
                {deleteError}
              </div>
            )}
            {deleteSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2">
                {deleteSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={handleDeleteYear}
              disabled={isDeleting}
              className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold active:scale-95 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Đang xoá...' : `Xoá đơn hàng & chi phí năm ${deleteYear}`}
            </button>
          </div>

          {/* 7.3 Nhật ký xoá / phục hồi dữ liệu */}
          <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" />
              Nhật ký xoá / phục hồi dữ liệu
            </h4>
            {deletionLogs.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có lần xoá hay phục hồi dữ liệu nào.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {deletionLogs.slice(0, 10).map((log, idx) => (
                  <div key={log.id || idx} className="py-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{formatDateTime(log.deleted_at)}</span> ·{' '}
                    {log.deleted_by || 'admin'} ·{' '}
                    {log.year ? (
                      <>
                        Năm <strong>{log.year}</strong> · xoá {log.orders_deleted} đơn hàng,{' '}
                        {log.expenses_deleted} chi phí
                      </>
                    ) : (
                      <span className="text-amber-700 font-semibold">{log.notes || 'Phục hồi dữ liệu'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
