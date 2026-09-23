import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-battle-characters.mjs <source-directory>');
const states = ['idle', 'ready', 'thinking', 'answering', 'correct', 'attack', 'wrong', 'hit', 'defense', 'victory', 'defeat', 'draw'];
const sources = {
  hero: [
    '8cbfcf3a-315f-4c35-bfe7-71c9fb6acecf', 'e1dc8628-6dce-426f-898b-4441db94e0b7',
    'c898b134-e592-4f8f-a63d-6376b8764e09', '995f2f8a-237d-4a6c-b215-45f719a64f5c',
    'e75904e2-9a6d-4feb-abc1-1f8e0f9b645d', '03a44ec6-5898-4c06-aeed-251f61b12764',
    'a824faf4-a32f-47d2-9559-d0416a90ff4f', 'b9a39c0b-8526-49bd-b68f-ae13fb7baa29',
    'cbb6d846-d634-456f-8930-9cad1060d6e6', '4b3ba01a-3ae3-4056-b131-0056a5855312',
    '694fedcf-a3ee-4492-9ed2-06612c72d46e', 'cf7aa6d2-4b02-4a95-aa41-97f9643112ae',
  ],
  rival: [
    '49ef6428-15dc-4a38-a6b1-e7bae6ce7c49', '166fae60-f5bc-4539-89ac-4a21361ed321',
    '7e0f8d14-e952-45b9-b4cf-353d642cec61', 'da9b7c58-01a1-45a7-8f64-8d7dab47d149',
    'de404a83-c722-4ff4-9d54-05ad7c0376b3', '24ded5a7-7823-4187-9a3b-6b6d67a3fce8',
    '6c800a03-c2a3-4bb8-a06e-679e2d8ae978', '78eb0d0f-bfde-4146-a9eb-1cd632ebb5a8',
    '0a5c9693-518b-4658-a54a-76895e414a7a', '9aa3a364-d18b-40ff-9310-5100bd73c2d8',
    '37c2c14c-ef82-4ad4-a146-6c553330f0b3', 'adb66092-7f93-46b1-b026-593b372aed11',
  ],
};

// Only remove near-black pixels connected to the canvas edge; enclosed eyes stay opaque.
function removeBackdrop(data, width, height) {
  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  function visit(p) {
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * 4;
    if (Math.max(data[i], data[i + 1], data[i + 2]) > 28) return;
    queue[tail++] = p;
    data[i + 3] = 0;
  }
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % width;
    if (x > 0) visit(p - 1);
    if (x < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < count - width) visit(p + width);
  }
  // Feather just the visited boundary, never the disconnected dark facial details.
  for (let p = 0; p < count; p++) {
    const i = p * 4;
    if (visited[p] && data[i + 3]) {
      const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = Math.min(data[i + 3], Math.round(Math.min(1, (brightness - 28) / 35) * 255));
    }
  }
  return data;
}

const sample = Buffer.alloc(5 * 5 * 4, 255);
for (let p = 0; p < 25; p++) {
  if (p < 5 || p >= 20 || p % 5 === 0 || p % 5 === 4 || p === 12) sample.fill(0, p * 4, p * 4 + 3);
}
removeBackdrop(sample, 5, 5);
assert.equal(sample[3], 0);
assert.equal(sample[12 * 4 + 3], 255, 'Enclosed black details must be preserved');

const manifest = [];
for (const [character, files] of Object.entries(sources)) {
  const output = path.join(root, 'public', 'battle', character);
  await mkdir(output, { recursive: true });
  for (const [index, filename] of files.entries()) {
    const { data, info } = await sharp(path.join(source, filename + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleaned = removeBackdrop(data, info.width, info.height);
    const target = path.join(output, states[index] + '.webp');
    await sharp(cleaned, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(768, 768).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile(target);
    const meta = await sharp(target).metadata();
    assert.equal(meta.hasAlpha, true);
    manifest.push({ character, state: states[index], code: `${character === 'hero' ? 'HERO' : 'RIVAL'}_${String(index + 1).padStart(2, '0')}`, source: filename + '.png', src: `/battle/${character}/${states[index]}.webp` });
  }
}
await writeFile(path.join(root, 'public/battle/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${manifest.length} transparent 768px character poses.`);
