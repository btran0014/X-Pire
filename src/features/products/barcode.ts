/**
 * Barcode helpers for EAN-8, UPC-A (12), EAN-13 and GTIN-14.
 * Receipts sometimes print UPC-A without its final check digit (11 digits); we rebuild it.
 */

/** GS1 check digit for the given digits (without the check digit). */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  // Weights alternate 3,1,3,1... starting from the rightmost digit of the body.
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function hasValidCheckDigit(code: string): boolean {
  if (!/^\d{8,14}$/.test(code)) return false;
  return gs1CheckDigit(code.slice(0, -1)) === Number(code.at(-1));
}

/**
 * Cleans a scanned or printed barcode. Returns a valid GTIN (8, 12, 13 or 14 digits) or null.
 * A 12-digit UPC is padded to EAN-13 so the same product always gets the same code.
 */
export function normalizeBarcode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  // As printed, or with a check digit the receipt dropped (EAN-8 -> 7, UPC-A -> 11, EAN-13 -> 12).
  const candidates = [7, 11, 12].includes(digits.length)
    ? [digits, digits + String(gs1CheckDigit(digits))]
    : [digits];
  for (const code of candidates) {
    if ([8, 12, 13, 14].includes(code.length) && hasValidCheckDigit(code)) {
      return code.length === 12 ? `0${code}` : code;
    }
  }
  return null;
}
