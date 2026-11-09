import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Numpad from '../common/Numpad';
import { formatVND, getVietQRUrl } from '../../utils/formatters';
import { Banknote, QrCode, CheckCircle2, Copy, Check, Printer } from 'lucide-react';

export default function CheckoutModal({
  isOpen,
  onClose,
  order,
  settings,
  onCompleteCheckout,
  onPrintBill,
}) {
  const [paymentMethod, setPaymentMethod] = useState('vietqr'); // 'cash' | 'vietqr'
  const [cashReceived, setCashReceived] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order) {
      setCashReceived(order.total_amount || 0);
      setPaymentMethod('vietqr');
    }
  }, [order, isOpen]);

  if (!order || !isOpen) return null;

  const totalAmount = order.total_amount || 0;
  const vietqrConfig = settings?.vietqr_config || {};
  const loyaltyConfig = settings?.loyalty_config || {};

  const tableName = order.tables?.name || (order.order_type === 'takeaway' ? '🛍️ Mang Về' : 'Bàn');
  const qrUrl = getVietQRUrl(vietqrConfig, totalAmount, `${tableName} ${order.order_number}`);

  const pointsEarned = loyaltyConfig.enabled && loyaltyConfig.earn_rate
    ? Math.floor(totalAmount / loyaltyConfig.earn_rate)
    : 0;

  const handleFinish = async () => {
    if (paymentMethod === 'cash' && cashReceived < totalAmount) {
      alert('Số tiền khách đưa chưa đủ để thanh toán!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompleteCheckout({
        payment_method: paymentMethod,
        cash_received: cashReceived,
        points_earned: pointsEarned,
        points_redeemed: order.points_redeemed || 0,
      });
      onClose();
    } catch (err) {
      console.error('Error completing checkout:', err);
      alert('Lỗi khi thanh toán: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAccount = () => {
    if (vietqrConfig.account_no) {
      navigator.clipboard.writeText(vietqrConfig.account_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thanh Toán: ${tableName}`}
      subtitle={`Mã đơn: ${order.order_number}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Total Amount Card */}
        <div className="bg-gradient-to-r from-red-600 to-amber-600 rounded-2xl p-4 text-white text-center shadow-md">
          <span className="text-xs uppercase font-bold tracking-wider text-red-100">
            Tổng tiền cần thanh toán
          </span>
          <div className="text-3xl font-black tracking-tight mt-0.5">
            {formatVND(totalAmount)}
          </div>
          {order.discount > 0 && (
            <div className="text-xs text-red-100 mt-1">
              (Đã giảm trừ: {formatVND(order.discount)})
            </div>
          )}
          {order.customers && (
            <div className="inline-block mt-2 bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-semibold">
              ⭐ Tích lũy: +{pointsEarned} điểm cho {order.customers.full_name}
            </div>
          )}
        </div>

        {/* Payment Method Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('vietqr')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 ${
              paymentMethod === 'vietqr'
                ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>Chuyển Khoản QR</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 ${
              paymentMethod === 'cash'
                ? 'border-red-600 bg-red-50 text-red-700 shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span>Tiền Mặt</span>
          </button>
        </div>

        {/* Tab 1: CASH NUMPAD */}
        {paymentMethod === 'cash' && (
          <div className="animate-in fade-in">
            <Numpad
              targetAmount={totalAmount}
              cashReceived={cashReceived}
              onChangeCash={setCashReceived}
            />
          </div>
        )}

        {/* Tab 2: VIETQR DISPLAY */}
        {paymentMethod === 'vietqr' && (
          <div className="space-y-3 animate-in fade-in">
            {qrUrl ? (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <div className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Quét mã qua App Ngân hàng bất kỳ
                </div>
                <div className="bg-white p-2.5 rounded-xl inline-block shadow-xs border border-slate-200">
                  <img
                    src={qrUrl}
                    alt="VietQR Code"
                    className="w-52 h-52 object-contain mx-auto rounded-lg"
                  />
                </div>
                <div className="mt-2 text-xs space-y-0.5">
                  <div className="text-slate-500">
                    Ngân hàng: <span className="font-bold text-slate-800">{vietqrConfig.bank_id}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                    <span>{vietqrConfig.account_no}</span>
                    <button
                      onClick={copyAccount}
                      className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 active:scale-90"
                      title="Sao chép số tài khoản"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-slate-700 font-bold uppercase">
                    {vietqrConfig.account_name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Số tiền: <strong className="text-red-600">{formatVND(totalAmount)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center text-amber-800 text-xs">
                Chưa cấu hình tài khoản ngân hàng trong Cài đặt! Vui lòng vào Cài đặt để cập nhật thông tin VietQR.
              </div>
            )}
          </div>
        )}

        {onPrintBill && (
          <button
            type="button"
            onClick={() =>
              onPrintBill({
                ...order,
                payment_method: paymentMethod,
              })
            }
            className="w-full py-2.5 px-4 rounded-2xl border border-slate-300 bg-white text-slate-800 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            In bill thanh toán
          </button>
        )}

        {/* Action Button: Checkout & Print */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting || (paymentMethod === 'cash' && cashReceived < totalAmount)}
            onClick={handleFinish}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-base shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Đang xử lý...'
                : `Xác Nhận Thu ${formatVND(totalAmount)}`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
