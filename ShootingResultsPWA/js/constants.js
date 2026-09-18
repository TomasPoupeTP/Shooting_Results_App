// Základní (výchozí) hodnoty - stejné jako v desktop verzi (shooting_results_app.py).
// Uživatel si může přidat vlastní disciplíny/kategorie navíc (viz Nastavení appky) -
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

/** Základní + uživatelem přidané kategorie (bez prázdné volby). */
export function allCategories() {
  const base = CATEGORIES.filter((c) => c);
  const custom = store.app.customCategories.map((c) => c.name);
  return [...base, ...custom];
}

/** Základní + uživatelem přidané disciplíny. */
export function allDisciplines() {
  return [...DISCIPLINES, ...store.app.customDisciplines];
}
