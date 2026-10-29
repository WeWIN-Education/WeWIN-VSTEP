import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directories = ['public/brand', 'public/brand/mascots', 'public/battle/ranks'];
let before = 0, after = 0, count = 0;
for (const directory of directories) {
  for (const name of await readdir(path.join(root, directory))) {
    if (!/\.(png|jpe?g)$/i.test(name)) continue;
    const source = path.join(root, directory, name);
    const target = source.replace(/\.(png|jpe?g)$/i, '.webp');
    const width = name.startsWith('wewin-logo') ? 600 : name === 'bg.png' ? 1600 : directory.endsWith('/ranks') ? 384 : 768;
    await sharp(source).rotate().resize({ width, withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(target);
    before += (await stat(source)).size;
    after += (await stat(target)).size;
    count++;
  }
}
console.log(JSON.stringify({ count, before, after, savedPercent: Math.round((1 - after / before) * 100) }));
