// Základní (výchozí) hodnoty - stejné jako v desktop verzi (shooting_results_app.py).
// Uživatel si může přidat vlastní disciplíny/kategorie navíc (viz Nastavení aplikace) -
// ty se ukládají do store.app.customDisciplines / store.app.customCategories a
// mísí se s touhle základní sadou pomocí allDisciplines()/allCategories() níže.
import { store } from "./state.js";

export const CATEGORIES = ["", "Senior", "Veterán", "Junior", "Žena", "Člen", "Host"];

export const CAT_SHORT = {
  "Senior": "S", "Veterán": "V", "Junior": "J",
  "Žena": "Ž", "Člen": "Č", "Host": "H", "": "",
};

export const DISCIPLINES = ["Americký TRAP", "Univerzální TRAP", "SKEET", "Speciál"];

export const ADD_CUSTOM = "__add_custom__"; // speciální hodnota pro "+ Přidat vlastní…" v <select>

export function catShort(cat) {
  if (Object.prototype.hasOwnProperty.call(CAT_SHORT, cat)) return CAT_SHORT[cat];
  const custom = store.app.customCategories.find((c) => c.name === cat);
  if (custom) return custom.short;
  return cat || "";
}

/** Základní (bez skrytých) + uživatelem přidané kategorie (bez prázdné volby).
 * `currentValue` (už dřív vybraná/uložená kategorie) se do seznamu vždy
 * zahrne, i kdyby mezitím byla skrytá - jinak by starým záznamům se skrytou
 * kategorií zmizela z <select> a tichem by se přepsaly na první možnost. */
export function allCategories(currentValue) {
  const base = CATEGORIES.filter((c) => c && (!store.app.hiddenCategories.includes(c) || c === currentValue));
  const custom = store.app.customCategories.map((c) => c.name);
  const list = [...base, ...custom];
  if (currentValue && !list.includes(currentValue)) list.push(currentValue);
  return list;
}

/** Základní (bez skrytých) + uživatelem přidané disciplíny - viz poznámka
 * u allCategories() k `currentValue`. */
export function allDisciplines(currentValue) {
  const base = DISCIPLINES.filter((d) => !store.app.hiddenDisciplines.includes(d) || d === currentValue);
  const list = [...base, ...store.app.customDisciplines];
  if (currentValue && !list.includes(currentValue)) list.push(currentValue);
  return list;
}
