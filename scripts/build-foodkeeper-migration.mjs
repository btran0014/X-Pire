#!/usr/bin/env node
/**
 * Converts the USDA FSIS FoodKeeper JSON (public domain, CC0) into a Supabase migration
 * that fills public.shelf_life.
 *
 * Usage:
 *   node scripts/build-foodkeeper-migration.mjs <path/to/foodkeeper.json> [output.sql]
 *
 * Download the source in a browser (the server blocks scripts):
 *   http://www.fsis.usda.gov/shared/data/EN/foodkeeper.json
 *
 * Rules:
 * - One row per product per storage location (pantry / fridge / freezer).
 * - Prefer "DOP_" (from date of purchase) times, since X-Pire logs the purchase date;
 *   fall back to the plain times (from the date on the package).
 * - Durations become days: Days 1, Weeks 7, Months 30, Years 365, Hours -> 0 (same day).
 * - "Package use-by date", "Indefinitely", "When Ripe" give a row with no day count and a
 *   tip explaining it (e.g. milk: use the package date). "Not Recommended" gives no row.
 * - After-opening times are used only for products that have no unopened time anywhere
 *   (e.g. lactose-free milk), and the tip says so. After-thawing times are ignored.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath) {
  console.error(
    'Usage: node scripts/build-foodkeeper-migration.mjs <foodkeeper.json> [output.sql]',
  );
  process.exit(1);
}

const source = JSON.parse(readFileSync(inputPath, 'utf8'));
const sheet = (name) => {
  const found = source.sheets?.find((s) => s.name === name);
  if (!found) throw new Error(`FoodKeeper file has no "${name}" sheet`);
  // Each row is an array of single-key objects: [{ID: 1}, {Name: "Butter"}, ...]
  return found.data.map((cells) => Object.assign({}, ...cells));
};

const DAYS_PER_UNIT = {
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
  month: 30,
  months: 30,
  year: 365,
  years: 365,
  hour: 0,
  hours: 0,
};

/** Metrics that carry advice instead of a duration. "Not Recommended" is deliberately absent. */
const SPECIAL_METRICS = {
  'package use-by date': 'Use the use-by date on the package.',
  indefinitely: 'Keeps indefinitely.',
  'when ripe': 'Keep until ripe.',
};

const metricKey = (metric) =>
  String(metric ?? '')
    .trim()
    .toLowerCase();

/** Returns { min, max } in days, or null when there's no usable duration. */
function toDays(min, max, metric) {
  if (!metric) return null;
  const perUnit = DAYS_PER_UNIT[metricKey(metric)];
  if (perUnit === undefined) return null; // Not Recommended, Indefinitely, When Ripe, ...
  const lo = Number.isFinite(min) ? min : max;
  const hi = Number.isFinite(max) ? max : min;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const a = Math.round(lo * perUnit);
  const b = Math.round(hi * perUnit);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

const LOCATIONS = [
  { storage: 'pantry', column: 'Pantry', tips: 'tips' },
  { storage: 'fridge', column: 'Refrigerate', tips: 'tips' },
  { storage: 'freezer', column: 'Freeze', tips: 'Tips' },
];

const categories = new Map(
  sheet('Category').map((c) => [
    c.ID,
    [c.Category_Name, c.Subcategory_Name].filter(Boolean).join(' / '),
  ]),
);

const clean = (s) => (typeof s === 'string' && s.trim() ? s.replace(/\s+/g, ' ').trim() : null);

function keywordsFor(product) {
  const words = [product.Name, product.Name_subtitle, ...(product.Keywords ?? '').split(',')]
    .map((k) => clean(k)?.toLowerCase())
    .filter(Boolean);
  return [...new Set(words)];
}

const joinTips = (...parts) => clean(parts.filter(Boolean).join(' '));

/** Best unopened estimate for one location, or null. */
function unopenedEstimate(p, loc) {
  const sources = [
    { prefix: 'DOP_', tips: `DOP_${loc.column}_${loc.tips}` },
    { prefix: '', tips: `${loc.column}_${loc.tips}` },
  ];
  // 1) a real duration, from purchase first, then from the package date
  for (const s of sources) {
    const c = `${s.prefix}${loc.column}`;
    const days = toDays(p[`${c}_Min`], p[`${c}_Max`], p[`${c}_Metric`]);
    if (days) return { ...days, tips: clean(p[s.tips]) };
  }
  // 2) advice only (package date, indefinitely, when ripe)
  for (const s of sources) {
    const note = SPECIAL_METRICS[metricKey(p[`${s.prefix}${loc.column}_Metric`])];
    if (note) return { min: null, max: null, tips: joinTips(note, p[s.tips]) };
  }
  return null;
}

/** After-opening estimate for one location, or null (pantry and fridge only). */
function afterOpeningEstimate(p, loc) {
  const c = `${loc.column}_After_Opening`;
  const days = toDays(p[`${c}_Min`], p[`${c}_Max`], p[`${c}_Metric`]);
  return days ? { ...days, tips: 'Time after opening (no unopened time listed).' } : null;
}

const rows = [];
for (const p of sheet('Product')) {
  const name = clean(p.Name);
  if (!name || !Number.isInteger(p.ID)) continue;

  const unopened = LOCATIONS.map((loc) => [loc, unopenedEstimate(p, loc)]);
  const hasUnopened = unopened.some(([, e]) => e);
  const estimates = hasUnopened
    ? unopened
    : LOCATIONS.map((loc) => [loc, afterOpeningEstimate(p, loc)]);

  for (const [loc, e] of estimates) {
    if (!e) continue;
    rows.push({
      source_id: p.ID,
      category: categories.get(p.Category_ID) ?? null,
      name,
      subtitle: clean(p.Name_subtitle),
      keywords: keywordsFor(p),
      storage: loc.storage,
      min_days: e.min,
      max_days: e.max,
      tips: e.tips,
    });
  }
}

const sql = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `array[${v.map(sql).join(', ')}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const versionRow = sheet('Version').at(-1);
const header = `-- USDA FSIS FoodKeeper shelf-life data (CC0 1.0, public domain).
-- Source: http://www.fsis.usda.gov/shared/data/EN/foodkeeper.json
-- Source file: ${source.fileName ?? 'unknown'}, data version ${versionRow?.Data_Version_Number ?? '?'} (${versionRow?.Modified_Date ?? '?'})
-- Generated by scripts/build-foodkeeper-migration.mjs. Do not edit by hand; regenerate instead.
-- ${rows.length} rows from ${new Set(rows.map((r) => r.source_id)).size} products.
`;

const columns = 'source_id, category, name, subtitle, keywords, storage, min_days, max_days, tips';
const values = rows
  .map(
    (r) =>
      `  (${[
        r.source_id,
        r.category,
        r.name,
        r.subtitle,
        r.keywords,
        r.storage,
        r.min_days,
        r.max_days,
        r.tips,
      ]
        .map(sql)
        .join(', ')})`,
  )
  .join(',\n');

const out = `${header}
insert into public.shelf_life (${columns})
values
${values}
on conflict (source_id, storage) do update set
  category = excluded.category,
  name = excluded.name,
  subtitle = excluded.subtitle,
  keywords = excluded.keywords,
  min_days = excluded.min_days,
  max_days = excluded.max_days,
  tips = excluded.tips;
`;

if (outputPath) {
  writeFileSync(outputPath, out);
  console.log(`Wrote ${rows.length} rows to ${outputPath}`);
} else {
  process.stdout.write(out);
}
