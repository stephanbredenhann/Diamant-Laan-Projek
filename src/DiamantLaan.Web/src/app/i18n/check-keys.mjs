/**
 * node src/app/i18n/check-keys.mjs
 *
 * Every `'Afrikaans' | t` in a template must have an entry in en.ts, otherwise
 * that string silently stays Afrikaans when English is selected. Exits non-zero
 * and lists the misses.
 *
 * ponytail: regex over the sources, not a TS parse. It only sees string
 * literals piped through `t` inline, so keys that arrive via a data array
 * (steps, faqs, scopeCards, phaseCards) are collected separately below.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const en = new Set(
  [...readFileSync(join(root, 'i18n/en.ts'), 'utf8').matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)].map(m => m[1])
);

// Data arrays feed the pipe through `{{ item.title | t }}`, so their strings are
// keys too. They are the only multi-line quoted copy in these components.
const arrayKeyFields = /^\s*(?:title|body|question|answer):\s*\n?\s*'((?:[^'\\]|\\.)*)',$/gm;

const missing = new Map();
for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8');
  const keys = [...src.matchAll(/'((?:[^'\\]|\\.)*)'\s*\|\s*t\b/g)].map(m => m[1]);
  const usesPipeOnData = /\.\w+\s*\|\s*t\b/.test(src);
  if (usesPipeOnData) keys.push(...[...src.matchAll(arrayKeyFields)].map(m => m[1]));
  for (const k of keys) {
    if (!en.has(k)) missing.set(k, file.slice(root.length + 1));
  }
}

if (missing.size) {
  console.error(`${missing.size} key(s) missing from en.ts:\n`);
  for (const [key, file] of missing) console.error(`  ${file}\n    ${key}\n`);
  process.exit(1);
}
console.log(`OK: every piped key resolves (${en.size} entries in en.ts).`);
