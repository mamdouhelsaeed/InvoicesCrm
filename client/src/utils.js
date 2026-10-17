export const money = (n = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n || 0);

export const moneyShort = (n = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const toInputDate = (d) => {
  const date = d ? new Date(d) : new Date();
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const STATUS_LABEL = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partly paid',
  overdue: 'Overdue',
  paid: 'Paid',
  cancelled: 'Cancelled',
  lead: 'Lead',
  active: 'Active',
  inactive: 'Inactive',
};

export const METHOD_LABEL = {
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cash: 'Cash',
  paypal: 'PayPal',
  other: 'Other',
};

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'EGP', 'SAR', 'AED', 'CAD', 'AUD'];

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export function daysFromNow(d) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - start) / 86400000);
}
