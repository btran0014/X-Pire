import type { Item } from '../items/types';

const COLUMNS: [header: string, value: (item: Item) => string | number | null][] = [
  ['name', (i) => i.name],
  ['brand', (i) => i.brand],
  ['quantity', (i) => i.quantity],
  ['storage', (i) => i.storage],
  ['purchased_on', (i) => i.purchased_on],
  ['expires_on', (i) => i.expires_on],
  ['status', (i) => i.status],
  ['expiry_source', (i) => i.expiry_source],
  ['barcode', (i) => i.barcode],
  ['added_at', (i) => i.created_at],
];

/** RFC 4180 field; also neutralises spreadsheet formulas (=, +, -, @) in text. */
export function csvField(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function itemsToCsv(items: readonly Item[]): string {
  const header = COLUMNS.map(([h]) => h).join(',');
  const rows = items.map((item) => COLUMNS.map(([, get]) => csvField(get(item))).join(','));
  return [header, ...rows].join('\r\n') + '\r\n';
}
