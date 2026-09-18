// Centrální stav appky + veškerá "business logika" 1:1 podle desktop verze
// (shooting_results_app.py): řazení, detekce shody, rozstřel, finále, statistika.
//
// Datový model (v2): appka drží víc soutěží najednou ("competitions"),
// mezi kterými lze přepínat, plus samostatné "appSettings" (vzhled, vlastní
// disciplíny/kategorie, výchozí hodnoty, kritéria řazení) sdílené napříč
// všemi soutěžemi.

const STORAGE_KEY = "shootingResultsPWA.v2";
const OLD_STORAGE_KEY = "shootingResultsPWA.competition.v1"; // v1 formát (jedna soutěž) - kvůli migraci

export function num(v, def = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

export function fmtScore(v) {
  const n = num(v, 0);
  return Number.isInteger(n) ? String(n) : String(n);
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyEntryRow(startNum) {
  return { surname: "", name: "", category: "", start_num: startNum, los: 0, total: 0 };
}

function blankItems(row, ni) {
  for (let k = 1; k <= ni; k++) {
    if (!(`item${k}_score` in row)) row[`item${k}_score`] = "";
    if (!(`item${k}_fault` in row)) row[`item${k}_fault`] = "";
  }
  return row;
}

function defaultAppSettings() {
  return {
    theme: "system",              // "dark" | "light" | "system"
    customDisciplines: [],        // string[]
    customCategories: [],         // {name, short}[]
    sortReverseDirection: false,  // false = od poslední položky k první (desktop chování)
    sortUseFault: true,           // brát v potaz "1. chybu" při shodě skóre
    defaultDiscipline: "Americký TRAP",
    defaultMaxScore: 25,
    defaultRefereeName: "",
  };
}

function defaultCompetitionData() {
  return {
    competitionName: "",
    numShooters: 8,
    numItems: 3,
    hasFinale: false,
    useCategories: false,
    discipline: "Americký TRAP",
    maxScore: 25,
    refereeName: "",
    eventDate: "",
    venue: "",

    lotteryList: [],
    shootersData: [],
    sortedResults: [],
    finaleFinalists: [],
  };
}

class Store {
  constructor() {
    this.app = defaultAppSettings();
    this.competitions = [];
    this.activeId = null;
    this.view = "home";
    this.listeners = [];

    this.load();
    if (!this.competitions.length) this._createCompetitionInternal("Nová soutěž");
    if (!this.activeId || !this.competitions.some((c) => c.id === this.activeId)) {
      this.activeId = this.competitions[0].id;
    }
  }

  onChange(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach((fn) => fn()); }

  // ── Aktivní soutěž (proxy na competitions[activeId].data) ───────────────
  get current() {
    return this.competitions.find((c) => c.id === this.activeId) || this.competitions[0];
  }

  get competitionName() { return this.current.data.competitionName; }
  set competitionName(v) { this.current.data.competitionName = v; this.current.name = v || "Bez názvu"; }
  get numShooters() { return this.current.data.numShooters; }
  set numShooters(v) { this.current.data.numShooters = v; }
  get numItems() { return this.current.data.numItems; }
  set numItems(v) { this.current.data.numItems = v; }
  get hasFinale() { return this.current.data.hasFinale; }
  set hasFinale(v) { this.current.data.hasFinale = v; }
  get useCategories() { return this.current.data.useCategories; }
  set useCategories(v) { this.current.data.useCategories = v; }
  get discipline() { return this.current.data.discipline; }
  set discipline(v) { this.current.data.discipline = v; }
  get maxScore() { return this.current.data.maxScore; }
  set maxScore(v) { this.current.data.maxScore = v; }
  get refereeName() { return this.current.data.refereeName || ""; }
  set refereeName(v) { this.current.data.refereeName = v; }
  get eventDate() { return this.current.data.eventDate || ""; }
  set eventDate(v) { this.current.data.eventDate = v; }
  get venue() { return this.current.data.venue || ""; }
  set venue(v) { this.current.data.venue = v; }

  get lotteryList() { return this.current.data.lotteryList; }
  set lotteryList(v) { this.current.data.lotteryList = v; }
  get shootersData() { return this.current.data.shootersData; }
  set shootersData(v) { this.current.data.shootersData = v; }
  get sortedResults() { return this.current.data.sortedResults; }
  set sortedResults(v) { this.current.data.sortedResults = v; }
  get finaleFinalists() { return this.current.data.finaleFinalists; }
  set finaleFinalists(v) { this.current.data.finaleFinalists = v; }

  disciplineText() {
    return this.discipline || "";
  }

  // ── Soutěže (víc uložených najednou, přepínání) ──────────────────────────
  _createCompetitionInternal(name) {
    const data = defaultCompetitionData();
    data.discipline = this.app?.defaultDiscipline || data.discipline;
    data.maxScore = this.app?.defaultMaxScore || data.maxScore;
    data.refereeName = this.app?.defaultRefereeName || "";
    const c = { id: uid(), name: name || "Nová soutěž", createdAt: Date.now(), updatedAt: Date.now(), data };
    this.competitions.push(c);
    return c;
  }

  createCompetition(name) {
    const c = this._createCompetitionInternal(name || "Nová soutěž");
    this.activeId = c.id;
    this.save();
    this.notify();
    return c;
  }

  switchCompetition(id) {
    if (this.competitions.some((c) => c.id === id)) {
      this.activeId = id;
      this.save();
      this.notify();
    }
  }

  renameCompetition(id, name) {
    const c = this.competitions.find((x) => x.id === id);
    if (!c) return;
    c.name = name || "Bez názvu";
    if (c.data) c.data.competitionName = name || "";
    this.save();
    this.notify();
  }

  deleteCompetition(id) {
    if (this.competitions.length <= 1) return false;
    const idx = this.competitions.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.competitions.splice(idx, 1);
    if (this.activeId === id) this.activeId = this.competitions[0].id;
    this.save();
    this.notify();
    return true;
  }

  /** @deprecated Zachováno kvůli zpětné kompatibilitě - resetuje AKTIVNÍ soutěž. */
  newCompetition() {
    const c = this.current;
    c.data = defaultCompetitionData();
    c.data.discipline = this.app.defaultDiscipline || c.data.discipline;
    c.data.maxScore = this.app.defaultMaxScore || c.data.maxScore;
    c.data.refereeName = this.app.defaultRefereeName || "";
    c.name = "Nová soutěž";
    this.save();
    this.notify();
  }

  // ── Nastavení appky (vzhled, vlastní disciplíny/kategorie, výchozí hodnoty, řazení) ──
  setTheme(theme) { this.app.theme = theme; this.save(); this.applyTheme(); }

  applyTheme() {
    const root = document.documentElement;
    let effective = this.app.theme;
    if (effective === "system") {
      effective = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
    }
    root.setAttribute("data-theme", effective);
  }

  addCustomDiscipline(name) {
    const n = (name || "").trim();
    if (!n) return false;
    if (!this.app.customDisciplines.includes(n)) this.app.customDisciplines.push(n);
    this.save();
    return true;
  }

  removeCustomDiscipline(name) {
    this.app.customDisciplines = this.app.customDisciplines.filter((d) => d !== name);
    this.save();
  }

  addCustomCategory(name, short) {
    const n = (name || "").trim();
    if (!n) return false;
    if (this.app.customCategories.some((c) => c.name === n)) return false;
    const s = (short || n.charAt(0).toUpperCase()).trim().slice(0, 3);
    this.app.customCategories.push({ name: n, short: s });
    this.save();
    return true;
  }

  removeCustomCategory(name) {
    this.app.customCategories = this.app.customCategories.filter((c) => c.name !== name);
    this.save();
  }

  setSortConfig({ reverseDirection, useFault }) {
    if (reverseDirection !== undefined) this.app.sortReverseDirection = reverseDirection;
    if (useFault !== undefined) this.app.sortUseFault = useFault;
    this.save();
  }

  // ── Perzistence (localStorage) ───────────────────────────────────────────
  toJSON() {
    return {
      app: this.app,
      competitions: this.competitions,
      activeId: this.activeId,
    };
  }

  fromJSON(d) {
    if (!d || typeof d !== "object") return;
    this.app = { ...defaultAppSettings(), ...(d.app || {}) };
    this.competitions = Array.isArray(d.competitions) && d.competitions.length
      ? d.competitions.map((c) => ({
          id: c.id || uid(),
          name: c.name || "Bez názvu",
          createdAt: c.createdAt || Date.now(),
          updatedAt: c.updatedAt || Date.now(),
          data: { ...defaultCompetitionData(), ...(c.data || {}) },
        }))
      : [];
    this.activeId = d.activeId || (this.competitions[0] && this.competitions[0].id) || null;
  }

  save() {
    if (this.current) this.current.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toJSON()));
    } catch (e) { console.warn("Uložení selhalo:", e); }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { this.fromJSON(JSON.parse(raw)); return; }
    } catch (e) { console.warn("Načtení selhalo:", e); }

    // Migrace ze starého formátu appky (jedna soutěž bez appSettings).
    try {
      const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        this.app = defaultAppSettings();
        const data = defaultCompetitionData();
        Object.assign(data, {
          competitionName: old.competitionName ?? "",
          numShooters: old.numShooters ?? 8,
          numItems: old.numItems ?? 3,
          hasFinale: !!old.hasFinale,
          useCategories: !!old.useCategories,
          discipline: old.discipline === "Vlastní…" ? (old.customDiscipline || "Vlastní") : (old.discipline ?? "Americký TRAP"),
          maxScore: old.maxScore ?? 25,
          lotteryList: old.lotteryList ?? [],
          shootersData: old.shootersData ?? [],
          sortedResults: old.sortedResults ?? [],
          finaleFinalists: old.finaleFinalists ?? [],
        });
        if (old.discipline === "Vlastní…" && old.customDiscipline) {
          this.app.customDisciplines.push(old.customDiscipline);
        }
        const id = uid();
        this.competitions = [{ id, name: data.competitionName || "Soutěž", createdAt: Date.now(), updatedAt: Date.now(), data }];
        this.activeId = id;
        this.save();
        localStorage.removeItem(OLD_STORAGE_KEY);
      }
    } catch (e) { console.warn("Migrace starých dat selhala:", e); }
  }

  exportJSON() {
    return JSON.stringify(this.current, null, 2);
  }

  importJSON(text) {
    const d = JSON.parse(text);
    // Podporuje jak export jedné soutěže (nový formát), tak starý v1 formát.
    const data = d.data ? d.data : d;
    const c = this._createCompetitionInternal(data.competitionName || "Importovaná soutěž");
    c.data = { ...defaultCompetitionData(), ...data };
    c.name = c.data.competitionName || "Importovaná soutěž";
    this.activeId = c.id;
    this.save();
    this.notify();
  }

  // ── Los (lottery) ────────────────────────────────────────────────────────
  addLotteryShooter(surname, name, prefix) {
    const start_num = this.lotteryList.length + 1;
    this.lotteryList.push({ surname, name, prefix: prefix || "", start_num, los: 0 });
    this.save();
  }

  removeLotteryShooter(idx) {
    this.lotteryList.splice(idx, 1);
    this.lotteryList.forEach((d, i) => { d.start_num = i + 1; });
    this.save();
  }

  sortLotteryByStartNum() {
    this.lotteryList.sort((a, b) => num(a.start_num, 0) - num(b.start_num, 0));
    this.save();
  }

  /** Náhodně rozdělí střelce do šestic tak, aby dva se stejným prefixem
   * nebyli ve stejné šestici. Vrací true/false podle úspěchu. */
  autoLos(groupSize = 6) {
    const shooters = this.lotteryList;
    const n = shooters.length;
    if (n === 0) return true;
    const R = Math.ceil(n / groupSize);
    const pref = (s) => String(s.prefix || "").trim().toLowerCase();

    const counts = {};
    shooters.forEach((s) => { const p = pref(s); if (p) counts[p] = (counts[p] || 0) + 1; });
    if (Object.values(counts).some((c) => c > R)) return false;

    for (let attempt = 0; attempt < 300; attempt++) {
      const pool = shuffle(shooters);
      const relays = Array.from({ length: R }, () => []);
      const relayPref = Array.from({ length: R }, () => new Set());
      const groups = {}; const plain = [];
      for (const s of pool) {
        const p = pref(s);
        if (p) { (groups[p] = groups[p] || []).push(s); } else plain.push(s);
      }
      const ordered = Object.values(groups)
        .sort((a, b) => b.length - a.length)
        .flat();

      let ok = true;
      for (const s of ordered) {
        const p = pref(s);
        const cands = [];
        for (let r = 0; r < R; r++) {
          if (relays[r].length < groupSize && !relayPref[r].has(p)) cands.push(r);
        }
        if (cands.length === 0) { ok = false; break; }
        let best = cands[0];
        for (const r of cands) if (relays[r].length < relays[best].length) best = r;
        relays[best].push(s); relayPref[best].add(p);
      }
      if (!ok) continue;

      for (const s of plain) {
        let best = 0;
        for (let r = 1; r < R; r++) if (relays[r].length < relays[best].length) best = r;
        relays[best].push(s);
      }

      const result = [];
      for (let r = 0; r < R; r++) result.push(...shuffle(relays[r]));
      result.forEach((d, i) => { d.los = i + 1; d.start_num = i + 1; });
      this.lotteryList = result;
      this.save();
      return true;
    }
    return false;
  }

  /** Přenese los do zápisu (seřadí dle start. čísla, doplní prázdná místa do plné šestice). */
  applyLotteryToEntry() {
    if (this.lotteryList.length === 0) return 0;
    const sn = (d) => {
      const v = parseInt(String(d.start_num ?? "").trim(), 10);
      return Number.isFinite(v) ? v : 10 ** 9;
    };
    const sorted = [...this.lotteryList].sort((a, b) => sn(a) - sn(b));
    const ni = this.numItems;
    const data = sorted.map((d, i) => blankItems({
      surname: d.surname || "", name: d.name || "",
      start_num: d.start_num ?? (i + 1), los: d.los || 0,
      category: "", total: 0,
    }, ni));

    const nums = sorted.map(sn).filter((v) => v < 10 ** 9);
    const nxt = nums.length ? Math.max(...nums) + 1 : sorted.length + 1;
    const pad = (6 - (sorted.length % 6)) % 6;
    for (let j = 0; j < pad; j++) {
      data.push(blankItems({ surname: "", name: "", start_num: String(nxt + j), los: 0, category: "", total: 0 }, ni));
    }

    this.shootersData = data;
    this.numShooters = data.length;
    this.sortedResults = [];
    this.save();
    return sorted.length;
  }

  // ── Zápis (entry) ────────────────────────────────────────────────────────
  ensureEntryRows() {
    while (this.shootersData.length < this.numShooters) {
      this.shootersData.push(blankItems(emptyEntryRow(this.shootersData.length + 1), this.numItems));
    }
    if (this.shootersData.length > this.numShooters) {
      this.shootersData = this.shootersData.slice(0, this.numShooters);
    }
    this.shootersData.forEach((d) => blankItems(d, this.numItems));
  }

  addShooterRow() { this.numShooters += 1; this.ensureEntryRows(); this.save(); }
  removeShooterRow() {
    if (this.numShooters > 1) { this.numShooters -= 1; this.ensureEntryRows(); this.save(); }
  }
  addItemColumn() { this.numItems += 1; this.ensureEntryRows(); this.save(); }
  removeItemColumn() {
    if (this.numItems > 1) {
      const ni = this.numItems;
      this.shootersData.forEach((d) => { delete d[`item${ni}_score`]; delete d[`item${ni}_fault`]; });
      this.numItems -= 1;
      this.save();
    }
  }

  recalcRowTotal(row) {
    let t = 0;
    for (let i = 1; i <= this.numItems; i++) t += num(row[`item${i}_score`], 0);
    row.total = t;
    return t;
  }

  // ── Řazení / rozstřel ────────────────────────────────────────────────────
  /** Pořadí položek, ve kterém se porovnávají při shodě celkového součtu. */
  tieBreakOrder(ni) {
    return this.app.sortReverseDirection
      ? Array.from({ length: ni }, (_, i) => i + 1)        // 1..ni (od první)
      : Array.from({ length: ni }, (_, i) => ni - i);       // ni..1 (od poslední - výchozí)
  }

  /** Klíč pro řazení - pole čísel, nižší = lepší (vzestupné řazení). */
  sortKey(d, ni) {
    const total = num(d.total, 0);
    const tb = [];
    for (const i of this.tieBreakOrder(ni)) {
      const sc = num(d[`item${i}_score`], 0);
      tb.push(-sc);
      if (this.app.sortUseFault) {
        const raw = d[`item${i}_fault`];
        const ft = raw ? num(raw, -1) : -1;
        tb.push(-ft);
      }
    }
    return [-total, ...tb];
  }

  static compareKeys(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] ?? 0, bv = b[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  sortShooters(data, ni) {
    return [...data].sort((a, b) => Store.compareKeys(this.sortKey(a, ni), this.sortKey(b, ni)));
  }

  findTiedIndices(sortedData, ni, upTo = 6) {
    if (!sortedData.length) return new Set();
    const round6 = (v) => Math.round(num(v, 0) * 1e6) / 1e6;
    const allCounts = new Map();
    sortedData.forEach((d) => {
      const t = round6(d.total);
      allCounts.set(t, (allCounts.get(t) || 0) + 1);
    });
    const topTotals = new Set(sortedData.slice(0, Math.min(upTo, sortedData.length)).map((d) => round6(d.total)));
    const contested = new Set([...topTotals].filter((t) => (allCounts.get(t) || 0) > 1));
    const tied = new Set();
    sortedData.forEach((d, i) => { if (contested.has(round6(d.total))) tied.add(i); });
    return tied;
  }

  goToSorted() {
    this.ensureEntryRows();
    this.shootersData.forEach((d) => this.recalcRowTotal(d));
    this.sortedResults = this.sortShooters(this.shootersData, this.numItems);
    this.save();
  }

  evalRozstrel() {
    const result = [...this.sortedResults];
    const round6 = (v) => Math.round(num(v, 0) * 1e6) / 1e6;
    const totalToIdx = new Map();
    result.forEach((d, i) => {
      const t = round6(d.total);
      if (!totalToIdx.has(t)) totalToIdx.set(t, []);
      totalToIdx.get(t).push(i);
    });
    for (const idxs of totalToIdx.values()) {
      if (idxs.length < 2) continue;
      const group = idxs.map((i) => result[i]);
      if (!group.some((d) => d.rozstrel)) continue;
      const rozVal = (d) => {
        const v = num(d.rozstrel, NaN);
        return Number.isFinite(v) ? -v : Infinity;
      };
      const groupSorted = [...group].sort((a, b) => rozVal(a) - rozVal(b));
      idxs.forEach((pos, k) => { result[pos] = groupSorted[k]; });
    }
    this.sortedResults = result;
    this.save();
  }

  // ── Finále ───────────────────────────────────────────────────────────────
  buildFinalists() {
    const already = this.finaleFinalists.length && this.finaleFinalists.some((d) => d.finale_score);
    if (already) return;
    const ni = this.numItems;
    const ties = this.findTiedIndices(this.sortedResults, ni, 6);
    const seen = [];
    for (let i = 0; i < Math.min(6, this.sortedResults.length); i++) {
      if (!seen.includes(this.sortedResults[i])) seen.push(this.sortedResults[i]);
    }
    [...ties].sort((a, b) => a - b).forEach((i) => {
      if (i >= 6 && !seen.includes(this.sortedResults[i])) seen.push(this.sortedResults[i]);
    });
    this.finaleFinalists = seen.slice(0, 6);
    this.save();
  }

  finaleKey(d, ni) {
    const base = num(d.total, 0);
    const fin = num(d.finale_score, 0);
    const tb = [];
    for (const i of this.tieBreakOrder(ni)) {
      const sc = num(d[`item${i}_score`], 0);
      tb.push(-sc);
      if (this.app.sortUseFault) {
        const raw = d[`item${i}_fault`];
        const ft = raw ? num(raw, -1) : -1;
        tb.push(-ft);
      }
    }
    return [-(base + fin), ...tb, -fin];
  }

  findFinaleTies(finalists) {
    const ni = this.numItems;
    if (!finalists.length) return new Set();
    const keys = finalists.map((d) => this.finaleKey(d, ni));
    const keyStr = (k) => k.join("|");
    const counts = new Map();
    keys.forEach((k) => { const s = keyStr(k); counts.set(s, (counts.get(s) || 0) + 1); });
    const boundary = keyStr(keys[Math.min(5, finalists.length - 1)]);
    const tied = new Set();
    keys.forEach((k, i) => { const s = keyStr(k); if (s === boundary || counts.get(s) > 1) tied.add(i); });
    return tied;
  }

  sortFinale() {
    const ni = this.numItems;
    this.finaleFinalists = [...this.finaleFinalists].sort(
      (a, b) => Store.compareKeys(this.finaleKey(a, ni), this.finaleKey(b, ni))
    );
    this.save();
  }

  evalFinaleRozstrel() {
    const result = [...this.finaleFinalists];
    const round6 = (v) => Math.round(num(v, 0) * 1e6) / 1e6;
    const totalToIdx = new Map();
    result.forEach((d, i) => {
      const combined = round6(num(d.total, 0) + num(d.finale_score, 0));
      if (!totalToIdx.has(combined)) totalToIdx.set(combined, []);
      totalToIdx.get(combined).push(i);
    });
    for (const idxs of totalToIdx.values()) {
      if (idxs.length < 2) continue;
      const group = idxs.map((i) => result[i]);
      if (!group.some((d) => d.finale_rozstrel)) continue;
      const rozVal = (d) => {
        const v = num(d.finale_rozstrel, NaN);
        return Number.isFinite(v) ? -v : Infinity;
      };
      const groupSorted = [...group].sort((a, b) => rozVal(a) - rozVal(b));
      idxs.forEach((pos, k) => { result[pos] = groupSorted[k]; });
    }
    this.finaleFinalists = result;
    this.save();
  }

  // ── Top statistika ───────────────────────────────────────────────────────
  computeTopStats() {
    const ni = this.numItems;
    const mx = num(this.maxScore, NaN);
    const src = this.sortedResults.length ? this.sortedResults : this.shootersData;
    const winners = [];
    if (Number.isFinite(mx)) {
      for (const d of src) {
        if (!(d.surname || d.name)) continue;
        const hits = [];
        for (let i = 1; i <= ni; i++) {
          const raw = d[`item${i}_score`];
          if (raw === undefined || raw === null || String(raw).trim() === "") continue;
          const sc = num(raw, NaN);
          if (Number.isFinite(sc) && sc === mx) hits.push(i);
        }
        if (hits.length) winners.push({ d, count: hits.length, hits });
      }
    }
    winners.sort((a, b) => (b.count - a.count) || (num(b.d.total, 0) - num(a.d.total, 0)));
    return winners;
  }
}

export const store = new Store();
