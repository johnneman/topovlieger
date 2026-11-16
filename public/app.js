/* Topovlieger Europa — topografie oefenen met een vliegtuigje. */
(() => {
  "use strict";

  const REGIONS = [
    ["west", "West-Europa"], ["midden", "Midden-Europa"], ["noord", "Noord-Europa"],
    ["zuid", "Zuid-Europa"], ["oost", "Oost-Europa"], ["balkan", "Balkan"],
    ["micro", "Dwergstaten"], ["kaukasus", "Kaukasus"],
  ];
  const FIT_WIDE = { type: "MultiPoint", coordinates: [[-24, 35], [-24, 66], [42, 71], [44, 36], [10, 34.5], [15, 71]] };
  const FIT_TALL = { type: "MultiPoint", coordinates: [[-10, 36], [-9, 58], [33, 35.5], [38, 62], [24, 70.5]] };
  // Soorten onderwerpen. "tap" = hint bij Vliegmissie, "ask" = vraag bij Waar ben ik?
  const KINDS = {
    land: { label: "Landen", tap: "Tik het land aan op de kaart", ask: "Welk land is dit?", info: null },
    zee: { label: "Zeeën, zeestraten en oceanen", tap: "Tik het water aan op de kaart", ask: "Welk water is dit?", info: "Zee of zeestraat" },
    rivier: { label: "Rivieren", tap: "Tik de rivier aan op de kaart", ask: "Welke rivier is dit?", info: "Rivier" },
    meer: { label: "Meren", tap: "Tik het meer aan op de kaart", ask: "Welk meer is dit?", info: "Meer" },
    berg: { label: "Gebergten", tap: "Tik het gebergte aan op de kaart", ask: "Welk gebergte is dit?", info: "Gebergte" },
    stad: { label: "Hoofdsteden", tap: "Tik de stad aan op de kaart", ask: "Welke hoofdstad is dit?", info: null },
  };
  const WATER = new Set(["zee", "rivier", "meer"]);
  // "de Donau", "het Bodenmeer", "Het Kanaal"
  const the = (c) => (c.article ? `${c.article} ${c.name}` : c.name);
  const START_LL = [5.6, 52.2]; // Nederland
  const MAX_TRIES = 3;

  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("topo:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("topo:" + k, JSON.stringify(v)); } catch { /* privémodus */ } },
  };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Foutzoeken: open de app met ?debug, dan komt elke geluidsstap in de nginx-log (/diag?...).
  const DEBUG = /[?&]debug\b/.test(location.search);
  function dbg(t, x = "") {
    if (!DEBUG) return;
    try {
      const q = new URLSearchParams({ t, x: String(x), actx: actx ? actx.state : "-", sound: S.sound, fun: S.fun, speak: S.speak,
        session: navigator.audioSession ? navigator.audioSession.type : "-", vis: document.visibilityState });
      new Image().src = "diag?" + q;
    } catch { /* niets */ }
  }

  // ---------- staat ----------
  const S = {
    items: new Map(),
    selected: new Set(),
    mode: "fly",
    queue: [], idx: 0, target: null, tries: 0,
    score: 0, streak: 0, bestStreak: 0, results: [],
    planeLL: START_LL, busy: false, playing: false,
    k: 1, labels: true, sound: true, fun: true, speak: true,
  };

  // ---------- geluid ----------
  let actx = null;
  function tone(freq, dur, type = "sine", vol = 0.15, delay = 0) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const t = actx.currentTime + delay;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch { /* geen audio */ }
  }
  const sfx = {
    ok() { dbg("beep-ok"); tone(660, 0.15, "triangle"); tone(880, 0.25, "triangle", 0.15, 0.12); tone(1320, 0.3, "triangle", 0.1, 0.24); },
    bad() { tone(200, 0.3, "square", 0.06); tone(150, 0.35, "square", 0.05, 0.12); },
    fly() { tone(320, 0.25, "sawtooth", 0.025); },
    end() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, i * 0.12)); },
  };

  // ---------- grappige extra's (weetjes + eigen geluidjes) ----------
  const FUN = { jokes: {}, sounds: new Map(), buffers: new Map() };
  const FUN_MAX_MS = 4500;
  const AUDIO_EXT = /\.(m4a|mp3|wav|aac)$/i;
  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  async function loadFun() {
    FUN.jokes = await fetch("data/grapjes.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    // Eigen geluidjes: op de eigen server altijd. Op GitHub Pages alleen via de speciale link
    // /geluidjes/ (zet window.TOPO_OWN_SOUNDS) of met ?geluidjes=aan.
    const ownSounds = window.TOPO_OWN_SOUNDS === true
      || new URLSearchParams(location.search).get("geluidjes") === "aan"
      || !/\.github\.io$/i.test(location.hostname);
    if (!ownSounds) return;
    const getJson = (u) => fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    // GitHub Pages: vaste lijst sounds/index.json. Eigen server: nginx geeft de map als JSON (autoindex_format json).
    const files = (await getJson("sounds/index.json")) || (await getJson("sounds/")) || [];
    const lookup = new Map();
    // Landen eerst; daarna de rest. Een naam die al bezet is (stad Luxemburg) werkt met voorvoegsel: "stad-luxemburg".
    const ordered = [...S.items.values()].sort((a, b) => (a.kind === "land" ? 0 : 1) - (b.kind === "land" ? 0 : 1));
    for (const c of ordered) {
      if (c.kind === "land") lookup.set(c.key.toLowerCase(), c.key);
      if (!lookup.has(slug(c.name))) lookup.set(slug(c.name), c.key);
      lookup.set(`${c.kind}-${slug(c.name)}`, c.key);
    }
    for (const f of Array.isArray(files) ? files : []) {
      if (f.type !== "file" || !AUDIO_EXT.test(f.name)) continue;
      // "frankrijk-2.m4a" → "frankrijk", "FR.mp3" → "fr"
      const base = slug(f.name.replace(AUDIO_EXT, "")).replace(/-\d+$/, "");
      const key = lookup.get(base);
      if (!key) continue;
      if (!FUN.sounds.has(key)) FUN.sounds.set(key, []);
      FUN.sounds.get(key).push("sounds/" + encodeURIComponent(f.name));
    }
  }

  let funSrc = null, funHideTimer = 0, funToken = 0;
  function stopFun() {
    funToken++;
    try { if (funSrc) funSrc.stop(); } catch { /* al gestopt */ }
    funSrc = null;
    try { funAudio.onended = funAudio.onerror = null; funAudio.pause(); } catch { /* niets */ }
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch { /* geen spraak */ }
  }
  function hideFun() { clearTimeout(funHideTimer); $("#fun").classList.remove("show"); }
  function showFun(text) {
    clearTimeout(funHideTimer);
    const el = $("#fun");
    el.textContent = text;
    el.classList.add("show");
  }

  // iOS: zonder dit valt Web Audio onder de stille modus (schuifje/actieknop), terwijl de
  // voorleesstem gewoon doorgaat. "playback" = gedraag je als mediaspeler.
  function setAudioSession() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* ouder iOS */ }
  }
  setAudioSession();
  // Terug naar het tabblad: geluid opnieuw aanzetten.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !actx) return;
    setAudioSession();
    actx.suspend().then(() => actx.resume()).catch(() => {});
  });

  // Reserve: gewone <audio>-speler, ontgrendeld tijdens de starttik.
  const funAudio = new Audio();
  funAudio.preload = "auto";
  let funAudioUnlocked = false;
  function unlockFunAudio() {
    if (funAudioUnlocked) return;
    funAudioUnlocked = true;
    // Een leeg wav-bestand afspelen tijdens de tik; daarna mag dit element later zelf starten.
    funAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const p = funAudio.play(); if (p && p.catch) p.catch(() => {});
  }
  function playWithAudioElement(url) {
    return new Promise((resolve, reject) => {
      funAudio.onended = () => resolve();
      funAudio.onerror = () => reject(new Error("audio-element"));
      funAudio.src = url;
      const p = funAudio.play();
      if (p && p.catch) p.catch(reject);
    });
  }

  async function playSoundFile(url) {
    try { const r = await playWithWebAudio(url); dbg("webaudio-klaar", url); return r; }
    catch (e) {
      dbg("webaudio-fout", (e && e.name) + " " + (e && e.message));
      console.warn("Web Audio lukt niet, probeer <audio>", e);
      try { const r = await playWithAudioElement(url); dbg("audio-el-klaar", url); return r; }
      catch (e2) { dbg("audio-el-fout", (e2 && e2.name) + " " + (e2 && e2.message)); throw e2; }
    }
  }

  async function playWithWebAudio(url) {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state !== "running") await Promise.race([actx.resume(), wait(500)]);
    if (actx.state !== "running") throw new Error("AudioContext " + actx.state);
    let buf = FUN.buffers.get(url);
    if (!buf) {
      const data = await fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
      buf = await new Promise((ok, err) => { const p = actx.decodeAudioData(data, ok, err); if (p && p.catch) p.catch(err); });
      FUN.buffers.set(url, buf);
    }
    return new Promise((resolve) => {
      const src = actx.createBufferSource();
      src.buffer = buf;
      src.connect(actx.destination);
      src.onended = () => resolve();
      funSrc = src;
      src.start();
      dbg("webaudio-start", `${url} duur=${buf.duration.toFixed(2)} sr=${actx.sampleRate}`);
    });
  }

  function dutchVoice() {
    try { return speechSynthesis.getVoices().find((v) => /^nl[-_]/i.test(v.lang)) || null; } catch { return null; }
  }
  function canSpeak() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
    // Geen Nederlandse stem (terwijl de stemmen wel geladen zijn)? Dan niet voorlezen.
    const voices = speechSynthesis.getVoices();
    return !voices.length || !!dutchVoice();
  }
  function speak(text) {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text.replace(/…/g, "..."));
      u.lang = "nl-NL";
      const v = dutchVoice(); if (v) u.voice = v;
      u.rate = 1.05; u.pitch = 1.15;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }
  let speechUnlocked = false;
  function unlockSpeech() {
    // iOS: spraak mag alleen starten na een tik; spreek daarom één keer "niets" tijdens de tik.
    if (speechUnlocked || !S.fun || !S.speak || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); speechUnlocked = true; } catch { /* geen spraak */ }
  }

  /** Grappige tekst + geluidje bij een landing. Resolvet als het klaar is (max. FUN_MAX_MS). */
  function funLanding(key) {
    if (!S.fun) return Promise.resolve();
    const text = FUN.jokes[key];
    const urls = FUN.sounds.get(key);
    dbg("fun", `${key} urls=${urls ? urls.join("|") : "-"} text=${!!text} canSpeak=${canSpeak()}`);
    if (!text && !urls) return Promise.resolve();
    stopFun();
    const token = funToken;
    const ownSound = S.sound && urls;
    const textMs = text ? Math.min(FUN_MAX_MS, 1500 + text.length * 30) : 0;
    // Eigen geluidje: géén tekstwolkje (wat je zelf inspreekt is iets anders dan de tekst).
    if (text && !ownSound) showFun(text);
    let readMs = ownSound ? 0 : textMs;
    let done;
    if (ownSound) {
      done = playSoundFile(urls[Math.random() * urls.length | 0])
        .catch((e) => {
          // Mislukt toch? Dan alsnog de tekst tonen (en voorlezen).
          console.warn("Geluidje mislukt", e);
          if (!text || token !== funToken) return;
          showFun(text);
          return S.speak && canSpeak() ? speak(text) : wait(textMs);
        });
    } else if (S.sound && S.speak && text && canSpeak()) done = speak(text);
    else done = wait(readMs);
    // Klaar als het geluid op is én de tekst lang genoeg in beeld stond om te lezen (max. FUN_MAX_MS).
    return Promise.race([Promise.all([done, wait(readMs)]), wait(FUN_MAX_MS)]).then(() => {
      if (token === funToken) funHideTimer = setTimeout(hideFun, 400);
    });
  }

  // ---------- kaart ----------
  const svg = d3.select("#map");
  const root = svg.append("g");
  // zeeën onderaan: al het land (ook buiten Europa) ligt eroverheen
  const gSea = root.append("g");
  const gBg = root.append("g");
  const gLand = root.append("g");
  const gMount = root.append("g");
  const gLake = root.append("g");
  const gRiver = root.append("g");
  const gMicro = root.append("g");
  const gCity = root.append("g");
  const gTrail = root.append("g");
  const gLabels = root.append("g");
  const gPlane = root.append("g").attr("id", "plane");
  const projection = d3.geoConicConformal().parallels([40, 64]).rotate([-12, 0]);
  const path = d3.geoPath(projection);
  let bgFeature = null;

  const shadow = gPlane.append("g").attr("class", "plane-shadow-g");
  const PLANE_D = "M18 0 C16 -2 12 -2.4 8 -2.4 L3 -2.4 L-5 -14 L-9 -14 L-4.5 -2.4 L-11 -2.4 L-15 -7.5 L-18 -7.5 L-15.5 0 L-18 7.5 L-15 7.5 L-11 2.4 L-4.5 2.4 L-9 14 L-5 14 L3 2.4 L8 2.4 C12 2.4 16 2 18 0 Z";
  shadow.append("path").attr("class", "plane-shadow").attr("d", PLANE_D);
  const body = gPlane.append("g");
  body.append("path").attr("class", "plane-body").attr("d", PLANE_D);
  body.append("path").attr("class", "plane-stripe").attr("d", "M-15.5 -1 L8 -1 L8 1 L-15.5 1 Z");
  const plane = { x: 0, y: 0, angle: -30, lift: 0 };

  function drawPlane() {
    const s = 1 / S.k, sc = 1 + plane.lift * 0.45, off = 3 + plane.lift * 10;
    gPlane.attr("transform", `translate(${plane.x},${plane.y}) scale(${s})`);
    body.attr("transform", `rotate(${plane.angle}) scale(${sc})`);
    shadow.attr("transform", `translate(${off},${off}) rotate(${plane.angle}) scale(${sc * 0.9})`).attr("opacity", 1 - plane.lift * 0.4);
  }
  function placePlaneAt(ll) { const [x, y] = projection(ll); plane.x = x; plane.y = y; drawPlane(); }

  const zoom = d3.zoom()
    .scaleExtent([0.6, 20])
    .on("zoom", (e) => { root.attr("transform", e.transform); S.k = e.transform.k; rescale(); });
  svg.call(zoom).on("dblclick.zoom", null);

  function rescale() {
    const k = S.k;
    gMicro.selectAll(".micro-dot").attr("r", 4.5 / k);
    gMicro.selectAll(".sea-dot").attr("r", 6 / k);
    gMicro.selectAll(".micro-hit").attr("r", 13 / k);
    gRiver.selectAll(".river").attr("stroke-width", 1.6 / k);
    gRiver.selectAll(".river-hit").attr("stroke-width", 16 / k);
    gCity.selectAll(".city").attr("x", -3.5 / k).attr("y", -3.5 / k).attr("width", 7 / k).attr("height", 7 / k);
    gCity.selectAll(".city-hit").attr("r", 13 / k);
    gLabels.selectAll(".label").attr("font-size", 12 / k).attr("stroke-width", 3 / k);
    gTrail.selectAll(".trail").attr("stroke-width", 2.2 / k).attr("stroke-dasharray", `${6 / k} ${5 / k}`);
    drawPlane();
  }

  function layout() {
    const w = innerWidth, h = innerHeight;
    const padTop = S.playing ? 70 : 20, padBot = S.playing ? 120 : 20;
    projection.fitExtent([[12, padTop], [w - 12, h - padBot]], w / h < 0.9 ? FIT_TALL : FIT_WIDE);
    zoom.extent([[0, 0], [w, h]]).translateExtent([[-w * 0.6, -h * 0.6], [w * 1.6, h * 1.6]]);
    gBg.selectAll("path").attr("d", path);
    gLand.selectAll("path").attr("d", (c) => path(c.feature));
    for (const g of [gSea, gMount, gLake, gRiver]) g.selectAll("path").attr("d", (c) => path(c.feature));
    for (const c of S.items.values()) c.xy = projection(c.anchor);
    gMicro.selectAll("g").attr("transform", (c) => `translate(${c.xy})`);
    gCity.selectAll("g").attr("transform", (c) => `translate(${c.xy})`);
    gLabels.selectAll(".label").attr("x", (d) => d.xy()[0]).attr("y", (d) => d.xy()[1]);
    gLabels.selectAll(".float").remove();
    placePlaneAt(S.planeLL);
    rescale();
  }

  function anchorOf(f) {
    if (f.properties.anchor) return f.properties.anchor;
    let best = null, area = -1;
    for (const p of f.geometry.coordinates) {
      const poly = { type: "Polygon", coordinates: p };
      const a = d3.geoArea(poly);
      if (a > area) { area = a; best = poly; }
    }
    return d3.geoCentroid(best);
  }

  async function init() {
    const [data, topo] = await Promise.all([
      fetch("data/europe.json").then((r) => r.json()),
      fetch("data/topo.json").then((r) => (r.ok ? r.json() : { items: [], presets: {} })).catch(() => ({ items: [], presets: {} })),
    ]);
    bgFeature = data.background;
    for (const f of data.countries) {
      const p = f.properties;
      S.items.set(p.key, { key: p.key, kind: "land", article: "", name: p.name, region: p.region, eu: p.eu, feature: f, anchor: anchorOf(f), micro: p.region === "micro" });
    }
    for (const t of topo.items) {
      const country = t.country && S.items.get(t.country);
      S.items.set(t.key, { ...t, feature: { type: "Feature", properties: {}, geometry: t.geometry },
        region: t.kind === "stad" && country ? country.region : t.kind });
    }
    S.presets = topo.presets || {};
    gBg.append("path").datum(bgFeature).attr("class", "bg-land");
    const list = [...S.items.values()];
    const of = (kind) => list.filter((c) => c.kind === kind);
    const tap = (e, c) => onTap(c.key);
    gSea.selectAll("path").data(of("zee")).join("path")
      .attr("class", "shape sea").attr("data-key", (c) => c.key).on("click", tap);
    gLand.selectAll("path").data(of("land")).join("path")
      .attr("class", "shape country").attr("data-key", (c) => c.key).on("click", tap);
    gMount.selectAll("path").data(of("berg")).join("path")
      .attr("class", "shape mount").attr("data-key", (c) => c.key).on("click", tap);
    gLake.selectAll("path").data(of("meer")).join("path")
      .attr("class", "shape lake").attr("data-key", (c) => c.key).on("click", tap);
    const rv = of("rivier");
    gRiver.selectAll("path.river").data(rv).join("path")
      .attr("class", "shape river").attr("data-key", (c) => c.key);
    gRiver.selectAll("path.river-hit").data(rv).join("path")
      .attr("class", "river-hit").on("click", tap);
    const m = gMicro.selectAll("g").data(list.filter((c) => c.micro || c.small)).join("g")
      .attr("class", (c) => (c.kind === "land" ? "dot-land" : "dot-zee"));
    m.append("circle").attr("class", (c) => (c.kind === "land" ? "shape micro-dot" : "shape sea-dot")).attr("data-key", (c) => c.key);
    m.append("circle").attr("class", "micro-hit").on("click", tap);
    const ct = gCity.selectAll("g").data(of("stad")).join("g").attr("class", "city-g").attr("data-key", (c) => c.key);
    ct.append("rect").attr("class", "shape city").attr("data-key", (c) => c.key);
    ct.append("circle").attr("class", "city-hit").on("click", tap);

    // instellingen
    const def = list.filter((c) => c.kind === "land" && c.region !== "kaukasus").map((c) => c.key);
    S.selected = new Set(store.get("selected", def).filter((k) => S.items.has(k)));
    S.mode = store.get("mode", "fly");
    S.labels = store.get("labels", true);
    S.sound = store.get("sound", true);
    S.fun = store.get("fun", true);
    S.speak = store.get("speak", true);
    loadFun();
    buildMenu();
    layout();
    addEventListener("resize", () => layout());
    // iOS: voorkom zoomen van de hele pagina
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("dblclick", (e) => e.preventDefault());
  }

  // ---------- kleuren / labels ----------
  function setClass(key, cls, on = true) {
    root.selectAll(`.shape[data-key="${key}"]`).classed(cls, on);
  }
  function clearMap() {
    root.selectAll(".shape").classed("ok meh miss flash target reveal picked off sel", false);
    gLabels.selectAll("*").remove();
    gTrail.selectAll("*").remove();
  }
  /** Welke onderwerpen zijn zichtbaar (gebergten, steden) en welke soorten zijn aantikbaar. */
  function updateMapState() {
    const shown = new Set(S.playing ? [...(S.lastPool || []), ...(S.mode === "explore" ? S.selected : [])] : S.selected);
    gMount.selectAll(".mount").classed("shown", (c) => shown.has(c.key));
    gCity.selectAll(".city-g").classed("shown", (c) => shown.has(c.key));
    gMicro.selectAll(".dot-zee").classed("shown", (c) => shown.has(c.key));
    let active = new Set();
    if (S.playing && S.mode === "explore") active = new Set([...shown].map((k) => S.items.get(k)?.kind));
    else if (S.playing && S.mode === "fly" && S.target) active = new Set([S.items.get(S.target).kind]);
    for (const k of Object.keys(KINDS)) svg.classed("act-" + k, k === "land" || active.has(k));
  }
  function addLabel(key, cls = "", ttl = 0) {
    const c = S.items.get(key);
    if (!ttl) gLabels.selectAll(`.label[data-key="${key}"]`).filter(function () { return !this.classList.contains("tmp"); }).remove();
    const lift = ttl ? 20 : c.micro || c.small || c.kind === "stad" ? 12 : 0;
    const t = gLabels.append("text").datum({ xy: () => c.xy })
      .attr("class", `label k-${c.kind} ${cls}${ttl ? " tmp" : ""}`).attr("data-key", key)
      .attr("x", c.xy[0]).attr("y", c.xy[1] - lift / S.k).text(c.name);
    rescale();
    if (ttl) t.transition().delay(ttl).duration(400).style("opacity", 0).remove();
  }
  function floatText(key, txt) {
    const c = S.items.get(key);
    const t = gLabels.append("text").attr("class", "float")
      .attr("x", c.xy[0]).attr("y", c.xy[1] - 14 / S.k)
      .attr("font-size", 18 / S.k).attr("stroke-width", 4 / S.k).text(txt);
    t.transition().duration(1100).ease(d3.easeCubicOut)
      .attr("y", c.xy[1] - 48 / S.k).style("opacity", 0).remove();
  }

  let toastTimer = 0;
  function toast(msg, kind = "", ms = 1600) {
    const el = $("#toast");
    el.textContent = msg; el.className = "show " + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ""; }, ms);
  }

  // ---------- vliegen ----------
  function flyTo(key) {
    const c = S.items.get(key);
    const to = c.anchor;
    const p0 = [plane.x, plane.y], p1 = projection(to);
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const dist = Math.hypot(dx, dy);
    S.planeLL = to;
    if (dist < 2) return Promise.resolve();
    // boog: controlepunt loodrecht op de lijn, bij voorkeur "omhoog"
    let nx = -dy / dist, ny = dx / dist;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const bend = Math.min(dist * 0.25, 160 / S.k);
    const cp = [(p0[0] + p1[0]) / 2 + nx * bend, (p0[1] + p1[1]) / 2 + ny * bend];
    const screenDist = dist * S.k;
    const dur = Math.max(650, Math.min(1900, 350 + screenDist * 2.4));

    gTrail.selectAll(".trail").interrupt().remove();
    const trail = gTrail.append("path").attr("class", "trail")
      .attr("d", `M${p0}Q${cp} ${p1}`);
    rescale();
    const len = trail.node().getTotalLength();
    trail.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len);
    sfx.fly();

    return new Promise((resolve) => {
      const t0 = performance.now();
      const ease = d3.easeCubicInOut;
      function frame(now) {
        const raw = Math.min(1, (now - t0) / dur), t = ease(raw), u = 1 - t;
        plane.x = u * u * p0[0] + 2 * u * t * cp[0] + t * t * p1[0];
        plane.y = u * u * p0[1] + 2 * u * t * cp[1] + t * t * p1[1];
        const tx = 2 * u * (cp[0] - p0[0]) + 2 * t * (p1[0] - cp[0]);
        const ty = 2 * u * (cp[1] - p0[1]) + 2 * t * (p1[1] - cp[1]);
        if (tx || ty) plane.angle = Math.atan2(ty, tx) * 180 / Math.PI;
        plane.lift = Math.sin(raw * Math.PI);
        trail.attr("stroke-dashoffset", len * (1 - t));
        drawPlane();
        if (raw < 1) requestAnimationFrame(frame);
        else {
          plane.lift = 0; drawPlane();
          const k = S.k;
          trail.attr("stroke-dasharray", `${6 / k} ${5 / k}`).attr("stroke-dashoffset", 0)
            .transition().delay(300).duration(700).style("opacity", 0).remove();
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function ensureVisible(key) {
    // Als het doel buiten beeld valt (ingezoomd), schuif de kaart mee.
    const c = S.items.get(key);
    const t = d3.zoomTransform(svg.node());
    const [sx, sy] = t.apply(c.xy);
    const m = 60;
    if (sx < m || sy < 80 || sx > innerWidth - m || sy > innerHeight - 140) {
      svg.transition().duration(500).call(zoom.translateTo, c.xy[0], c.xy[1]);
    }
  }

  function zoomToSmall(key) {
    // Kleine landen: inzoomen zodat je ze goed ziet.
    const c = S.items.get(key);
    if (c.kind === "stad") return wait(0);
    const [[x0, y0], [x1, y1]] = path.bounds(c.feature);
    const size = Math.max(x1 - x0, y1 - y0, 1);
    if (size * S.k >= 55) return wait(0);
    // smalle zeestraten: niet te ver inzoomen, anders herken je de omgeving niet meer
    const k = Math.max(1, Math.min(c.small ? 4 : 10, (Math.min(innerWidth, innerHeight) * 0.3) / size));
    const t = d3.zoomIdentity.translate(innerWidth / 2, innerHeight / 2 - 60).scale(k).translate(-c.xy[0], -c.xy[1]);
    return new Promise((r) => svg.transition().duration(600).call(zoom.transform, t).on("end", r).on("interrupt", r));
  }
  function resetZoomIfDeep() {
    if (S.k <= 1.6) return wait(0);
    return new Promise((r) => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity).on("end", r).on("interrupt", r));
  }

  // ---------- spel ----------
  /** keys: landen voor deze ronde (standaard de selectie uit het menu).
   *  practice: oefenronde met foutjes; de oorspronkelijke set (S.basePool) blijft dan bewaard. */
  function startGame(keys, practice = false) {
    S.mode = document.querySelector('input[name="mode"]:checked').value;
    const pool = keys || [...S.selected];
    if (S.mode !== "explore" && !pool.length) return;
    S.practiceRound = practice;
    if (!practice) S.basePool = pool;
    S.queue = shuffle(pool);
    S.idx = 0; S.score = 0; S.streak = 0; S.bestStreak = 0; S.results = [];
    S.playing = true; S.busy = false;
    S.lastPool = pool;
    clearMap();
    $("#menu").classList.add("hidden");
    $("#result").classList.add("hidden");
    $("#hud").classList.remove("hidden");
    $("#zoom-ctl").classList.remove("hidden");
    $("#prompt").classList.remove("hidden");
    $("#hud .hud-mid").classList.toggle("hidden", S.mode === "explore");
    $("#hud .hud-stats").classList.toggle("hidden", S.mode === "explore");
    S.planeLL = START_LL;
    S.target = null;
    updateMapState();
    layout();
    svg.call(zoom.transform, d3.zoomIdentity);
    stopFun(); hideFun();
    setAudioSession();
    // iOS kan een geluidskanaal na een onderbreking (telefoontje, andere app, lang op de
    // achtergrond) op "running" laten staan terwijl er niets meer uitkomt. Daarom bij elke
    // start (tijdens de tik, dus toegestaan) een vers kanaal. AudioBuffers blijven bruikbaar.
    if (actx) { try { actx.close(); } catch { /* al dicht */ } actx = null; }
    tone(1, 0.01); // iOS: audio ontgrendelen tijdens tik
    if (S.fun && S.sound) unlockFunAudio();
    unlockSpeech();
    dbg("start", `mode=${S.mode} sounds=${[...FUN.sounds.keys()].join(",")} ua=${navigator.userAgent}`);
    updateHud();
    if (S.mode === "explore") {
      $("#prompt-label").textContent = "Rondvliegen";
      $("#prompt-name").textContent = "Tik iets aan op de kaart";
      $("#prompt-tries").textContent = "Het vliegtuig vliegt erheen en je ziet de naam";
      $("#choices").innerHTML = "";
      return;
    }
    nextQuestion();
  }

  function updateHud() {
    const n = S.queue.length;
    $("#progress-bar").style.width = n ? `${(S.idx / n) * 100}%` : "0";
    $("#progress-text").textContent = `${Math.min(S.idx + 1, n)} / ${n}`;
    $("#score").textContent = `⭐ ${S.score}`;
    const st = $("#streak");
    st.textContent = `🔥 ${S.streak}`;
    st.classList.toggle("hot", S.streak >= 3);
  }
  function triesText() {
    const kind = KINDS[S.items.get(S.target)?.kind || "land"];
    if (!S.tries) return S.mode === "fly" ? kind.tap : "Kies de juiste naam";
    const left = (S.mode === "fly" ? MAX_TRIES : MAX_TRIES - 1) - S.tries;
    return `Nog ${left} poging${left === 1 ? "" : "en"}`;
  }

  async function nextQuestion() {
    if (S.idx >= S.queue.length) return finish();
    S.target = S.queue[S.idx];
    S.tries = 0;
    updateHud();
    const c = S.items.get(S.target);
    updateMapState();
    if (S.mode === "fly") {
      $("#prompt-label").textContent = "Vlieg naar";
      $("#prompt-name").textContent = the(c);
      $("#prompt-tries").textContent = triesText();
      $("#choices").innerHTML = "";
    } else {
      S.busy = true;
      $("#prompt-label").textContent = "Op weg naar…";
      $("#prompt-name").textContent = "✈️";
      $("#prompt-tries").textContent = "";
      $("#choices").innerHTML = "";
      await resetZoomIfDeep();
      ensureVisible(S.target);
      await flyTo(S.target);
      setClass(S.target, "target");
      gPlane.style("opacity", 0.35);
      await zoomToSmall(S.target);
      $("#prompt-label").textContent = "Waar ben ik geland?";
      $("#prompt-name").textContent = KINDS[c.kind].ask;
      $("#prompt-tries").textContent = triesText();
      renderChoices();
      S.busy = false;
    }
  }

  function points(tries) {
    const base = [100, 60, 30][tries] || 0;
    return base + Math.min(S.streak, 5) * 10;
  }

  function scoreCorrect() {
    const firstTime = S.tries === 0;
    S.streak = firstTime ? S.streak + 1 : 0;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    const pts = points(S.tries);
    S.score += pts;
    S.results.push({ key: S.target, tries: S.tries, missed: false });
    setClass(S.target, "target", false);
    setClass(S.target, firstTime ? "ok" : "meh");
    if (S.labels) addLabel(S.target);
    floatText(S.target, `+${pts}`);
    sfx.ok();
    toast(firstTime ? ["Top!", "Perfect geland!", "Goed zo!", "Uitstekend!"][Math.random() * 4 | 0] : "Gevonden!", "good", 1100);
    return funLanding(S.target);
  }

  async function reveal() {
    S.streak = 0;
    S.results.push({ key: S.target, tries: S.tries, missed: true });
    setClass(S.target, "target", false);
    setClass(S.target, "reveal");
    const c = S.items.get(S.target);
    toast(`Hier ${c.kind === "rivier" ? "stroomt" : "ligt"} ${the(c)}`, "bad", 2200);
    ensureVisible(S.target);
    if (S.mode === "fly") { await wait(900); await flyTo(S.target); }
    await Promise.all([wait(1300), funLanding(S.target)]);
    setClass(S.target, "reveal", false);
    setClass(S.target, "miss");
    if (S.labels) addLabel(S.target, "bad");
  }

  function infoText(c) {
    if (c.kind === "land") return REGIONS.find((r) => r[0] === c.region)[1] + (c.eu ? " · EU-lid" : "");
    if (c.kind === "stad") { const l = S.items.get(c.country); return l ? `Hoofdstad van ${l.name}` : "Hoofdstad"; }
    if (c.kind === "zee") {
      if (/oceaan|ijszee/i.test(c.name)) return "Oceaan";
      if (/straat|kanaal|bosporus|skagerrak|kattegat/i.test(c.name)) return "Zeestraat";
      if (/golf/i.test(c.name)) return "Golf (baai)";
      return "Zee";
    }
    return KINDS[c.kind].info;
  }

  async function onTap(key) {
    if (!S.playing || S.busy) return;
    const c = S.items.get(key);
    if (S.mode === "explore") {
      S.busy = true;
      root.selectAll(".picked").classed("picked", false);
      setClass(key, "picked");
      $("#prompt-name").textContent = c.name;
      $("#prompt-tries").textContent = infoText(c);
      await flyTo(key);
      addLabel(key, "", 1800);
      funLanding(key); // niet wachten: je mag meteen verder tikken
      S.busy = false;
      return;
    }
    if (S.mode !== "fly") return;
    S.busy = true;
    await flyTo(key);
    if (key === S.target) {
      const fun = scoreCorrect();
      S.idx++;
      await Promise.all([wait(850), fun]);
    } else {
      S.tries++;
      S.streak = 0;
      sfx.bad();
      setClass(key, "flash");
      addLabel(key, "bad", 1300);
      toast(`Oeps, dit is ${the(c)}`, "bad", 1500);
      updateHud();
      setTimeout(() => setClass(key, "flash", false), 900);
      if (S.tries >= MAX_TRIES) {
        await wait(600);
        await reveal();
        S.idx++;
      } else {
        $("#prompt-tries").textContent = triesText();
        S.busy = false;
        return;
      }
    }
    S.busy = false;
    nextQuestion();
  }

  function renderChoices() {
    const target = S.items.get(S.target);
    // afleiders: liefst uit dezelfde regio en uit de selectie
    const all = [...S.items.values()].filter((c) => c.key !== S.target);
    const same = all.filter((c) => c.kind === target.kind);
    const others = same.length >= 3 ? same : all;
    const prefer = shuffle(others.filter((c) => c.region === target.region && (S.selected.has(c.key) || (S.basePool || S.lastPool).includes(c.key))));
    const rest = shuffle(others.filter((c) => !prefer.includes(c)));
    const opts = shuffle([target, ...prefer.concat(rest).slice(0, 3)]);
    const box = $("#choices");
    box.innerHTML = "";
    for (const o of opts) {
      const b = document.createElement("button");
      b.textContent = o.name;
      b.onclick = () => onChoice(o.key, b);
      box.appendChild(b);
    }
  }

  async function onChoice(key, btn) {
    if (S.busy) return;
    if (key === S.target) {
      S.busy = true;
      btn.classList.add("ok");
      const fun = scoreCorrect();
      lockChoices();
      S.idx++;
      await Promise.all([wait(1100), fun]);
    } else {
      btn.classList.add("bad"); btn.disabled = true;
      S.tries++; S.streak = 0;
      sfx.bad(); updateHud();
      if (S.tries >= MAX_TRIES - 1) {
        S.busy = true;
        [...$("#choices").children].forEach((b) => { if (b.textContent === S.items.get(S.target).name) b.classList.add("ok"); });
        lockChoices();
        await reveal();
        S.idx++;
      } else {
        $("#prompt-tries").textContent = triesText();
        return;
      }
    }
    S.busy = false;
    gPlane.style("opacity", null);
    nextQuestion();
  }
  const lockChoices = () => [...$("#choices").children].forEach((b) => (b.disabled = true));

  function finish() {
    S.playing = false;
    hideFun();
    gPlane.style("opacity", null);
    updateHud();
    $("#progress-bar").style.width = "100%";
    sfx.end();
    const n = S.results.length;
    const first = S.results.filter((r) => r.tries === 0).length;
    const acc = n ? Math.round((first / n) * 100) : 0;
    const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 40 ? 1 : 0;
    $("#res-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    $("#res-title").textContent = ["Blijven oefenen!", "Goede vlucht!", "Prima piloot!", "Topgezagvoerder!"][stars];
    $("#res-score").textContent = S.score;
    $("#res-acc").textContent = acc + "%";
    $("#res-streak").textContent = S.bestStreak;

    const bestKey = `best:${S.mode}:${S.lastPool.slice().sort().join(",")}`;
    const prev = store.get(bestKey, 0);
    if (S.practiceRound) {
      $("#res-best").textContent = "Oefenronde met je foutjes: telt niet mee voor het record";
    } else {
      if (S.score > prev) store.set(bestKey, S.score);
      $("#res-best").textContent = S.score > prev && prev > 0 ? `🏆 Nieuw record! (vorige: ${prev})` : prev ? `Record voor deze selectie: ${Math.max(prev, S.score)}` : "";
    }

    // Foutjes: bij "Opnieuw" komen ze terug, gemixt met evenveel andere landen uit de oorspronkelijke set.
    S.mistakes = [...new Set(S.results.filter((r) => r.tries > 0).map((r) => r.key))];
    const wrongKeys = S.mistakes;
    $("#res-mistakes-wrap").classList.toggle("hidden", !wrongKeys.length);
    $("#res-mistakes").innerHTML = wrongKeys.map((k) => `<span class="chip">${S.items.get(k).name}</span>`).join("");
    $("#btn-again").textContent = wrongKeys.length ? "Opnieuw 🔁 (je foutjes + andere)" : "Opnieuw 🔁";
    $("#result").classList.remove("hidden");
    $("#hud").classList.add("hidden");
    $("#zoom-ctl").classList.add("hidden");
    $("#prompt").classList.add("hidden");
  }

  function toMenu() {
    S.playing = false; S.busy = false;
    stopFun(); hideFun();
    gPlane.style("opacity", null);
    $("#result").classList.add("hidden");
    $("#hud").classList.add("hidden");
    $("#zoom-ctl").classList.add("hidden");
    $("#prompt").classList.add("hidden");
    $("#menu").classList.remove("hidden");
    S.target = null;
    clearMap();
    showSelectionOnMap();
    layout();
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  }

  // ---------- menu ----------
  function buildMenu() {
    const box = $("#regions");
    box.innerHTML = "";
    const all = [...S.items.values()];
    const regionName = (id) => (REGIONS.find((r) => r[0] === id) || [id, ""])[1];
    for (const [kind, meta] of Object.entries(KINDS)) {
      const items = all.filter((c) => c.kind === kind);
      if (!items.length) continue;
      const det = document.createElement("details");
      det.className = "kind"; det.dataset.kind = kind;
      det.open = kind === "land";
      det.innerHTML = `<summary><b>${meta.label}</b> <span class="pill kind-count"></span></summary>`;
      // landen en steden per regio, de rest in één blok
      const groups = kind === "land" || kind === "stad"
        ? REGIONS.map(([id]) => [id, items.filter((c) => c.region === id)]).filter(([, l]) => l.length)
        : [[kind, items]];
      for (const [id, list] of groups) {
        const sec = document.createElement("div");
        sec.className = "region";
        const title = groups.length > 1 ? regionName(id) : "";
        sec.innerHTML = `<div class="region-head"><b>${title}</b><button type="button">alles</button></div><div class="chips"></div>`;
        const chips = sec.querySelector(".chips");
        for (const c of list.sort((a, b) => a.name.localeCompare(b.name, "nl"))) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "chip"; b.dataset.key = c.key; b.textContent = c.name;
          b.onclick = () => { S.selected.has(c.key) ? S.selected.delete(c.key) : S.selected.add(c.key); syncMenu(); };
          chips.appendChild(b);
        }
        sec.querySelector(".region-head button").onclick = () => {
          const allOn = list.every((c) => S.selected.has(c.key));
          list.forEach((c) => (allOn ? S.selected.delete(c.key) : S.selected.add(c.key)));
          syncMenu();
        };
        det.appendChild(sec);
      }
      box.appendChild(det);
    }
    document.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => {
      const p = b.dataset.preset;
      const keys = p === "land" ? all.filter((c) => c.kind === "land" && c.region !== "kaukasus").map((c) => c.key)
        : p === "eu" ? all.filter((c) => c.kind === "land" && c.eu).map((c) => c.key)
        : p === "water" ? all.filter((c) => WATER.has(c.kind)).map((c) => c.key)
        : S.presets[p] ? S.presets[p].filter((k) => S.items.has(k)) : [];
      S.selected = new Set(keys);
      // klap de soorten open die in deze selectie zitten
      const kinds = new Set(keys.map((k) => S.items.get(k).kind));
      document.querySelectorAll("#regions details.kind").forEach((d) => { if (kinds.has(d.dataset.kind)) d.open = true; });
      syncMenu();
    }));
    const modeInput = document.querySelector(`input[name="mode"][value="${S.mode}"]`);
    if (modeInput) modeInput.checked = true;
    document.querySelectorAll('input[name="mode"]').forEach((i) => (i.onchange = () => { S.mode = i.value; store.set("mode", S.mode); syncMenu(); }));
    $("#opt-labels").checked = S.labels;
    $("#opt-sound").checked = S.sound;
    $("#opt-labels").onchange = (e) => { S.labels = e.target.checked; store.set("labels", S.labels); };
    $("#opt-sound").onchange = (e) => { S.sound = e.target.checked; store.set("sound", S.sound); };
    $("#opt-fun").checked = S.fun;
    $("#opt-speak").checked = S.speak;
    $("#opt-speak-wrap").classList.toggle("hidden", !S.fun);
    $("#opt-fun").onchange = (e) => {
      S.fun = e.target.checked; store.set("fun", S.fun);
      $("#opt-speak-wrap").classList.toggle("hidden", !S.fun);
    };
    $("#opt-speak").onchange = (e) => { S.speak = e.target.checked; store.set("speak", S.speak); };
    syncMenu();
  }

  function syncMenu() {
    document.querySelectorAll("#regions .chip").forEach((b) => b.classList.toggle("on", S.selected.has(b.dataset.key)));
    document.querySelectorAll("#regions .region").forEach((sec) => {
      const keys = [...sec.querySelectorAll(".chip")].map((b) => b.dataset.key);
      sec.querySelector(".region-head button").textContent = keys.every((k) => S.selected.has(k)) ? "geen" : "alles";
    });
    $("#sel-count").textContent = S.selected.size;
    document.querySelectorAll("#regions details.kind").forEach((d) => {
      const keys = [...d.querySelectorAll(".chip")].map((b) => b.dataset.key);
      const n = keys.filter((k) => S.selected.has(k)).length;
      d.querySelector(".kind-count").textContent = `${n}/${keys.length}`;
      d.querySelector(".kind-count").classList.toggle("zero", !n);
    });
    const explore = S.mode === "explore";
    const start = $("#btn-start");
    start.disabled = !explore && S.selected.size === 0;
    const onlyLand = [...S.selected].every((k) => S.items.get(k)?.kind === "land");
    start.textContent = explore ? "Rondvliegen ✈️" : S.selected.size ? `Opstijgen! ${S.selected.size} ${onlyLand ? "landen" : "vragen"} ✈️` : "Kies eerst wat je wilt oefenen";
    store.set("selected", [...S.selected]);
    const bestKey = `best:${S.mode}:${[...S.selected].sort().join(",")}`;
    const best = store.get(bestKey, 0);
    $("#best").textContent = best && !explore ? `🏆 Record voor deze selectie: ${best}` : "";
    showSelectionOnMap();
  }

  function showSelectionOnMap() {
    if (S.playing) return;
    gLand.selectAll(".country").classed("off", (c) => !S.selected.has(c.key));
    gMicro.selectAll(".micro-dot").classed("off", (c) => !S.selected.has(c.key));
    root.selectAll(".sea, .lake, .river, .sea-dot").classed("sel", (c) => S.selected.has(c.key));
    updateMapState();
  }

  // ---------- knoppen ----------
  $("#btn-start").onclick = () => startGame();
  $("#btn-stop").onclick = () => toMenu();
  $("#btn-menu").onclick = () => toMenu();
  $("#btn-again").onclick = () => {
    const base = S.basePool || S.lastPool;
    if (!S.mistakes || !S.mistakes.length) return startGame(base);
    const others = shuffle(base.filter((k) => !S.mistakes.includes(k))).slice(0, S.mistakes.length);
    startGame([...S.mistakes, ...others], true);
  };
  $("#zoom-in").onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.6);
  $("#zoom-out").onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6);
  $("#zoom-reset").onclick = () => svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity);

  init().catch((err) => {
    console.error(err);
    document.body.insertAdjacentHTML("beforeend", `<p style="position:fixed;inset:auto 0 0;background:#b3261e;color:#fff;padding:12px;margin:0">Kaart laden mislukt: ${err.message}</p>`);
  });
})();
