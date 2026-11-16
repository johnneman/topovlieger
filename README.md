# ✈️ Topovlieger Europa

Een webapp om topografie van Europa te oefenen als spel: je vliegt met een vliegtuigje naar landen, hoofdsteden, zeeën, rivieren, meren en gebergten.
De app werkt in Safari op iPhone en iPad, en ook in elke andere moderne browser.

## Spelvormen

| Spelvorm | Wat doe je? |
|---|---|
| **Vliegmissie** | Je krijgt een land ("Vlieg naar Spanje") en tikt het aan op de kaart. Het vliegtuig vliegt erheen. Fout? Dan zie je welk land het wél was. Na 3 foute pogingen wordt het goede land aangewezen. |
| **Waar ben ik?** | Het vliegtuig landt ergens en jij kiest uit 4 namen welk land het is. |
| **Rondvliegen** | Vrij oefenen: tik een land aan, vlieg erheen en zie de naam. |

- **Wat oefen je?** 50 landen, hun hoofdsteden, 22 zeeën en zeestraten, 20 rivieren, 8 meren en 13 gebergten. Je kiest per onderwerp of per groep (regio, soort), of snel met **📝 Huiswerk Kaart A** (de 44 onderwerpen van Blink TopoMaster Europa – Kaart A), *Alle landen*, *EU-landen*, *Alle wateren* of *Geen*.
- **Op de kaart:** rivieren zijn blauwe lijnen, gebergten bruine vlekken en hoofdsteden vierkantjes, net als op het werkblad. Bij *Vliegmissie* kun je alleen de soort aantikken waar de vraag over gaat. Zo raak je bij "Vlieg naar Duitsland" niet per ongeluk de Rijn.
- **Punten:** 100 punten als het in één keer goed is, 60 bij de tweede poging en 30 bij de derde, plus een bonus voor een reeks goede antwoorden 🔥.
- **Na afloop:** sterren, score, record per selectie en de knop **"Opnieuw"**. Had je fouten? Dan krijg je een oefenronde met je foute landen plus evenveel andere landen uit je selectie, elk één keer. Zonder fouten speel je de hele selectie opnieuw. Een oefenronde telt niet mee voor het record.
- **Kaart:** knijpen om te zoomen, slepen om te schuiven. Er zijn ook knoppen voor +, − en de hele kaart. Dwergstaten (Andorra, Monaco, San Marino, Vaticaanstad, Liechtenstein, Malta) hebben een rondje zodat je ze goed kunt aantikken.
- Je keuzes en records worden lokaal in de browser bewaard.

## Starten met Docker (alleen lokaal netwerk)

```bash
cd topografie-europa
docker compose up -d --build
```

Open daarna op je iPhone (verbonden met hetzelfde wifi-netwerk) `http://<ip-van-je-server>:8080`, bijvoorbeeld `http://192.168.1.10:8080`.

**Tip voor iOS:** tik in Safari op *Deel* → *Zet op beginscherm*. Dan start Topovlieger als app op volledig scherm, zonder adresbalk.

### Niet online zetten

De app is alleen bereikbaar binnen je eigen netwerk, zolang je op je router **geen port-forward** maakt naar deze poort. Wil je een andere poort, of alleen luisteren op één netwerkadres? Dat kan zo:

```bash
BIND_IP=192.168.1.10 PORT=8080 docker compose up -d --build
```

Zonder compose kan het ook:

```bash
docker build -t topovlieger-europa .
docker run -d --name topovlieger --restart unless-stopped -p 8080:80 topovlieger-europa
```

## Techniek

- Een statische site (HTML, CSS en JavaScript) die nginx in de container serveert. Er is geen backend en de app gebruikt geen internet: alles, ook de kaart en de D3-bibliotheek, zit in de container.
- De landen komen uit Natural Earth 1:50m (publiek domein), via `world-atlas`. Zo bouw je `public/data/europe.json` opnieuw:

  ```bash
  cd topografie-europa
  npm i --no-save world-atlas@2 topojson-client@3
  node tools/build-data.mjs
  ```

  In `tools/build-data.mjs` staan de Nederlandse namen, de regio-indeling en de landingspunten van het vliegtuig. Een land toevoegen of de indeling aanpassen doe je daar.

- Zeeën, rivieren, meren, gebergten en hoofdsteden komen uit Natural Earth 1:10m en staan in `public/data/topo.json`. Een onderwerp toevoegen doe je in de lijsten in `tools/build-topo.mjs`, daar staat ook de huiswerkset. Opnieuw bouwen (Node is niet nodig op de server):

  ```bash
  docker run --rm -v "$PWD":/w -w /w node:22-alpine node tools/build-topo.mjs
  docker compose up -d --build
  ```

## Grappige extra's bij landing

Landt het vliegtuig goed, dan verschijnt er een grappig wolkje over het land ("Ooh là là! Croissants…"). In Rondvliegen gebeurt dat bij elke landing, bij *Waar ben ik?* pas nadat je hebt geantwoord.

- **Teksten:** staan in `public/data/grapjes.json`, één per landcode. Pas ze gerust aan. Daarna wel opnieuw bouwen (`docker compose up -d --build`).
- **Eigen geluidjes:** zet ze in `public/sounds/`, bijvoorbeeld `frankrijk.m4a`. Zie [`public/sounds/README.md`](public/sounds/README.md) voor de namen. De map is als volume gekoppeld, dus `git pull` en de pagina herladen is genoeg.
- Een land zonder eigen geluidje krijgt de tekst voorgelezen met een Nederlandse stem.
- **Uitzetten** in het menu onder *Opties*:
  - *Grappige extra's bij landing*: zet alles uit, dus tekst, geluidjes en voorlezen.
  - *Voorlezen als er geen eigen geluidje is*: zet alleen de computerstem uit.
  - *Geluid*: zet al het geluid uit. De tekstwolkjes blijven dan wel.

## Online via GitHub Pages

Bij elke push naar `main` zet de workflow `.github/workflows/pages.yml` het spel op GitHub Pages. Dat gebeurt met `tools/build-pages.sh`:

- **https://johnneman.github.io/topovlieger/**: het spel zónder eigen geluidjes (grapjes en voorleesstem werken wel).
- **https://johnneman.github.io/topovlieger/geluidjes/**: de speciale link, mét eigen geluidjes. Zet je deze versie op je beginscherm, dan blijven de geluidjes erbij.

De geluidsbestanden staan wel openbaar in de repo; de gewone link gebruikt ze alleen niet. Op je eigen server (Docker) spelen de geluidjes altijd.

Eenmalig instellen: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
