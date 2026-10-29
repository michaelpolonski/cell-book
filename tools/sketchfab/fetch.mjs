#!/usr/bin/env node
/**
 * מוריד מודלים מ-Sketchfab (רק CC-BY / CC-BY-SA / CC0), מכווץ אותם ושומר ב-public/models/.
 * שימוש:  SKETCHFAB_TOKEN=xxxx node tools/sketchfab/fetch.mjs
 * הטוקן לא נשמר בשום מקום. הקרדיטים נכתבים ל-public/models/credits.json ו-CREDITS.md.
 * כיווץ: @gltf-transform/cli (dedup, weld, simplify, meshopt, טקסטורות ≤1K webp).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'public/models');
const TMP = path.join(ROOT, '.sketchfab-cache');
const TOKEN = process.env.SKETCHFAB_TOKEN;
if (!TOKEN) { console.error('Set SKETCHFAB_TOKEN'); process.exit(1); }
const list = JSON.parse(fs.readFileSync(path.join(HERE, 'models.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const OK = new Set(['by', 'by-sa', 'cc0']);
const credits = [];

for (const m of list) {
  const dest = path.join(OUT, `${m.id}.glb`);
  const info = await (await fetch(`https://api.sketchfab.com/v3/models/${m.uid}`)).json();
  const slug = info.license?.slug;
  if (!OK.has(slug)) { console.warn(`skip ${m.id}: license ${slug}`); continue; }
  credits.push({
    id: m.id, uid: m.uid, name: info.name, author: info.user?.displayName || info.user?.username,
    authorUrl: info.user?.profileUrl, url: info.viewerUrl, license: info.license?.label, licenseUrl: info.license?.url,
    usedIn: m.usedIn,
  });
  if (fs.existsSync(dest) && !process.env.FORCE) { console.log(`have ${m.id}`); continue; }
  const dl = await (await fetch(`https://api.sketchfab.com/v3/models/${m.uid}/download`, { headers: { Authorization: `Token ${TOKEN}` } })).json();
  const src = dl.glb?.url || dl.gltf?.url;
  if (!src) { console.warn(`no download for ${m.id}`, JSON.stringify(dl).slice(0, 200)); credits.pop(); continue; }
  const isGlb = !!dl.glb?.url;
  const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
  const raw = path.join(TMP, `${m.id}.${isGlb ? 'glb' : 'zip'}`);
  fs.writeFileSync(raw, buf);
  let input = raw;
  if (!isGlb) {
    const dir = path.join(TMP, m.id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
    execFileSync('unzip', ['-q', '-o', raw, '-d', dir]);
    input = path.join(dir, 'scene.gltf');
  }
  const ratio = String(m.simplify ?? 0.5);
  const tf = (args) => execFileSync('npx', ['-y', '@gltf-transform/cli@4', ...args], { stdio: 'inherit' });
  const mid = path.join(TMP, `${m.id}.mid.glb`);
  tf(['optimize', input, mid, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024', '--simplify', m.simplify ? 'true' : 'false', '--simplify-ratio', ratio, '--simplify-error', '0.002']);
  fs.copyFileSync(mid, dest);
  console.log(`saved ${m.id}: ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
}

fs.writeFileSync(path.join(OUT, 'credits.json'), JSON.stringify(credits, null, 2));
const md = ['# קרדיטים למודלים תלת-ממדיים', '', 'המודלים הורדו מ-[Sketchfab](https://sketchfab.com) ברישיונות Creative Commons, כווצו וצוירו מחדש בסגנון הדיו של הספר.', '',
  '| מודל | יוצר | רישיון | שימוש בספר |', '|---|---|---|---|',
  ...credits.map((c) => `| [${c.name}](${c.url}) | [${c.author}](${c.authorUrl}) | [${c.license}](${c.licenseUrl}) | ${c.usedIn} |`)].join('\n');
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), md + '\n');
console.log('done', credits.length, 'models');
