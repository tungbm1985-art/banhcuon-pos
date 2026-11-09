/** How many taps with nothing new before the next tap reprints the whole ticket. */
export const KOT_REPRINT_ON_PRESS = 4;

function itemKey(item) {
  return String(item.menu_item_id || item.id || item.item_name || '');
}

/**
 * Decide what a Báo Bếp tap should do.
 * - New or increased quantities print only the extra amount and reset the idle counter.
 * - The next 3 taps with nothing new only warn.
 * - The 4th tap reprints every current item, then the counter starts over.
 */
export function decideKitchenSend({ snapshot = {}, idlePresses = 0, items = [] }) {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const deltaItems = [];

  items.forEach((item) => {
    const key = itemKey(item);
    const alreadySent = Number(safeSnapshot[key]) || 0;
    const qty = Number(item.quantity) || 0;
    const extra = qty - alreadySent;
    if (extra > 0) {
      deltaItems.push({
        item_name: item.item_name || item.name,
        quantity: extra,
        notes: item.notes || '',
        unit_price: item.unit_price || item.price || 0,
        kitchen_station: item.kitchen_station,
      });
    }
  });

  const nextSnapshot = {};
  items.forEach((item) => {
    const key = itemKey(item);
    const qty = Number(item.quantity) || 0;
    if (qty > 0) nextSnapshot[key] = qty;
  });

  if (deltaItems.length > 0) {
    const hadSentBefore = Object.values(safeSnapshot).some((qty) => Number(qty) > 0);
    return {
      action: 'delta',
      items: deltaItems,
      snapshot: nextSnapshot,
      idlePresses: 0,
      kotRound: hadSentBefore ? 2 : 1,
      kotReprint: false,
    };
  }

  const nextIdle = (Number(idlePresses) || 0) + 1;
  if (nextIdle >= KOT_REPRINT_ON_PRESS) {
    return {
      action: 'reprint',
      items: items.map((item) => ({
        item_name: item.item_name || item.name,
        quantity: Number(item.quantity) || 0,
        notes: item.notes || '',
        unit_price: item.unit_price || item.price || 0,
        kitchen_station: item.kitchen_station,
      })),
      snapshot: nextSnapshot,
      idlePresses: 0,
      kotRound: 1,
      kotReprint: true,
    };
  }

  const clamped = {};
  items.forEach((item) => {
    const key = itemKey(item);
    const qty = Number(item.quantity) || 0;
    const sent = Number(safeSnapshot[key]) || 0;
    if (sent > 0 && qty > 0) clamped[key] = Math.min(sent, qty);
  });

  return {
    action: 'noop',
    items: [],
    snapshot: clamped,
    idlePresses: nextIdle,
    pressesUntilReprint: KOT_REPRINT_ON_PRESS - nextIdle,
    kotReprint: false,
  };
}
