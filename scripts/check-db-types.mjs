#!/usr/bin/env node
/**
 * Fails if src/types/database.ts doesn't match the schema built from supabase/migrations.
 * Needs the local database running (`npx supabase db start`), as in CI.
 *
 * Fix a failure with: npm run db:push && npm run db:types
 *
 * The `__InternalSupabase` block (API server version) is ignored: the hosted project includes it
 * and a local database doesn't, and it describes the server, not the schema.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prettier = require('prettier');

const FILE = 'src/types/database.ts';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const generated = execFileSync(
  npx,
  ['supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'],
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32',
  },
);

const options = { ...(await prettier.resolveConfig(FILE)), filepath: FILE };

/** Drops the `__InternalSupabase: { ... };` block and the comment lines directly above it. */
export function withoutInternalBlock(lines) {
  const start = lines.findIndex((line) => /^\s*__InternalSupabase: \{/.test(line));
  if (start === -1) return lines;
  let end = start;
  while (end < lines.length && !/^\s*\};?\s*$/.test(lines[end])) end++;
  let from = start;
  while (from > 0 && /^\s*\/\//.test(lines[from - 1])) from--;
  return [...lines.slice(0, from), ...lines.slice(end + 1)];
}

// Lines some generator versions emit and others don't, with no schema meaning. A table with real
// computed fields produces a multi-line block, which is still compared.
const GENERATOR_NOISE = [/^\s*ComputedFields: never;?\s*$/];

const normalize = async (source) =>
  withoutInternalBlock((await prettier.format(source, options)).split('\n'))
    .filter((line) => !GENERATOR_NOISE.some((re) => re.test(line)))
    .join('\n');

/** Minimal line diff (LCS); fine for a file of a few hundred lines. */
export function lineDiff(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push(`+ ${b[j++]}`);
    } else {
      out.push(`- ${a[i++]}`);
    }
  }
  return out;
}

const expected = await normalize(generated);
const actual = await normalize(readFileSync(FILE, 'utf8'));

// Compare ignoring whitespace: Prettier keeps an object type on several lines if the input had a
// line break, so the same types can wrap differently depending on which generator produced them.
// Also ignore the optional `;` / `,` before a closing bracket, which differs between the two forms.
const squash = (text) => text.replace(/\s+/g, '').replace(/[;,](?=[}\]])/g, '');

if (squash(expected) === squash(actual)) {
  console.log(`${FILE} matches the migrations.`);
} else {
  const diff = lineDiff(actual.split('\n'), expected.split('\n'));
  console.error(`${FILE} is out of date with supabase/migrations (- committed, + expected):`);
  for (const line of diff.slice(0, 60)) console.error(`  ${line}`);
  if (diff.length > 60) console.error(`  … ${diff.length - 60} more`);
  console.error('Run: npm run db:push && npm run db:types');
  process.exit(1);
}
