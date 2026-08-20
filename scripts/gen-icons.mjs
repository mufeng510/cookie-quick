/**
 * Generates simple solid-color PNG icon files for the extension.
 * Each pixel is rendered via an RGBA buffer and zlib-encoded as a valid PNG.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels(x, y, size);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// "Cookie" glyph: a tan rounded circle with a few darker chocolate chips.
function cookiePixels(x, y, size) {
  const cx = (x + 0.5) / size;
  const cy = (y + 0.5) / size;
  const r = 0.46;

  // distance from center with slight squash for a softer round shape
  let dx = cx - 0.5;
  let dy = cy - 0.5;
  const d = Math.hypot(dx, dy);

  const bg = [0, 0, 0, 0]; // transparent bg

  if (d > r) return bg;

  const base = [222, 166, 88, 255]; // cookie tan
  // subtle shading
  const shade = 1 - ((d / r) * 0.15);
  let R = Math.round(base[0] * shade);
  let G = Math.round(base[1] * shade);
  let B = Math.round(base[2] * shade);
  const A = 255;

  // chocolate chips (dark brown), fixed relative layout within the circle
  const chips = [
    [-0.22, -0.18],
    [0.2, -0.22],
    [-0.02, 0.05],
    [0.22, 0.2],
    [-0.24, 0.22],
  ];
  for (const [cx, cy] of chips) {
    const cd = Math.hypot(cx - dx, cy - dy);
    if (cd < 0.1) {
      R = 90;
      G = 56;
      B = 30;
      break;
    }
  }
  return [R, G, B, A];
}

for (const size of [16, 48, 128]) {
  const png = makePng(size, cookiePixels);
  writeFileSync(resolve(outDir, `icon${size}.png`), png);
  console.log(`[gen-icons] icon${size}.png (${png.length} bytes)`);
}
