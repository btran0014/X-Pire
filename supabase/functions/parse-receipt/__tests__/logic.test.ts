import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  geminiRequestBody,
  geminiText,
  MAX_IMAGE_BASE64_CHARS,
  parseModelOutput,
  RequestError,
  toSuggestion,
  validateRequest,
  type ParsedLine,
} from '../logic';

const PURCHASED = '2026-11-28';
const valid = { image: 'aGVsbG8=', mimeType: 'image/jpeg', purchasedOn: PURCHASED };

function errorOf(fn: () => unknown): RequestError {
  try {
    fn();
  } catch (e) {
    return e as RequestError;
  }
  throw new Error('expected an error');
}

describe('validateRequest', () => {
  it('accepts a valid body', () => {
    expect(validateRequest(valid)).toEqual(valid);
  });

  it.each([
    [null, 400],
    [{ ...valid, image: '' }, 400],
    [{ ...valid, image: 'not base64!!' }, 400],
    [{ ...valid, image: 'A'.repeat(MAX_IMAGE_BASE64_CHARS + 1) }, 413],
    [{ ...valid, mimeType: 'image/gif' }, 400],
    [{ ...valid, purchasedOn: '2026-02-30' }, 400],
    [{ ...valid, purchasedOn: 'today' }, 400],
  ])('rejects %#', (body, status) => {
    expect(errorOf(() => validateRequest(body)).status).toBe(status);
  });
});

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('geminiRequestBody / geminiText', () => {
  it('sends the image before the prompt and toggles JSON mode', () => {
    const withJson = geminiRequestBody(valid as never, true);
    expect(withJson.contents[0]?.parts[0]).toEqual({
      inline_data: { mime_type: 'image/jpeg', data: 'aGVsbG8=' },
    });
    expect(withJson).toHaveProperty('generationConfig.responseMimeType', 'application/json');
    expect(geminiRequestBody(valid as never, false)).not.toHaveProperty('generationConfig');
  });

  it('reads candidate text', () => {
    expect(
      geminiText({ candidates: [{ content: { parts: [{ text: '{"a"' }, { text: ':1}' }] } }] }),
    ).toBe('{"a":1}');
    expect(() => geminiText({})).toThrow(RequestError);
  });
});

describe('parseModelOutput', () => {
  it('parses, cleans and clamps items', () => {
    const text =
      '```json\n' +
      JSON.stringify({
        is_receipt: true,
        items: [
          {
            name: '  2% milk,   1 gallon ',
            quantity: 2,
            storage: 'fridge',
            shelf_life_days: 7,
            confidence: 0.9,
            brand: 'Great Value',
            size: ' 1  gal ',
            upc: '04900002891',
            emoji: '🥛',
          },
          { name: 'Peas', quantity: '3', storage: 'garage', shelf_life_days: 99999, confidence: 4 },
          { name: '', quantity: 1 },
          'junk',
          {
            name: 'Bread',
            quantity: -5,
            shelf_life_days: null,
            upc: '1234',
            emoji: 'bread',
            brand: 'null',
          },
        ],
      }) +
      '\n```';
    expect(parseModelOutput(text)).toEqual({
      isReceipt: true,
      items: [
        {
          name: '2% milk, 1 gallon',
          quantity: 2,
          storage: 'fridge',
          shelfLifeDays: 7,
          confidence: 0.9,
          brand: 'Great Value',
          size: '1 gal',
          barcode: '0049000028911',
          emoji: '🥛',
        },
        {
          name: 'Peas',
          quantity: 3,
          storage: 'fridge',
          shelfLifeDays: 3650,
          confidence: 1,
          brand: null,
          size: null,
          barcode: null,
          emoji: null,
        },
        {
          name: 'Bread',
          quantity: 1,
          storage: 'fridge',
          shelfLifeDays: null,
          confidence: 0,
          brand: null,
          size: null,
          barcode: null,
          emoji: null,
        },
      ],
    });
  });

  it('reports a non-receipt', () => {
    expect(parseModelOutput('{"is_receipt": false, "items": []}')).toEqual({
      isReceipt: false,
      items: [],
    });
  });

  it('rejects non-JSON replies', () => {
    expect(errorOf(() => parseModelOutput('Sure! Here are the items...')).code).toBe(
      'ai_bad_response',
    );
  });
});

describe('toSuggestion', () => {
  const line = (over: Partial<ParsedLine>): ParsedLine => ({
    name: 'Chicken breast',
    quantity: 1,
    storage: 'fridge',
    shelfLifeDays: 2,
    confidence: 0.9,
    brand: 'Perdue',
    size: null,
    barcode: null,
    emoji: '🍗',
    ...over,
  });
  const usda = {
    name: 'Chicken parts',
    subtitle: 'breast halves, boneless',
    min_days: 1,
    max_days: 2,
    tips: null,
  };

  it('uses a confident AI estimate as is', () => {
    expect(toSuggestion(line({}), PURCHASED, usda)).toMatchObject({
      expiresOn: '2026-11-30',
      expirySource: 'ai',
      note: null,
      brand: 'Perdue',
      emoji: '🍗',
    });
  });

  it('prefers USDA when the AI is unsure', () => {
    expect(toSuggestion(line({ confidence: 0.3 }), PURCHASED, usda)).toMatchObject({
      expiresOn: '2026-11-29',
      expirySource: 'foodkeeper',
      note: 'USDA FoodKeeper: Chicken parts (breast halves, boneless)',
    });
  });

  it('keeps a low-confidence AI date with a warning when USDA has nothing', () => {
    expect(toSuggestion(line({ confidence: 0.3 }), PURCHASED, null)).toMatchObject({
      expiresOn: '2026-11-30',
      expirySource: 'ai',
      note: 'Low-confidence estimate. Check the date.',
    });
  });

  it('leaves the date empty with USDA advice when there is no number at all', () => {
    const milk = {
      name: 'Milk',
      subtitle: null,
      min_days: null,
      max_days: null,
      tips: 'Use the use-by date on the package.',
    };
    expect(toSuggestion(line({ shelfLifeDays: null }), PURCHASED, milk)).toMatchObject({
      expiresOn: null,
      expirySource: 'manual',
      note: 'Use the use-by date on the package.',
    });
  });
});
