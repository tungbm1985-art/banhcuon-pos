import { formatVND } from '../../utils/formatters';
import { Delete, ArrowRight } from 'lucide-react';

export default function Numpad({ targetAmount, cashReceived, onChangeCash }) {
  const denominations = [50000, 100000, 200000, 500000];

  const handleDigit = (digit) => {
    const currentStr = cashReceived.toString();
    if (digit === '000') {
      onChangeCash(Number(currentStr + '000'));
    } else {
      const nextStr = currentStr === '0' ? digit : currentStr + digit;
      onChangeCash(Number(nextStr));
    }
  };

  const handleBackspace = () => {
    const currentStr = cashReceived.toString();
    if (currentStr.length <= 1) {
      onChangeCash(0);
    } else {
      onChangeCash(Number(currentStr.slice(0, -1)));
    }
  };

  const handleClear = () => {
    onChangeCash(0);
  };

  const changeAmount = Math.max(0, cashReceived - targetAmount);

  return (
    <div className="space-y-3">
      {/* Summary Box */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div>
          <span className="text-xs text-slate-500 font-medium">Khách đưa:</span>
          <div className="text-lg font-black text-slate-900 truncate">
            {formatVND(cashReceived)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-medium">Tiền thừa trả khách:</span>
          <div
            className={`text-lg font-black truncate ${
              cashReceived >= targetAmount ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {cashReceived >= targetAmount ? formatVND(changeAmount) : `Thiếu ${formatVND(targetAmount - cashReceived)}`}
          </div>
        </div>
      </div>

      {/* Quick Denomination Chips */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => onChangeCash(targetAmount)}
          className="col-span-4 sm:col-span-1 py-2 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 active:scale-95 transition-all text-center"
        >
          Đủ tiền ({formatVND(targetAmount)})
        </button>
        {denominations.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChangeCash(val)}
            className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 active:scale-95 transition-all text-center"
          >
            {formatVND(val)}
          </button>
        ))}
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num.toString())}
            className="h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs font-bold text-lg text-slate-800 active:bg-slate-100 active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleDigit('000')}
          className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm active:scale-95 transition-all"
        >
          000
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs font-bold text-lg text-slate-800 active:bg-slate-100 active:scale-95 transition-all"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
