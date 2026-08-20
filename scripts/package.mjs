/**
 * Packages the built extension (dist/) into a release ZIP under release/.
 */
import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;

// Ensure version is synced first.
execSync(`node scripts/sync-version.mjs`, { cwd: root, stdio: 'inherit' });

const distDir = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');
rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

const zipName = `cookie-quick-${version}.zip`;
const zipPath = resolve(releaseDir, zipName);

execSync(`cd dist && zip -r ${JSON.stringify(zipPath)} .`, { cwd: root, stdio: 'inherit' });

console.log(`[package] Zipped extension -> ${zipPath}`);
