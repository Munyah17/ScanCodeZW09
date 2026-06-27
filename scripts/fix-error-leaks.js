/**
 * One-off script: replace raw .message returns in API handlers with generic strings.
 * Run once then delete.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

function walk(dir) {
  const files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      if (!f.startsWith('_')) files.push(...walk(full));  // skip _utils etc.
    } else if (f.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const root = process.cwd();
const apiDir = join(root, 'api');
const files = walk(apiDir);

let changed = 0;

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  // Any variable name followed by .message returned as the error body with status 500
  const next = src.replace(
    /return j\(\{ error: \w+\.message \}, 500\)/g,
    "return j({ error: 'Internal server error.' }, 500)"
  );
  if (next !== src) {
    writeFileSync(file, next, 'utf8');
    console.log('  fixed:', relative(root, file));
    changed++;
  }
}

console.log(`\nDone — ${changed} file(s) updated.`);
