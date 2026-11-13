import { useState, useEffect, useRef } from 'react';
import CustomerLookup from './CustomerLookup';
import MenuSelector from './MenuSelector';
import { formatVND } from '../../utils/formatters';
import { decideKitchenSend, KOT_REPRINT_ON_PRESS } from '../../utils/kitchenSend';
import {
  DEFAULT_KITCHEN_STATION,
  getDefaultKitchenStation,
} from '../../utils/kitchenStations';
import {
  Trash2,
  Plus,
  Minus,
  Utensils,
  Receipt,
  X,
  ChefHat,
  MessageSquare,
  ArrowLeft,
  Printer,
} from 'lucide-react';

const KOT_STORAGE_KEY = 'banhcuon_kot_sent';

function readKotState(orderId) {
  if (!orderId) return { snapshot: {}, idlePresses: 0 };
  try {
    const all = JSON.parse(localStorage.getItem(KOT_STORAGE_KEY) || '{}');
    const saved = all[orderId];
    if (!saved) return { snapshot: {}, idlePresses: 0 };
    return {
      snapshot: saved.snapshot || {},
      idlePresses: Number(saved.idlePresses) || 0,
    };
  } catch {
    return { snapshot: {}, idlePresses: 0 };
  }
}

function writeKotState(orderId, state) {
  if (!orderId) return;
  try {
    const all = JSON.parse(localStorage.getItem(KOT_STORAGE_KEY) || '{}');
    all[orderId] = {
      snapshot: state.snapshot || {},
      idlePresses: state.idlePresses || 0,
    };
    localStorage.setItem(KOT_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Không lưu được trạng thái báo bếp:', err);
  }
}

export default function OrderDrawer({
  isOpen,
  onClose,
  table,
  activeOrder,
  menuItems = [],
  settings,
  onSaveOrder,
  onSendKOT,
  onPrintBill,
  onOpenCheckout,
  onCancelOrder,
  canCancel = true,
}) {
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'cart'
  const [editingNotesItemIdx, setEditingNotesItemIdx] = useState(null);
  // Per order: quantities already sent to the kitchen, plus idle taps.
  // idlePresses chỉ đếm trong phiên đang mở (reset khi mở đơn) để tránh in lại sớm.
  const kotRef = useRef({ orderId: undefined, snapshot: {}, idlePresses: 0 });
  const [kotIdle, setKotIdle] = useState(0);
  // Chặn bấm trùng khi đang xử lý (tránh in trùng phiếu bếp)
  const [sendingKot, setSendingKot] = useState(false);
  // Thông báo to khi đã báo bếp hết
  const [kotNotice, setKotNotice] = useState(false);
  const kotNoticeTimer = useRef(null);

  const showKotNotice = () => {
    setKotNotice(true);
    clearTimeout(kotNoticeTimer.current);
    kotNoticeTimer.current = setTimeout(() => setKotNotice(false), 3200);
  };

  useEffect(() => () => clearTimeout(kotNoticeTimer.current), []);

  // Initialize or update from activeOrder
  useEffect(() => {
    if (!isOpen || !table) return;

    if (activeOrder) {
      setCartItems(
        (activeOrder.order_items || []).map((it) => ({
          id: it.id,
          menu_item_id: it.menu_item_id,
          name: it.item_name,
          price: Number(it.unit_price) || 0,
          quantity: Number(it.quantity) || 1,
          notes: it.notes || '',
          kitchen_station:
            menuItems.find((menuItem) => menuItem.id === it.menu_item_id)
              ?.kitchen_station || getDefaultKitchenStation(it),
        }))
      );
      setSelectedCustomer(activeOrder.customers || null);
      setOrderNotes(activeOrder.notes || '');
      setDiscountAmount(Number(activeOrder.discount) || 0);
      setActiveTab(activeOrder.order_items?.length ? 'cart' : 'menu');
    } else {
      // New order
      setCartItems([]);
      setSelectedCustomer(null);
      setOrderNotes('');
      setDiscountAmount(0);
      setActiveTab('menu');
    }
  }, [activeOrder, table, isOpen, menuItems]);

  // Load kitchen-sent quantities when the order changes.
  // Giữ số lượng đã báo bếp, nhưng đếm lại từ 0 cho phiên bấm hiện tại.
  useEffect(() => {
    if (!isOpen) return;
    const orderId = activeOrder?.id || null;
    if (kotRef.current.orderId === orderId) return;
    const stored = readKotState(orderId);
    kotRef.current = { orderId, snapshot: stored.snapshot, idlePresses: 0 };
    setKotIdle(0);
  }, [isOpen, activeOrder?.id]);

  if (!isOpen || !table) return null;

  // Cart operations
  const handleAddToCart = (item) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => (i.menu_item_id || i.id) === item.id
      );
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        {
          id: item.id,
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: 1,
          notes: '',
          kitchen_station:
            item.kitchen_station || DEFAULT_KITCHEN_STATION,
        },
      ];
    });
  };

  const handleUpdateQty = (idx, delta) => {
    setCartItems((prev) => {
      const copy = [...prev];
      const newQty = copy[idx].quantity + delta;
      if (newQty <= 0) {
        copy.splice(idx, 1);
      } else {
        copy[idx].quantity = newQty;
      }
      return copy;
    });
  };

  const handleRemoveItem = (idx) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemNotes = (idx, notes) => {
    setCartItems((prev) => {
      const copy = [...prev];
      copy[idx].notes = notes;
      return copy;
    });
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSaveAndSync = async () => {
    if (cartItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 món để tạo đơn!');
      return null;
    }
    const orderData = {
      table_id: table.id,
      order_type: table.zone === 'Takeaway' ? 'takeaway' : 'dine_in',
      customer_id: selectedCustomer?.id || null,
      notes: orderNotes,
      discount: discountAmount,
      items: cartItems.map((it) => ({
        id: it.id,
        menu_item_id: it.menu_item_id || it.id,
        item_name: it.name,
        unit_price: it.price,
        quantity: it.quantity,
        notes: it.notes,
      })),
    };
    return await onSaveOrder(orderData);
  };

  const rememberKot = (orderId, decision) => {
    kotRef.current = {
      orderId,
      snapshot: decision.snapshot,
      idlePresses: decision.idlePresses,
    };
    setKotIdle(decision.idlePresses);
    writeKotState(orderId, kotRef.current);
  };

  const handleKOTClick = async () => {
    if (sendingKot) return;
    setSendingKot(true);
    try {
      await sendKOT();
    } finally {
      setSendingKot(false);
    }
  };

  const sendKOT = async () => {
    const saved = await handleSaveAndSync();
    if (!saved) return;

    const orderId = saved.id;
    if (kotRef.current.orderId !== orderId) {
      const stored = readKotState(orderId);
      const memorySnapshot = kotRef.current.snapshot || {};
      const storedHasSent = Object.values(stored.snapshot || {}).some((qty) => Number(qty) > 0);
      kotRef.current = {
        orderId,
        snapshot: storedHasSent ? stored.snapshot : memorySnapshot,
        idlePresses: 0,
      };
    }

    const decision = decideKitchenSend({
      snapshot: kotRef.current.snapshot,
      idlePresses: kotRef.current.idlePresses,
      items: cartItems.map((item) => ({
        menu_item_id: item.menu_item_id || item.id,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes || '',
        kitchen_station:
          item.kitchen_station ||
          menuItems.find(
            (menuItem) => menuItem.id === (item.menu_item_id || item.id)
          )?.kitchen_station ||
          getDefaultKitchenStation(item),
      })),
    });

    if (decision.action === 'noop') {
      rememberKot(orderId, decision);
      showKotNotice();
      return;
    }

    rememberKot(orderId, decision);

    onSendKOT({
      ...saved,
      tables: table,
      notes: orderNotes,
      order_items: decision.items,
      kotRound: decision.kotRound,
      kotReprint: decision.kotReprint,
    });
  };

  const handlePrintBillClick = async () => {
    const saved = await handleSaveAndSync();
    if (!saved || !onPrintBill) return;
    onPrintBill({
      ...saved,
      tables: table,
      customers: selectedCustomer,
      notes: orderNotes,
      discount: discountAmount,
      subtotal,
      total_amount: totalAmount,
    });
  };

  const handleCheckoutClick = async () => {
    const saved = await handleSaveAndSync();
    if (saved) {
      onOpenCheckout({
        ...saved,
        total_amount: totalAmount,
        discount: discountAmount,
        customers: selectedCustomer,
        tables: table,
      });
    }
  };

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {table.name}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {table.zone}
                </span>
                {table.status === 'occupied' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 animate-pulse">
                    Đang phục vụ
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {activeOrder
                  ? `Mã: ${activeOrder.order_number}`
                  : 'Tạo đơn gọi món mới'}
              </p>
            </div>
          </div>

          {/* Right Action: Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Toggle Bar (Chosse Menu vs Cart) */}
        <div className="grid grid-cols-2 bg-slate-100 p-1.5 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'menu'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4 text-red-600" />
            <span>Thực Đơn Món</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cart')}
            className={`relative py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'cart'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Đơn Đang Chọn ({totalItemsCount})</span>
            {totalItemsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-600" />
            )}
          </button>
        </div>

        {/* Body View */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 no-scrollbar">
          {activeTab === 'menu' ? (
            <MenuSelector
              menuItems={menuItems}
              cartItems={cartItems}
              onAddToCart={handleAddToCart}
            />
          ) : (
            <div className="space-y-3">
              {/* Customer Loyalty Search */}
              <CustomerLookup
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                loyaltyConfig={settings?.loyalty_config}
              />

              {/* Cart Items List */}
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {cartItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Chưa có món nào trong đơn</p>
                    <button
                      onClick={() => setActiveTab('menu')}
                      className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold active:scale-95"
                    >
                      + Chọn món ngay
                    </button>
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {item.name}
                          </h4>
                          <span className="text-xs font-semibold text-red-600">
                            {formatVND(item.price)}
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-black text-sm text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center ml-1"
                            title="Xóa món"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Notes toggle/input */}
                      <div className="flex items-center gap-2 text-xs">
                        {editingNotesItemIdx === idx ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              placeholder="Ghi chú món (ví dụ: Ít ớt, nhiều hành phi...)"
                              value={item.notes}
                              onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs focus:bg-white focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingNotesItemIdx(null)}
                              className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[11px] font-bold"
                            >
                              Xong
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingNotesItemIdx(idx)}
                            className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px]"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>
                              {item.notes ? (
                                <strong className="text-amber-700 font-medium">Ghi chú: {item.notes}</strong>
                              ) : (
                                '+ Thêm ghi chú món'
                              )}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Order Level Notes */}
              {cartItems.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Ghi chú chung cho đơn / Khách dặn:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Mang ra cùng lúc, khách đang vội..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Cart Summary & Sticky Action Bar */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4 space-y-2.5 shadow-lg">
          {/* Quick Price Breakdown */}
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">
              Tạm tính ({totalItemsCount} món):
            </span>
            <span className="font-bold text-slate-900">{formatVND(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs sm:text-sm text-red-600">
              <span className="font-medium">Giảm giá / Ưu đãi điểm:</span>
              <span className="font-bold">-{formatVND(discountAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-base sm:text-lg border-t border-slate-100 pt-1.5 font-black text-slate-900">
            <span>Tổng thanh toán:</span>
            <span className="text-red-600 text-xl">{formatVND(totalAmount)}</span>
          </div>

          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={handlePrintBillClick}
            className="w-full py-2.5 px-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-bold text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>In bill thanh toán</span>
          </button>

          {kotIdle > 0 && (
            <p className="text-[11px] text-center text-amber-700 font-medium">
              Đã báo bếp đủ món. Bấm thêm {KOT_REPRINT_ON_PRESS - kotIdle} lần nữa để in lại toàn bộ.
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Send to Kitchen / KOT */}
            <button
              type="button"
              disabled={cartItems.length === 0 || sendingKot}
              onClick={handleKOTClick}
              className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span className="text-center leading-tight">
                {sendingKot
                  ? 'Đang gửi bếp...'
                  : activeOrder
                    ? 'Báo Bếp (KOT)'
                    : 'Tạo Đơn - Báo Bếp (KOT)'}
              </span>
            </button>

            {/* Checkout */}
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={handleCheckoutClick}
              className="py-3 px-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white font-black text-xs sm:text-sm shadow-md shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span>Thanh Toán</span>
            </button>
          </div>

          {/* Cancel Order / Free Table button */}
          {activeOrder && canCancel && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Bạn có chắc muốn hủy đơn hàng ${table.name}?`)) {
                    onCancelOrder(activeOrder.id);
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold py-1 px-3 rounded-lg hover:bg-red-50"
              >
                Hủy đơn & giải phóng bàn
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thông báo to khi đã báo bếp hết */}
      {kotNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setKotNotice(false)}
        >
          <div className="bg-white rounded-3xl px-8 py-7 text-center shadow-2xl max-w-sm w-full">
            <div className="text-4xl sm:text-5xl font-black text-red-600 tracking-tight">
              ĐÃ BÁO HẾT
            </div>
            <div className="mt-3 text-base sm:text-lg font-bold text-slate-700">
              Bấm thêm 3 lần để in báo lại toàn bộ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
