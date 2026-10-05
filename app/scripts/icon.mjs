import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const BELLADONNA = [0x24, 0x02, 0x0e, 255];
const VELVET = [0x72, 0x0f, 0x50, 255];
const MAGENTA = [0x94, 0x3a, 0x79, 255];
const PARADE = [0xb3, 0x6f, 0xa3, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

const MARK = [
  { x0: 336, y0: 288, x1: 456, y1: 736, color: VELVET },
  { x0: 568, y0: 400, x1: 688, y1: 736, color: MAGENTA },
  { x0: 288, y0: 556, x1: 736, y1: 588, color: PARADE },
];

function scaledMark(scale, colorOverride) {
  return MARK.map((s) => ({
    x0: Math.round(512 + (s.x0 - 512) * scale),
    y0: Math.round(512 + (s.y0 - 512) * scale),
    x1: Math.round(512 + (s.x1 - 512) * scale),
    y1: Math.round(512 + (s.y1 - 512) * scale),
    color: colorOverride ?? s.color,
  }));
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) | 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'ascii');
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crcBytes]);
}

function renderPng(size, background, shapes) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x += 1) {
      let pixel = background;
      for (const s of shapes) {
        const fx0 = Math.floor((s.x0 * size) / 1024);
        const fy0 = Math.floor((s.y0 * size) / 1024);
        const fx1 = Math.floor((s.x1 * size) / 1024);
        const fy1 = Math.floor((s.y1 * size) / 1024);
        if (x >= fx0 && x < fx1 && y >= fy0 && y < fy1) {
          pixel = s.color;
        }
      }
      const o = rowStart + 1 + x * 4;
      raw[o] = pixel[0];
      raw[o + 1] = pixel[1];
      raw[o + 2] = pixel[2];
      raw[o + 3] = pixel[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(root, { recursive: true });
const jobs = [
  ['icon.png', 1024, BELLADONNA, MARK],
  ['adaptive-foreground.png', 1024, CLEAR, scaledMark(0.62)],
  ['adaptive-monochrome.png', 1024, CLEAR, scaledMark(0.62, WHITE)],
  ['favicon.png', 64, BELLADONNA, MARK],
];
for (const [name, size, background, shapes] of jobs) {
  writeFileSync(join(root, name), renderPng(size, background, shapes));
  console.log(`wrote assets/${name}`);
}
