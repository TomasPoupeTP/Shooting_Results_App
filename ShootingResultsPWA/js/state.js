// Centrální stav appky + veškerá "business logika" 1:1 podle desktop verze
// (shooting_results_app.py): řazení, detekce shody, rozstřel, finále, statistika.

const STORAGE_KEY = "shootingResultsPWA.competition.v1";

function num(v, def = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function fmtScore(v) {
  const n = num(v, 0);
  return Number.isInteger(n) ? String(n) : String(n);
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

class Store {
  constructor() {
    this.reset();
    this.load();
    this.view = "home";
    this.listeners = [];
  }

  reset() {
    this.competitionName = "";
    this.numShooters = 8;
    this.numItems = 3;
    this.hasFinale = false;
    this.useCategories = false;
    this.discipline = "Americký TRAP";
    this.customDiscipline = "";
    this.maxScore = 25;

    this.lotteryList = [];
    this.shootersData = [];
    this.sortedResults = [];
    this.finaleFinalists = [];
  }

  onChange(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach((fn) => fn()); }

  disciplineText() {
    if (this.discipline === "Vlastní…") return this.customDiscipline || "Vlastní";
    return this.discipline;
  }

  // ── Perzistence (localStorage) ───────────────────────────────────────────
  toJSON() {
    return {
      competitionName: this.competitionName,
      numShooters: this.numShooters,
      numItems: this.numItems,
      hasFinale: this.hasFinale,
      useCategories: this.useCategories,
      discipline: this.discipline,
      customDiscipline: this.customDiscipline,
      maxScore: this.maxScore,
      lotteryList: this.lotteryList,
      shootersData: this.shootersData,
      sortedResults: this.sortedResults,
      finaleFinalists: this.finaleFinalists,
    };
  }

  fromJSON(d) {
    if (!d || typeof d !== "object") return;
    this.reset();
    Object.assign(this, {
      competitionName: d.competitionName ?? "",
      numShooters: d.numShooters ?? 8,
      numItems: d.numItems ?? 3,
      hasFinale: !!d.hasFinale,
      useCategories: !!d.useCategories,
      discipline: d.discipline ?? "Americký TRAP",
      customDiscipline: d.customDiscipline ?? "",
      maxScore: d.maxScore ?? 25,
      lotteryList: d.lotteryList ?? [],
      shootersData: d.shootersData ?? [],
      sortedResults: d.sortedResults ?? [],
      finaleFinalists: d.finaleFinalists ?? [],
    });
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toJSON()));
    } catch (e) { console.warn("Uložení selhalo:", e); }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.fromJSON(JSON.parse(raw));
    } catch (e) { console.warn("Načtení selhalo:", e); }
  }

  newCompetition() {
    this.reset();
    this.save();
    this.notify();
  }

  exportJSON() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  importJSON(text) {
    const d = JSON.parse(text);
    this.fromJSON(d);
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
  /** Klíč pro řazení - pole čísel, nižší = lepší (vzestupné řazení). */
  sortKey(d, ni) {
    const total = num(d.total, 0);
    const tb = [];
    for (let i = ni; i >= 1; i--) {
      const sc = num(d[`item${i}_score`], 0);
      tb.push(-sc);
      const raw = d[`item${i}_fault`];
      const ft = raw ? num(raw, -1) : -1;
      tb.push(-ft);
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
    const ni = this.numItems;
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
    for (let i = ni; i >= 1; i--) {
      const sc = num(d[`item${i}_score`], 0);
      tb.push(-sc);
      const raw = d[`item${i}_fault`];
      const ft = raw ? num(raw, -1) : -1;
      tb.push(-ft);
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
export { num, fmtScore };
