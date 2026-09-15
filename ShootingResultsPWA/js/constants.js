// Stejné hodnoty jako v desktop verzi (shooting_results_app.py).
export const CATEGORIES = ["", "Senior", "Veterán", "Junior", "Žena", "Člen", "Host"];

export const CAT_SHORT = {
  "Senior": "S", "Veterán": "V", "Junior": "J",
  "Žena": "Ž", "Člen": "Č", "Host": "H", "": "",
};

export function catShort(cat) {
  return Object.prototype.hasOwnProperty.call(CAT_SHORT, cat) ? CAT_SHORT[cat] : (cat || "");
}

export const DISCIPLINES = ["Americký TRAP", "Univerzální TRAP", "SKEET", "Speciál"];
export const CUSTOM_DISC = "Vlastní…";
