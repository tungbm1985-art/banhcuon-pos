import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import Header from './components/common/Header';
import Navigation from './components/common/Navigation';
import TableMap from './components/pos/TableMap';
import OrderDrawer from './components/pos/OrderDrawer';
import CheckoutModal from './components/pos/CheckoutModal';
import MenuManager from './components/menu/MenuManager';
import CustomerManager from './components/customers/CustomerManager';
import TableManager from './components/tables/TableManager';
import ExpenseManager from './components/expenses/ExpenseManager';
import FinanceManager from './components/finance/FinanceManager';
import ReportsView from './components/reports/ReportsView';
import OrderHistory from './components/orders/OrderHistory';
import StaffManager from './components/staff/StaffManager';
import SettingsView from './components/settings/SettingsView';
import BillReceipt from './components/print/BillReceipt';
import KitchenTicket from './components/print/KitchenTicket';
import LoginModal from './components/common/LoginModal';
import {
  DEFAULT_KITCHEN_STATION,
  groupItemsByKitchenStation,
} from './utils/kitchenStations';

import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getActiveOrders,
  createOrder,
  updateOrderItems,
  completeOrder,
  cancelOrder,
  subscribeToTables,
  subscribeToOrders,
  createPrintJob,
  isPrintQueueAvailable,
} from './services/db';

function MainApp() {
  const { currentUser, isManager, isAdmin } = useAuth();
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState('pos');
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active table / order drawer state
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrderForDrawer, setActiveOrderForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Checkout modal state
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Printing state
  const [printType, setPrintType] = useState(null); // 'bill' | 'kot'
  const [orderToPrint, setOrderToPrint] = useState(null);

  // Load all live data
  const loadData = async () => {
    try {
      const [tList, mList, oList] = await Promise.all([
        getTables(),
        getMenuItems(),
        getActiveOrders(),
      ]);
      setTables(tList);
      setMenuItems(mList);
      setActiveOrders(oList);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes on tables and orders
    const unsubscribeTables = subscribeToTables(() => {
      getTables().then(setTables);
    });

    const unsubscribeOrders = subscribeToOrders(() => {
      getActiveOrders().then(setActiveOrders);
      getTables().then(setTables);
    });

    return () => {
      unsubscribeTables();
      unsubscribeOrders();
    };
  }, []);

  // Table selection from Table Map
  const handleSelectTable = (table, order) => {
    setSelectedTable(table);
    setActiveOrderForDrawer(order || null);
    setIsDrawerOpen(true);
  };

  // Save / Update order from Drawer
  const handleSaveOrder = async (orderData) => {
    try {
      let savedOrder = null;
      if (activeOrderForDrawer) {
        savedOrder = await updateOrderItems(
          activeOrderForDrawer.id,
          orderData.items,
          orderData.notes,
          orderData.discount
        );
      } else {
        savedOrder = await createOrder(orderData);
      }

      await loadData();
      setActiveOrderForDrawer(savedOrder);
      return savedOrder;
    } catch (err) {
      alert('Lỗi lưu đơn hàng: ' + err.message);
      return null;
    }
  };

  const useLANPrint =
    settings?.print_config?.print_mode === 'lan' &&
    settings?.print_config?.printer_enabled &&
    !!settings?.print_config?.printer_ip;

  const printViaLAN = async (order, type) => {
    const cfg = settings.print_config || {};
    const ip = cfg.printer_ip;
    const port = cfg.printer_port || 9100;

    // 1) Ưu tiên: đẩy lệnh in vào hàng đợi trên Supabase.
    //    Vì là HTTPS nên chạy được từ mọi mạng (WiFi quán hoặc 4G),
    //    không bị trình duyệt chặn như gọi thẳng HTTP vào máy in LAN.
    if (isPrintQueueAvailable()) {
      const job = await createPrintJob({
        jobType: type,
        printerIp: ip,
        printerPort: port,
        payload: {
          order,
          settings,
          kitchenTickets: order.kitchenTickets || [],
        },
      });
      if (job) return; // Print Server trên máy tính tiền sẽ tự lấy và in
    }

    // 2) Dự phòng: gọi Print Server ngay trên máy đang mở app
    //    (chỉ thành công khi chính máy này đang chạy "npm run print-server").
    try {
      if (type === 'bill') {
        const res = await fetch('http://localhost:3001/print-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, port, order, settings }),
        });
        const data = await res.json();
        if (!data.success) {
          alert('Lỗi in LAN: ' + (data.error || 'Không xác định'));
        }
      } else if (type === 'kot') {
        const tickets = order.kitchenTickets || [];
        for (const ticket of tickets) {
          await fetch('http://localhost:3001/print-kot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip,
              port,
              order,
              itemsToPrint: ticket.items,
              kitchenStation: ticket.kitchenStation,
              settings,
            }),
          });
        }
      }
    } catch {
      alert('Không kết nối được máy in LAN. Đã chuyển về in qua trình duyệt.');
      doPrint();
    }
  };

  const queuePrint = (order, type) => {
    setOrderToPrint(order);
    setPrintType(type);
    setTimeout(() => {
      if (useLANPrint) {
        printViaLAN(order, type);
      } else {
        doPrint();
      }
    }, 150);
  };

  // Send KOT to Kitchen
  const handleSendKOT = (order) => {
    const fullOrder = {
      ...order,
      tables: order.tables || selectedTable || tables.find((t) => t.id === order.table_id) || { name: 'Bàn' },
      created_at: order.created_at || new Date().toISOString(),
      kitchenTickets: groupItemsByKitchenStation(order.order_items || []),
    };
    queuePrint(fullOrder, 'kot');
  };

  const handlePrintBill = (order) => {
    queuePrint(
      {
        ...order,
        tables: order.tables || selectedTable || tables.find((t) => t.id === order.table_id),
        created_at: order.created_at || new Date().toISOString(),
      },
      'bill'
    );
  };

  const handleReprintBill = (order) => {
    queuePrint(
      {
        ...order,
        tables: order.tables || tables.find((t) => t.id === order.table_id),
      },
      'bill'
    );
  };

  // Open Checkout Modal
  const handleOpenCheckout = (order) => {
    setIsDrawerOpen(false);
    setCheckoutOrder(order);
    setIsCheckoutOpen(true);
  };

  // Complete Checkout
  const handleCompleteCheckout = async (paymentDetails) => {
    if (!checkoutOrder) return;
    try {
      const completed = await completeOrder(checkoutOrder.id, paymentDetails);
      await loadData();

      // Check auto print bill setting
      if (settings?.print_config?.auto_print_bill !== false) {
        const printOrder = {
          ...completed,
          tables: completed.tables || checkoutOrder.tables || tables.find((t) => t.id === completed.table_id),
          customers: completed.customers || checkoutOrder.customers,
          created_at: completed.created_at || new Date().toISOString(),
        };
        setOrderToPrint(printOrder);
        setPrintType('bill');
        setTimeout(() => {
          if (useLANPrint) {
            printViaLAN(printOrder, 'bill');
          } else {
            doPrint();
          }
        }, 200);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      throw err;
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId, 'Hủy bởi nhân viên');
      setIsDrawerOpen(false);
      await loadData();
    } catch (err) {
      alert('Lỗi hủy đơn: ' + err.message);
    }
  };

  // Menu item actions
  const handleToggleAvailability = async (id, isAvailable) => {
    try {
      await toggleMenuItemAvailability(id, isAvailable);
      const updated = await getMenuItems();
      setMenuItems(updated);
    } catch (err) {
      alert('Lỗi cập nhật món: ' + err.message);
    }
  };

  const handleSaveMenuItem = async (itemData) => {
    if (itemData.id) {
      await updateMenuItem(itemData.id, itemData);
    } else {
      await createMenuItem(itemData);
    }
    const updated = await getMenuItems();
    setMenuItems(updated);
  };

  const handleDeleteMenuItem = async (id) => {
    await deleteMenuItem(id);
    const updated = await getMenuItems();
    setMenuItems(updated);
  };

  // Table actions
  const handleCreateTable = async (tableData) => {
    await createTable(tableData);
    const updated = await getTables();
    setTables(updated);
  };

  const handleUpdateTable = async (id, updates) => {
    await updateTable(id, updates);
    const updated = await getTables();
    setTables(updated);
  };

  const handleDeleteTable = async (id) => {
    await deleteTable(id);
    const updated = await getTables();
    setTables(updated);
  };

  // Quick Add Takeaway Slot
  const handleQuickAddTakeaway = async () => {
    try {
      const takeawayTables = tables.filter((t) => t.zone === 'Takeaway');
      let nextNum = takeawayTables.length + 1;
      takeawayTables.forEach((t) => {
        const match = t.name.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num >= nextNum) nextNum = num + 1;
        }
      });
      const numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      const newTakeawayName = `🛍️ Mang Về ${numStr}`;
      const newTable = await createTable({
        name: newTakeawayName,
        zone: 'Takeaway',
        display_order: nextNum,
      });
      const updated = await getTables();
      setTables(updated);
      // Automatically open drawer for order entry
      handleSelectTable(newTable, null);
    } catch (err) {
      alert('Lỗi tạo đơn mang về: ' + err.message);
    }
  };

  // Test print handlers
  const handleTestPrintBill = () => {
    const sampleOrder = {
      order_number: 'BC-TEST-001',
      total_amount: 95000,
      subtotal: 95000,
      discount: 0,
      payment_method: 'vietqr',
      created_at: new Date().toISOString(),
      tables: { name: 'Bàn 01' },
      customers: { full_name: 'Nguyễn Văn Minh', phone: '0912345678', points: 35 },
      order_items: [
        { item_name: 'Bánh Cuốn Chả Nướng Thanh Hóa', quantity: 2, unit_price: 40000 },
        { item_name: 'Nước Mía Tươi Tắc', quantity: 1, unit_price: 15000, notes: 'Ít đá' },
      ],
    };
    setOrderToPrint(sampleOrder);
    setPrintType('bill');
    setTimeout(() => {
      doPrint();
    }, 150);
  };

  const handleTestPrintKOT = () => {
    const sampleOrder = {
      order_number: 'BC-TEST-001',
      created_at: new Date().toISOString(),
      tables: { name: 'Bàn 01' },
      notes: 'Bàn ưu tiên làm trước, khách đang vội',
      order_items: [
        { item_name: 'Bánh Cuốn Trứng Lòng Đào', quantity: 1, notes: 'Trứng chín vừa', kitchen_station: 'Bếp tráng' },
        { item_name: 'Chả Nướng Thanh Hóa', quantity: 2, notes: 'Nướng kỹ', kitchen_station: 'Bếp nướng' },
        { item_name: 'Nước Mía Tươi Tắc', quantity: 1, notes: 'Ít đá', kitchen_station: 'Bếp pha chế' },
      ],
    };
    sampleOrder.kitchenTickets = groupItemsByKitchenStation(sampleOrder.order_items);
    setOrderToPrint(sampleOrder);
    setPrintType('kot');
    setTimeout(() => {
      doPrint();
    }, 150);
  };

  const is80mm = settings?.print_config?.paper_size === '80mm';

  // Safe print helper: detects whether a printer is available based on
  // how quickly the print dialog closes after window.print() is invoked.
  // Returns: 'printed' | 'not-installed' | 'not-found' | 'error'
  const safePrint = () => {
    return new Promise((resolve) => {
      if (typeof window.print !== 'function') {
        resolve('not-installed');
        return;
      }

      let resolved = false;
      const startedAt = Date.now();

      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        if (resolved) return;
        resolved = true;
        const elapsed = Date.now() - startedAt;
        if (elapsed < 500) {
          // Print service likely not installed on the device
          resolve('not-installed');
        } else if (elapsed < 1500) {
          // Print service exists but no printer found/connected
          resolve('not-found');
        } else {
          // User interacted with the dialog; print command was sent
          resolve('printed');
        }
      };

      window.addEventListener('afterprint', handleAfterPrint);

      // Safety fallback in case afterprint never fires
      const safetyTimer = setTimeout(() => {
        window.removeEventListener('afterprint', handleAfterPrint);
        if (!resolved) {
          resolved = true;
          resolve('printed');
        }
      }, 30000);

      try {
        window.print();
      } catch (e) {
        window.removeEventListener('afterprint', handleAfterPrint);
        clearTimeout(safetyTimer);
        if (!resolved) {
          resolved = true;
          resolve('not-installed');
        }
      }
    });
  };

  // Wrapper that shows appropriate warnings and keeps current behavior on success
  const doPrint = async () => {
    const status = await safePrint();
    if (status === 'not-installed') {
      alert('Thiết bị chưa cài đặt máy in. Vui lòng cài đặt máy in trước khi in.');
    } else if (status === 'not-found') {
      alert('Không tìm thấy máy in. Vui lòng kiểm tra kết nối máy in và thử lại.');
    }
    // 'printed' → no alert, keep current behavior
  };

  // Check if current user is allowed to view the active tab
  const canViewTab = (tab) => {
    switch (tab) {
      case 'pos':
      case 'history':
      case 'menu':
      case 'customers':
        return true;
      case 'tables':
      case 'expenses':
      case 'reports':
        return isManager;
      case 'staff':
      case 'settings':
      case 'finance':
        return isAdmin;
      default:
        return true;
    }
  };

  const showNoPermission =
    !canViewTab(activeTab) &&
    !['pos', 'history', 'menu', 'customers'].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 1. Header */}
      <Header onRefresh={loadData} activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* 2. Top Navigation for desktop */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeOrdersCount={activeOrders.length}
      />

      {/* 3. Main Views Container */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {activeTab === 'pos' && (
          <TableMap
            tables={tables}
            activeOrders={activeOrders}
            onSelectTable={handleSelectTable}
            onQuickAddTakeaway={handleQuickAddTakeaway}
            onDeleteTable={handleDeleteTable}
          />
        )}

        {activeTab === 'history' && <OrderHistory onReprintBill={handleReprintBill} />}

        {activeTab === 'menu' && (
          <MenuManager
            menuItems={menuItems}
            onToggleAvailability={handleToggleAvailability}
            onSaveMenuItem={handleSaveMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager loyaltyConfig={settings?.loyalty_config} />
        )}

        {activeTab === 'tables' && isManager && (
          <TableManager
            tables={tables}
            onCreateTable={handleCreateTable}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
          />
        )}

        {activeTab === 'expenses' && isManager && <ExpenseManager />}

        {activeTab === 'reports' && isManager && <ReportsView />}

        {activeTab === 'staff' && isAdmin && <StaffManager />}

        {activeTab === 'finance' && isAdmin && <FinanceManager />}

        {activeTab === 'settings' && isAdmin && (
          <SettingsView
            onTestPrintBill={handleTestPrintBill}
            onTestPrintKOT={handleTestPrintKOT}
          />
        )}

        {/* No Permission Fallback */}
        {showNoPermission && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <span className="text-4xl">🚫</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-2">
              Bạn không có quyền thực hiện thao tác này
            </h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Tài khoản hiện tại không được phép truy cập mục này. Vui lòng liên hệ chủ quán nếu cần hỗ trợ.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs active:scale-95 transition-all"
            >
              Quay lại Bán Hàng
            </button>
          </div>
        )}
      </main>

      {/* 4. Order Drawer */}
      {isDrawerOpen && (
        <OrderDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          table={selectedTable}
          activeOrder={activeOrderForDrawer}
          menuItems={menuItems}
          settings={settings}
          onSaveOrder={handleSaveOrder}
          onSendKOT={handleSendKOT}
          onPrintBill={handlePrintBill}
          onOpenCheckout={handleOpenCheckout}
          onCancelOrder={handleCancelOrder}
          canCancel={isAdmin}
        />
      )}

      {/* 5. Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          order={checkoutOrder}
          settings={settings}
          onCompleteCheckout={handleCompleteCheckout}
          onPrintBill={handlePrintBill}
        />
      )}

      {/* 6. Login Screen (shows when not logged in or after logout) */}
      {!currentUser && <LoginModal isOpen={true} />}

      {/* 7. Dynamic Thermal Roll Size Style for exact print preview */}
      <style>{`
        @media print {
          @page {
            size: ${is80mm ? '80mm auto' : '58mm auto'} !important;
            margin: 0mm !important;
          }
        }
      `}</style>

      {/* 8. Hidden Print Section (@media print only) */}
      <div className="print-only">
        {printType === 'bill' && (
          <BillReceipt
            order={orderToPrint}
            settings={settings}
            cashierName={currentUser?.full_name || 'Nhân viên'}
            is80mm={is80mm}
          />
        )}
        {printType === 'kot' &&
          (orderToPrint?.kitchenTickets?.length
            ? orderToPrint.kitchenTickets.map((ticket) => (
                <div className="kot-ticket-page" key={ticket.kitchenStation}>
                  <KitchenTicket
                    order={orderToPrint}
                    itemsToPrint={ticket.items}
                    kitchenStation={ticket.kitchenStation}
                    is80mm={is80mm}
                  />
                </div>
              ))
            : (
                <div className="kot-ticket-page">
                  <KitchenTicket
                    order={orderToPrint}
                    kitchenStation={DEFAULT_KITCHEN_STATION}
                    is80mm={is80mm}
                  />
                </div>
              ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
