import { useState } from 'react';
import { findCustomerByPhone, createCustomer } from '../../services/db';
import { Search, UserPlus, Star, Phone, Check, X } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function CustomerLookup({
  selectedCustomer,
  onSelectCustomer,
  loyaltyConfig,
  currentSubtotal = 0,
  redeemedDiscount = 0,
  onApplyDiscount,
}) {
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [usePoints, setUsePoints] = useState(false);

  const handleSearchPhone = async (e) => {
    e?.preventDefault();
    if (!phoneInput || phoneInput.trim().length < 9) return;

    setSearching(true);
    setNotFound(false);
    try {
      const cust = await findCustomerByPhone(phoneInput.trim());
      if (cust) {
        onSelectCustomer(cust);
        setShowAddForm(false);
      } else {
        setNotFound(true);
        setShowAddForm(true);
      }
    } catch (err) {
      console.error('Customer search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!phoneInput || !nameInput) return;

    try {
      const newCust = await createCustomer({
        phone: phoneInput.trim(),
        full_name: nameInput.trim(),
      });
      onSelectCustomer(newCust);
      setShowAddForm(false);
      setNotFound(false);
    } catch (err) {
      console.error('Error creating customer:', err);
    }
  };

  const handleToggleRedeemPoints = (checked) => {
    setUsePoints(checked);
    if (checked && selectedCustomer && loyaltyConfig?.redeem_rate) {
      // 1 point = redeem_rate VND
      const maxDiscountFromPoints = (selectedCustomer.points || 0) * loyaltyConfig.redeem_rate;
      const actualDiscount = Math.min(maxDiscountFromPoints, currentSubtotal);
      const pointsToUse = Math.ceil(actualDiscount / loyaltyConfig.redeem_rate);
      onApplyDiscount?.(actualDiscount, pointsToUse);
    } else {
      onApplyDiscount?.(0, 0);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
      {selectedCustomer ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900">
                  {selectedCustomer.full_name}
                </span>
                <span className="text-xs text-slate-500">
                  ({selectedCustomer.phone})
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  ⭐ {selectedCustomer.points || 0} điểm
                </span>
                {loyaltyConfig?.enabled && (
                  <span className="text-slate-400 text-[11px]">
                    (Quy đổi ~{formatVND((selectedCustomer.points || 0) * (loyaltyConfig?.redeem_rate || 100))})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loyaltyConfig?.enabled && (selectedCustomer.points || 0) > 0 && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={(e) => handleToggleRedeemPoints(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>Dùng điểm</span>
              </label>
            )}

            <button
              type="button"
              onClick={() => {
                onSelectCustomer(null);
                setUsePoints(false);
                onApplyDiscount?.(0, 0);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Bỏ chọn khách"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <form onSubmit={handleSearchPhone} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Nhập SĐT khách tích điểm..."
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !phoneInput}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm</span>
            </button>
          </form>

          {/* Quick Create if not found */}
          {showAddForm && (
            <form onSubmit={handleCreateCustomer} className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center gap-2 animate-in fade-in">
              <input
                type="text"
                placeholder="Họ tên khách mới..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-red-500"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-95 transition-all flex items-center gap-1 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
