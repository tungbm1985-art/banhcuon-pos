import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { DialogProvider, useDialog } from './contexts/DialogContext';
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
  const { showAlert } = useDialog();

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
  // Khung in ẩn dùng để phát lệnh in RA NGOÀI frame của app (xem queuePrint).
  const printFrameRef = useRef(null);
  const printTimersRef = useRef([]);

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
      // Đơn đã thu tiền/đã hủy thì không ghi đè nữa, tạo đơn mới
      // (tránh món mới bị ghi vào đơn cũ và tưởng là không tạo được đơn).
      const canEditExisting =
        activeOrderForDrawer &&
        (activeOrderForDrawer.status === 'pending' || activeOrderForDrawer.status === 'served');

      let savedOrder = null;
      if (canEditExisting) {
        savedOrder = await updateOrderItems(
          activeOrderForDrawer.id,
          orderData.items,
          orderData.notes,
          orderData.discount
        );
      } else {
        savedOrder = await createOrder(orderData);
      }

      // Làm mới dữ liệu chạy nền, không chặn bước tiếp theo
      // (hộp thoại thanh toán phải hiện ra ngay, không đợi tải lại xong)
      loadData();
      setActiveOrderForDrawer(savedOrder);
      return savedOrder;
    } catch (err) {
      showAlert('Lỗi lưu đơn hàng: ' + err.message, { variant: 'danger' });
      return null;
    }
  };

  const useLANPrint =
    settings?.print_config?.print_mode === 'lan' &&
    settings?.print_config?.printer_enabled &&
    !!settings?.print_config?.printer_ip;

  const printViaLAN = async (order, type, html) => {
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
          showAlert('Lỗi in LAN: ' + (data.error || 'Không xác định'), { variant: 'danger' });
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
      showAlert('Không kết nối được máy in LAN. Đã chuyển về in qua trình duyệt.', {
        variant: 'warning',
      });
      await doPrint(html);
    }
  };

  // Dọn khung in ẩn cũ (nếu có) cùng các timer đang chờ của nó.
  const disposePrintFrame = () => {
    printTimersRef.current.forEach((id) => clearTimeout(id));
    printTimersRef.current = [];
    const frame = printFrameRef.current;
    if (frame) {
      frame.onload = null;
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      printFrameRef.current = null;
    }
  };

  // Dọn khung in khi rời màn hình (tránh sót iframe ẩn).
  useEffect(() => disposePrintFrame, []);

  // Dọn sạch trạng thái in của app (nội dung phiếu đang gắn trong cây DOM React).
  const clearPrintState = () => {
    setPrintType(null);
    setOrderToPrint(null);
  };

  // NGUYÊN NHÂN GỐC LỖI "ĐƠ GIAO DIỆN SAU KHI THANH TOÁN / BÁO BẾP":
  // window.print() không chạy ở luồng nền. Nó mở một "nested event loop" và TẠM
  // DỪNG (pause) execution context của CHÍNH FRAME gọi nó cho tới khi hộp thoại
  // in đóng lại (Chromium: "Pausing is generally only used for nested event
  // loops (ie. synchronous print)"; window.print nằm trong nhóm kPaused).
  // Nếu máy in chưa bật / dịch vụ in không phản hồi thì hộp thoại in không bao
  // giờ đóng → frame đó treo vĩnh viễn → toàn bộ app đơ, phải tải lại trang.
  // Cả luồng TỰ ĐỘNG IN BILL sau khi thu tiền lẫn luồng IN PHIẾU BẾP (Báo bếp)
  // đều gọi window.print() nên đều gây đơ; lệnh in treo của đơn trước còn làm
  // hộp thoại thanh toán của đơn sau hiện chậm.
  // CÁCH SỬA: không gọi window.print() trong frame của app nữa. Nội dung phiếu
  // được chụp lại rồi đưa sang một <iframe> ẩn RIÊNG, lệnh in phát trong frame
  // đó. Frame của app không bị tạm dừng nên dù môi trường in có treo thì giao
  // diện vẫn dùng bình thường. Trạng thái in của app được dọn NGAY sau khi chụp
  // xong phiếu, hoàn toàn KHÔNG phụ thuộc vào việc in đã xong hay chưa.
  const queuePrint = (order, type) => {
    disposePrintFrame();
    setOrderToPrint(order);
    setPrintType(type);

    // Cho React vẽ xong nội dung phiếu rồi mới lấy HTML đem đi in.
    const timer = setTimeout(() => {
      const container = document.querySelector('.print-only');
      const html = container ? buildPrintDocument(container.outerHTML) : '';

      // Dọn state in ngay sau khi đã chụp xong nội dung phiếu.
      clearPrintState();

      if (!html) return;

      if (useLANPrint) {
        printViaLAN(order, type, html).catch((err) => console.error('Lỗi in LAN:', err));
      } else {
        doPrint(html).catch((err) => console.error('Lỗi in:', err));
      }
    }, 120);
    printTimersRef.current.push(timer);
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
    const currentCheckout = checkoutOrder;
    if (!currentCheckout) return;
    try {
      const completed = await completeOrder(currentCheckout.id, paymentDetails);

      // Làm mới bảng bàn TRƯỚC khi đóng hộp thoại, để lúc bấm được vào bàn
      // thì bàn đã hiện trống và không mở nhầm lại đơn vừa thu tiền.
      await loadData();

      // Reset state sau khi thu tiền để tạo được đơn tiếp theo ngay,
      // không phải tải lại trang.
      setCheckoutOrder(null);
      setIsCheckoutOpen(false);
      setActiveOrderForDrawer(null);
      setIsDrawerOpen(false);

      // Check auto print bill setting
      if (settings?.print_config?.auto_print_bill !== false) {
        const printOrder = {
          ...completed,
          tables: completed.tables || currentCheckout.tables || tables.find((t) => t.id === completed.table_id),
          customers: completed.customers || currentCheckout.customers,
          created_at: completed.created_at || new Date().toISOString(),
        };
        queuePrint(printOrder, 'bill');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      throw err;
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId, options = {}) => {
    try {
      await cancelOrder(orderId, {
        reason: options.reason || 'Huỷ đơn chưa thanh toán',
        cancelledBy: options.cancelledBy || currentUser?.full_name || '',
      });
      setIsDrawerOpen(false);
      await loadData();
      return true;
    } catch (err) {
      showAlert('Lỗi hủy đơn: ' + err.message, { variant: 'danger' });
      throw err;
    }
  };

  // Menu item actions
  const handleToggleAvailability = async (id, isAvailable) => {
    try {
      await toggleMenuItemAvailability(id, isAvailable);
      const updated = await getMenuItems();
      setMenuItems(updated);
    } catch (err) {
      showAlert('Lỗi cập nhật món: ' + err.message, { variant: 'danger' });
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
      showAlert('Lỗi tạo đơn mang về: ' + err.message, { variant: 'danger' });
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
    queuePrint(sampleOrder, 'bill');
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
    queuePrint(sampleOrder, 'kot');
  };

  const is80mm = settings?.print_config?.paper_size === '80mm';

  // Gộp nội dung phiếu + toàn bộ CSS của app vào một tài liệu HTML độc lập để in
  // trong iframe (giữ nguyên đúng giao diện phiếu in như trước đây).
  const buildPrintDocument = (bodyHtml) => {
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    return [
      '<!doctype html><html><head><meta charset="utf-8">',
      `<base href="${document.baseURI}">`,
      styles,
      '</head><body>',
      bodyHtml,
      '</body></html>',
    ].join('');
  };

  // Phát lệnh in trong iframe ẩn để KHÔNG tạm dừng frame của app.
  // Trả về: 'printed' | 'not-installed' | 'not-found' | 'error'
  const printHtmlInFrame = (html) =>
    new Promise((resolve) => {
      disposePrintFrame();

      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      frame.setAttribute('title', 'Khung in hoá đơn');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      printFrameRef.current = frame;

      let done = false;
      const finish = (status) => {
        if (done) return;
        done = true;
        resolve(status);
      };

      frame.onload = () => {
        const win = frame.contentWindow;
        const doc = frame.contentDocument;
        if (!win || !doc) {
          finish('error');
          return;
        }

        const startedAt = Date.now();
        const handleAfterPrint = () => {
          win.removeEventListener('afterprint', handleAfterPrint);
          const elapsed = Date.now() - startedAt;
          if (elapsed < 500) {
            // Máy/dịch vụ in không có trên thiết bị
            finish('not-installed');
          } else if (elapsed < 1500) {
            // Có dịch vụ in nhưng không tìm thấy máy in
            finish('not-found');
          } else {
            finish('printed');
          }
        };
        win.addEventListener('afterprint', handleAfterPrint);

        waitForPrintImages(doc).then(() => {
          try {
            win.focus();
            win.print();
          } catch {
            win.removeEventListener('afterprint', handleAfterPrint);
            finish('not-installed');
          }
        });
      };

      frame.srcdoc = html;
      document.body.appendChild(frame);

      // Chốt an toàn: nếu hộp thoại in không bao giờ đóng thì promise vẫn kết
      // thúc — app không bị treo vì frame của app không hề bị tạm dừng.
      printTimersRef.current.push(setTimeout(() => finish('printed'), 30000));
    });

  // Đợi mọi ảnh trong khu vực in (đặc biệt là mã QR VietQR) tải xong TRƯỚC khi
  // mở hộp thoại in. Nếu không đợi, ảnh QR chưa kịp hiện nên phiếu in chỉ có
  // khung trống kèm chữ "VietQR Payment".
  const waitForPrintImages = async (root) => {
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        if (typeof img.decode === 'function') {
          return img.decode().catch(() => {});
        }
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 4000);
        });
      })
    );
    // Cho trình duyệt 1 nhịp vẽ lại trước khi in.
    await new Promise((resolve) => setTimeout(resolve, 60));
  };

  // In phiếu trong iframe ẩn, kèm cảnh báo khi máy in chưa sẵn sàng.
  // Hàm này KHÔNG được await trong luồng xử lý đơn/thanh toán: việc dọn state
  // sau thanh toán/báo bếp không phụ thuộc vào kết quả in.
  const doPrint = async (html) => {
    if (!html) return 'error';
    const status = await printHtmlInFrame(html);
    if (status === 'not-installed') {
      showAlert('Thiết bị chưa cài đặt máy in. Vui lòng cài đặt máy in trước khi in.', {
        variant: 'warning',
      });
    } else if (status === 'not-found') {
      showAlert('Không tìm thấy máy in. Vui lòng kiểm tra kết nối máy in và thử lại.', {
        variant: 'warning',
      });
    }
    // 'printed' → no alert, keep current behavior
    return status;
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

        {activeTab === 'history' && (
          <OrderHistory
            onReprintBill={handleReprintBill}
            onCancelOrder={handleCancelOrder}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'menu' && (
          <MenuManager
            menuItems={menuItems}
            onToggleAvailability={handleToggleAvailability}
            onSaveMenuItem={handleSaveMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager loyaltyConfig={settings?.loyalty_config} isAdmin={isAdmin} />
        )}

        {activeTab === 'tables' && isManager && (
          <TableManager
            tables={tables}
            onCreateTable={handleCreateTable}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
          />
        )}

        {activeTab === 'expenses' && isManager && <ExpenseManager isAdmin={isAdmin} />}

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
          canCancel={true}
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
        <DialogProvider>
          <MainApp />
        </DialogProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
