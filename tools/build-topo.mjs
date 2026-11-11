// Bouwt public/data/topo.json: zeeën, rivieren, meren, gebergten en hoofdsteden.
// Bron: Natural Earth 1:10m (publiek domein), via github.com/nvkelso/natural-earth-vector.
// Geen npm-pakketten nodig (Node 18+). Zonder Node op de server:
//   docker run --rm -v "$PWD":/w -w /w node:22-alpine node tools/build-topo.mjs
import { writeFileSync } from "node:fs";

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const CLIP = [-35, 28, 72, 85]; // west, zuid, oost, noord

// ---------- onderwerpen ----------
// [sleutel, naam, lidwoord, Natural Earth-namen, landingsplek (lon, lat) of null, opties]
const SEAS = [
  ["noordzee", "Noordzee", "de", ["North Sea"], [3.6, 56]],
  ["oostzee", "Oostzee", "de", ["Baltic Sea", "Gulf of Riga", "Mecklenburger Bucht"], [19, 56.3]],
  ["middellandse-zee", "Middellandse Zee", "de", ["Mediterranean Sea", "Tyrrhenian Sea", "Ionian Sea", "Balearic Sea", "Ligurian Sea",
    "Alboran Sea", "Sea of Crete", "Golfe du Lion", "Gulf of Sidra", "Gulf of Gabès"], [18, 35.3]],
  ["het-kanaal", "Het Kanaal", "", ["English Channel"], [-1.6, 50.2]],
  ["straat-van-gibraltar", "Straat van Gibraltar", "de", ["Strait of Gibraltar"], [-5.6, 35.97], { small: true }],
  ["atlantische-oceaan", "Atlantische Oceaan", "de", ["North Atlantic Ocean"], [-18, 46]],
  ["noordelijke-ijszee", "Noordelijke IJszee", "de", ["Arctic Ocean"], null],
  ["noorse-zee", "Noorse Zee", "de", ["Norwegian Sea"], [2, 67]],
  ["barentszzee", "Barentszzee", "de", ["Barents Sea"], [40, 73.5]],
  ["zwarte-zee", "Zwarte Zee", "de", ["Black Sea"], [34, 43.3]],
  ["kaspische-zee", "Kaspische Zee", "de", ["Caspian Sea"], [50.6, 42]],
  ["zee-van-azov", "Zee van Azov", "de", ["Sea of Azov"], [36.6, 46.1]],
  ["adriatische-zee", "Adriatische Zee", "de", ["Adriatic Sea"], [15.6, 43]],
  ["egeische-zee", "Egeïsche Zee", "de", ["Aegean Sea"], [25, 39]],
  ["ierse-zee", "Ierse Zee", "de", ["Irish Sea"], [-5.2, 53.7]],
  ["golf-van-biskaje", "Golf van Biskaje", "de", ["Bay of Biscay"], [-4.5, 45.4]],
  ["botnische-golf", "Botnische Golf", "de", ["Gulf of Bothnia"], [20, 62.5]],
  ["finse-golf", "Finse Golf", "de", ["Gulf of Finland"], [26.5, 59.8]],
  ["skagerrak", "Skagerrak", "het", ["Skagerrak"], [9, 57.9]],
  ["kattegat", "Kattegat", "het", ["Kattegat"], [11.5, 56.8]],
  ["waddenzee", "Waddenzee", "de", ["Waddenzee"], null, { small: true }],
  ["bosporus", "Bosporus", "de", ["Bosporus"], null, { small: true }],
];
// [sleutel, naam, lidwoord, Natural Earth-namen, landingsplek, bbox-filter [w,z,o,n]]
const RIVERS = [
  ["rijn", "Rijn", "de", ["Rhine", "Rhein", "Nederrijn"], [7.62, 50.33]],
  ["maas", "Maas", "de", ["Maas"], null, [2, 47, 7, 53]],
  ["schelde", "Schelde", "de", ["Schelde"], null, [2, 49, 5, 52]],
  ["ijssel", "IJssel", "de", ["IJssel"], null, [5, 51, 7, 53]],
  ["theems", "Theems", "de", ["Thames"], null, [-3, 51, 1, 52.5]],
  ["seine", "Seine", "de", ["Seine"], null, [-1, 47, 6, 50]],
  ["loire", "Loire", "de", ["Loire"], null, [-3, 44, 5, 48.5]],
  ["rhone", "Rhône", "de", ["Rhône"], null, [3, 43, 9, 47]],
  ["garonne", "Garonne", "de", ["Garonne"], null, [-2, 42, 2, 46]],
  ["elbe", "Elbe", "de", ["Elbe"], null, [8, 49, 17, 55]],
  ["oder", "Oder", "de", ["Oder"], null, [13, 49, 19, 55]],
  ["weichsel", "Weichsel", "de", ["Vistula"], null, [17, 49, 24, 55]],
  ["donau", "Donau", "de", ["Danube", "Donau"], [20.5, 45.2]],
  ["po", "Po", "de", ["Po"], null, [6, 44, 13, 46]],
  ["taag", "Taag", "de", ["Tajo", "Tejo"], null, [-10, 38, -1, 42]],
  ["ebro", "Ebro", "de", ["Ebro"], null, [-5, 40, 2, 44]],
  ["moezel", "Moezel", "de", ["Mosel"], null, [5, 47, 8, 51]],
  ["wolga", "Wolga", "de", ["Volga"], [45.5, 50.5]],
  ["dnjepr", "Dnjepr", "de", ["Dnipro", "Dnieper"], null, [28, 46, 36, 56]],
  ["don", "Don", "de", ["Don"], null, [37, 46, 45, 55]],
];
const LAKES = [
  ["meer-van-geneve", "Meer van Genève", "het", ["Lake Geneva", "Lac Léman", "Léman", "Lac Leman"]],
  ["bodenmeer", "Bodenmeer", "het", ["Lake Constance", "Bodensee"]],
  ["gardameer", "Gardameer", "het", ["Lago di Garda", "Lake Garda", "Garda"]],
  ["balatonmeer", "Balatonmeer", "het", ["Lake Balaton", "Balaton"]],
  ["ladogameer", "Ladogameer", "het", ["Lake Ladoga", "Ladoga", "Ladozhskoye Ozero"]],
  ["onegameer", "Onegameer", "het", ["Lake Onega", "Onega", "Onezhskoye Ozero"]],
  ["ijsselmeer", "IJsselmeer", "het", ["IJsselmeer", "Ijsselmeer"]],
  ["vanern", "Vänern", "het", ["Vänern", "Vanern", "Lake Vänern"]],
];
const MOUNTAINS = [
  ["alpen", "Alpen", "de", ["ALPS"], [10.5, 46.6]],
  ["pyreneeen", "Pyreneeën", "de", ["PYRENEES"], null],
  ["kaukasus", "Kaukasus", "de", ["CAUCASUS MTS."], null],
  ["oeral", "Oeral", "de", ["URAL MOUNTAINS"], null],
  ["karpaten", "Karpaten", "de", ["CARPATHIAN MOUNTAINS"], null],
  ["apennijnen", "Apennijnen", "de", ["APPENNINI"], null],
  ["scandinavisch-hoogland", "Scandinavisch Hoogland", "het", ["KJØLEN MOUNTAINS"], null],
  ["dinarische-alpen", "Dinarische Alpen", "de", ["Dinaric Alps"], null],
  ["balkangebergte", "Balkangebergte", "het", ["Balkan Mts."], null],
  ["cantabrisch-gebergte", "Cantabrisch Gebergte", "het", ["Cord. Cantábrica"], null],
  ["ardennen", "Ardennen", "de", ["Ardennes"], null],
  ["jura", "Jura", "de", ["Jura"], null],
  ["vogezen", "Vogezen", "de", ["Vosges"], null],
];
// landcode -> [Nederlandse naam, Natural Earth-naam]
const CAPITALS = {
  AL: ["Tirana", "Tirana"], AD: ["Andorra la Vella", "Andorra"], AM: ["Jerevan", "Yerevan"], AZ: ["Bakoe", "Baku"],
  BE: ["Brussel", "Brussels"], BA: ["Sarajevo", "Sarajevo"], BG: ["Sofia", "Sofia"], CY: ["Nicosia", "Nicosia"],
  DK: ["Kopenhagen", "København"], DE: ["Berlijn", "Berlin"], EE: ["Tallinn", "Tallinn"], FI: ["Helsinki", "Helsinki"],
  FR: ["Parijs", "Paris"], GE: ["Tbilisi", "Tbilisi"], GR: ["Athene", "Athens"], HU: ["Boedapest", "Budapest"],
  IE: ["Dublin", "Dublin"], IS: ["Reykjavik", "Reykjavík"], IT: ["Rome", "Rome"], XK: ["Pristina", "Pristina"],
  HR: ["Zagreb", "Zagreb"], LV: ["Riga", "Riga"], LI: ["Vaduz", "Vaduz"], LT: ["Vilnius", "Vilnius"],
  LU: ["Luxemburg", "Luxembourg"], MT: ["Valletta", "Valletta"], MD: ["Chisinau", "Chișinău"], MC: ["Monaco", "Monaco"],
  ME: ["Podgorica", "Podgorica"], NL: ["Amsterdam", "Amsterdam"], MK: ["Skopje", "Skopje"], NO: ["Oslo", "Oslo"],
  UA: ["Kyiv", "Kyiv"], AT: ["Wenen", "Vienna"], PL: ["Warschau", "Warsaw"], PT: ["Lissabon", "Lisbon"],
  RO: ["Boekarest", "Bucharest"], RU: ["Moskou", "Moscow"], SM: ["San Marino", "San Marino"], RS: ["Belgrado", "Belgrade"],
  SI: ["Ljubljana", "Ljubljana"], SK: ["Bratislava", "Bratislava"], ES: ["Madrid", "Madrid"], CZ: ["Praag", "Prague"],
  TR: ["Ankara", "Ankara"], VA: ["Vaticaanstad", "Vatican City"], GB: ["Londen", "London"], BY: ["Minsk", "Minsk"],
  SE: ["Stockholm", "Stockholm"], CH: ["Bern", "Bern"],
};

// ---------- hulpfuncties ----------
const round = (c) => [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000];
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
async function load(name) {
  const r = await fetch(NE + name + ".geojson");
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return (await r.json()).features;
}
const prop = (p, k) => p[k] ?? p[k.toUpperCase()];
const polysOf = (g) => !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
const linesOf = (g) => !g ? [] : g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];

// Sutherland–Hodgman: ring bijknippen tot een rechthoek (lon/lat).
function clipRing(ring, [w, s, e, n]) {
  const edges = [
    [(p) => p[0] >= w, (a, b) => [w, a[1] + (b[1] - a[1]) * (w - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= e, (a, b) => [e, a[1] + (b[1] - a[1]) * (e - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= s, (a, b) => [a[0] + (b[0] - a[0]) * (s - a[1]) / (b[1] - a[1]), s]],
    [(p) => p[1] <= n, (a, b) => [a[0] + (b[0] - a[0]) * (n - a[1]) / (b[1] - a[1]), n]],
  ];
  let pts = ring.slice(0, -1);
  for (const [inside, cut] of edges) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); }
      else if (inside(a)) out.push(cut(a, b));
    }
    pts = out;
    if (!pts.length) return null;
  }
  return pts.length >= 3 ? [...pts, pts[0]] : null;
}
function simplify(line, tol, closed) {
  const out = [round(line[0])];
  for (let i = 1; i < line.length - 1; i++) {
    const p = line[i], q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= tol) out.push(round(p));
  }
  out.push(round(line[line.length - 1]));
  const min = closed ? 4 : 2;
  return out.length >= min ? out : line.map(round);
}
const signedArea = (r) => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
// d3-geo verwacht buitenringen met de klok mee (in lon/lat met noord boven), gaten tegen de klok in.
function orient(poly) {
  return poly.map((r, i) => ((signedArea(r) < 0) === (i === 0) ? r : r.slice().reverse()));
}
function preparePolys(polys, tol) {
  const out = [];
  for (const poly of polys) {
    const outer = clipRing(poly[0], CLIP);
    if (!outer) continue;
    const holes = poly.slice(1).map((r) => clipRing(r, CLIP)).filter(Boolean);
    const p = orient([outer, ...holes].map((r) => simplify(r, tol, true)));
    if (Math.abs(signedArea(p[0])) > 1e-6) out.push(p);
  }
  return out;
}
function inRing([x, y], ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inPoly = (pt, poly) => inRing(pt, poly[0]) && !poly.slice(1).some((h) => inRing(pt, h));
function segDist([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l)) : 0;
  return Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
}
// Punt diep binnen het grootste vlak (eenvoudige "polylabel" met een raster).
function labelPoint(polys) {
  const big = polys.reduce((a, p) => (Math.abs(signedArea(p[0])) > Math.abs(signedArea(a[0])) ? p : a));
  const xs = big[0].map((p) => p[0]), ys = big[0].map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best = null, bestD = -1;
  const N = 60;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const pt = [x0 + (x1 - x0) * i / N, y0 + (y1 - y0) * j / N];
    if (!inPoly(pt, big)) continue;
    // afstand in "kaartgraden": lon gecorrigeerd voor de breedtegraad
    const k = Math.cos(pt[1] * Math.PI / 180);
    let d = Infinity;
    for (const r of big) for (let m = 0; m < r.length - 1; m++) {
      const a = [r[m][0] * k, r[m][1]], b = [r[m + 1][0] * k, r[m + 1][1]];
      d = Math.min(d, segDist([pt[0] * k, pt[1]], a, b));
    }
    if (d > bestD) { bestD = d; best = pt; }
  }
  return best ? round(best) : round(big[0][0]);
}
// Punt halverwege de (totale) lengte van een rivier.
function midLine(lines) {
  const len = (l) => l.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0);
  const longest = lines.reduce((a, l) => (len(l) > len(a) ? l : a));
  let half = len(longest) / 2;
  for (let i = 1; i < longest.length; i++) {
    const d = Math.hypot(longest[i][0] - longest[i - 1][0], longest[i][1] - longest[i - 1][1]);
    if ((half -= d) <= 0) return round(longest[i]);
  }
  return round(longest[longest.length - 1]);
}
const lineInBox = (l, [w, s, e, n]) => l.some(([x, y]) => x >= w && x <= e && y >= s && y <= n);

// ---------- bouwen ----------
const problems = [];
const items = [];
function nameMatch(p, names) {
  const cands = ["name", "name_en", "name_alt", "namealt", "nameascii"].map((k) => prop(p, k)).filter(Boolean);
  return cands.some((c) => names.includes(c));
}

const marine = await load("ne_10m_geography_marine_polys");
for (const [key, name, article, ne, anchor, opt = {}] of SEAS) {
  const polys = marine.filter((f) => nameMatch(f.properties, ne)).flatMap((f) => polysOf(f.geometry));
  const geo = preparePolys(polys, opt.small ? 0 : 0.04);
  if (!geo.length) { problems.push(`zee ontbreekt: ${name}`); continue; }
  const a = anchor || labelPoint(geo);
  if (!opt.small && !geo.some((p) => inPoly(a, p))) problems.push(`landingsplek ligt niet in ${name}: ${a}`);
  items.push({ key: "zee:" + key, name, kind: "zee", article, small: !!opt.small, anchor: a, geometry: { type: "MultiPolygon", coordinates: geo } });
}

const rivers = await load("ne_10m_rivers_lake_centerlines");
for (const [key, name, article, ne, anchor, box] of RIVERS) {
  let lines = rivers.filter((f) => nameMatch(f.properties, ne)).flatMap((f) => linesOf(f.geometry));
  if (box) lines = lines.filter((l) => lineInBox(l, box));
  lines = lines.filter((l) => l.length >= 2).map((l) => simplify(l, 0.02, false));
  if (!lines.length) { problems.push(`rivier ontbreekt: ${name}`); continue; }
  items.push({ key: "rivier:" + key, name, kind: "rivier", article, anchor: anchor || midLine(lines), geometry: { type: "MultiLineString", coordinates: lines } });
}

const lakes = [...await load("ne_10m_lakes"), ...await load("ne_10m_lakes_europe")];
for (const [key, name, article, ne] of LAKES) {
  const feats = lakes.filter((f) => nameMatch(f.properties, ne));
  // dezelfde naam kan in beide bestanden staan: neem het bestand met de meeste punten
  const polys = feats.length ? polysOf(feats.reduce((a, f) => (JSON.stringify(f.geometry).length > JSON.stringify(a.geometry).length ? f : a)).geometry) : [];
  const geo = preparePolys(polys, 0.01);
  if (!geo.length) { problems.push(`meer ontbreekt (overgeslagen): ${name}`); continue; }
  items.push({ key: "meer:" + key, name, kind: "meer", article, anchor: labelPoint(geo), geometry: { type: "MultiPolygon", coordinates: geo } });
}

const regions = await load("ne_10m_geography_regions_polys");
for (const [key, name, article, ne, anchor] of MOUNTAINS) {
  const polys = regions.filter((f) => /range/i.test(prop(f.properties, "featurecla")) && ne.includes(prop(f.properties, "name")))
    .flatMap((f) => polysOf(f.geometry));
  const geo = preparePolys(polys, 0.04);
  if (!geo.length) { problems.push(`gebergte ontbreekt: ${name}`); continue; }
  items.push({ key: "berg:" + key, name, kind: "berg", article, anchor: anchor || labelPoint(geo), geometry: { type: "MultiPolygon", coordinates: geo } });
}

const places = await load("ne_10m_populated_places_simple");
for (const [cc, [name, ne]] of Object.entries(CAPITALS)) {
  const cand = places.filter((f) => nameMatch(f.properties, [ne]) && f.properties.adm0cap);
  const f = cand[0] || places.find((x) => nameMatch(x.properties, [ne]));
  if (!f) { problems.push(`hoofdstad ontbreekt: ${name}`); continue; }
  const c = round(f.geometry.coordinates);
  items.push({ key: "stad:" + slug(name), name, kind: "stad", article: "", country: cc, anchor: c, geometry: { type: "Point", coordinates: c } });
}

// Huiswerk Blink TopoMaster Europa – Kaart A
const HOMEWORK_A = [
  "NL", "BE", "LU", "NO", "SE", "RU", "GB", "DE", "PL", "FR", "CH", "AT", "IT", "ES",
  ...["amsterdam", "brussel", "luxemburg", "oslo", "stockholm", "moskou", "londen", "berlijn", "warschau", "parijs", "bern", "wenen", "rome", "madrid"].map((k) => "stad:" + k),
  ...["noordzee", "oostzee", "middellandse-zee", "het-kanaal", "straat-van-gibraltar"].map((k) => "zee:" + k),
  ...["theems", "seine", "rijn", "schelde", "rhone", "donau", "wolga"].map((k) => "rivier:" + k),
  ...["alpen", "pyreneeen", "kaukasus", "oeral"].map((k) => "berg:" + k),
];
const keys = new Set(items.map((i) => i.key));
for (const k of HOMEWORK_A) if (!k.includes(":") ? false : !keys.has(k)) problems.push(`huiswerk-onderwerp ontbreekt: ${k}`);

const out = { source: "Natural Earth 1:10m", presets: { huiswerkA: HOMEWORK_A }, items };
const json = JSON.stringify(out);
writeFileSync(new URL("../public/data/topo.json", import.meta.url), json);
const count = (k) => items.filter((i) => i.kind === k).length;
console.log(`zeeën ${count("zee")}, rivieren ${count("rivier")}, meren ${count("meer")}, gebergten ${count("berg")}, hoofdsteden ${count("stad")} — ${(json.length / 1024).toFixed(0)} KB, huiswerk A: ${HOMEWORK_A.length}`);
for (const p of problems) console.warn("⚠️ ", p);
if (problems.some((p) => p.startsWith("huiswerk"))) process.exit(1);
