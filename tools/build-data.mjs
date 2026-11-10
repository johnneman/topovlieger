// Bouwt public/data/europe.json uit Natural Earth (world-atlas, 1:50m).
// Gebruik: npm i world-atlas@2 topojson-client@3 && node tools/build-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-50m.json");
const all = feature(topo, topo.objects.countries).features;

// Engelse naam (world-atlas) -> [sleutel, Nederlandse naam, regio, EU-lid]
const EU = true;
const C = {
  "Albania": ["AL", "Albanië", "balkan"],
  "Andorra": ["AD", "Andorra", "micro"],
  "Austria": ["AT", "Oostenrijk", "midden", EU],
  "Belarus": ["BY", "Wit-Rusland", "oost"],
  "Belgium": ["BE", "België", "west", EU],
  "Bosnia and Herz.": ["BA", "Bosnië en Herzegovina", "balkan"],
  "Bulgaria": ["BG", "Bulgarije", "balkan", EU],
  "Croatia": ["HR", "Kroatië", "balkan", EU],
  "Cyprus": ["CY", "Cyprus", "zuid", EU],
  "N. Cyprus": ["CY"],
  "Czechia": ["CZ", "Tsjechië", "midden", EU],
  "Denmark": ["DK", "Denemarken", "noord", EU],
  "Estonia": ["EE", "Estland", "oost", EU],
  "Finland": ["FI", "Finland", "noord", EU],
  "Åland": ["FI"],
  "France": ["FR", "Frankrijk", "west", EU],
  "Germany": ["DE", "Duitsland", "midden", EU],
  "Greece": ["GR", "Griekenland", "zuid", EU],
  "Hungary": ["HU", "Hongarije", "midden", EU],
  "Iceland": ["IS", "IJsland", "noord"],
  "Ireland": ["IE", "Ierland", "west", EU],
  "Italy": ["IT", "Italië", "zuid", EU],
  "Kosovo": ["XK", "Kosovo", "balkan"],
  "Latvia": ["LV", "Letland", "oost", EU],
  "Liechtenstein": ["LI", "Liechtenstein", "micro"],
  "Lithuania": ["LT", "Litouwen", "oost", EU],
  "Luxembourg": ["LU", "Luxemburg", "west", EU],
  "Macedonia": ["MK", "Noord-Macedonië", "balkan"],
  "Malta": ["MT", "Malta", "micro", EU],
  "Moldova": ["MD", "Moldavië", "oost"],
  "Monaco": ["MC", "Monaco", "micro"],
  "Montenegro": ["ME", "Montenegro", "balkan"],
  "Netherlands": ["NL", "Nederland", "west", EU],
  "Norway": ["NO", "Noorwegen", "noord"],
  "Poland": ["PL", "Polen", "midden", EU],
  "Portugal": ["PT", "Portugal", "zuid", EU],
  "Romania": ["RO", "Roemenië", "oost", EU],
  "Russia": ["RU", "Rusland", "oost"],
  "San Marino": ["SM", "San Marino", "micro"],
  "Serbia": ["RS", "Servië", "balkan"],
  "Slovakia": ["SK", "Slowakije", "midden", EU],
  "Slovenia": ["SI", "Slovenië", "balkan", EU],
  "Spain": ["ES", "Spanje", "zuid", EU],
  "Sweden": ["SE", "Zweden", "noord", EU],
  "Switzerland": ["CH", "Zwitserland", "midden"],
  "Turkey": ["TR", "Turkije", "zuid"],
  "Ukraine": ["UA", "Oekraïne", "oost"],
  "United Kingdom": ["GB", "Verenigd Koninkrijk", "west"],
  "Vatican": ["VA", "Vaticaanstad", "micro"],
  "Georgia": ["GE", "Georgië", "kaukasus"],
  "Armenia": ["AM", "Armenië", "kaukasus"],
  "Azerbaijan": ["AZ", "Azerbeidzjan", "kaukasus"],
};

// Ankerpunt (lon, lat) waar het vliegtuig landt; handmatig voor grillige landen.
const ANCHOR = {
  RU: [38, 56], NO: [9.5, 61], FR: [2.5, 46.8], GB: [-1.8, 52.8], IT: [12.6, 42.8],
  HR: [16, 45.4], GR: [22, 39.4], DK: [9.2, 56.1], SE: [15, 62.5], FI: [26, 62.5],
  TR: [33, 39.2], ES: [-3.6, 40.2], PT: [-8.1, 39.6], NL: [5.6, 52.2], CY: [33, 35],
  MT: [14.44, 35.9], IS: [-18.6, 64.9], GE: [43.5, 42.2], AZ: [47.6, 40.3],
};

const BBOX = [-32, 33, 66, 82]; // west, zuid, oost, noord
const inBox = ([x, y]) => x >= BBOX[0] - 8 && x <= BBOX[2] + 8 && y >= BBOX[1] - 6 && y <= BBOX[3];
const round = (c) => [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000];

function polys(geom) {
  if (!geom) return [];
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}
function keepPoly(poly) {
  return poly[0].some(inBox);
}
function simplifyRing(ring, tol) {
  // eenvoudige afstandsfilter, behoudt begin/eind
  const out = [round(ring[0])];
  for (let i = 1; i < ring.length - 1; i++) {
    const p = ring[i], q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= tol) out.push(round(p));
  }
  out.push(round(ring[ring.length - 1]));
  return out.length >= 4 ? out : ring.map(round);
}

const byKey = new Map();
const background = [];
for (const f of all) {
  const name = f.properties.name;
  const ps = polys(f.geometry).filter(keepPoly);
  if (!ps.length) continue;
  const meta = C[name];
  const tol = meta && meta[2] === "micro" ? 0 : 0.04;
  const rings = ps.map((p) => p.map((r) => simplifyRing(r, tol)));
  if (!meta) { background.push(...rings); continue; }
  const key = meta[0];
  if (!byKey.has(key)) byKey.set(key, { key, rings: [] });
  const e = byKey.get(key);
  e.rings.push(...rings);
  if (meta[1]) Object.assign(e, { name: meta[1], region: meta[2], eu: !!meta[3] });
}

const features = [...byKey.values()].map((e) => ({
  type: "Feature",
  properties: { key: e.key, name: e.name, region: e.region, eu: e.eu, anchor: ANCHOR[e.key] || null },
  geometry: { type: "MultiPolygon", coordinates: e.rings },
}));
features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, "nl"));

const out = {
  bbox: BBOX,
  countries: features,
  background: { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: background } },
};
const target = new URL("../public/data/europe.json", import.meta.url);
writeFileSync(target, JSON.stringify(out));
console.log(`${features.length} landen, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
