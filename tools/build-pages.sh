#!/usr/bin/env bash
# Stelt de site voor GitHub Pages samen in de map _site (of de map die je meegeeft).
#   /            het spel, zónder eigen geluidjes
#   /geluidjes/  hetzelfde spel, mét eigen geluidjes (de "speciale link")
# Gebruik: tools/build-pages.sh [doelmap]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"
rm -rf "$OUT"
cp -r public "$OUT"
touch "$OUT/.nojekyll"

SITE_VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%s)" python3 - "$OUT" <<'PY'
import json, os, sys
out = sys.argv[1]

# GitHub Pages heeft geen mappenoverzicht zoals nginx: daarom een vaste lijst met geluidjes.
snd = os.path.join(out, "sounds")
names = sorted(f for f in os.listdir(snd) if f.lower().endswith((".m4a", ".mp3", ".wav", ".aac")))
with open(os.path.join(snd, "index.json"), "w", encoding="utf-8") as f:
    json.dump([{"name": n, "type": "file"} for n in names], f, ensure_ascii=False)

# Versienummer achter style.css en app.js: na een wijziging haalt elke browser meteen de
# nieuwe versie op (GitHub Pages laat browsers bestanden anders 10 minuten bewaren).
ver = os.environ.get("SITE_VERSION", "dev")
idx = os.path.join(out, "index.html")
html = open(idx, encoding="utf-8").read()
assert 'href="style.css"' in html and 'src="app.js"' in html
html = html.replace('href="style.css"', f'href="style.css?v={ver}"').replace('src="app.js"', f'src="app.js?v={ver}"')

# Bezoekersteller (GoatCounter, zonder cookies). Staat alleen in de Pages-versie, zodat lokaal
# testen niet meetelt. Dashboard: https://topovlieger.goatcounter.com
assert html.count("</body>") == 1
html = html.replace("</body>", '  <script data-goatcounter="https://topovlieger.goatcounter.com/count"\n'
                    '          async src="https://gc.zgo.at/count.js"></script>\n</body>', 1)
open(idx, "w", encoding="utf-8").write(html)

# /geluidjes/: zelfde index.html, maar met <base href="../"> (alle bestanden komen uit de hoofdmap)
# en een vlag die de eigen geluidjes aanzet.
os.makedirs(os.path.join(out, "geluidjes"), exist_ok=True)
html = open(os.path.join(out, "index.html"), encoding="utf-8").read()
assert html.count("<head>") == 1 and 'href="manifest.webmanifest"' in html
html = html.replace("<head>", '<head>\n  <base href="../">\n  <script>window.TOPO_OWN_SOUNDS = true;</script>', 1)
html = html.replace('href="manifest.webmanifest"', 'href="geluidjes/manifest.webmanifest"')
open(os.path.join(out, "geluidjes", "index.html"), "w", encoding="utf-8").write(html)

# Eigen manifest, zodat "Zet op beginscherm" ook de versie mét geluidjes opent.
man = json.load(open(os.path.join(out, "manifest.webmanifest"), encoding="utf-8"))
man["start_url"] = "./"
man["scope"] = "./"
man["icons"] = [dict(i, src="../" + i["src"]) for i in man["icons"]]
json.dump(man, open(os.path.join(out, "geluidjes", "manifest.webmanifest"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{out}: {len(names)} eigen geluidjes, /geluidjes/ aangemaakt")
PY
