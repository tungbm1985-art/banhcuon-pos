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
  const [pointsInput, setPointsInput] = useState(0);
  // Lựa chọn tường minh: "Để tích luỹ" (mặc định) hay "Dùng điểm".
  const [usePoints, setUsePoints] = useState(false);

  const totalAmount = order?.total_amount || 0;
  const vietqrConfig = settings?.vietqr_config || {};
  const loyaltyConfig = settings?.loyalty_config || {};

  // Đổi điểm thưởng ngay khi thanh toán
  const customerPoints = Number(order?.customers?.points) || 0;
  const redeemRate = Number(loyaltyConfig.redeem_rate) || 0;
  // Chỉ hiện khu điểm khi đơn có gắn khách hàng và khách có điểm > 0.
  const showPointsBlock = !!order?.customers && !!loyaltyConfig.enabled && redeemRate > 0 && customerPoints > 0;
  const maxPointsByAmount = redeemRate > 0 ? Math.floor(totalAmount / redeemRate) : 0;
  const maxPoints = Math.min(customerPoints, maxPointsByAmount);
  // Không tự trừ điểm: chỉ trừ khi nhân viên chọn "Dùng điểm".
  const pointsUsed = usePoints ? Math.min(Math.max(0, Number(pointsInput) || 0), maxPoints) : 0;
  const pointsDiscount = pointsUsed * redeemRate;
  const finalAmount = Math.max(0, totalAmount - pointsDiscount);

  useEffect(() => {
    if (order) {
      setPaymentMethod('vietqr');
      setPointsInput(0);
      setUsePoints(false);
      setCashReceived(order.total_amount || 0);
    }
  }, [order, isOpen]);

  // Khi số điểm dùng thay đổi, cập nhật lại số tiền khách đưa (tab tiền mặt)
  useEffect(() => {
    if (order && paymentMethod === 'cash') {
      setCashReceived(finalAmount);
    }
  }, [finalAmount, paymentMethod, order]);

  if (!order || !isOpen) return null;

  const tableName = order.tables?.name || (order.order_type === 'takeaway' ? '🛍️ Mang Về' : 'Bàn');
  const qrUrl = getVietQRUrl(vietqrConfig, finalAmount, `${tableName} ${order.order_number}`);

  const pointsEarned = loyaltyConfig.enabled && loyaltyConfig.earn_rate
    ? Math.floor(finalAmount / loyaltyConfig.earn_rate)
    : 0;

  const handleFinish = async () => {
    if (paymentMethod === 'cash' && cashReceived < finalAmount) {
      alert('Số tiền khách đưa chưa đủ để thanh toán!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompleteCheckout({
        payment_method: paymentMethod,
        cash_received: cashReceived,
        discount: (Number(order.discount) || 0) + pointsDiscount,
        points_earned: pointsEarned,
        points_redeemed: pointsUsed,
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
            {formatVND(finalAmount)}
          </div>
          {order.customers && (
            <div className="inline-block mt-2 bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-semibold">
              ⭐ Tích lũy: +{pointsEarned} điểm cho {order.customers.full_name}
            </div>
          )}
        </div>

        {/* Tổng kết giảm do dùng điểm — hiện rõ trước khi bấm Xác Nhận Thu */}
        {pointsDiscount > 0 && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
            <span className="text-xs font-bold text-emerald-800">
              Giảm từ điểm ({pointsUsed} điểm)
            </span>
            <span className="text-sm font-black text-emerald-700">
              −{formatVND(pointsDiscount)}
            </span>
          </div>
        )}

        {/* ĐIỂM THƯỞNG — chọn rõ "Dùng điểm" hay "Để tích luỹ" */}
        {showPointsBlock && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wide">
                ⭐ Điểm thưởng
              </span>
              <span className="text-sm font-black text-amber-900">{customerPoints} điểm</span>
            </div>
            <div className="text-[11px] text-amber-700">
              1 điểm = {formatVND(redeemRate)} · {customerPoints} điểm tương đương{' '}
              {formatVND(customerPoints * redeemRate)}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  !usePoints ? 'border-amber-500 bg-white text-amber-900' : 'border-amber-200 bg-amber-50/60 text-amber-700'
                }`}
              >
                <input
                  type="radio"
                  name="point-choice"
                  checked={!usePoints}
                  onChange={() => {
                    setUsePoints(false);
                    setPointsInput(0);
                  }}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-bold">Để tích luỹ</span>
              </label>
              <label
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  usePoints ? 'border-amber-500 bg-white text-amber-900' : 'border-amber-200 bg-amber-50/60 text-amber-700'
                }`}
              >
                <input
                  type="radio"
                  name="point-choice"
                  checked={usePoints}
                  onChange={() => setUsePoints(true)}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-bold">Dùng điểm</span>
              </label>
            </div>

            {!usePoints && (
              <div className="text-[11px] text-amber-700">
                Khách sẽ không bị trừ điểm, chỉ được cộng thêm điểm mới theo tiền đơn.
              </div>
            )}

            {usePoints && (
              <div className="space-y-2">
                <div className="text-[11px] text-amber-700">
                  Được dùng tối đa {maxPoints} điểm ({formatVND(maxPoints * redeemRate)})
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxPoints}
                    inputMode="numeric"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-amber-300 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                    placeholder="Số điểm muốn dùng"
                  />
                  <button
                    type="button"
                    onClick={() => setPointsInput(maxPoints)}
                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold active:scale-95 shrink-0"
                  >
                    Dùng tối đa
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
              targetAmount={finalAmount}
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
                    Số tiền: <strong className="text-red-600">{formatVND(finalAmount)}</strong>
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
                discount: (Number(order.discount) || 0) + pointsDiscount,
                total_amount: finalAmount,
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
            disabled={isSubmitting || (paymentMethod === 'cash' && cashReceived < finalAmount)}
            onClick={handleFinish}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-base shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Đang xử lý...'
                : `Xác Nhận Thu ${formatVND(finalAmount)}`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
