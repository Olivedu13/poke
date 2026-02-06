#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
const streamPipeline = promisify(pipeline);

const API_URL = 'https://tyradex.vercel.app/api/v1/pokemon';
const OUT_DIR = path.resolve(new URL(import.meta.url).pathname, '..', '..', 'assets', 'tyradex');
const IMAGES_DIR = path.join(OUT_DIR, 'images');
const JSON_FILE = path.join(OUT_DIR, 'pokemon.json');

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function collectImageUrls(obj){
  const urls = new Set();
  function walk(v){
    if(!v) return;
    if(typeof v === 'string'){
      const m = v.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)(?:\?|$)/i);
      if(m) urls.add(v.split('#')[0]);
      return;
    }
    if(Array.isArray(v)) return v.forEach(walk);
    if(typeof v === 'object') return Object.values(v).forEach(walk);
  }
  walk(obj);
  return Array.from(urls);
}

async function download(url, dest){
  if(fs.existsSync(dest)) return; // skip existing
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await streamPipeline(res.body, fs.createWriteStream(dest));
}

async function main(){
  ensureDir(OUT_DIR);
  ensureDir(IMAGES_DIR);

  console.log('Fetching JSON from', API_URL);
  const res = await fetch(API_URL);
  if(!res.ok) throw new Error('Failed to fetch JSON: ' + res.status);
  const data = await res.json();

  console.log('Saving JSON to', JSON_FILE);
  fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));

  // Télécharger les images en évitant les collisions de noms.
  // Pour chaque entrée Pokémon on enregistre les sprites dans images/<pokedex_id>/...
  let count = 0;
  for (const p of data) {
    const id = p.pokedex_id ?? 'unknown';
    const targetDir = path.join(IMAGES_DIR, String(id));
    ensureDir(targetDir);

    // sprites (regular, shiny, gmax, ...)
    if (p.sprites && typeof p.sprites === 'object') {
      for (const [k, v] of Object.entries(p.sprites)) {
        if (v && typeof v === 'string' && v.startsWith('http')) {
          try {
            const urlObj = new URL(v);
            const name = path.basename(urlObj.pathname) || `${k}.png`;
            const dest = path.join(targetDir, name);
            if (fs.existsSync(dest)) {
              console.log('Skip existing', path.relative(OUT_DIR, dest));
            } else {
              console.log('Downloading', v, '->', path.relative(OUT_DIR, dest));
              await download(v, dest);
              count++;
            }
          } catch (err) {
            console.warn('Error downloading sprite', v, err.message);
          }
        }
      }
    }

    // types images
    if (p.types && Array.isArray(p.types)) {
      for (const t of p.types) {
        if (t && t.image && typeof t.image === 'string' && t.image.startsWith('http')) {
          try {
            const urlObj = new URL(t.image);
            const typesDir = path.join(IMAGES_DIR, 'types');
            ensureDir(typesDir);
            const name = path.basename(urlObj.pathname) || 'type.png';
            const dest = path.join(typesDir, name);
            if (fs.existsSync(dest)) {
              console.log('Skip existing', path.relative(OUT_DIR, dest));
            } else {
              console.log('Downloading', t.image, '->', path.relative(OUT_DIR, dest));
              await download(t.image, dest);
              count++;
            }
          } catch (err) {
            console.warn('Error downloading type image', t.image, err.message);
          }
        }
      }
    }
  }

  console.log(`Downloaded ${count} new images`);

  console.log('Done. JSON:', JSON_FILE, 'Images in', IMAGES_DIR);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
