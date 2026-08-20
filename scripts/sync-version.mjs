/**
 * Syncs the `version` field in public/manifest.json (and dist/manifest.json)
 * with package.json so the extension version always matches the npm version.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;

const targets = [
  resolve(root, 'public/manifest.json'),
  resolve(root, 'dist/manifest.json'),
];

for (const file of targets) {
  if (!existsSync(file)) continue;
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.version = version;
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[sync-version] ${file.replace(root, '.')} -> ${version}`);
}
