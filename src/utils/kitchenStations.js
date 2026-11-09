export const KITCHEN_STATIONS = [
  'Bếp tráng',
  'Bếp nướng',
  'Bếp pha chế',
];

export const DEFAULT_KITCHEN_STATION = KITCHEN_STATIONS[0];

export function getDefaultKitchenStation(item = {}) {
  if (item.category === 'Đồ Uống') return 'Bếp pha chế';
  if (item.category === 'Bánh Cuốn') return 'Bếp tráng';

  const name = String(item.name || item.item_name || '').toLocaleLowerCase('vi');
  if (
    name.includes('nướng') ||
    name.includes('nem chua rán') ||
    name.includes('chả lụa') ||
    name.includes('chả quế')
  ) {
    return 'Bếp nướng';
  }

  return DEFAULT_KITCHEN_STATION;
}

export function groupItemsByKitchenStation(items = []) {
  return KITCHEN_STATIONS.map((station) => ({
    kitchenStation: station,
    items: items.filter(
      (item) =>
        (KITCHEN_STATIONS.includes(item.kitchen_station)
          ? item.kitchen_station
          : DEFAULT_KITCHEN_STATION) === station
    ),
  })).filter((ticket) => ticket.items.length > 0);
}
