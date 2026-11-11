# 🔊 Eigen geluidjes

Zet hier geluidjes neer. Als het vliegtuig in dat land landt, speelt het spel ze af.
Een land zonder eigen geluidje krijgt het grapje uit `public/data/grapjes.json`, voorgelezen door de browser.

## Zo noem je het bestand

Gebruik de naam (of bij een land de landcode), bijvoorbeeld:

- `frankrijk.m4a` of `FR.mp3`
- `verenigd-koninkrijk.mp3`, `rijn.m4a`, `noordzee.m4a`, `alpen.m4a`, `parijs.m4a`
- meer dan één geluidje voor hetzelfde land: `frankrijk-2.m4a`, `frankrijk-3.m4a`. Het spel kiest er dan willekeurig één.

Hoofdletters, accenten en spaties maken niet uit: `België.m4a`, `belgie.m4a` en `BE.m4a` werken alle drie.

**Formaten:** `.m4a` (Spraakmemo's van je iPhone), `.mp3`, `.wav`, `.aac`.
Houd het kort: na ongeveer 4 seconden gaat het spel alweer verder.

## Werkt het meteen?

Ja. Docker koppelt deze map direct aan de container, dus opnieuw bouwen is niet nodig:

```bash
cd ~/claude-workspace/topovlieger && git pull
```

Herlaad daarna de pagina in Safari.

## Alle namen

Steden met dezelfde naam als hun land (Luxemburg, Monaco, San Marino, Vaticaanstad) krijgen het voorvoegsel `stad-`, bijvoorbeeld `stad-luxemburg.m4a`. Het voorvoegsel mag ook bij alle andere onderwerpen: `rivier-rijn.m4a` werkt net zo goed als `rijn.m4a`.

### Landen

| Land | Bestandsnaam | Code |
|---|---|---|
| Albanië | `albanie` | `AL` |
| Andorra | `andorra` | `AD` |
| Armenië | `armenie` | `AM` |
| Azerbeidzjan | `azerbeidzjan` | `AZ` |
| België | `belgie` | `BE` |
| Bosnië en Herzegovina | `bosnie-en-herzegovina` | `BA` |
| Bulgarije | `bulgarije` | `BG` |
| Cyprus | `cyprus` | `CY` |
| Denemarken | `denemarken` | `DK` |
| Duitsland | `duitsland` | `DE` |
| Estland | `estland` | `EE` |
| Finland | `finland` | `FI` |
| Frankrijk | `frankrijk` | `FR` |
| Georgië | `georgie` | `GE` |
| Griekenland | `griekenland` | `GR` |
| Hongarije | `hongarije` | `HU` |
| Ierland | `ierland` | `IE` |
| IJsland | `ijsland` | `IS` |
| Italië | `italie` | `IT` |
| Kosovo | `kosovo` | `XK` |
| Kroatië | `kroatie` | `HR` |
| Letland | `letland` | `LV` |
| Liechtenstein | `liechtenstein` | `LI` |
| Litouwen | `litouwen` | `LT` |
| Luxemburg | `luxemburg` | `LU` |
| Malta | `malta` | `MT` |
| Moldavië | `moldavie` | `MD` |
| Monaco | `monaco` | `MC` |
| Montenegro | `montenegro` | `ME` |
| Nederland | `nederland` | `NL` |
| Noord-Macedonië | `noord-macedonie` | `MK` |
| Noorwegen | `noorwegen` | `NO` |
| Oekraïne | `oekraine` | `UA` |
| Oostenrijk | `oostenrijk` | `AT` |
| Polen | `polen` | `PL` |
| Portugal | `portugal` | `PT` |
| Roemenië | `roemenie` | `RO` |
| Rusland | `rusland` | `RU` |
| San Marino | `san-marino` | `SM` |
| Servië | `servie` | `RS` |
| Slovenië | `slovenie` | `SI` |
| Slowakije | `slowakije` | `SK` |
| Spanje | `spanje` | `ES` |
| Tsjechië | `tsjechie` | `CZ` |
| Turkije | `turkije` | `TR` |
| Vaticaanstad | `vaticaanstad` | `VA` |
| Verenigd Koninkrijk | `verenigd-koninkrijk` | `GB` |
| Wit-Rusland | `wit-rusland` | `BY` |
| Zweden | `zweden` | `SE` |
| Zwitserland | `zwitserland` | `CH` |

### Zeeën, zeestraten en oceanen

| Naam | Bestandsnaam |
|---|---|
| Adriatische Zee | `adriatische-zee` |
| Atlantische Oceaan | `atlantische-oceaan` |
| Barentszzee | `barentszzee` |
| Bosporus | `bosporus` |
| Botnische Golf | `botnische-golf` |
| Egeïsche Zee | `egeische-zee` |
| Finse Golf | `finse-golf` |
| Golf van Biskaje | `golf-van-biskaje` |
| Het Kanaal | `het-kanaal` |
| Ierse Zee | `ierse-zee` |
| Kaspische Zee | `kaspische-zee` |
| Kattegat | `kattegat` |
| Middellandse Zee | `middellandse-zee` |
| Noordelijke IJszee | `noordelijke-ijszee` |
| Noordzee | `noordzee` |
| Noorse Zee | `noorse-zee` |
| Oostzee | `oostzee` |
| Skagerrak | `skagerrak` |
| Straat van Gibraltar | `straat-van-gibraltar` |
| Waddenzee | `waddenzee` |
| Zee van Azov | `zee-van-azov` |
| Zwarte Zee | `zwarte-zee` |

### Rivieren

| Naam | Bestandsnaam |
|---|---|
| Dnjepr | `dnjepr` |
| Don | `don` |
| Donau | `donau` |
| Ebro | `ebro` |
| Elbe | `elbe` |
| Garonne | `garonne` |
| IJssel | `ijssel` |
| Loire | `loire` |
| Maas | `maas` |
| Moezel | `moezel` |
| Oder | `oder` |
| Po | `po` |
| Rhône | `rhone` |
| Rijn | `rijn` |
| Schelde | `schelde` |
| Seine | `seine` |
| Taag | `taag` |
| Theems | `theems` |
| Weichsel | `weichsel` |
| Wolga | `wolga` |

### Meren

| Naam | Bestandsnaam |
|---|---|
| Balatonmeer | `balatonmeer` |
| Bodenmeer | `bodenmeer` |
| Gardameer | `gardameer` |
| IJsselmeer | `ijsselmeer` |
| Ladogameer | `ladogameer` |
| Meer van Genève | `meer-van-geneve` |
| Onegameer | `onegameer` |
| Vänern | `vanern` |

### Gebergten

| Naam | Bestandsnaam |
|---|---|
| Alpen | `alpen` |
| Apennijnen | `apennijnen` |
| Ardennen | `ardennen` |
| Balkangebergte | `balkangebergte` |
| Cantabrisch Gebergte | `cantabrisch-gebergte` |
| Dinarische Alpen | `dinarische-alpen` |
| Jura | `jura` |
| Karpaten | `karpaten` |
| Kaukasus | `kaukasus` |
| Oeral | `oeral` |
| Pyreneeën | `pyreneeen` |
| Scandinavisch Hoogland | `scandinavisch-hoogland` |
| Vogezen | `vogezen` |

### Hoofdsteden

| Naam | Bestandsnaam |
|---|---|
| Amsterdam | `amsterdam` |
| Andorra la Vella | `andorra-la-vella` |
| Ankara | `ankara` |
| Athene | `athene` |
| Bakoe | `bakoe` |
| Belgrado | `belgrado` |
| Berlijn | `berlijn` |
| Bern | `bern` |
| Boedapest | `boedapest` |
| Boekarest | `boekarest` |
| Bratislava | `bratislava` |
| Brussel | `brussel` |
| Chisinau | `chisinau` |
| Dublin | `dublin` |
| Helsinki | `helsinki` |
| Jerevan | `jerevan` |
| Kopenhagen | `kopenhagen` |
| Kyiv | `kyiv` |
| Lissabon | `lissabon` |
| Ljubljana | `ljubljana` |
| Londen | `londen` |
| Madrid | `madrid` |
| Minsk | `minsk` |
| Moskou | `moskou` |
| Nicosia | `nicosia` |
| Oslo | `oslo` |
| Parijs | `parijs` |
| Podgorica | `podgorica` |
| Praag | `praag` |
| Pristina | `pristina` |
| Reykjavik | `reykjavik` |
| Riga | `riga` |
| Rome | `rome` |
| Sarajevo | `sarajevo` |
| Skopje | `skopje` |
| Sofia | `sofia` |
| Luxemburg | `stad-luxemburg` |
| Monaco | `stad-monaco` |
| San Marino | `stad-san-marino` |
| Vaticaanstad | `stad-vaticaanstad` |
| Stockholm | `stockholm` |
| Tallinn | `tallinn` |
| Tbilisi | `tbilisi` |
| Tirana | `tirana` |
| Vaduz | `vaduz` |
| Valletta | `valletta` |
| Vilnius | `vilnius` |
| Warschau | `warschau` |
| Wenen | `wenen` |
| Zagreb | `zagreb` |
