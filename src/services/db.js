import { getSupabase } from './supabaseClient';
import {
  INITIAL_TABLES,
  INITIAL_MENU_ITEMS,
  INITIAL_CUSTOMERS,
  INITIAL_STAFF,
  INITIAL_SETTINGS,
  INITIAL_EXPENSES,
  INITIAL_WALLETS,
  INITIAL_FINANCE_CATEGORIES,
  INITIAL_TRANSACTIONS,
} from './mockData';
import {
  DEFAULT_KITCHEN_STATION,
  getDefaultKitchenStation,
} from '../utils/kitchenStations';

// Local storage keys
const STORAGE_KEYS = {
  TABLES: 'banhcuon_tables',
  MENU: 'banhcuon_menu_items',
  CUSTOMERS: 'banhcuon_customers',
  ORDERS: 'banhcuon_orders',
  ORDER_ITEMS: 'banhcuon_order_items',
  EXPENSES: 'banhcuon_expenses',
  SETTINGS: 'banhcuon_settings',
  STAFF: 'banhcuon_staff',
  WALLETS: 'banhcuon_wallets',
  FINANCE_CATEGORIES: 'banhcuon_finance_categories',
  TRANSACTIONS: 'banhcuon_transactions',
  DELETION_LOGS: 'banhcuon_data_deletion_logs',
};

// Listeners for local changes to simulate realtime when using local storage
const localListeners = {
  tables: new Set(),
  orders: new Set(),
};

function notifyLocalListeners(type, payload) {
  if (localListeners[type]) {
    localListeners[type].forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error in local listener for ${type}:`, err);
      }
    });
  }
}

// Helper to generate UUID
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Tìm khách theo tên không dấu, không phân biệt hoa thường:
// gõ "tung" phải ra "Tùng", gõ "le hoang" phải ra "Lê Hoàng".
export function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Ngày của mã đơn phải tính theo giờ Việt Nam (UTC+7):
// ngày đổi lúc 00:00 giờ VN, không phải 00:00 UTC (07:00 giờ VN).
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function getVietnamDateKey(date = new Date()) {
  // 'en-CA' cho ra đúng dạng YYYY-MM-DD
  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return isoDate.slice(2).replace(/-/g, '');
}

// Sinh mã đơn bằng máy chủ: dãy số nguyên tử theo từng ngày nên nhiều máy
// cùng lúc cũng không trùng mã. Cần hàm next_order_number() trên Supabase
// (xem supabase_order_number_migration.sql).
async function fetchServerOrderNumber(supabase) {
  try {
    const { data, error } = await supabase.rpc('next_order_number');
    if (!error && typeof data === 'string' && data.startsWith('BC-')) return data;
    if (error) {
      console.warn('Không gọi được next_order_number(), tạm dùng mã cục bộ:', error.message);
    }
  } catch (err) {
    console.warn('Lỗi sinh mã đơn trên máy chủ:', err.message);
  }
  return null;
}

function isDuplicateOrderNumberError(error) {
  if (!error) return false;
  return error.code === '23505' || /duplicate key/i.test(error.message || '');
}

// Dự phòng khi chạy offline (không có Supabase): mã đơn cục bộ theo ngày giờ VN.
// BC-YYMMDD-001, -002, ...
function generateLocalOrderNumber() {
  const dateStr = getVietnamDateKey();

  const counterKey = 'banhcuon_order_seq';
  let seq = 1;
  try {
    const raw = localStorage.getItem(counterKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === dateStr) {
        seq = (parsed.seq || 0) + 1;
      }
    }
    localStorage.setItem(counterKey, JSON.stringify({ date: dateStr, seq }));
  } catch (e) {
    // fallback: still return a valid number
  }

  return `BC-${dateStr}-${String(seq).padStart(3, '0')}`;
}

// Local storage helpers
function getLocalItem(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error parsing localStorage key ${key}:`, e);
    return defaultValue;
  }
}

function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error setting localStorage key ${key}:`, e);
  }
}

// Initialize Local Storage if empty
export function initLocalDataIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEYS.TABLES)) {
    setLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.MENU)) {
    setLocalItem(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    setLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
    setLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WALLETS)) {
    setLocalItem(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FINANCE_CATEGORIES)) {
    setLocalItem(STORAGE_KEYS.FINANCE_CATEGORIES, INITIAL_FINANCE_CATEGORIES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    setLocalItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
    setLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  } else {
    // Migrate old "Thu Ngân 01" to "Nhân Viên 01"
    const staffList = getLocalItem(STORAGE_KEYS.STAFF, []);
    let modified = false;
    const updatedStaff = staffList.map((s) => {
      if (s.full_name === 'Thu Ngân 01') {
        modified = true;
        return { ...s, full_name: 'Nhân Viên 01' };
      }
      return s;
    });
    if (modified) {
      setLocalItem(STORAGE_KEYS.STAFF, updatedStaff);
    }
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    // Seed 1 active order for demonstration
    const demoTableId = 't-01';
    const demoOrderId = 'demo-order-1';
    const sampleOrders = [
      {
        id: demoOrderId,
        order_number: 'BC-2611-001',
        table_id: demoTableId,
        order_type: 'dine_in',
        customer_id: 'c-01',
        status: 'pending',
        subtotal: 95000,
        discount: 0,
        total_amount: 95000,
        payment_method: 'cash',
        notes: 'Nhiều hành phi, nước mắm cay vừa',
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      },
    ];
    const sampleItems = [
      {
        id: 'oi-1',
        order_id: demoOrderId,
        menu_item_id: 'm-02',
        item_name: 'Bánh Cuốn Chả Nướng Thanh Hóa',
        unit_price: 40000,
        quantity: 2,
        notes: '',
      },
      {
        id: 'oi-2',
        order_id: demoOrderId,
        menu_item_id: 'm-14',
        item_name: 'Nước Mía Tươi Tắc',
        unit_price: 15000,
        quantity: 1,
        notes: 'Ít đá',
      },
    ];

    // Mark table 1 occupied
    const tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES).map((t) =>
      t.id === demoTableId ? { ...t, status: 'occupied' } : t
    );
    setLocalItem(STORAGE_KEYS.TABLES, tables);
    setLocalItem(STORAGE_KEYS.ORDERS, sampleOrders);
    setLocalItem(STORAGE_KEYS.ORDER_ITEMS, sampleItems);
  }
}

initLocalDataIfEmpty();

export function isUsingSupabase() {
  return !!getSupabase();
}

// ==============================================================================
// 1. TABLES SERVICE
// ==============================================================================

export async function getTables() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.warn('Supabase getTables error, falling back to local:', error.message);
    } else if (data && data.length > 0) {
      return data;
    }
  }

  // Local fallback
  const tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);
  return [...tables].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

export async function createTable(tableData) {
  const newTable = {
    id: generateUUID(),
    name: tableData.name,
    zone: tableData.zone || 'Tầng 1',
    status: 'available',
    display_order: Number(tableData.display_order) || 99,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('tables').insert([newTable]).select().single();
    if (!error && data) return data;
  }

  const tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);
  tables.push(newTable);
  setLocalItem(STORAGE_KEYS.TABLES, tables);
  notifyLocalListeners('tables', { eventType: 'INSERT', new: newTable });
  return newTable;
}

export async function updateTable(id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('tables').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }

  const tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);
  const index = tables.findIndex((t) => t.id === id);
  if (index !== -1) {
    tables[index] = { ...tables[index], ...updates };
    setLocalItem(STORAGE_KEYS.TABLES, tables);
    notifyLocalListeners('tables', { eventType: 'UPDATE', new: tables[index] });
    return tables[index];
  }
  return null;
}

export async function deleteTable(id) {
  // Safety constraint: Check if table currently has active/occupied orders
  const activeOrders = await getActiveOrders();
  const hasActiveOrder = activeOrders.some((o) => o.table_id === id);
  if (hasActiveOrder) {
    throw new Error('Không thể xóa bàn đang có khách ngồi hoặc đơn hàng chưa hoàn tất!');
  }

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (!error) return true;
  }

  let tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);
  const deleted = tables.find((t) => t.id === id);
  tables = tables.filter((t) => t.id !== id);
  setLocalItem(STORAGE_KEYS.TABLES, tables);
  notifyLocalListeners('tables', { eventType: 'DELETE', old: deleted });
  return true;
}

// ==============================================================================
// 2. MENU ITEMS SERVICE
// ==============================================================================

export async function getMenuItems() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('menu_items').select('*').order('category').order('name');
    if (!error && data && data.length > 0) {
      return data.map((item) => ({
        ...item,
        kitchen_station:
          item.kitchen_station || getDefaultKitchenStation(item),
      }));
    }
  }
  return getLocalItem(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS).map((item) => ({
    ...item,
    kitchen_station: item.kitchen_station || getDefaultKitchenStation(item),
  }));
}

export async function createMenuItem(itemData) {
  const newItem = {
    id: generateUUID(),
    name: itemData.name,
    price: Number(itemData.price) || 0,
    category: itemData.category || 'Bánh Cuốn',
    kitchen_station:
      itemData.kitchen_station ||
      getDefaultKitchenStation(itemData) ||
      DEFAULT_KITCHEN_STATION,
    is_available: itemData.is_available !== undefined ? itemData.is_available : true,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('menu_items').insert([newItem]).select().single();
    if (!error && data) return data;
  }

  const items = getLocalItem(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  items.push(newItem);
  setLocalItem(STORAGE_KEYS.MENU, items);
  return newItem;
}

export async function updateMenuItem(id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('menu_items').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }

  const items = getLocalItem(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    setLocalItem(STORAGE_KEYS.MENU, items);
    return items[idx];
  }
  return null;
}

export async function toggleMenuItemAvailability(id, is_available) {
  return updateMenuItem(id, { is_available });
}

export async function deleteMenuItem(id) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (!error) return true;
  }

  let items = getLocalItem(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  items = items.filter((i) => i.id !== id);
  setLocalItem(STORAGE_KEYS.MENU, items);
  return true;
}

// ==============================================================================
// 3. CUSTOMERS SERVICE
// ==============================================================================

export async function getCustomers(query = '') {
  const rawQuery = String(query || '').trim();
  const q = normalizeSearchText(rawQuery);
  const matchCustomer = (c) =>
    normalizeSearchText(c.full_name).includes(q) || String(c.phone || '').includes(rawQuery);

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('customers').select('*').order('full_name');
    if (!error && data) {
      // Lọc ngay trên máy để khớp cả tên không dấu (Supabase ilike chỉ khớp không phân biệt hoa thường).
      return q ? data.filter(matchCustomer) : data;
    }
  }

  let customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  if (q) {
    customers = customers.filter(matchCustomer);
  }
  return customers;
}

export async function findCustomerByPhone(phone) {
  if (!phone) return null;
  const cleanPhone = phone.trim();

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('customers').select('*').eq('phone', cleanPhone).maybeSingle();
    if (!error && data) return data;
  }

  const customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  return customers.find((c) => c.phone === cleanPhone) || null;
}

export async function createCustomer(customerData) {
  const existing = await findCustomerByPhone(customerData.phone);
  if (existing) {
    return existing;
  }

  const newCust = {
    id: generateUUID(),
    full_name: customerData.full_name || 'Khách Vãng Lai',
    phone: customerData.phone.trim(),
    points: customerData.points || 0,
    total_spent: customerData.total_spent || 0,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('customers').insert([newCust]).select().single();
    if (!error && data) return data;
  }

  const customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  customers.push(newCust);
  setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
  return newCust;
}

export async function updateCustomer(id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }

  const customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const idx = customers.findIndex((c) => c.id === id);
  if (idx !== -1) {
    customers[idx] = { ...customers[idx], ...updates };
    setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
    return customers[idx];
  }
  return null;
}

export async function adjustCustomerPointsAndSpend(id, pointsDelta, spendDelta) {
  const customers = await getCustomers();
  const cust = customers.find((c) => c.id === id);
  if (!cust) return null;

  const newPoints = Math.max(0, (cust.points || 0) + pointsDelta);
  const newSpent = Math.max(0, (cust.total_spent || 0) + spendDelta);

  return updateCustomer(id, { points: newPoints, total_spent: newSpent });
}

// ==============================================================================
// 4. ORDERS SERVICE
// ==============================================================================

export async function getActiveOrders() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(id, full_name, phone, points)')
      .in('status', ['pending', 'served'])
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  }

  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
  const items = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
  const customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);

  const active = orders.filter((o) => o.status === 'pending' || o.status === 'served');
  return active.map((order) => {
    const orderItems = items.filter((it) => it.order_id === order.id);
    const customer = customers.find((c) => c.id === order.customer_id) || null;
    return {
      ...order,
      order_items: orderItems,
      customers: customer,
    };
  });
}

export async function getActiveOrderByTableId(tableId) {
  const activeOrders = await getActiveOrders();
  return activeOrders.find((o) => o.table_id === tableId) || null;
}

export async function getOrderById(orderId) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(id, full_name, phone, points), tables(id, name, zone)')
      .eq('id', orderId)
      .single();
    if (!error && data) return data;
  }

  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
  const items = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
  const customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);

  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  return {
    ...order,
    order_items: items.filter((it) => it.order_id === order.id),
    customers: customers.find((c) => c.id === order.customer_id) || null,
    tables: tables.find((t) => t.id === order.table_id) || null,
  };
}

// Món có thể đã bị xoá khỏi thực đơn sau khi đơn được tạo. Khi đó khoá ngoại
// menu_item_id trỏ tới món không còn tồn tại sẽ làm lệnh ghi thất bại và mất
// dòng món của đơn cũ. Tên món và đơn giá đã được chụp lại (snapshot) trong
// order_items nên chỉ cần đưa menu_item_id về null là an toàn.
async function sanitizeItemsMenuId(supabase, items) {
  if (items.length === 0) return items;
  const { data } = await supabase.from('menu_items').select('id');
  const validIds = new Set((data || []).map((m) => m.id));
  return items.map((it) => ({
    ...it,
    menu_item_id: it.menu_item_id && validIds.has(it.menu_item_id) ? it.menu_item_id : null,
  }));
}

export async function createOrder({
  table_id,
  order_type = 'dine_in',
  customer_id = null,
  items = [],
  notes = '',
  discount = 0,
}) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
  const total_amount = Math.max(0, subtotal - (Number(discount) || 0));
  const orderId = generateUUID();

  const newOrder = {
    id: orderId,
    order_number: null,
    table_id: table_id || null,
    order_type,
    customer_id: customer_id || null,
    status: 'pending',
    subtotal,
    discount: Number(discount) || 0,
    total_amount,
    payment_method: 'cash',
    notes: notes || '',
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  const newOrderItems = items.map((it) => ({
    id: generateUUID(),
    order_id: orderId,
    menu_item_id: it.menu_item_id || it.id || null,
    item_name: it.item_name || it.name,
    unit_price: Number(it.unit_price || it.price) || 0,
    quantity: Number(it.quantity) || 1,
    notes: it.notes || '',
  }));

  const supabase = getSupabase();
  const serverNumber = supabase ? await fetchServerOrderNumber(supabase) : null;
  const orderNumber = serverNumber || generateLocalOrderNumber();
  newOrder.order_number = orderNumber;

  if (supabase) {
    let insertError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase.from('orders').insert([newOrder]);
      if (!error) {
        insertError = null;
        break;
      }
      insertError = error;
      // Mã đơn là duy nhất -> nếu trùng thì xin mã khác rồi ghi lại, không ghi đè
      if (!isDuplicateOrderNumberError(error)) break;
      const retryNumber = (await fetchServerOrderNumber(supabase)) || generateLocalOrderNumber();
      newOrder.order_number = retryNumber;
    }

    if (!insertError) {
      if (newOrderItems.length > 0) {
        const itemsToInsert = await sanitizeItemsMenuId(supabase, newOrderItems);
        await supabase.from('order_items').insert(itemsToInsert);
      }
      if (table_id) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', table_id);
      }
      return { ...newOrder, order_items: newOrderItems };
    }

    console.error('Không tạo được đơn trên Supabase:', insertError.message);
  }

  // Local fallback
  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
  const allItems = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
  orders.push(newOrder);
  allItems.push(...newOrderItems);
  setLocalItem(STORAGE_KEYS.ORDERS, orders);
  setLocalItem(STORAGE_KEYS.ORDER_ITEMS, allItems);

  if (table_id) {
    await updateTable(table_id, { status: 'occupied' });
  }

  notifyLocalListeners('orders', { eventType: 'INSERT', new: newOrder });
  return { ...newOrder, order_items: newOrderItems };
}

export async function updateOrderItems(orderId, items, notes, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
  const total_amount = Math.max(0, subtotal - (Number(discount) || 0));

  const updates = {
    subtotal,
    discount: Number(discount) || 0,
    total_amount,
    notes: notes !== undefined ? notes : '',
  };

  const newOrderItems = items.map((it) => ({
    id: it.id && it.id.length > 10 ? it.id : generateUUID(),
    order_id: orderId,
    menu_item_id: it.menu_item_id || it.id || null,
    item_name: it.item_name || it.name,
    unit_price: Number(it.unit_price || it.price) || 0,
    quantity: Number(it.quantity) || 1,
    notes: it.notes || '',
  }));

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('orders').update(updates).eq('id', orderId);
    await supabase.from('order_items').delete().eq('order_id', orderId);
    if (newOrderItems.length > 0) {
      const itemsToInsert = await sanitizeItemsMenuId(supabase, newOrderItems);
      await supabase.from('order_items').insert(itemsToInsert);
    }
    return getOrderById(orderId);
  }

  // Local
  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
  const orderIdx = orders.findIndex((o) => o.id === orderId);
  if (orderIdx !== -1) {
    orders[orderIdx] = { ...orders[orderIdx], ...updates };
    setLocalItem(STORAGE_KEYS.ORDERS, orders);
  }

  let allItems = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
  allItems = allItems.filter((i) => i.order_id !== orderId);
  allItems.push(...newOrderItems);
  setLocalItem(STORAGE_KEYS.ORDER_ITEMS, allItems);

  notifyLocalListeners('orders', { eventType: 'UPDATE', new: orders[orderIdx] });
  return getOrderById(orderId);
}

export async function completeOrder(
  orderId,
  { payment_method = 'cash', discount = 0, points_earned = 0, points_redeemed = 0 }
) {
  const currentOrder = await getOrderById(orderId);
  if (!currentOrder) throw new Error('Không tìm thấy đơn hàng!');

  const completedAt = new Date().toISOString();
  const subtotal = currentOrder.subtotal || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  const updates = {
    status: 'completed',
    payment_method,
    discount,
    total_amount: totalAmount,
    points_earned: Number(points_earned) || 0,
    points_redeemed: Number(points_redeemed) || 0,
    completed_at: completedAt,
  };

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('orders').update(updates).eq('id', orderId);
    if (currentOrder.table_id) {
      await supabase.from('tables').update({ status: 'available' }).eq('id', currentOrder.table_id);
    }
    if (currentOrder.customer_id) {
      const netPoints = (points_earned || 0) - (points_redeemed || 0);
      await adjustCustomerPointsAndSpend(currentOrder.customer_id, netPoints, totalAmount);
    }
  } else {
    // Local
    const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...updates };
      setLocalItem(STORAGE_KEYS.ORDERS, orders);
      notifyLocalListeners('orders', { eventType: 'UPDATE', new: orders[idx] });
    }

    if (currentOrder.table_id) {
      await updateTable(currentOrder.table_id, { status: 'available' });
    }

    if (currentOrder.customer_id) {
      const netPoints = (points_earned || 0) - (points_redeemed || 0);
      await adjustCustomerPointsAndSpend(currentOrder.customer_id, netPoints, totalAmount);
    }
  }

  return getOrderById(orderId);
}

export async function cancelOrder(orderId, { reason = '', cancelledBy = '' } = {}) {
  const currentOrder = await getOrderById(orderId);
  if (!currentOrder) throw new Error('Không tìm thấy đơn hàng!');
  // Đã huỷ rồi thì bỏ qua, tránh trừ/hoàn điểm hai lần.
  if (currentOrder.status === 'cancelled') return getOrderById(orderId);

  const wasCompleted = currentOrder.status === 'completed';
  const now = new Date().toISOString();

  const updates = {
    status: 'cancelled',
    cancel_reason: String(reason || ''),
    cancelled_by: String(cancelledBy || ''),
    cancelled_at: now,
  };
  // Đơn đã thanh toán phải giữ nguyên completed_at (thời điểm thu tiền).
  if (!wasCompleted) {
    updates.completed_at = now;
  }

  // Đơn đã thanh toán: hoàn lại điểm khách đã dùng, trừ lại điểm đã tích,
  // và trừ doanh số đã cộng cho khách.
  let pointsDelta = 0;
  let spendDelta = 0;
  if (wasCompleted && currentOrder.customer_id) {
    pointsDelta = (Number(currentOrder.points_redeemed) || 0) - (Number(currentOrder.points_earned) || 0);
    spendDelta = -(Number(currentOrder.total_amount) || 0);
  }

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('orders').update(updates).eq('id', orderId);
    if (currentOrder.table_id) {
      await supabase.from('tables').update({ status: 'available' }).eq('id', currentOrder.table_id);
    }
  } else {
    const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...updates };
      setLocalItem(STORAGE_KEYS.ORDERS, orders);
      notifyLocalListeners('orders', { eventType: 'UPDATE', new: orders[idx] });
    }

    if (currentOrder.table_id) {
      await updateTable(currentOrder.table_id, { status: 'available' });
    }
  }

  if (currentOrder.customer_id && (pointsDelta !== 0 || spendDelta !== 0)) {
    await adjustCustomerPointsAndSpend(currentOrder.customer_id, pointsDelta, spendDelta);
  }

  return getOrderById(orderId);
}

export async function getOrdersHistory({ startDate, endDate, status = 'completed' } = {}) {
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase
      .from('orders')
      .select('*, order_items(*), customers(full_name, phone), tables(name, zone)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      q = q.eq('status', status);
    }
    if (startDate) {
      q = q.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      q = q.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    const { data, error } = await q;
    if (!error && data) return data;
  }

  // Local
  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
  const items = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
  const customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);

  return orders
    .filter((order) => {
      if (status && status !== 'all' && order.status !== status) return false;
      const createdAtDate = order.created_at.slice(0, 10);
      if (startDate && createdAtDate < startDate) return false;
      if (endDate && createdAtDate > endDate) return false;
      return true;
    })
    .map((order) => ({
      ...order,
      order_items: items.filter((i) => i.order_id === order.id),
      customers: customers.find((c) => c.id === order.customer_id) || null,
      tables: tables.find((t) => t.id === order.table_id) || null,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ==============================================================================
// 5. EXPENSES SERVICE
// ==============================================================================

export async function getExpenses({ startDate, endDate, category } = {}) {
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false });
    if (category && category !== 'Tất cả') {
      q = q.eq('category', category);
    }
    if (startDate) {
      q = q.gte('expense_date', startDate);
    }
    if (endDate) {
      q = q.lte('expense_date', endDate);
    }
    const { data, error } = await q;
    if (!error && data) return data;
  }

  let expenses = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  return expenses.filter((e) => {
    if (category && category !== 'Tất cả' && e.category !== category) return false;
    if (startDate && e.expense_date < startDate) return false;
    if (endDate && e.expense_date > endDate) return false;
    return true;
  });
}

export async function createExpense({ amount, category, expense_date, notes = '' }) {
  const newExp = {
    id: generateUUID(),
    amount: Number(amount) || 0,
    category: category || 'Khác',
    expense_date: expense_date || new Date().toISOString().slice(0, 10),
    notes: notes || '',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('expenses').insert([newExp]).select().single();
    if (!error && data) return data;
  }

  const list = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  list.unshift(newExp);
  setLocalItem(STORAGE_KEYS.EXPENSES, list);
  return newExp;
}

export async function updateExpense(id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }

  const list = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  const idx = list.findIndex((e) => e.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    setLocalItem(STORAGE_KEYS.EXPENSES, list);
    return list[idx];
  }
  return null;
}

export async function deleteExpense(id) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) return true;
  }

  let list = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  list = list.filter((e) => e.id !== id);
  setLocalItem(STORAGE_KEYS.EXPENSES, list);
  return true;
}

// ==============================================================================
// 5B. FINANCE / THU CHI SERVICE (Ví, Khoản mục, Nhóm chi, Giao dịch)
// ==============================================================================

// Generic CRUD helpers for simple dictionary-like entities
async function listEntity(table, storageKey, fallback) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) return data;
  }
  return getLocalItem(storageKey, fallback);
}

async function insertEntity(table, storageKey, fallback, record) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(table).insert([record]).select().single();
    if (!error && data) return data;
  }
  const list = getLocalItem(storageKey, fallback);
  list.push(record);
  setLocalItem(storageKey, list);
  return record;
}

async function updateEntity(table, storageKey, fallback, id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }
  const list = getLocalItem(storageKey, fallback);
  const idx = list.findIndex((x) => x.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    setLocalItem(storageKey, list);
    return list[idx];
  }
  return null;
}

async function deleteEntity(table, storageKey, fallback, id) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) return true;
  }
  const list = getLocalItem(storageKey, fallback).filter((x) => x.id !== id);
  setLocalItem(storageKey, list);
  return true;
}

// --- Ví (Wallets) ---
export function getWallets() {
  return listEntity('wallets', STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
}
export function createWallet(name) {
  return insertEntity('wallets', STORAGE_KEYS.WALLETS, INITIAL_WALLETS, {
    id: generateUUID(),
    name,
    created_at: new Date().toISOString(),
  });
}
export function updateWallet(id, name) {
  return updateEntity('wallets', STORAGE_KEYS.WALLETS, INITIAL_WALLETS, id, { name });
}
export function deleteWallet(id) {
  return deleteEntity('wallets', STORAGE_KEYS.WALLETS, INITIAL_WALLETS, id);
}

// --- Khoản mục thu/chi (Finance Categories) ---
export function getFinanceCategories() {
  return listEntity('finance_categories', STORAGE_KEYS.FINANCE_CATEGORIES, INITIAL_FINANCE_CATEGORIES);
}
export function createFinanceCategory(name, type = 'expense') {
  return insertEntity('finance_categories', STORAGE_KEYS.FINANCE_CATEGORIES, INITIAL_FINANCE_CATEGORIES, {
    id: generateUUID(),
    name,
    type,
    created_at: new Date().toISOString(),
  });
}
export function updateFinanceCategory(id, name) {
  return updateEntity('finance_categories', STORAGE_KEYS.FINANCE_CATEGORIES, INITIAL_FINANCE_CATEGORIES, id, { name });
}
export function deleteFinanceCategory(id) {
  return deleteFinanceCategoryCascade(id);
}
// Xóa khoản mục nhưng giữ lại giao dịch cũ: gỡ khoản mục khỏi các giao dịch đang dùng nó
async function deleteFinanceCategoryCascade(id) {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('transactions').update({ category_id: null }).eq('category_id', id);
    const { error } = await supabase.from('finance_categories').delete().eq('id', id);
    if (!error) return true;
  }

  const txList = getLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS).map((t) =>
    t.category_id === id ? { ...t, category_id: null } : t
  );
  setLocalItem(STORAGE_KEYS.TRANSACTIONS, txList);

  return deleteEntity(
    'finance_categories',
    STORAGE_KEYS.FINANCE_CATEGORIES,
    INITIAL_FINANCE_CATEGORIES,
    id
  );
}

// --- Giao dịch thu/chi (Transactions) ---
export async function getTransactions({ startDate, endDate, type, wallet_id, category_id } = {}) {
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (type && type !== 'all') q = q.eq('type', type);
    if (wallet_id && wallet_id !== 'all') q = q.eq('wallet_id', wallet_id);
    if (category_id === '__none__') q = q.is('category_id', null);
    else if (category_id && category_id !== 'all') q = q.eq('category_id', category_id);
    if (startDate) q = q.gte('transaction_date', startDate);
    if (endDate) q = q.lte('transaction_date', endDate);
    const { data, error } = await q;
    if (!error && data) return data;
  }

  const list = getLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  return list
    .filter((t) => {
      if (type && type !== 'all' && t.type !== type) return false;
      if (wallet_id && wallet_id !== 'all' && t.wallet_id !== wallet_id) return false;
      if (category_id === '__none__') {
        if (t.category_id) return false;
      } else if (category_id && category_id !== 'all' && t.category_id !== category_id) return false;
      if (startDate && t.transaction_date < startDate) return false;
      if (endDate && t.transaction_date > endDate) return false;
      return true;
    })
    .sort(
      (a, b) =>
        (b.transaction_date || '').localeCompare(a.transaction_date || '') ||
        new Date(b.created_at) - new Date(a.created_at)
    );
}

export async function createTransaction(data) {
  const record = {
    id: generateUUID(),
    type: data.type || 'expense',
    amount: Number(data.amount) || 0,
    wallet_id: data.wallet_id || null,
    category_id: data.category_id || null,
    transaction_date: data.transaction_date || new Date().toISOString().slice(0, 10),
    notes: data.notes || '',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data: inserted, error } = await supabase.from('transactions').insert([record]).select().single();
    if (!error && inserted) return inserted;
  }

  const list = getLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  list.unshift(record);
  setLocalItem(STORAGE_KEYS.TRANSACTIONS, list);
  return record;
}

export async function updateTransaction(id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().single();
    if (!error && data) return data;
  }

  const list = getLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  const idx = list.findIndex((t) => t.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, list);
    return list[idx];
  }
  return null;
}

export async function deleteTransaction(id) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) return true;
  }

  let list = getLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  list = list.filter((t) => t.id !== id);
  setLocalItem(STORAGE_KEYS.TRANSACTIONS, list);
  return true;
}

// ==============================================================================
// 6. SYSTEM SETTINGS SERVICE
// ==============================================================================

export async function getSystemSettings() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (!error && data && data.length > 0) {
      const settingsMap = {};
      data.forEach((row) => {
        settingsMap[row.key] = row.value;
      });
      return { ...INITIAL_SETTINGS, ...settingsMap };
    }
  }

  return getLocalItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export async function updateSystemSetting(key, value) {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('system_settings').upsert({ key, value });
  }

  const current = getLocalItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  current[key] = value;
  setLocalItem(STORAGE_KEYS.SETTINGS, current);
  return current;
}

// ==============================================================================
// 7. STAFF SERVICE
// ==============================================================================

export async function getStaffList() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('staff').select('id, full_name, username, role, created_at');
    if (!error && data) return data;
  }

  return getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF).map(({ password: _pwd, ...rest }) => rest);
}

export async function createStaff({ full_name, username, password, role = 'staff' }) {
  const newStaff = {
    id: generateUUID(),
    full_name,
    username: username.toLowerCase().trim(),
    password,
    role,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('staff').insert([newStaff]).select().single();
    if (!error && data) {
      const { password: _p, ...safe } = data;
      return safe;
    }
  }

  const list = getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  if (list.some((s) => s.username === newStaff.username)) {
    throw new Error('Tên đăng nhập đã tồn tại!');
  }
  list.push(newStaff);
  setLocalItem(STORAGE_KEYS.STAFF, list);
  const { password: _p, ...safe } = newStaff;
  return safe;
}

export async function updateStaff(id, updates) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('staff').update(updates).eq('id', id).select().single();
    if (!error && data) {
      const { password: _p, ...safe } = data;
      return safe;
    }
  }

  const list = getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const idx = list.findIndex((s) => s.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    setLocalItem(STORAGE_KEYS.STAFF, list);
    const { password: _p, ...safe } = list[idx];
    return safe;
  }
  return null;
}

export async function deleteStaff(id) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) return true;
  }

  let list = getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  list = list.filter((s) => s.id !== id);
  setLocalItem(STORAGE_KEYS.STAFF, list);
  return true;
}

export async function authenticateStaff(username, password) {
  const cleanUsername = username.toLowerCase().trim();

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', cleanUsername)
      .eq('password', password)
      .maybeSingle();

    if (!error && data) {
      const { password: _p, ...safe } = data;
      return safe;
    }
    // Supabase là nguồn xác thực chính: KHÔNG rơi về localStorage,
    // tránh trường hợp mật khẩu cũ còn lưu trên máy vẫn đăng nhập được.
    return null;
  }

  const list = getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const user = list.find((s) => s.username === cleanUsername && s.password === password);
  if (user) {
    const { password: _p, ...safe } = user;
    return safe;
  }
  return null;
}

// ==============================================================================
// 7B. KHÔI PHỤC MẬT KHẨU CHỦ QUÁN
// ==============================================================================

export async function getAdminAccount() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, full_name, username, role')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();
    if (!error) return data || null;
  }

  const list = getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const admin = list.find((s) => s.role === 'admin');
  if (!admin) return null;
  const { password: _p, ...safe } = admin;
  return safe;
}

export async function createPasswordResetCode(code, ttlMinutes = 10) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  await updateSystemSetting('password_reset', { code, expires_at: expiresAt });
  return expiresAt;
}

export async function getPasswordResetRequest() {
  const settings = await getSystemSettings();
  return settings.password_reset || null;
}

export async function clearPasswordResetCode() {
  await updateSystemSetting('password_reset', null);
}

// Gửi mã khôi phục qua EmailJS (REST API, không cần thư viện ngoài)
export async function sendResetCodeEmail(config, { code, storeName }) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.emailjs_service_id,
      template_id: config.emailjs_template_id,
      user_id: config.emailjs_public_key,
      template_params: {
        to_email: config.recipient_email,
        reset_code: code,
        store_name: storeName,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `EmailJS trả về mã lỗi ${res.status}`);
  }
  return true;
}

// ==============================================================================
// 8. REALTIME SUBSCRIPTIONS
// ==============================================================================

export function subscribeToTables(callback) {
  const supabase = getSupabase();
  if (supabase) {
    const channel = supabase
      .channel('realtime_tables')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Local fallback
  localListeners.tables.add(callback);
  return () => {
    localListeners.tables.delete(callback);
  };
}

export function subscribeToOrders(callback) {
  const supabase = getSupabase();
  if (supabase) {
    const channel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Local fallback
  localListeners.orders.add(callback);
  return () => {
    localListeners.orders.delete(callback);
  };
}

// ==============================================================================
// 9. DATABASE SEED / RESET HELPER
// ==============================================================================

export async function seedInitialDataToSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình!');

  // Check tables count
  const { data: existingTables } = await supabase.from('tables').select('id').limit(1);
  if (!existingTables || existingTables.length === 0) {
    await supabase.from('tables').insert(
      INITIAL_TABLES.map(({ id: _id, ...rest }) => ({
        ...rest,
        id: generateUUID(),
      }))
    );
  }

  const { data: existingMenu } = await supabase.from('menu_items').select('id').limit(1);
  if (!existingMenu || existingMenu.length === 0) {
    await supabase.from('menu_items').insert(
      INITIAL_MENU_ITEMS.map(({ id: _id, ...rest }) => ({
        ...rest,
        id: generateUUID(),
      }))
    );
  }

  const { data: existingCust } = await supabase.from('customers').select('id').limit(1);
  if (!existingCust || existingCust.length === 0) {
    await supabase.from('customers').insert(
      INITIAL_CUSTOMERS.map(({ id: _id, ...rest }) => ({
        ...rest,
        id: generateUUID(),
      }))
    );
  }

  const { data: existingStaff } = await supabase.from('staff').select('id').limit(1);
  if (!existingStaff || existingStaff.length === 0) {
    await supabase.from('staff').insert(
      INITIAL_STAFF.map(({ id: _id, ...rest }) => ({
        ...rest,
        id: generateUUID(),
      }))
    );
  }

  for (const [key, value] of Object.entries(INITIAL_SETTINGS)) {
    await supabase.from('system_settings').upsert({ key, value });
  }

  return true;
}

// ==============================================================================
// 10. PRINT QUEUE (Hàng đợi in qua Supabase)
// ==============================================================================
// Ứng dụng (kể cả trên điện thoại dùng WiFi quán hay 4G) chỉ cần ghi 1 dòng
// vào bảng print_jobs. Print Server trên máy tính tiền sẽ quét và đẩy sang máy in LAN.

export function isPrintQueueAvailable() {
  return !!getSupabase();
}

export async function createPrintJob({ jobType, printerIp, printerPort, payload }) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('print_jobs')
    .insert([
      {
        job_type: jobType,
        printer_ip: printerIp,
        printer_port: printerPort || 9100,
        payload,
      },
    ])
    .select()
    .single();

  if (error) {
    console.warn('createPrintJob error:', error.message);
    return null;
  }
  return data;
}

export async function getPrintJob(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('print_jobs').select('*').eq('id', id).single();
  if (error) {
    console.warn('getPrintJob error:', error.message);
    return null;
  }
  return data;
}

export function resetLocalData() {
  localStorage.removeItem(STORAGE_KEYS.TABLES);
  localStorage.removeItem(STORAGE_KEYS.MENU);
  localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
  localStorage.removeItem(STORAGE_KEYS.ORDER_ITEMS);
  localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.STAFF);
  localStorage.removeItem(STORAGE_KEYS.WALLETS);
  localStorage.removeItem(STORAGE_KEYS.FINANCE_CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  initLocalDataIfEmpty();
  notifyLocalListeners('tables', { eventType: 'RESET' });
  notifyLocalListeners('orders', { eventType: 'RESET' });
  return true;
}

// ==============================================================================
// 11. QUẢN LÝ DỮ LIỆU (Sao lưu toàn bộ / Xoá dữ liệu năm cũ)
// ==============================================================================

// Xác nhận mật khẩu tài khoản chủ quán (admin). Dùng cho thao tác nguy hiểm:
// xoá dữ liệu năm cũ, huỷ đơn đã thanh toán.
export async function verifyAdminPassword(password) {
  if (!password) return false;
  const admin = await getAdminAccount();
  if (!admin) return false;
  const user = await authenticateStaff(admin.username, password);
  return !!user && user.role === 'admin';
}

const BACKUP_TABLES = [
  'tables',
  'menu_items',
  'customers',
  'orders',
  'order_items',
  'expenses',
  'staff',
  'system_settings',
];

// Khoảng thời gian của 1 năm theo giờ Việt Nam (UTC+7).
function getYearRange(year) {
  const start = new Date(`${year}-01-01T00:00:00+07:00`);
  const end = new Date(`${Number(year) + 1}-01-01T00:00:00+07:00`);
  return { start, end, startISO: start.toISOString(), endISO: end.toISOString() };
}

// Tạo bản sao lưu toàn bộ dữ liệu để tải về máy.
export async function backupAllData() {
  const supabase = getSupabase();
  const payload = {};

  if (supabase) {
    for (const table of BACKUP_TABLES) {
      const { data, error } = await supabase.from(table).select('*');
      payload[table] = error ? [] : data || [];
    }
  } else {
    payload.tables = getLocalItem(STORAGE_KEYS.TABLES, INITIAL_TABLES);
    payload.menu_items = getLocalItem(STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
    payload.customers = getLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    payload.orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
    payload.order_items = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
    payload.expenses = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    payload.staff = getLocalItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    payload.system_settings = Object.entries(getLocalItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)).map(
      ([key, value]) => ({ key, value })
    );
  }

  return {
    exported_at: new Date().toISOString(),
    source: supabase ? 'supabase' : 'local',
    ...payload,
  };
}

// Đếm số đơn hàng và chi phí thuộc 1 năm (để đối chiếu trước khi xoá).
export async function getYearDataSummary(year) {
  const y = Number(year);
  const { start, end, startISO, endISO } = getYearRange(y);
  const supabase = getSupabase();

  if (supabase) {
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startISO)
      .lt('created_at', endISO);
    const { count: expensesCount } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .gte('expense_date', `${y}-01-01`)
      .lte('expense_date', `${y}-12-31`);
    return { year: y, orders: ordersCount || 0, expenses: expensesCount || 0 };
  }

  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []).filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
  const expenses = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES).filter(
    (e) => String(e.expense_date || '').slice(0, 4) === String(y)
  );
  return { year: y, orders: orders.length, expenses: expenses.length };
}

// Xoá đơn hàng + chi phí của 1 năm. Giữ nguyên tài khoản, thực đơn, cài đặt,
// khách hàng và điểm thưởng. Ghi nhật ký lần xoá.
export async function deleteYearData(year, { deletedBy = '' } = {}) {
  const y = Number(year);
  const { start, end, startISO, endISO } = getYearRange(y);
  const supabase = getSupabase();

  if (supabase) {
    const { data: yearOrders } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', startISO)
      .lt('created_at', endISO);
    const orderIds = (yearOrders || []).map((o) => o.id);

    if (orderIds.length > 0) {
      await supabase.from('order_items').delete().in('order_id', orderIds);
    }
    await supabase.from('orders').delete().gte('created_at', startISO).lt('created_at', endISO);

    const { count: expensesCount } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .gte('expense_date', `${y}-01-01`)
      .lte('expense_date', `${y}-12-31`);
    await supabase
      .from('expenses')
      .delete()
      .gte('expense_date', `${y}-01-01`)
      .lte('expense_date', `${y}-12-31`);

    const log = {
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy || 'admin',
      year: y,
      orders_deleted: orderIds.length,
      expenses_deleted: expensesCount || 0,
    };
    await supabase.from('data_deletion_logs').insert([log]);
    return log;
  }

  // Local
  const orders = getLocalItem(STORAGE_KEYS.ORDERS, []);
  const yearOrderIds = new Set(
    orders
      .filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .map((o) => o.id)
  );
  setLocalItem(
    STORAGE_KEYS.ORDERS,
    orders.filter((o) => !yearOrderIds.has(o.id))
  );

  const items = getLocalItem(STORAGE_KEYS.ORDER_ITEMS, []);
  setLocalItem(
    STORAGE_KEYS.ORDER_ITEMS,
    items.filter((i) => !yearOrderIds.has(i.order_id))
  );

  const expenses = getLocalItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  const remainingExpenses = expenses.filter((e) => String(e.expense_date || '').slice(0, 4) !== String(y));
  setLocalItem(STORAGE_KEYS.EXPENSES, remainingExpenses);

  const log = {
    id: generateUUID(),
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy || 'admin',
    year: y,
    orders_deleted: yearOrderIds.size,
    expenses_deleted: expenses.length - remainingExpenses.length,
  };
  const logs = getLocalItem(STORAGE_KEYS.DELETION_LOGS, []);
  logs.unshift(log);
  setLocalItem(STORAGE_KEYS.DELETION_LOGS, logs);

  notifyLocalListeners('orders', { eventType: 'RESET' });
  return log;
}

export async function getDataDeletionLogs() {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('data_deletion_logs')
      .select('*')
      .order('deleted_at', { ascending: false });
    if (!error && data) return data;
  }
  return getLocalItem(STORAGE_KEYS.DELETION_LOGS, []);
}

// ==============================================================================
// 12. PHỤC HỒI DỮ LIỆU TỪ FILE SAO LƯU (Mục 6 đợt 3)
// ==============================================================================

// Các bảng nghiệp vụ được phục hồi. KHÔNG gồm 'staff' — tài khoản đăng nhập
// của chủ quán/nhân viên luôn giữ nguyên, không bị đè.
export const RESTORE_TABLES = [
  'tables',
  'menu_items',
  'customers',
  'orders',
  'order_items',
  'expenses',
  'system_settings',
];

// Nạp bảng cha trước để khoá ngoại hợp lệ (orders -> tables/customers,
// order_items -> orders/menu_items).
const RESTORE_INSERT_ORDER = [
  'tables',
  'menu_items',
  'customers',
  'orders',
  'order_items',
  'expenses',
  'system_settings',
];

// Xoá bảng con trước để không vướng khoá ngoại.
const RESTORE_DELETE_ORDER = [
  'order_items',
  'orders',
  'menu_items',
  'customers',
  'tables',
  'expenses',
  'system_settings',
];

// Kiểm tra file sao lưu có đúng định dạng và đủ bảng cần phục hồi không.
// Thiếu bất kỳ bảng nào => coi là không hợp lệ, không phục hồi.
export function validateBackupFile(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    return {
      ok: false,
      error: 'File không đúng định dạng sao lưu (không phải file JSON do chức năng Sao lưu tạo ra).',
    };
  }
  const missing = RESTORE_TABLES.filter((t) => !Array.isArray(backup[t]));
  if (missing.length > 0) {
    return { ok: false, error: `File sao lưu thiếu bảng dữ liệu: ${missing.join(', ')}. Không phục hồi.` };
  }
  return { ok: true };
}

// Số liệu tóm tắt nội dung file sao lưu để đối chiếu trước khi phục hồi.
export function summarizeBackup(backup) {
  const rows = (t) => (Array.isArray(backup?.[t]) ? backup[t].length : 0);
  return {
    exported_at: backup?.exported_at || null,
    tables: rows('tables'),
    orders: rows('orders'),
    order_items: rows('order_items'),
    expenses: rows('expenses'),
    customers: rows('customers'),
    menu_items: rows('menu_items'),
  };
}

const RESTORE_CHUNK_SIZE = 500;

// Phục hồi: THAY THẾ toàn bộ dữ liệu nghiệp vụ hiện tại bằng dữ liệu trong file.
// Không phục hồi một phần; không đụng tới bảng staff.
export async function restoreAllData(backup, { restoredBy = 'admin' } = {}) {
  const check = validateBackupFile(backup);
  if (!check.ok) throw new Error(check.error);

  const summary = summarizeBackup(backup);
  const supabase = getSupabase();

  if (supabase) {
    for (const table of RESTORE_DELETE_ORDER) {
      const column = table === 'system_settings' ? 'key' : 'id';
      const { error } = await supabase.from(table).delete().not(column, 'is', null);
      if (error) throw new Error(`Lỗi xoá dữ liệu bảng "${table}": ${error.message}`);
    }

    for (const table of RESTORE_INSERT_ORDER) {
      const rows = backup[table] || [];
      for (let i = 0; i < rows.length; i += RESTORE_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + RESTORE_CHUNK_SIZE);
        const { error } = await supabase.from(table).insert(chunk);
        if (error) throw new Error(`Lỗi nạp dữ liệu bảng "${table}": ${error.message}`);
      }
    }
  } else {
    setLocalItem(STORAGE_KEYS.TABLES, backup.tables || []);
    setLocalItem(STORAGE_KEYS.MENU, backup.menu_items || []);
    setLocalItem(STORAGE_KEYS.CUSTOMERS, backup.customers || []);
    setLocalItem(STORAGE_KEYS.ORDERS, backup.orders || []);
    setLocalItem(STORAGE_KEYS.ORDER_ITEMS, backup.order_items || []);
    setLocalItem(STORAGE_KEYS.EXPENSES, backup.expenses || []);
    const settingsMap = {};
    (backup.system_settings || []).forEach((row) => {
      if (row && row.key) settingsMap[row.key] = row.value;
    });
    setLocalItem(STORAGE_KEYS.SETTINGS, settingsMap);
    notifyLocalListeners('tables', { eventType: 'RESET' });
    notifyLocalListeners('orders', { eventType: 'RESET' });
  }

  const notes =
    `Phục hồi dữ liệu từ bản sao lưu` +
    (summary.exported_at ? ` ngày ${summary.exported_at}` : '') +
    ` — nạp lại ${summary.orders} đơn, ${summary.order_items} chi tiết món, ` +
    `${summary.expenses} chi phí, ${summary.customers} khách, ${summary.menu_items} món, ${summary.tables} bàn.`;

  const log = {
    deleted_at: new Date().toISOString(),
    deleted_by: restoredBy || 'admin',
    year: null,
    orders_deleted: summary.orders,
    expenses_deleted: summary.expenses,
    notes,
  };

  if (supabase) {
    const { error } = await supabase.from('data_deletion_logs').insert([log]);
    if (error) console.warn('Không ghi được nhật ký phục hồi:', error.message);
  } else {
    const logs = getLocalItem(STORAGE_KEYS.DELETION_LOGS, []);
    logs.unshift({ id: generateUUID(), ...log });
    setLocalItem(STORAGE_KEYS.DELETION_LOGS, logs);
  }

  return { ...summary, log };
}
