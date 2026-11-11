# 🔊 Eigen geluidjes

Zet hier geluidjes neer. Als het vliegtuig in dat land landt, speelt het spel ze af.
Een land zonder eigen geluidje krijgt het grapje uit `public/data/grapjes.json`, voorgelezen door de browser.

## Zo noem je het bestand

Gebruik de landnaam of de landcode, bijvoorbeeld:

- `frankrijk.m4a` of `FR.mp3`
- `verenigd-koninkrijk.mp3`
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

## Alle landen

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
