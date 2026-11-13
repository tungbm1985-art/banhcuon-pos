import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

// Cơ chế hộp thoại DÙNG CHUNG cho toàn app (thay hộp thoại gốc của trình duyệt).
// Dùng:
//   const { showAlert, showConfirm } = useDialog();
//   showAlert('Nội dung thông báo');
//   if (await showConfirm('Bạn có chắc?', { variant: 'danger' })) { ... }
// showConfirm trả về Promise<boolean> nên chỗ gọi phải await.

const DialogContext = createContext(null);

const VARIANTS = {
  info: {
    icon: Info,
    iconClass: 'text-slate-600 bg-slate-100',
    confirmClass: 'bg-slate-900 hover:bg-black',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 bg-emerald-50',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 bg-amber-50',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
  },
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-red-600 bg-red-50',
    confirmClass: 'bg-red-600 hover:bg-red-700',
  },
};

function DialogBox({ kind, title, message, confirmText, cancelText, variant = 'info', onResolve }) {
  const style = VARIANTS[variant] || VARIANTS.info;
  const Icon = style.icon;
  const isConfirm = kind === 'confirm';

  const finish = useCallback(
    (result) => onResolve(result),
    [onResolve]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') finish(isConfirm ? false : undefined);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish, isConfirm]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        onClick={() => finish(isConfirm ? false : undefined)}
      />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        <div className="p-5 flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${style.iconClass}`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-900 leading-tight">
              {title || (isConfirm ? 'Xác nhận' : 'Thông báo')}
            </h3>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line break-words">
              {message}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={() => finish(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all"
              >
                {cancelText || 'Huỷ'}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all ${style.confirmClass}`}
              >
                {confirmText || 'Đồng ý'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => finish(undefined)}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all ${style.confirmClass}`}
            >
              Đã hiểu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const open = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialog(options);
      }),
    []
  );

  const close = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    if (resolve) resolve(result);
  }, []);

  const showAlert = useCallback(
    (message, options = {}) => open({ kind: 'alert', message, ...options }),
    [open]
  );

  const showConfirm = useCallback(
    (message, options = {}) => open({ kind: 'confirm', message, ...options }),
    [open]
  );

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && <DialogBox {...dialog} onResolve={close} />}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog phải được dùng bên trong DialogProvider');
  return ctx;
}
