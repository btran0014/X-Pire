#!/usr/bin/env node
/**
 * Fails if src/types/database.ts doesn't match the schema built from supabase/migrations.
 * Needs the local database running (`npx supabase db start`), as in CI.
 *
 * Fix a failure with: npm run db:push && npm run db:types
 *
 * The PostgrestVersion line is ignored: it reflects the API server version of whichever
 * database the types were generated from (hosted vs local), not the schema.
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
  ['supabase', 'gen', 'types', 'typescript', '--schema', 'public'],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32',
  },
);

const options = { ...(await prettier.resolveConfig(FILE)), filepath: FILE };
const normalize = async (source) =>
  (await prettier.format(source, options))
    .split('\n')
    .filter((line) => !/PostgrestVersion:/.test(line))
    .join('\n');

const expected = await normalize(generated);
const actual = await normalize(readFileSync(FILE, 'utf8'));

if (expected === actual) {
  console.log(`${FILE} matches the migrations.`);
} else {
  const a = actual.split('\n');
  const e = expected.split('\n');
  const length = Math.max(a.length, e.length);
  const first = Array.from({ length }, (_, i) => i).find((i) => a[i] !== e[i]) ?? 0;
  console.error(
    `${FILE} is out of date with supabase/migrations (first difference at line ${first + 1}):`,
  );
  console.error(`  committed: ${a[first] ?? '(end of file)'}`);
  console.error(`  expected:  ${e[first] ?? '(end of file)'}`);
  console.error('Run: npm run db:push && npm run db:types');
  process.exit(1);
}
