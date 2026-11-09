// Utility formatters for Vietnamese POS currency, dates, VietQR

export function formatVND(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatVNDShort(amount) {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'tr';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'k';
  }
  return num.toString();
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Generates VietQR dynamic image URL
 * @param {Object} vietqrConfig - { bank_id, account_no, account_name, template }
 * @param {number} amount - Total amount to pay
 * @param {string} orderInfo - e.g. "Ban 01 - BC-001"
 */
export function getVietQRUrl(vietqrConfig, amount, orderInfo = '') {
  if (!vietqrConfig || !vietqrConfig.bank_id || !vietqrConfig.account_no) {
    return null;
  }

  const bankId = encodeURIComponent(vietqrConfig.bank_id.trim());
  const accountNo = encodeURIComponent(vietqrConfig.account_no.trim());
  const template = encodeURIComponent(vietqrConfig.template || 'compact2');
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  
  // Clean description for VietQR (Vietnamese characters without accents prefered by banks)
  const cleanInfo = orderInfo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .slice(0, 25);

  const queryParams = new URLSearchParams();
  if (safeAmount > 0) {
    queryParams.set('amount', safeAmount.toString());
  }
  if (cleanInfo) {
    queryParams.set('addInfo', cleanInfo);
  }
  if (vietqrConfig.account_name) {
    queryParams.set('accountName', vietqrConfig.account_name.trim());
  }

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.jpg?${queryParams.toString()}`;
}
