import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import csv, os, json, random
from datetime import datetime
from collections import Counter

# ── ReportLab + Unicode font ──────────────────────────────────────────────────
try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import sys as _sys, os as _os2

    _FONT_CANDIDATES = []
    if _sys.platform == "win32":
        _wf = _os2.path.join(_os2.environ.get("WINDIR","C:\\Windows"), "Fonts")
        _FONT_CANDIDATES = [
            (_os2.path.join(_wf,"arial.ttf"),   _os2.path.join(_wf,"arialbd.ttf")),
            (_os2.path.join(_wf,"calibri.ttf"), _os2.path.join(_wf,"calibrib.ttf")),
            (_os2.path.join(_wf,"tahoma.ttf"),  _os2.path.join(_wf,"tahomabd.ttf")),
        ]
    else:
        _FONT_CANDIDATES = [
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ]
    PDF_FONT = "Helvetica"; PDF_FONT_BOLD = "Helvetica-Bold"
    for _reg, _bold in _FONT_CANDIDATES:
        if _os2.path.exists(_reg):
            try:
                pdfmetrics.registerFont(TTFont("_AN", _reg))
                pdfmetrics.registerFont(TTFont("_AB", _bold if _os2.path.exists(_bold) else _reg))
                PDF_FONT = "_AN"; PDF_FONT_BOLD = "_AB"; break
            except Exception: pass
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    PDF_FONT = "Helvetica"; PDF_FONT_BOLD = "Helvetica-Bold"

# ── Palette ───────────────────────────────────────────────────────────────────
BG_DARK      = "#0D1117"; BG_CARD  = "#161B22"; BG_INPUT = "#1C2128"; BG_HOVER = "#21262D"
ACCENT       = "#E8A317"; ACCENT_DARK = "#B8820F"
TEXT_PRIMARY = "#F0F6FC"; TEXT_MUTED  = "#8B949E"; BORDER  = "#30363D"
RED_ACCENT   = "#F85149"; GREEN_ACCENT = "#3FB950"; GOLD = "#FFD700"
H_TOP6 = "#1E3A1E"; H_TOP6_BD = "#3FB950"; H_TIE = "#3A2A0A"; H_TIE_BD = "#E8A317"

FONT_SH   = ("Courier New", 10, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_SM   = ("Segoe UI", 9)
FONT_CELL = ("Segoe UI", 9)

CATEGORIES     = ["", "Senior", "Veterán", "Junior", "Žena", "Člen", "Host"]
CAT_SHORT      = {"Senior":"S","Veterán":"V","Junior":"J","Žena":"Ž","Člen":"Č","Host":"H","":""}
DISCIPLINES    = ["Americký TRAP", "Univerzální TRAP", "SKEET", "Speciál"]
CUSTOM_DISC    = "Vlastní…"

def cat_short(cat):
    """Krátký kód kategorie; pro vlastní (custom) kategorie vrátí text tak, jak je."""
    if cat in CAT_SHORT:
        return CAT_SHORT[cat]
    return cat or ""

def make_btn(parent, text, cmd, style="primary", width=14):
    m = {"primary":(ACCENT,TEXT_PRIMARY),"secondary":(BG_HOVER,TEXT_PRIMARY),
         "danger":(RED_ACCENT,TEXT_PRIMARY),"success":(GREEN_ACCENT,BG_DARK)}
    bg,fg = m.get(style,m["secondary"])
    return tk.Button(parent, text=text, command=cmd, bg=bg, fg=fg, font=FONT_BODY,
                     relief="flat", bd=0, padx=10, pady=6, cursor="hand2", width=width,
                     activebackground=ACCENT_DARK, activeforeground=TEXT_PRIMARY)

def cell_entry(parent, textvariable, width, bg, justify="center"):
    e = tk.Entry(parent, textvariable=textvariable, width=width,
                 bg=bg, fg=TEXT_PRIMARY, insertbackground=TEXT_PRIMARY,
                 relief="flat", bd=0, font=FONT_CELL, justify=justify,
                 highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT)
    return e

def cell_label(parent, text="", textvariable=None, width=8, bg=BG_CARD, fg=TEXT_PRIMARY,
               bold=False, border=BORDER, anchor="center"):
    kw = dict(width=width, bg=bg, fg=fg, relief="flat", bd=0,
              highlightthickness=1, highlightbackground=border,
              pady=5, anchor=anchor,
              font=(FONT_CELL[0], FONT_CELL[1], "bold") if bold else FONT_CELL)
    if textvariable is not None:
        return tk.Label(parent, textvariable=textvariable, **kw)
    return tk.Label(parent, text=text, **kw)

def scrollable_canvas(parent):
    canvas = tk.Canvas(parent, bg=BG_DARK, highlightthickness=0)
    vsb = tk.Scrollbar(parent, orient="vertical",   command=canvas.yview)
    hsb = tk.Scrollbar(parent, orient="horizontal", command=canvas.xview)
    canvas.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
    vsb.pack(side="right", fill="y"); hsb.pack(side="bottom", fill="x")
    canvas.pack(side="left", fill="both", expand=True)
    inner = tk.Frame(canvas, bg=BG_DARK)
    canvas.create_window((0,0), window=inner, anchor="nw")
    inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
    canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(int(-1*(e.delta/120)),"units"))
    return inner


# ══════════════════════════════════════════════════════════════════════════════
class ShootingApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Shooting Results App")
        self.geometry("1380x820")
        self.minsize(1000, 600)
        self.configure(bg=BG_DARK)
        self.resizable(True, True)

        # ── App state ─────────────────────────────────────────────────────────
        self.competition_name = tk.StringVar()
        self.save_folder      = tk.StringVar(value=os.path.expanduser("~/Documents"))
        self.num_shooters     = tk.IntVar(value=8)
        self.num_items        = tk.IntVar(value=3)
        self.has_finale       = tk.BooleanVar(value=False)
        self.use_categories   = tk.BooleanVar(value=False)
        self.discipline       = tk.StringVar(value="Americký TRAP")
        self.custom_discipline = tk.StringVar(value="")
        self.max_score        = tk.IntVar(value=25)

        self.shooters_data    = []
        self.sorted_results   = []
        self.finale_finalists = []
        self.lottery_list     = []  # seznam s losem

        self.container = tk.Frame(self, bg=BG_DARK)
        self.container.pack(fill="both", expand=True)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)
        self.frames = {}
        self._toast_job = None

        # Dark style for comboboxes
        _s = ttk.Style(self)
        _s.theme_use("default")
        _s.configure("Dark.TCombobox",
                     fieldbackground=BG_INPUT, background=BG_HOVER,
                     foreground=TEXT_PRIMARY, selectbackground=BG_INPUT,
                     selectforeground=TEXT_PRIMARY, arrowcolor=TEXT_MUTED,
                     borderwidth=1, relief="flat",
                     padding=(4,4))
        _s.map("Dark.TCombobox",
               fieldbackground=[("readonly", BG_INPUT), ("disabled", BG_HOVER)],
               foreground=[("readonly", TEXT_PRIMARY)],
               background=[("active", BG_HOVER), ("readonly", BG_HOVER)])

        self._show_home()

    # ── Frame management ──────────────────────────────────────────────────────
    def _show_frame(self, name, widget):
        if name in self.frames:
            try: self.frames[name].destroy()
            except Exception: pass
        self.frames[name] = widget
        widget.grid(row=0, column=0, sticky="nsew")
        widget.tkraise()

    # ── Toast notification ────────────────────────────────────────────────────
    def _toast(self, msg="Uloženo ✔"):
        try:
            if hasattr(self,"_toast_lbl") and self._toast_lbl.winfo_exists():
                self._toast_lbl.destroy()
            if self._toast_job:
                self.after_cancel(self._toast_job)
        except Exception: pass
        lbl = tk.Label(self, text=f"  {msg}  ", font=FONT_SM,
                       bg=GREEN_ACCENT, fg=BG_DARK, relief="flat", bd=0, padx=8, pady=6)
        lbl.place(relx=1.0, rely=1.0, anchor="se", x=-12, y=-12)
        self._toast_lbl = lbl
        self._toast_job = self.after(3000, lambda: lbl.destroy() if lbl.winfo_exists() else None)

    # ── Auto-save ─────────────────────────────────────────────────────────────
    def _autosave(self):
        try:
            self._do_save(silent=True)
        except Exception:
            pass

    # ── Save path ─────────────────────────────────────────────────────────────
    def _save_path(self, ext, suffix=""):
        folder = self.save_folder.get()
        os.makedirs(folder, exist_ok=True)
        safe = "".join(c for c in self.competition_name.get()
                       if c.isalnum() or c in " _-").strip() or "soutez"
        date = datetime.now().strftime("%Y%m%d")
        name = f"{safe}_{date}{('_'+suffix) if suffix else ''}.{ext}"
        return os.path.join(folder, name)

    def _save_lottery_path(self, suffix=""):
        """Speciální cesta pro los soubory"""
        folder = self.save_folder.get()
        os.makedirs(folder, exist_ok=True)
        safe = "".join(c for c in self.competition_name.get()
                       if c.isalnum() or c in " _-").strip() or "soutez"
        date = datetime.now().strftime("%Y%m%d")
        name = f"{safe}_{date}_los.json"
        return os.path.join(folder, name)

    # ── Core save logic ───────────────────────────────────────────────────────
    def _do_save(self, silent=False):
        # Collect from entry grid if open
        if hasattr(self, "_entry_vars") and self._entry_vars:
            self.shooters_data = self._collect_entry_data()

        # Persist finale scores / rozstrel from live vars back into dicts
        if hasattr(self, "_finale_score_vars"):
            for r_idx, d in enumerate(self.finale_finalists):
                sv = self._finale_score_vars.get(r_idx)
                if sv is not None:
                    d["finale_score"] = sv.get().strip()
                rv = self._finale_roz_vars.get(r_idx) if hasattr(self, "_finale_roz_vars") else None
                if rv is not None:
                    d["finale_rozstrel"] = rv.get().strip()

        # Persist rozstrel from sorted screen
        if hasattr(self, "_rozstrel_vars"):
            for r_idx in range(len(self.sorted_results)):
                v = self._rozstrel_vars.get(r_idx)
                if v is not None:
                    self.sorted_results[r_idx]["rozstrel"] = v.get().strip()

        folder = self.save_folder.get()
        os.makedirs(folder, exist_ok=True)

        state = {
            "competition_name":  self.competition_name.get(),
            "save_folder":       folder,
            "num_shooters":      self.num_shooters.get(),
            "num_items":         self.num_items.get(),
            "has_finale":        self.has_finale.get(),
            "use_categories":    self.use_categories.get(),
            "discipline":        self.discipline.get(),
            "custom_discipline": self.custom_discipline.get(),
            "max_score":         self.max_score.get(),
            "shooters_data":     self.shooters_data,
            "sorted_results":    self.sorted_results,
            "finale_finalists":  self.finale_finalists,
        }
        json_path = self._save_path("srj")
        with open(json_path, "w", encoding="utf-8") as fh:
            json.dump(state, fh, ensure_ascii=False, indent=2)

        ni = self.num_items.get()
        csv_path = self._save_path("csv")

        # Build combined CSV
        fin_map = {d.get("surname","") + d.get("name",""): d for d in self.finale_finalists}
        fieldnames = ["rank", "surname", "name", "category"] + \
                     [f for i in range(1,ni+1) for f in (f"item{i}_score", f"item{i}_fault")] + \
                     ["total", "rozstrel", "finale_score", "finale_total"]

        rows_out = []
        source = self.sorted_results if self.sorted_results else self.shooters_data
        for ri, d in enumerate(source):
            key = d.get("surname","") + d.get("name","")
            fd  = fin_map.get(key, {})
            base = float(d.get("total", 0) or 0)
            fs   = fd.get("finale_score", "") if fd else ""
            try:   ft = base + float(fs or 0)
            except: ft = base
            row = {"rank": ri+1,
                   "surname":  d.get("surname",""),
                   "name":     d.get("name",""),
                   "category": d.get("category","")}
            for i in range(1, ni+1):
                row[f"item{i}_score"] = d.get(f"item{i}_score","")
                row[f"item{i}_fault"] = d.get(f"item{i}_fault","")
            row["total"]         = base
            row["rozstrel"]      = d.get("rozstrel","")
            row["finale_score"]  = fs
            row["finale_total"]  = (str(int(ft)) if ft == int(ft) else str(round(ft,4))) if fs else ""
            rows_out.append(row)
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows_out)

        if silent:
            self._toast("Automaticky uloženo ✔")
        else:
            self._toast("Uloženo ✔")

    def _save_data(self):
        try:
            self._do_save(silent=False)
        except Exception as e:
            messagebox.showerror("Chyba uložení", str(e))

    # ── Discipline / category helpers ─────────────────────────────────────────
    def _discipline_text(self):
        """Vrátí efektivní název disciplíny (vlastní text, pokud je zvoleno Vlastní…)."""
        d = self.discipline.get()
        if d == CUSTOM_DISC:
            return self.custom_discipline.get().strip() or "Vlastní disciplína"
        return d

    def _category_values(self):
        """Seznam kategorií pro výběr: základní + jakékoli vlastní již použité."""
        vals = list(CATEGORIES[1:])
        seen = set(vals)
        for d in (self.shooters_data or []):
            c = (d.get("category", "") or "").strip()
            if c and c not in seen:
                seen.add(c); vals.append(c)
        return vals

    # ══════════════════════════════════════════════════════════════════════════
    # HOME
    # ══════════════════════════════════════════════════════════════════════════
    def _show_home(self):
        f = tk.Frame(self.container, bg=BG_DARK)
        self._show_frame("home", f)
        tk.Frame(f, bg=ACCENT, height=4).pack(fill="x")

        tf = tk.Frame(f, bg=BG_DARK); tf.pack(pady=(40,6))
        tk.Label(tf, text="🎯  SHOOTING  RESULTS  APP",
                 font=("Georgia",30,"bold"), bg=BG_DARK, fg=ACCENT).pack()
        tk.Label(tf, text="Profesionální správa střeleckých výsledků",
                 font=("Segoe UI",12), bg=BG_DARK, fg=TEXT_MUTED).pack(pady=(4,0))

        tk.Frame(f, bg=BORDER, height=1).pack(fill="x", padx=80, pady=14)

        card = tk.Frame(f, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        card.pack(padx=80, pady=4, fill="x")
        inner = tk.Frame(card, bg=BG_CARD); inner.pack(padx=30, pady=22)

        def row(lbl_text, fn, pady=5):
            r = tk.Frame(inner, bg=BG_CARD); r.pack(fill="x", pady=pady)
            tk.Label(r, text=lbl_text, font=FONT_BODY, bg=BG_CARD,
                     fg=TEXT_MUTED, width=22, anchor="w").pack(side="left")
            fn(r)

        row("Název soutěže:", lambda p: tk.Entry(
            p, textvariable=self.competition_name, width=35,
            bg=BG_INPUT, fg=TEXT_PRIMARY, insertbackground=TEXT_PRIMARY,
            relief="flat", bd=0, font=FONT_BODY,
            highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT
        ).pack(side="left"))

        def _folder(p):
            tk.Entry(p, textvariable=self.save_folder, width=28,
                     bg=BG_INPUT, fg=TEXT_PRIMARY, insertbackground=TEXT_PRIMARY,
                     relief="flat", bd=0, font=FONT_BODY,
                     highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT
                     ).pack(side="left", padx=(0,6))
            make_btn(p,"Procházet…",self._choose_folder,"secondary",10).pack(side="left")
        row("Složka pro uložení:", _folder)

        def sp(p, var, **kw):
            tk.Spinbox(p, textvariable=var, width=6,
                       bg=BG_INPUT, fg=TEXT_PRIMARY, insertbackground=TEXT_PRIMARY,
                       relief="flat", bd=0, font=FONT_BODY,
                       highlightthickness=1, highlightbackground=BORDER,
                       buttonbackground=BG_HOVER, **kw).pack(side="left")
        row("Počet střelců:", lambda p: sp(p, self.num_shooters, from_=1, to=200))
        row("Počet položek:", lambda p: sp(p, self.num_items,    from_=1, to=20))

        def _disc(p):
            cb = ttk.Combobox(p, textvariable=self.discipline,
                              values=DISCIPLINES + [CUSTOM_DISC],
                              state="readonly", width=20, font=FONT_BODY,
                              style="Dark.TCombobox")
            cb.pack(side="left")
            custom_e = tk.Entry(p, textvariable=self.custom_discipline, width=22,
                                bg=BG_INPUT, fg=TEXT_PRIMARY, insertbackground=TEXT_PRIMARY,
                                relief="flat", bd=0, font=FONT_BODY,
                                highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT)
            def _toggle_custom(*_):
                if self.discipline.get() == CUSTOM_DISC:
                    custom_e.pack(side="left", padx=(8,0))
                else:
                    custom_e.pack_forget()
            cb.bind("<<ComboboxSelected>>", _toggle_custom)
            _toggle_custom()
        row("Disciplína:", _disc)

        def _maxscore(p):
            tk.Spinbox(p, textvariable=self.max_score, from_=1, to=999, width=6,
                       bg=BG_INPUT, fg=TEXT_PRIMARY, insertbackground=TEXT_PRIMARY,
                       relief="flat", bd=0, font=FONT_BODY,
                       highlightthickness=1, highlightbackground=BORDER,
                       buttonbackground=BG_HOVER).pack(side="left")
            tk.Label(p, text="  (max. výsledek z jedné položky)", font=FONT_SM,
                     bg=BG_CARD, fg=TEXT_MUTED).pack(side="left")
        row("Max. terčů v položce:", _maxscore)

        def _opts(p):
            tk.Checkbutton(p, variable=self.has_finale, text="Finále",
                           bg=BG_CARD, fg=TEXT_PRIMARY, selectcolor=BG_INPUT,
                           activebackground=BG_CARD, font=FONT_BODY).pack(side="left")
        row("Možnosti:", _opts)

        bf = tk.Frame(f, bg=BG_DARK); bf.pack(pady=20)
        make_btn(bf,"📋 Zápis a Los",    self._go_to_lottery,     "secondary",22).pack(side="left",padx=6)
        make_btn(bf,"Vygenerovat zápis →",self._go_to_entry,     "primary",22).pack(side="left",padx=6)
        make_btn(bf,"📂 Načíst soutěž",  self._load_competition, "secondary",18).pack(side="left",padx=6)

        tk.Label(f, text="© Shooting Results App", font=("Segoe UI",8),
                 bg=BG_DARK, fg=TEXT_MUTED).pack(side="bottom", pady=8)

    def _choose_folder(self):
        d = filedialog.askdirectory(initialdir=self.save_folder.get())
        if d: self.save_folder.set(d)

    def _go_to_lottery(self):
        if not self.competition_name.get().strip():
            messagebox.showwarning("Chybí název", "Vyplň název soutěže.")
            return
        self._show_lottery()

    # ══════════════════════════════════════════════════════════════════════════
    # LOTTERY (LOS) DIALOG
    # ══════════════════════════════════════════════════════════════════════════
    def _show_lottery(self):
        """Integrovaná obrazovka pro správu zápisu a losu přímo v hlavním okně"""
        f = tk.Frame(self.container, bg=BG_DARK)
        self._show_frame("lottery", f)

        # Top bar
        topbar = tk.Frame(f, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        topbar.pack(fill="x")
        tk.Label(topbar, text=f"📋 {self.competition_name.get()} – Zápis a Los",
                 font=("Georgia",13,"bold"), bg=BG_CARD, fg=ACCENT).pack(side="left", padx=16, pady=8)

        # Input fields
        input_frame = tk.Frame(f, bg=BG_DARK)
        input_frame.pack(fill="x", padx=10, pady=10)

        tk.Label(input_frame, text="Příjmení:", font=FONT_SM, bg=BG_DARK, fg=TEXT_MUTED).pack(side="left", padx=5)
        surname_var = tk.StringVar()
        entry_sn = tk.Entry(input_frame, textvariable=surname_var, width=20,
                 bg=BG_INPUT, fg=TEXT_PRIMARY, font=FONT_BODY,
                 relief="flat", bd=0, highlightthickness=1, highlightbackground=BORDER)
        entry_sn.pack(side="left", padx=5)

        tk.Label(input_frame, text="Jméno:", font=FONT_SM, bg=BG_DARK, fg=TEXT_MUTED).pack(side="left", padx=5)
        name_var = tk.StringVar()
        entry_nm = tk.Entry(input_frame, textvariable=name_var, width=20,
                 bg=BG_INPUT, fg=TEXT_PRIMARY, font=FONT_BODY,
                 relief="flat", bd=0, highlightthickness=1, highlightbackground=BORDER)
        entry_nm.pack(side="left", padx=5)

        # Buttons
        btn_frame = tk.Frame(input_frame, bg=BG_DARK)
        btn_frame.pack(side="left", padx=10)

        def _add_shooter():
            try:
                sn = surname_var.get().strip()
                nm = name_var.get().strip()
                if not sn or not nm:
                    messagebox.showwarning("Chyba", "Vyplň příjmení a jméno")
                    return
                start_num = len(self.lottery_list) + 1
                self.lottery_list.append({"surname": sn, "name": nm, "start_num": start_num, "los": 0})
                
                surname_var.set("")
                name_var.set("")
                
                _refresh_list()
                _save_lottery_auto()
                entry_sn.focus()
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při přidání: {str(e)}")

        make_btn(btn_frame, "+ Přidat", _add_shooter, "success", 10).pack(side="left", padx=2)

        # List frame with scrollbar
        list_frame = tk.Frame(f, bg=BG_DARK)
        list_frame.pack(fill="both", expand=True, padx=10, pady=10)

        self.lottery_canvas = tk.Canvas(list_frame, bg=BG_DARK, highlightthickness=0)
        scrollbar = tk.Scrollbar(list_frame, orient="vertical", command=self.lottery_canvas.yview)
        self.lottery_canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        self.lottery_canvas.pack(side="left", fill="both", expand=True)

        self.lottery_inner = tk.Frame(self.lottery_canvas, bg=BG_DARK)
        self.lottery_canvas.create_window((0,0), window=self.lottery_inner, anchor="nw")
        self.lottery_inner.bind("<Configure>", lambda e: self.lottery_canvas.configure(scrollregion=self.lottery_canvas.bbox("all")))

        self._los_sn_vars = []

        def _refresh_list():
            for w in self.lottery_inner.winfo_children(): w.destroy()
            self._los_sn_vars.clear()
            
            # Headers - Vyčištěné hlavičky Losu
            h_frame = tk.Frame(self.lottery_inner, bg=BG_CARD)
            h_frame.pack(fill="x", padx=0, pady=(0,5))
            tk.Label(h_frame, text="Start.č", font=FONT_SH, bg=BG_CARD, fg=ACCENT, width=8, anchor="center").pack(side="left", padx=2)
            tk.Label(h_frame, text="Příjmení", font=FONT_SH, bg=BG_CARD, fg=ACCENT, width=20, anchor="w").pack(side="left", padx=2)
            tk.Label(h_frame, text="Jméno", font=FONT_SH, bg=BG_CARD, fg=ACCENT, width=20, anchor="w").pack(side="left", padx=2)
            tk.Label(h_frame, text="Akce", font=FONT_SH, bg=BG_CARD, fg=TEXT_MUTED, width=6, anchor="center").pack(side="left", padx=2)
            
            # Rows - Srovnané řádky a decentní tlačítko mazání
            for i, d in enumerate(self.lottery_list):
                row_bg = BG_CARD if i%2==0 else BG_INPUT
                r = tk.Frame(self.lottery_inner, bg=row_bg, pady=3)
                r.pack(fill="x", padx=0, pady=1)
                
                sn_var = tk.StringVar(value=str(d.get("start_num", i+1)))
                self._los_sn_vars.append(sn_var)
                
                def make_updater(idx=i, var=sn_var):
                    def _updater(*args):
                        try:
                            self.lottery_list[idx]["start_num"] = int(var.get() or 0)
                            _save_lottery_auto()
                        except ValueError:
                            pass
                    return _updater
                
                sn_var.trace_add("write", make_updater())
                
                e_sn = tk.Entry(r, textvariable=sn_var, width=6, bg=BG_INPUT, fg=GOLD, 
                                font=FONT_BODY, justify="center", relief="flat",
                                highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT)
                e_sn.pack(side="left", padx=8)
                
                tk.Label(r, text=d["surname"], font=FONT_BODY, bg=row_bg, fg=TEXT_PRIMARY, width=20, anchor="w").pack(side="left", padx=2)
                tk.Label(r, text=d["name"], font=FONT_BODY, bg=row_bg, fg=TEXT_MUTED, width=20, anchor="w").pack(side="left", padx=2)
                
                # Decentní mazací tlačítko, které zčervená až při najetí myší
                btn_del = tk.Button(r, text="✕", font=FONT_SM, bg=row_bg, fg=TEXT_MUTED,
                                    relief="flat", bd=0, cursor="hand2", width=4, activebackground=RED_ACCENT, activeforeground=TEXT_PRIMARY,
                                    command=lambda idx=i: _delete_shooter(idx))
                btn_del.bind("<Enter>", lambda e, b=btn_del: b.configure(fg=RED_ACCENT))
                btn_del.bind("<Leave>", lambda e, b=btn_del, bg=row_bg: b.configure(fg=TEXT_MUTED))
                btn_del.pack(side="left", padx=4)

        def _delete_shooter(idx):
            try:
                self.lottery_list.pop(idx)
                for i, d in enumerate(self.lottery_list):
                    d["start_num"] = i + 1
                _refresh_list()
                _save_lottery_auto()
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při smazání: {str(e)}")

        def _save_lottery_auto():
            try:
                path = self._save_lottery_path()
                los_data = {
                    "competition_name": self.competition_name.get(),
                    "save_folder": self.save_folder.get(),
                    "lottery_list": self.lottery_list,
                }
                with open(path, "w", encoding="utf-8") as fh:
                    json.dump(los_data, fh, ensure_ascii=False, indent=2)
            except Exception:
                pass

        _refresh_list()

        # Control buttons
        ctrl_frame = tk.Frame(f, bg=BG_DARK)
        ctrl_frame.pack(fill="x", padx=10, pady=10)

        def _sort_by_los():
            try:
                if not self.lottery_list:
                    messagebox.showwarning("Chyba", "Nejdřív přidej střelce")
                    return
                self.lottery_list.sort(key=lambda d: int(d.get("start_num", 0)))
                _refresh_list()
                _save_lottery_auto()
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při seřazení: {str(e)}")

        def _auto_los():
            try:
                if not self.lottery_list:
                    messagebox.showwarning("Chyba", "Nejdřív přidej střelce")
                    return
                random.shuffle(self.lottery_list)
                for i, d in enumerate(self.lottery_list, 1):
                    d["los"] = i
                    d["start_num"] = i
                _refresh_list()
                _save_lottery_auto()
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při auto-losu: {str(e)}")

        def _print_lottery_pdf():
            """Vygeneruje úsporné PDF startovní listiny (bez plýtvání barvou, přesně pro max 42 řádků na A4)"""
            if not REPORTLAB_AVAILABLE:
                messagebox.showerror("Chyba", "Není nainstalována knihovna ReportLab (pip install reportlab)"); return
            if not self.lottery_list:
                messagebox.showwarning("Chyba", "Nejdřív přidej střelce"); return
            
            path = self._save_path("pdf", "startovni_listina")
            try:
                # Zmenšení okrajů na 1.2 cm pro maximalizaci tiskové plochy na výšku
                doc = SimpleDocTemplate(path, pagesize=A4,
                                      leftMargin=1.5*cm, rightMargin=1.5*cm,
                                      topMargin=1.2*cm, bottomMargin=1.2*cm)
                
                story = self._pdf_header("Startovní listina")
                story.append(Spacer(1, 0.3*cm))
                
                # Kompaktní styl písma (velikost 9 bodů, černá barva)
                ts_cell = ParagraphStyle("cell", fontName=PDF_FONT, fontSize=9, alignment=TA_LEFT, textColor=colors.black)
                ts_cell_center = ParagraphStyle("cell_c", fontName=PDF_FONT, fontSize=9, alignment=TA_CENTER, textColor=colors.black)
                ts_hdr = ParagraphStyle("hdr", fontName=PDF_FONT_BOLD, fontSize=9, alignment=TA_CENTER, textColor=colors.black)
                
                # Příprava tabulky: Záhlaví (bez textu "tužkou")
                table_data = [[
                    Paragraph("<b>Poř. č.</b>", ts_hdr),
                    Paragraph("<b>Příjmení</b>", ts_hdr),
                    Paragraph("<b>Jméno</b>", ts_hdr),
                    Paragraph("<b>Start. č.</b>", ts_hdr)
                ]]
                
                # Přidání střelců
                for idx, d in enumerate(self.lottery_list, 1):
                    table_data.append([
                        Paragraph(str(idx), ts_cell_center),
                        Paragraph(d["surname"], ts_cell),
                        Paragraph(d["name"], ts_cell),
                        Paragraph("", ts_cell)
                    ])
                
                col_widths = [1.5*cm, 6.0*cm, 5.5*cm, 5.0*cm]
                
                # Stylování tabulky: Odsazení nastaveno na 2.5 bodu, aby se 42 řádků zaručeně vešlo na 1 stranu A4
                t_style = TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.white),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    
                    # Husté řádkování pro záhlaví i střelce
                    ('TOPPADDING', (0,0), (-1,-1), 2.5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
                    
                    # Tenké ohraničení jemnou šedou linkou
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#A0A0A0')),
                ])
                
                pdf_table = Table(table_data, colWidths=col_widths)
                pdf_table.setStyle(t_style)
                story.append(pdf_table)
                
                doc.build(story)
                self._toast("PDF startovní listiny uloženo ✔")
                
                if messagebox.askyesno("Otevřít", f"PDF uloženo do:\n{path}\n\nChceš ho hned otevřít?"):
                    os.startfile(path) if hasattr(os, 'startfile') else os.system(f'xdg-open "{path}"')
            except Exception as e:
                messagebox.showerror("Chyba tisku PDF", str(e))

        def _save_los():
            try:
                if not self.lottery_list:
                    messagebox.showwarning("Chyba", "Nejdřív přidej střelce")
                    return
                path = self._save_lottery_path()
                messagebox.showinfo("Uloženo", f"Los seznam uložen:\n{path}")
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při ukládání: {str(e)}")

        def _load_los():
            try:
                path = filedialog.askopenfilename(
                    title="Načíst los seznam",
                    filetypes=[("Los soubory","*.json"),("Vše","*.*")],
                    initialdir=self.save_folder.get())
                if not path: return
                with open(path, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                self.lottery_list = data.get("lottery_list", [])
                _refresh_list()
                messagebox.showinfo("Načteno", "Los seznam načten")
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při načítání: {str(e)}")

        def _apply_to_entry():
            try:
                if not self.lottery_list:
                    messagebox.showwarning("Chyba", "Nejdřív přidej střelce")
                    return
                sorted_list = sorted(self.lottery_list, key=lambda d: int(d.get("start_num", 0)))
                self.num_shooters.set(len(sorted_list))
                self.shooters_data = [{"surname": d["surname"], "name": d["name"], 
                                       "start_num": d.get("start_num", i+1), "los": d.get("los", 0),
                                       "category": "", "total": 0}
                                      for i, d in enumerate(sorted_list)]
                for d in self.shooters_data:
                    for i in range(1, self.num_items.get() + 1):
                        d[f"item{i}_score"] = ""
                        d[f"item{i}_fault"] = ""
                messagebox.showinfo("Hotovo", f"{len(sorted_list)} střelců vloženo do zápisu")
                self._show_entry()
            except Exception as e:
                messagebox.showerror("Chyba", f"Chyba při vložení do zápisu: {str(e)}")

        make_btn(ctrl_frame, "Seřadit dle čísel", _sort_by_los, "secondary", 15).pack(side="left", padx=3)
        make_btn(ctrl_frame, "🎲 Auto-Los", _auto_los, "secondary", 11).pack(side="left", padx=3)
        make_btn(ctrl_frame, "🖨️ Tisk listiny", _print_lottery_pdf, "primary", 13).pack(side="left", padx=3)
        make_btn(ctrl_frame, "🎯 Položkové listy", self._show_item_sheets_dialog, "primary", 16).pack(side="left", padx=3)
        make_btn(ctrl_frame, "💾 Uložit los", _save_los, "success", 12).pack(side="left", padx=3)
        make_btn(ctrl_frame, "📂 Načíst los", _load_los, "secondary", 12).pack(side="left", padx=3)
        make_btn(ctrl_frame, "✓ Použít v zápisu", _apply_to_entry, "primary", 15).pack(side="left", padx=3)
        make_btn(ctrl_frame, "← Zpět", self._show_home, "secondary", 9).pack(side="left", padx=3)

    # ══════════════════════════════════════════════════════════════════════════
    # POLOŽKOVÉ LISTY (score sheets) – PDF na A4 naležato
    # ══════════════════════════════════════════════════════════════════════════
    def _round_sizes(self, n, mode, per, custom_text):
        """Vrátí seznam počtu REÁLNÝCH střelců na jednu rundu (stránku)."""
        sizes = []
        if mode == "auto":
            per = 6
        if mode in ("auto", "per"):
            try: per = max(1, int(per or 6))
            except Exception: per = 6
            full, rem = divmod(max(n, 0), per)
            sizes = [per] * full + ([rem] if rem else [])
            if not sizes:
                sizes = [per]
        elif mode == "custom":
            for tok in str(custom_text).replace(";", ",").replace(" ", ",").split(","):
                tok = tok.strip()
                if tok.isdigit() and int(tok) > 0:
                    sizes.append(int(tok))
            if not sizes:
                sizes = [6]
            while sum(sizes) < n:                      # rundy navíc, aby se vešli všichni
                sizes.append(min(6, n - sum(sizes)) or 6)
        return sizes

    def _build_slots(self, round_sizes, extra_pages=0, page_rows=6):
        """Rozdělí střelce (dle startovního čísla) do rund.
        Každá stránka má vždy min. `page_rows` (6) míst – chybějící se doplní
        prázdnými buňkami se startovním číslem pro pozdější ruční dopsání."""
        real = [d for d in self.lottery_list if (d.get("surname") or d.get("name"))]
        def _sn(d):
            try: return int(str(d.get("start_num", 0)).strip() or 0)
            except Exception: return 10**9
        real = sorted(real, key=_sn)
        nums = [_sn(d) for d in real if str(d.get("start_num", "")).strip().isdigit()]
        ec = [(max(nums) + 1) if nums else (len(real) + 1)]   # čítač čísel pro prázdná místa
        def _empty():
            s = {"start": str(ec[0]), "name": "", "empty": True}; ec[0] += 1; return s

        ridx = 0
        rounds = []
        for size in round_sizes:
            pr = max(page_rows, size)
            block = []
            for j in range(pr):
                if j < size and ridx < len(real):
                    d = real[ridx]; ridx += 1
                    block.append({
                        "start": str(d.get("start_num", ridx)),
                        "name": (d.get("surname", "") + " " + d.get("name", "")).strip(),
                        "empty": False,
                    })
                else:
                    block.append(_empty())
            rounds.append(block)
        for _ in range(int(extra_pages or 0)):          # zcela prázdné rundy navíc
            rounds.append([_empty() for _ in range(page_rows)])
        return rounds

    def _show_item_sheets_dialog(self):
        if not self.lottery_list:
            messagebox.showwarning("Chyba", "Nejdřív přidej střelce do losu."); return
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Chyba", "Není nainstalována knihovna ReportLab (pip install reportlab)"); return

        n = len([d for d in self.lottery_list if (d.get("surname") or d.get("name"))])

        win = tk.Toplevel(self)
        win.title("Položkové listy – nastavení")
        win.configure(bg=BG_DARK)
        win.geometry("540x440")
        win.transient(self)
        try: win.grab_set()
        except Exception: pass

        tk.Frame(win, bg=ACCENT, height=4).pack(fill="x")
        tk.Label(win, text="🎯  Položkové listy", font=("Georgia", 16, "bold"),
                 bg=BG_DARK, fg=ACCENT).pack(anchor="w", padx=18, pady=(12, 0))
        tk.Label(win, text=f"Střelců: {n}   •   Položek na střelce: {self.num_items.get()}   •   Max. terčů: {self.max_score.get()}",
                 font=FONT_SM, bg=BG_DARK, fg=TEXT_MUTED).pack(anchor="w", padx=18, pady=(2, 8))

        card = tk.Frame(win, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        card.pack(fill="x", padx=18, pady=4)
        inner = tk.Frame(card, bg=BG_CARD); inner.pack(padx=16, pady=14, fill="x")

        mode        = tk.StringVar(value="auto")
        per_var     = tk.IntVar(value=6)
        custom_var  = tk.StringVar(value="")
        reserve_var = tk.IntVar(value=0)

        preview = tk.Label(win, text="", font=FONT_SM, bg=BG_DARK, fg=GREEN_ACCENT,
                           justify="left", anchor="w", wraplength=490)

        def _current_sizes():
            return self._round_sizes(n, mode.get(), per_var.get(), custom_var.get())

        def _update_preview(*_):
            try:
                sizes = _current_sizes()
                try: extra = max(0, int(reserve_var.get() or 0))
                except Exception: extra = 0
                pages = len(sizes) + extra
                empties = sum(max(6, s) - s for s in sizes) + extra * 6
                txt = "Rundy (lidí): " + ", ".join(str(s) for s in sizes)
                txt += f"    •  stran: {pages}    •  prázdných míst: {empties}"
                preview.configure(text=txt)
            except Exception as e:
                preview.configure(text=str(e))

        def _radio(parent, text, val):
            return tk.Radiobutton(parent, text=text, variable=mode, value=val,
                                  bg=BG_CARD, fg=TEXT_PRIMARY, selectcolor=BG_INPUT,
                                  activebackground=BG_CARD, font=FONT_BODY,
                                  command=_update_preview, anchor="w")

        r1 = tk.Frame(inner, bg=BG_CARD); r1.pack(fill="x", pady=3)
        _radio(r1, "Automaticky po 6 lidech", "auto").pack(side="left")

        r2 = tk.Frame(inner, bg=BG_CARD); r2.pack(fill="x", pady=3)
        _radio(r2, "Po vlastním počtu na rundu:", "per").pack(side="left")
        tk.Spinbox(r2, textvariable=per_var, from_=1, to=6, width=4,
                   bg=BG_INPUT, fg=TEXT_PRIMARY, relief="flat", bd=0, font=FONT_BODY,
                   highlightthickness=1, highlightbackground=BORDER, buttonbackground=BG_HOVER,
                   command=_update_preview).pack(side="left", padx=(6, 0))

        r3 = tk.Frame(inner, bg=BG_CARD); r3.pack(fill="x", pady=3)
        _radio(r3, "Vlastní rozpis (např. 6,6,5):", "custom").pack(side="left")
        ce = tk.Entry(r3, textvariable=custom_var, width=16,
                      bg=BG_INPUT, fg=TEXT_PRIMARY, relief="flat", bd=0, font=FONT_BODY,
                      highlightthickness=1, highlightbackground=BORDER, highlightcolor=ACCENT)
        ce.pack(side="left", padx=(6, 0))
        ce.bind("<KeyRelease>", _update_preview)

        r4 = tk.Frame(inner, bg=BG_CARD); r4.pack(fill="x", pady=(10, 3))
        tk.Label(r4, text="Prázdné rundy navíc (stránky):", bg=BG_CARD, fg=TEXT_MUTED,
                 font=FONT_BODY).pack(side="left")
        tk.Spinbox(r4, textvariable=reserve_var, from_=0, to=10, width=4,
                   bg=BG_INPUT, fg=TEXT_PRIMARY, relief="flat", bd=0, font=FONT_BODY,
                   highlightthickness=1, highlightbackground=BORDER, buttonbackground=BG_HOVER,
                   command=_update_preview).pack(side="left", padx=(6, 0))

        preview.pack(anchor="w", padx=18, pady=(12, 4))
        _update_preview()

        bf = tk.Frame(win, bg=BG_DARK); bf.pack(side="bottom", fill="x", pady=10)
        def _go():
            sizes = _current_sizes()
            try: extra = max(0, int(reserve_var.get() or 0))
            except Exception: extra = 0
            try: win.grab_release()
            except Exception: pass
            win.destroy()
            self._generate_item_sheets_pdf(sizes, extra)
        make_btn(bf, "🖨️ Generovat PDF", _go, "primary", 18).pack(side="left", padx=(18, 6))
        make_btn(bf, "Zrušit", win.destroy, "secondary", 10).pack(side="left", padx=2)

    def _sheet_row_heights(self, ni):
        return [0.55*cm, 0.40*cm] + [0.62*cm]*ni

    def _item_sheet_table(self, slot, ni, mx, col_widths, ncols, name_style, hdr_style):
        if slot["empty"]:
            banner = f'St. č. {slot["start"]}   ·   ………………………………………………………'
        else:
            banner = f'St. č. {slot["start"]}   ·   {slot["name"]}'

        data = []
        data.append([Paragraph(banner, name_style)] + [""] * (ncols - 1))     # jmenovka
        data.append(["Pol."] + [Paragraph(str(i), hdr_style) for i in range(1, mx + 1)]
                    + [Paragraph("Celkem", hdr_style), Paragraph("Celkové", hdr_style)])
        for it in range(1, ni + 1):
            data.append([Paragraph(str(it), hdr_style)] + [""] * mx + ["", ""])

        t = Table(data, colWidths=col_widths, rowHeights=self._sheet_row_heights(ni))
        t.setStyle(TableStyle([
            ("SPAN", (0, 0), (ncols - 1, 0)),                       # jmenovka přes celou šířku
            ("SPAN", (ncols - 1, 2), (ncols - 1, 1 + ni)),          # Celkové celkem přes řádky položek
            ("BACKGROUND", (0, 0), (ncols - 1, 0), colors.HexColor("#E8E8E8")),
            ("BACKGROUND", (0, 1), (ncols - 1, 1), colors.HexColor("#F2F2F2")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#888888")),
            ("BOX", (0, 0), (-1, -1), 0.9, colors.black),
            ("LINEBELOW", (0, 0), (ncols - 1, 0), 0.9, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 1), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 1), (0, -1), PDF_FONT_BOLD),
            ("FONTSIZE", (0, 1), (0, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 1),
            ("RIGHTPADDING", (0, 0), (-1, -1), 1),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (ncols - 1, 0), 5),             # odsazení jmenovky
        ]))
        return t

    def _generate_item_sheets_pdf(self, round_sizes, extra_pages=0):
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Chyba", "pip install reportlab"); return
        rounds = self._build_slots(round_sizes, extra_pages)
        ni = self.num_items.get()
        try: mx = int(self.max_score.get())
        except Exception: mx = 25
        mx = max(1, min(mx, 60))            # rozumný limit pro tisk na šířku

        path = self._save_path("pdf", "polozkove_listy")
        try:
            page = landscape(A4)
            doc = SimpleDocTemplate(path, pagesize=page,
                                    leftMargin=1.0*cm, rightMargin=1.0*cm,
                                    topMargin=1.0*cm, bottomMargin=0.8*cm)
            usable_w = page[0] - 2.0*cm
            w_idx, w_sum, w_tot = 0.8*cm, 1.4*cm, 1.5*cm
            box_w = max((usable_w - w_idx - w_sum - w_tot) / mx, 0.30*cm)
            col_widths = [w_idx] + [box_w]*mx + [w_sum, w_tot]
            ncols = mx + 3

            comp = self.competition_name.get()
            title_style = ParagraphStyle("rt", fontName=PDF_FONT_BOLD, fontSize=14,
                                         alignment=TA_LEFT, textColor=colors.black, spaceAfter=4)
            name_style  = ParagraphStyle("nm", fontName=PDF_FONT_BOLD, fontSize=10,
                                         alignment=TA_LEFT, textColor=colors.black)
            hdr_style   = ParagraphStyle("hd", fontName=PDF_FONT, fontSize=6.5,
                                         alignment=TA_CENTER, textColor=colors.black, leading=7)

            story = []
            for r_no, slots in enumerate(rounds, 1):
                story.append(Paragraph(f"Runda {r_no} – {comp}", title_style))
                for slot in slots:
                    story.append(self._item_sheet_table(slot, ni, mx, col_widths, ncols,
                                                        name_style, hdr_style))
                    story.append(Spacer(1, 0.18*cm))
                if r_no < len(rounds):
                    story.append(PageBreak())

            doc.build(story)
            self._toast("PDF položkových listů uloženo ✔")
            if messagebox.askyesno("Otevřít", f"PDF uloženo do:\n{path}\n\nChceš ho hned otevřít?"):
                os.startfile(path) if hasattr(os, "startfile") else os.system(f'xdg-open "{path}"')
        except Exception as e:
            messagebox.showerror("Chyba tisku PDF", str(e))

    # ══════════════════════════════════════════════════════════════════════════
    # ENTRY GRID
    # ══════════════════════════════════════════════════════════════════════════
    def _go_to_entry(self):
        if not self.competition_name.get().strip():
            messagebox.showwarning("Chybí název","Prosím vyplňte název soutěže."); return
        try:
            if self.num_shooters.get()<1 or self.num_items.get()<1: raise ValueError
        except (ValueError,tk.TclError):
            messagebox.showwarning("Chybné hodnoty","Počty musí být kladná čísla."); return
        if not self.shooters_data: self.shooters_data = []
        self._show_entry()

    def _load_competition(self):
        path = filedialog.askopenfilename(
            title="Načíst soutěž",
            filetypes=[("Shooting Results","*.srj"),("JSON","*.json"),("Vše","*.*")],
            initialdir=self.save_folder.get())
        if not path: return
        try:
            with open(path,"r",encoding="utf-8") as fh: data = json.load(fh)
            self.competition_name.set(data.get("competition_name",""))
            self.save_folder.set(data.get("save_folder",self.save_folder.get()))
            self.num_shooters.set(data.get("num_shooters",8))
            self.num_items.set(data.get("num_items",3))
            self.has_finale.set(data.get("has_finale",False))
            self.use_categories.set(data.get("use_categories",False))
            _disc = data.get("discipline","Americký TRAP")
            _cust = data.get("custom_discipline","")
            if _disc not in DISCIPLINES and _disc != CUSTOM_DISC:
                _cust = _disc; _disc = CUSTOM_DISC
            self.discipline.set(_disc)
            self.custom_discipline.set(_cust)
            self.max_score.set(data.get("max_score",25))
            self.shooters_data    = data.get("shooters_data",[])
            self.sorted_results   = data.get("sorted_results",[])
            self.finale_finalists = data.get("finale_finalists",[])
            self._show_entry()
        except Exception as e:
            messagebox.showerror("Chyba načítání",str(e))

    def _show_entry(self):
        f = tk.Frame(self.container, bg=BG_DARK)
        self._show_frame("entry", f)
        self._entry_page = f

        topbar = tk.Frame(f, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        topbar.pack(fill="x")
        tk.Label(topbar, text=f"🎯  {self.competition_name.get()}",
                 font=("Georgia",13,"bold"), bg=BG_CARD, fg=ACCENT).pack(side="left",padx=16,pady=8)
        tk.Label(topbar, text=f"│  {self._discipline_text()}  │  Max: {self.max_score.get()} terčů",
                 font=FONT_SM, bg=BG_CARD, fg=TEXT_MUTED).pack(side="left",padx=4,pady=8)

        def _toggle_cat():
            self.shooters_data = self._collect_entry_data()
            self._build_entry_grid()
        tk.Checkbutton(topbar, variable=self.use_categories, text="Kategorie",
                       command=_toggle_cat,
                       bg=BG_CARD, fg=TEXT_PRIMARY, selectcolor=BG_INPUT,
                       activebackground=BG_CARD, font=FONT_SM).pack(side="left", padx=(8,0))

        bb = tk.Frame(topbar, bg=BG_CARD); bb.pack(side="right",padx=10,pady=6)
        for txt,cmd,sty,w in [
            ("+ Střelec", self._add_shooter,"secondary",10),
            ("- Střelec", self._rem_shooter,"secondary",10),
            ("+ Položka", self._add_item,  "secondary",10),
            ("- Položka", self._rem_item,  "secondary",10),
            ("💾 Uložit", self._save_data, "success",  10),
            ("🖥 Prezentace", self._show_presentation,"secondary",12),
            ("Seřadit →", self._go_to_sorted,"primary",10),
            ("← Zpět",    self._show_home, "secondary", 8),
        ]:
            make_btn(bb,txt,cmd,sty,w).pack(side="left",padx=2)

        self._entry_grid_frame = tk.Frame(f, bg=BG_DARK)
        self._entry_grid_frame.pack(fill="both", expand=True, padx=8, pady=8)
        self._build_entry_grid()

    def _build_entry_grid(self):
        """Vygeneruje tabulku střelců s opraveným pořadím sloupců: Start. č. a poté Kategorie"""
        for w in self._entry_grid_frame.winfo_children(): w.destroy()
        ns = self.num_shooters.get(); ni = self.num_items.get()
        inner = scrollable_canvas(self._entry_grid_frame)
        self._entry_vars = {}

        # Srovnané hlavičky: Start.č a pak Kategorie (Kat.)
        headers    = ["#", "Příjmení", "Jméno", "Start.č", "Kat."]
        col_widths = [4,   14,        12,      8,         10]
        for i in range(1, ni+1):
            headers    += [f"Pol.{i}", f"1.Ch.{i}"]
            col_widths += [9,           11]
        headers.append("Součet"); col_widths.append(9)

        for c,(h,cw) in enumerate(zip(headers,col_widths)):
            cell_label(inner,text=h,width=cw,bg=BG_CARD,fg=ACCENT,bold=True,border=BORDER
                       ).grid(row=0,column=c,padx=1,pady=1,sticky="nsew")

        existing = self.shooters_data
        for r in range(ns):
            rb = BG_CARD if r%2==0 else BG_INPUT
            ex = existing[r] if r<len(existing) else {}

            # Sloupec 0: Pořadové číslo (#)
            cell_label(inner,text=str(r+1),width=4,bg=rb,fg=TEXT_MUTED,border=BORDER
                       ).grid(row=r+1,column=0,padx=1,pady=1,sticky="nsew")

            # Sloupec 1 a 2: Příjmení a Jméno
            col_off = 1
            for key,cw in [("surname",col_widths[1]),("name",col_widths[2])]:
                v = tk.StringVar(value=ex.get(key,""))
                self._entry_vars[(r,key)] = v
                e = cell_entry(inner,v,cw,rb)
                e.bind("<FocusOut>",lambda _: self._autosave())
                e.grid(row=r+1,column=col_off,padx=1,pady=1,sticky="nsew")
                col_off+=1

            # Sloupec 3: Startovní číslo (vstupní pole Entry, provázané se stavem)
            sn_var = tk.StringVar(value=str(ex.get("start_num", r+1)))
            self._entry_vars[(r,"start_num")] = sn_var
            
            def make_sn_updater(row_idx=r, var=sn_var):
                def _upd(*_):
                    if row_idx < len(self.shooters_data):
                        self.shooters_data[row_idx]["start_num"] = var.get().strip()
                return _upd
            sn_var.trace_add("write", make_sn_updater())
            
            e_sn = cell_entry(inner, sn_var, col_widths[col_off], rb)
            e_sn.configure(fg=GOLD, font=(FONT_CELL[0], FONT_CELL[1], "bold"))
            e_sn.bind("<FocusOut>", lambda _: self._autosave())
            e_sn.grid(row=r+1, column=col_off, padx=1, pady=1, sticky="nsew")
            col_off+=1

            # Sloupec 4: Kategorie (Výběrové pole Combobox)
            cat_var = tk.StringVar(value=ex.get("category",""))
            self._entry_vars[(r,"category")] = cat_var
            opt = ttk.Combobox(inner, textvariable=cat_var,
                               values=self._category_values(), state="normal",
                               width=col_widths[col_off]-2, font=FONT_CELL,
                               style="Dark.TCombobox")
            opt.bind("<<ComboboxSelected>>", lambda _: self._autosave())
            opt.bind("<FocusOut>", lambda _: self._autosave())
            opt.grid(row=r+1,column=col_off,padx=1,pady=1,sticky="nsew")
            col_off+=1

            sum_var = tk.StringVar(value="")
            self._entry_vars[(r,"sum")] = sum_var
            ni_ref = ni

            def make_upd(row_idx=r, sv=sum_var, ni_cap=ni_ref):
                def _u(*_):
                    t=0.0
                    for ii in range(1,ni_cap+1):
                        try: t+=float(self._entry_vars.get((row_idx,f"item{ii}_score"),tk.StringVar()).get() or 0)
                        except: pass
                    sv.set(str(int(t)) if t==int(t) else str(t))
                return _u
            upd = make_upd()

            # Sloupce pro položky (P.1, P.2...) a chyby
            for i in range(1,ni+1):
                for sfx,off2 in [("score",0),("fault",1)]:
                    key = f"item{i}_{sfx}"
                    v = tk.StringVar(value=ex.get(key,""))
                    self._entry_vars[(r,key)] = v
                    cn = col_off+(i-1)*2+off2
                    if sfx=="score": v.trace_add("write",upd)
                    e = cell_entry(inner,v,col_widths[cn],rb)
                    e.bind("<FocusOut>",lambda _: self._autosave())
                    if sfx=="score":
                        def make_validator(entry=e, var=v):
                            def _val(*_):
                                try:
                                    val = float(var.get() or 0)
                                    mx  = float(self.max_score.get())
                                    entry.configure(highlightbackground=
                                                    RED_ACCENT if val > mx else BORDER,
                                                    highlightcolor=
                                                    RED_ACCENT if val > mx else ACCENT)
                                except (ValueError, tk.TclError):
                                    pass
                            var.trace_add("write", _val)
                        make_validator()
                    e.grid(row=r+1,column=cn,padx=1,pady=1,sticky="nsew")
            upd()

            # Poslední sloupec: Součet
            sum_col = col_off+ni*2
            cell_label(inner,textvariable=sum_var,width=9,bg=rb,fg=GOLD,bold=True,border=BORDER
                       ).grid(row=r+1,column=sum_col,padx=1,pady=1,sticky="nsew")

    def _collect_entry_data(self):
        ns=self.num_shooters.get(); ni=self.num_items.get(); data=[]
        for r in range(ns):
            d={"surname":  self._entry_vars.get((r,"surname"),  tk.StringVar()).get().strip(),
               "name":     self._entry_vars.get((r,"name"),     tk.StringVar()).get().strip(),
               "category": self._entry_vars.get((r,"category"), tk.StringVar()).get().strip()}
            total=0.0
            for i in range(1,ni+1):
                sc=self._entry_vars.get((r,f"item{i}_score"),tk.StringVar()).get().strip()
                ft=self._entry_vars.get((r,f"item{i}_fault"),tk.StringVar()).get().strip()
                d[f"item{i}_score"]=sc; d[f"item{i}_fault"]=ft
                try: total+=float(sc or 0)
                except ValueError: pass
            d["total"]=total; data.append(d)
        return data

    def _add_shooter(self):
        self.shooters_data=self._collect_entry_data()
        self.num_shooters.set(self.num_shooters.get()+1); self._build_entry_grid()
    def _rem_shooter(self):
        if self.num_shooters.get()>1:
            self.shooters_data=self._collect_entry_data()[:-1]
            self.num_shooters.set(self.num_shooters.get()-1); self._build_entry_grid()
    def _add_item(self):
        self.shooters_data=self._collect_entry_data()
        self.num_items.set(self.num_items.get()+1); self._build_entry_grid()
    def _rem_item(self):
        if self.num_items.get()>1:
            self.shooters_data=self._collect_entry_data(); ni=self.num_items.get()
            for d in self.shooters_data: d.pop(f"item{ni}_score",None); d.pop(f"item{ni}_fault",None)
            self.num_items.set(ni-1); self._build_entry_grid()

    # ══════════════════════════════════════════════════════════════════════════
    # PREZENTACE  (samostatné okno pro druhý monitor – průběžné auto-řazení a scroll)
    # ══════════════════════════════════════════════════════════════════════════
    def _pres_alive(self):
        win = getattr(self, "_pres_win", None)
        try:
            return win is not None and win.winfo_exists()
        except Exception:
            return False

    def _show_presentation(self):
        # Sebrání aktuálních dat ze zápisu před otevřením
        if hasattr(self, "_entry_vars") and self._entry_vars:
            try: self.shooters_data = self._collect_entry_data()
            except Exception: pass

        # Pokud už okno běží, jen ho vytáhneme dopředu
        if self._pres_alive():
            try:
                self._pres_win.deiconify(); self._pres_win.lift(); self._pres_win.focus_force()
            except Exception: pass
            return

        win = tk.Toplevel(self)
        self._pres_win = win
        win.title(f"Prezentace – {self.competition_name.get()}")
        win.configure(bg=BG_DARK)
        win.geometry("960x720")
        win.minsize(600, 400)
        win.protocol("WM_DELETE_WINDOW", self._close_presentation)

        header = tk.Frame(win, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        header.pack(fill="x")
        tk.Label(header, text=f"🎯  {self.competition_name.get()}",
                 font=("Georgia", 26, "bold"), bg=BG_CARD, fg=ACCENT).pack(pady=(12, 2))
        tk.Label(header, text=f"{self._discipline_text()}  •  průběžné výsledky",
                 font=("Segoe UI", 14), bg=BG_CARD, fg=TEXT_MUTED).pack(pady=(0, 12))

        body = tk.Frame(win, bg=BG_DARK)
        body.pack(fill="both", expand=True)
        canvas = tk.Canvas(body, bg=BG_DARK, highlightthickness=0)
        canvas.pack(fill="both", expand=True)
        inner = tk.Frame(canvas, bg=BG_DARK)
        win_id = canvas.create_window((0, 0), window=inner, anchor="nw")
        inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(win_id, width=e.width))

        self._pres_canvas    = canvas
        self._pres_inner     = inner
        self._pres_scroll_pos   = 0.0
        self._pres_pause        = 16     # úvodní pauza nahoře
        self._pres_px           = 1.8    # pixelů na tik – klidné, ale čitelné tempo
        self._pres_interval     = 40     # ms mezi tiky
        self._pres_bottom_pause = 50     # pauza dole (~2 s) než skočí nahoru
        self._pres_top_pause    = 20     # pauza nahoře (~0,8 s) po skoku
        self._pres_last_sig     = None

        self._pres_update_loop()
        self._pres_scroll_loop()

    def _pres_current_data(self):
        ni = self.num_items.get()
        if hasattr(self, "_entry_vars") and self._entry_vars:
            try: data = self._collect_entry_data()
            except Exception: data = list(self.shooters_data)
        else:
            data = list(self.shooters_data)
        data = [d for d in data if (d.get("surname") or d.get("name"))]
        return self._sort_shooters(data, ni)

    def _pres_signature(self, data):
        ni = self.num_items.get()
        return tuple((
            d.get("surname", ""), d.get("name", ""), d.get("category", ""),
            round(float(d.get("total", 0) or 0), 4),
            tuple(d.get(f"item{i}_score", "") for i in range(1, ni + 1)),
        ) for d in data) + (ni, self.use_categories.get())

    def _pres_update_loop(self):
        if not self._pres_alive():
            return
        try:
            data = self._pres_current_data()
            sig = self._pres_signature(data)
            empty = (not self._pres_inner.winfo_children())
            if sig != self._pres_last_sig or empty:
                self._pres_last_sig = sig
                self._pres_build(data)
        except Exception:
            pass
        self._pres_update_job = self.after(1000, self._pres_update_loop)

    def _pres_scroll_loop(self):
        if not self._pres_alive():
            return
        try:
            canvas = self._pres_canvas
            bbox = canvas.bbox("all")
            view_h = canvas.winfo_height()
            content_h = (bbox[3] - bbox[1]) if bbox else 0
            # Plynulé posouvání dolů; na konci pauza a skok zpět nahoru (stále dokola)
            if content_h > view_h + 4 and view_h > 1:
                if self._pres_pause > 0:
                    self._pres_pause -= 1
                    # konec pauzy u spodního okraje → skok zpět na začátek
                    if self._pres_pause == 0 and self._pres_scroll_pos >= 1.0:
                        self._pres_scroll_pos = 0.0
                        canvas.yview_moveto(0.0)
                        self._pres_pause = self._pres_top_pause
                else:
                    self._pres_scroll_pos += self._pres_px / max(content_h - view_h, 1)
                    if self._pres_scroll_pos >= 1.0:
                        self._pres_scroll_pos = 1.0
                        canvas.yview_moveto(1.0)
                        self._pres_pause = self._pres_bottom_pause
                    else:
                        canvas.yview_moveto(self._pres_scroll_pos)
            else:
                canvas.yview_moveto(0.0)
                self._pres_scroll_pos = 0.0
        except Exception:
            pass
        self._pres_scroll_job = self.after(self._pres_interval, self._pres_scroll_loop)

    def _pres_build(self, data):
        inner = self._pres_inner
        for w in inner.winfo_children():
            w.destroy()
        ni = self.num_items.get()
        use_cat = self.use_categories.get()

        F_HDR = ("Segoe UI", 14, "bold")
        F_ROW = ("Segoe UI", 17, "bold")
        F_SUM = ("Segoe UI", 19, "bold")

        col_w = [4, 26]
        if use_cat: col_w.append(7)
        col_w += [8] * ni
        col_w.append(9)
        sum_col = len(col_w) - 1

        def cell(text, row, col, fg, bg, font, anchor="center"):
            tk.Label(inner, text=text, width=col_w[col], font=font, bg=bg, fg=fg,
                     anchor=anchor, padx=8, pady=8,
                     highlightthickness=1, highlightbackground=BORDER
                     ).grid(row=row, column=col, sticky="nsew", padx=1, pady=1)

        # Hlavička
        c = 0
        cell("#", 0, c, ACCENT, BG_CARD, F_HDR); c += 1
        cell("Jméno", 0, c, ACCENT, BG_CARD, F_HDR, anchor="w"); c += 1
        if use_cat:
            cell("Kat.", 0, c, ACCENT, BG_CARD, F_HDR); c += 1
        for i in range(1, ni + 1):
            cell(f"Pol.{i}", 0, c, ACCENT, BG_CARD, F_HDR); c += 1
        cell("Součet", 0, sum_col, ACCENT, BG_CARD, F_HDR)

        medals = {1: "🥇", 2: "🥈", 3: "🥉"}
        for ri, d in enumerate(data):
            rank = ri + 1
            rb = BG_CARD if ri % 2 == 0 else BG_INPUT
            if rank <= 3:   rfg = GOLD
            elif rank <= 6: rfg = GREEN_ACCENT
            else:           rfg = TEXT_MUTED
            c = 0
            cell(medals.get(rank, str(rank)), rank, c, rfg, rb, F_ROW); c += 1
            name = (d.get("surname", "") + " " + d.get("name", "")).strip()
            cell(name, rank, c, TEXT_PRIMARY, rb, F_ROW, anchor="w"); c += 1
            if use_cat:
                cell(cat_short(d.get("category", "")), rank, c, TEXT_MUTED, rb, F_ROW); c += 1
            for i in range(1, ni + 1):
                cell(self._cs(d.get(f"item{i}_score", "")), rank, c, TEXT_PRIMARY, rb, F_ROW); c += 1
            cell(self._cs(d.get("total", 0)), rank, sum_col, GOLD, rb, F_SUM)

        if not data:
            tk.Label(inner, text="Zatím nejsou zadáni žádní střelci.",
                     font=("Segoe UI", 16), bg=BG_DARK, fg=TEXT_MUTED
                     ).grid(row=1, column=0, columnspan=max(1, sum_col + 1), padx=20, pady=20)

        inner.grid_columnconfigure(1, weight=1)

    def _close_presentation(self):
        for attr in ("_pres_update_job", "_pres_scroll_job"):
            job = getattr(self, attr, None)
            if job:
                try: self.after_cancel(job)
                except Exception: pass
                setattr(self, attr, None)
        win = getattr(self, "_pres_win", None)
        if win is not None:
            try: win.destroy()
            except Exception: pass
        self._pres_win = None

    # ══════════════════════════════════════════════════════════════════════════
    # TOP STATISTIKA  (střelci s plnou položkou = maximum terčů)
    # ══════════════════════════════════════════════════════════════════════════
    def _show_top_stats(self):
        # Sebrání aktuálních dat (pokud jsme v zápisu)
        if hasattr(self, "_entry_vars") and self._entry_vars:
            try: self.shooters_data = self._collect_entry_data()
            except Exception: pass

        ni = self.num_items.get()
        try: mx = float(self.max_score.get())
        except Exception: mx = None
        src = self.sorted_results if self.sorted_results else self.shooters_data

        winners = []
        if mx is not None:
            for d in src:
                if not (d.get("surname") or d.get("name")):
                    continue
                hits = []
                for i in range(1, ni + 1):
                    raw = d.get(f"item{i}_score", "")
                    if raw is None or str(raw).strip() == "":
                        continue
                    try: sc = float(raw)
                    except (ValueError, TypeError): continue
                    if sc == mx:
                        hits.append(i)
                if hits:
                    winners.append((d, len(hits), hits))
        winners.sort(key=lambda w: (-w[1], -float(w[0].get("total", 0) or 0)))

        win = tk.Toplevel(self)
        win.title(f"Top Statistika – {self.competition_name.get()}")
        win.configure(bg=BG_DARK)
        win.geometry("740x620")
        win.minsize(520, 360)

        tk.Frame(win, bg=ACCENT, height=4).pack(fill="x")
        head = tk.Frame(win, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        head.pack(fill="x")
        tk.Label(head, text="📊  Top Statistika", font=("Georgia", 18, "bold"),
                 bg=BG_CARD, fg=ACCENT).pack(anchor="w", padx=16, pady=(10, 2))
        tk.Label(head, text=f"Střelci s plnou položkou (maximum {self.max_score.get()} terčů) – alespoň jednou",
                 font=FONT_BODY, bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="w", padx=16, pady=(0, 4))
        tk.Label(head, text=f"Celkem střelců s plnou položkou: {len(winners)}",
                 font=FONT_SM, bg=BG_CARD, fg=GREEN_ACCENT).pack(anchor="w", padx=16, pady=(0, 10))

        footer = tk.Frame(win, bg=BG_DARK); footer.pack(side="bottom", fill="x")
        make_btn(footer, "Zavřít", win.destroy, "secondary", 12).pack(pady=8)

        body = tk.Frame(win, bg=BG_DARK)
        body.pack(fill="both", expand=True, padx=10, pady=10)
        inner = scrollable_canvas(body)

        if not winners:
            tk.Label(inner, text="Zatím žádný střelec nedosáhl plné položky.",
                     font=FONT_BODY, bg=BG_DARK, fg=TEXT_MUTED).grid(row=0, column=0, padx=20, pady=20)
            return

        hdrs   = ["Příjmení", "Jméno", "Kat.", "Plných pol.", "Které položky", "Součet"]
        widths = [16,          14,      6,      11,            20,              9]
        for c, (h, w) in enumerate(zip(hdrs, widths)):
            cell_label(inner, text=h, width=w, bg=BG_CARD, fg=ACCENT, bold=True
                       ).grid(row=0, column=c, padx=1, pady=1, sticky="nsew")

        best = winners[0][1]
        for ri, (d, cnt, hits) in enumerate(winners):
            rb = BG_CARD if ri % 2 == 0 else BG_INPUT
            cnt_fg = GOLD if cnt == best else GREEN_ACCENT
            cells = [
                (d.get("surname", ""), TEXT_PRIMARY, False),
                (d.get("name", ""),    TEXT_MUTED,   False),
                (cat_short(d.get("category", "")), TEXT_MUTED, False),
                (f"{cnt}×",            cnt_fg,       True),
                (", ".join(f"Pol.{i}" for i in hits), TEXT_PRIMARY, False),
                (self._cs(d.get("total", 0)), GOLD,  True),
            ]
            for c, (txt, fg, bold) in enumerate(cells):
                cell_label(inner, text=txt, width=widths[c], bg=rb, fg=fg, bold=bold
                           ).grid(row=ri + 1, column=c, padx=1, pady=1, sticky="nsew")

    # ══════════════════════════════════════════════════════════════════════════
    # SORTING LOGIC
    # ══════════════════════════════════════════════════════════════════════════
    def _sort_key(self, d, ni):
        """Lower tuple = better rank (ascending sort).
        Priority: total desc → last item score desc → last item fault DESC
                  (higher fault = fault came later = better)"""
        total = float(d.get("total", 0) or 0)
        tb = []
        for i in range(ni, 0, -1):
            try:    sc = float(d.get(f"item{i}_score", 0) or 0)
            except: sc = 0
            tb.append(-sc)
            ft_raw = d.get(f"item{i}_fault", "")
            try:    ft = float(ft_raw) if ft_raw else -1.0
            except: ft = -1.0
            tb.append(-ft)
        return (-total, *tb)

    def _sort_shooters(self, data, ni):
        return sorted(data, key=lambda d: self._sort_key(d, ni))

    def _find_tied_indices(self, sorted_data, ni, up_to=6):
        if not sorted_data: return set()
        all_totals = Counter(round(float(d.get("total", 0) or 0), 6) for d in sorted_data)
        top_totals = {round(float(sorted_data[i].get("total", 0) or 0), 6)
                      for i in range(min(up_to, len(sorted_data)))}
        contested = {t for t, cnt in all_totals.items() if cnt > 1 and t in top_totals}
        tied = set()
        for i, d in enumerate(sorted_data):
            t = round(float(d.get("total", 0) or 0), 6)
            if t in contested:
                tied.add(i)
        return tied

    # ══════════════════════════════════════════════════════════════════════════
    # SORTED RESULTS
    # ══════════════════════════════════════════════════════════════════════════
    def _go_to_sorted(self):
        self.shooters_data = self._collect_entry_data()
        self.sorted_results = []
        self._autosave()
        self._show_sorted()

    def _show_sorted(self):
        ni = self.num_items.get()
        if not self.sorted_results:
            self.sorted_results = self._sort_shooters(self.shooters_data, ni)
        ties = self._find_tied_indices(self.sorted_results, ni, 6)

        f = tk.Frame(self.container, bg=BG_DARK)
        self._show_frame("sorted", f)
        self._sorted_ties = ties
        self._rozstrel_vars = {}

        topbar = tk.Frame(f, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER)
        topbar.pack(fill="x")
        tk.Label(topbar, text=f"🏆  {self.competition_name.get()}  –  Výsledky",
                 font=("Georgia",13,"bold"), bg=BG_CARD, fg=ACCENT).pack(side="left",padx=16,pady=8)
        bb = tk.Frame(topbar, bg=BG_CARD); bb.pack(side="right",padx=10,pady=6)

        make_btn(bb,"Vyhodnotit rozstřel", self._eval_rozstrel, "secondary", 17).pack(side="left",padx=2)
        if self.has_finale.get():
            make_btn(bb,"Finále →",            self._go_to_finale,    "primary",   10).pack(side="left",padx=2)
        make_btn(bb,"💾 Uložit",   self._save_data,        "success",  10).pack(side="left",padx=2)
        make_btn(bb,"🖨 Tisk PDF", self._print_sorted_pdf, "success",  12).pack(side="left",padx=2)
        make_btn(bb,"📊 Top Statistika", self._show_top_stats, "secondary", 15).pack(side="left",padx=2)
        make_btn(bb,"← Zpět",      self._show_entry,       "secondary", 8).pack(side="left",padx=2)

        wrap = tk.Frame(f, bg=BG_DARK); wrap.pack(fill="both",expand=True,padx=8,pady=8)
        inner = scrollable_canvas(wrap)

        headers    = ["Poř.","Příjmení","Jméno","Start.č","Kat."]
        col_widths = [6,      16,         13,     6,      8]
        for i in range(1,ni+1):
            headers    += [f"Pol.{i}", f"1.Ch.{i}"]
            col_widths += [9,           11]
        headers.append("Součet"); col_widths.append(9)
        headers.append("Rozstřel"); col_widths.append(9)

        for c,(h,cw) in enumerate(zip(headers,col_widths)):
            cell_label(inner,text=h,width=cw,bg=BG_CARD,fg=ACCENT,bold=True
                       ).grid(row=0,column=c,padx=1,pady=1,sticky="nsew")

        for r_idx,d in enumerate(self.sorted_results):
            rank=r_idx+1; in_top6=r_idx<6; is_tied=r_idx in ties
            if in_top6:   rb,bdr,rfg = H_TOP6,H_TOP6_BD,(GOLD if rank<=3 else GREEN_ACCENT)
            elif is_tied: rb,bdr,rfg = H_TIE,H_TIE_BD,ACCENT
            else:         rb,bdr,rfg = (BG_CARD if r_idx%2==0 else BG_INPUT),BORDER,TEXT_MUTED

            medals={1:"🥇",2:"🥈",3:"🥉"}
            def lbl(text,col,fg=TEXT_PRIMARY,bold=False,ri=r_idx,rbg=rb,b=bdr):
                cell_label(inner,text=text,width=col_widths[col],bg=rbg,fg=fg,bold=bold,border=b
                           ).grid(row=ri+1,column=col,padx=1,pady=1,sticky="nsew")

            col_off=0
            lbl(medals.get(rank,str(rank)),col_off,rfg,bold=True); col_off+=1
            lbl(d.get("surname",""),col_off); col_off+=1
            lbl(d.get("name",""),  col_off,TEXT_MUTED); col_off+=1
            lbl(cat_short(d.get("category","")),col_off,TEXT_MUTED); col_off+=1
            lbl(str(d.get("start_num", "")), col_off, GOLD); col_off+=1
            for i in range(1,ni+1):
                lbl(d.get(f"item{i}_score",""),col_off+(i-1)*2)
                lbl(d.get(f"item{i}_fault",""),col_off+(i-1)*2+1,TEXT_MUTED)
            col_off+=ni*2
            t=d.get("total",0)
            lbl(str(int(t)) if t==int(t) else str(t),col_off,GOLD,bold=True); col_off+=1

            roz_col=col_off
            if is_tied or not self.has_finale.get():
                v=tk.StringVar(value=d.get("rozstrel",""))
                self._rozstrel_vars[r_idx]=v
                e=cell_entry(inner,v,col_widths[roz_col],BG_INPUT)
                e.configure(justify="center",highlightbackground=ACCENT,highlightcolor=ACCENT)
                e.bind("<FocusOut>",lambda _: self._autosave())
                e.grid(row=r_idx+1,column=roz_col,padx=1,pady=1,sticky="nsew")
            else:
                lbl("",roz_col,TEXT_MUTED)

        leg=tk.Frame(f,bg=BG_DARK); leg.pack(fill="x",padx=16,pady=4)
        for sym,col,txt in [("■",GREEN_ACCENT," Top 6  "),("■",ACCENT," Shodné výsledky – nutný rozstřel")]:
            tk.Label(leg,text=sym,bg=BG_DARK,fg=col,font=FONT_SM).pack(side="left")
            tk.Label(leg,text=txt,bg=BG_DARK,fg=TEXT_MUTED,font=FONT_SM).pack(side="left")

    def _eval_rozstrel(self):
        ni = self.num_items.get()
        for r_idx in range(len(self.sorted_results)):
            sv = self._rozstrel_vars.get(r_idx)
            if sv is not None:
                self.sorted_results[r_idx]["rozstrel"] = sv.get().strip()

        result = list(self.sorted_results)
        total_to_indices = {}
        for i, d in enumerate(result):
            t = round(float(d.get("total", 0) or 0), 6)
            total_to_indices.setdefault(t, []).append(i)

        for total, idxs in total_to_indices.items():
            if len(idxs) < 2:
                continue
            group = [result[i] for i in idxs]
            if not any(d.get("rozstrel", "") for d in group):
                continue

            def roz_val(d):
                rv = d.get("rozstrel", "")
                try:    return -float(rv)
                except: return float("inf")

            group_sorted = sorted(group, key=roz_val)
            for new_pos, item in zip(idxs, group_sorted):
                result[new_pos] = item

        self.sorted_results = result
        self._autosave()
        self._show_sorted()

    def _go_to_finale(self):
        for r_idx in range(len(self.sorted_results)):
            sv = self._rozstrel_vars.get(r_idx)
            if sv is not None:
                self.sorted_results[r_idx]["rozstrel"] = sv.get().strip()
        self._autosave()
        self._show_finale()

    # ══════════════════════════════════════════════════════════════════════════
    # FINALE
    # ══════════════════════════════════════════════════════════════════════════
    def _show_finale(self):
        ni=self.num_items.get()

        if not self.finale_finalists or not any(d.get("finale_score","") for d in self.finale_finalists):
            ties=self._find_tied_indices(self.sorted_results,ni,6)
            seen=[]
            for i in range(min(6,len(self.sorted_results))):
                if self.sorted_results[i] not in seen: seen.append(self.sorted_results[i])
            for i in sorted(ties):
                if i>=6 and self.sorted_results[i] not in seen: seen.append(self.sorted_results[i])
            self.finale_finalists=seen[:6]

        self._finale_score_vars={}; self._finale_roz_vars={}

        f=tk.Frame(self.container,bg=BG_DARK)
        self._show_frame("finale",f); self._finale_page=f

        topbar=tk.Frame(f,bg=BG_CARD,highlightthickness=1,highlightbackground=BORDER)
        topbar.pack(fill="x")
        tk.Label(topbar,text=f"🏅  {self.competition_name.get()}  –  Finále",
                 font=("Georgia",13,"bold"),bg=BG_CARD,fg=ACCENT).pack(side="left",padx=16,pady=8)
        bb=tk.Frame(topbar,bg=BG_CARD); bb.pack(side="right",padx=10,pady=6)
        make_btn(bb,"Vyhodnotit rozstřel",self._eval_finale_rozstrel,"secondary",18).pack(side="left",padx=2)
        make_btn(bb,"Seřadit finále",     self._sort_finale,         "primary",13).pack(side="left",padx=2)
        make_btn(bb,"💾 Uložit",          self._save_data,           "success",10).pack(side="left",padx=2)
        make_btn(bb,"🖨 Tisk PDF",        self._print_finale_pdf,    "success",12).pack(side="left",padx=2)
        make_btn(bb,"← Zpět",             self._show_sorted,         "secondary",8).pack(side="left",padx=2)

        self._finale_tbl=tk.Frame(f,bg=BG_DARK)
        self._finale_tbl.pack(fill="both",expand=True,padx=8,pady=8)
        self._build_finale_table()

    def _build_finale_table(self, order=None):
        for w in self._finale_tbl.winfo_children(): w.destroy()
        ni=self.num_items.get()
        finalists=order if order is not None else self.finale_finalists
        inner=scrollable_canvas(self._finale_tbl)

        headers    = ["Poř.","Příjmení","Jméno","Kat."]
        col_widths = [6,      16,         13,     6]
        for i in range(1,ni+1):
            headers    += [f"Pol.{i}",f"1.Ch.{i}"]
            col_widths += [9,          11]
        headers    += ["Fin.pol.","Celkem","Rozstřel"]
        col_widths += [10,         10,      9]

        for c,(h,cw) in enumerate(zip(headers,col_widths)):
            cell_label(inner,text=h,width=cw,bg=BG_CARD,fg=ACCENT,bold=True
                       ).grid(row=0,column=c,padx=1,pady=1,sticky="nsew")

        fin_ties=self._find_finale_ties(finalists) if order is not None else set()

        for r_idx,d in enumerate(finalists):
            rank=r_idx+1; in_top=r_idx<6; is_tie=r_idx in fin_ties
            if is_tie:    rb,bdr,rfg = H_TIE,H_TIE_BD,ACCENT
            elif in_top:  rb,bdr,rfg = H_TOP6,H_TOP6_BD,(GOLD if rank<=3 else GREEN_ACCENT)
            else:         rb,bdr,rfg = (BG_CARD if r_idx%2==0 else BG_INPUT),BORDER,TEXT_MUTED
            medals={1:"🥇",2:"🥈",3:"🥉"}

            def lbl(text,col,fg=TEXT_PRIMARY,bold=False,ri=r_idx,rbg=rb,b=bdr):
                cell_label(inner,text=text,width=col_widths[col],bg=rbg,fg=fg,bold=bold,border=b
                           ).grid(row=ri+1,column=col,padx=1,pady=1,sticky="nsew")

            co=0
            lbl(medals.get(rank,str(rank)),co,rfg,bold=True); co+=1
            lbl(d.get("surname",""),co); co+=1
            lbl(d.get("name",""),  co,TEXT_MUTED); co+=1
            lbl(cat_short(d.get("category","")),co,TEXT_MUTED); co+=1
            for i in range(1,ni+1):
                lbl(d.get(f"item{i}_score",""),co+(i-1)*2)
                lbl(d.get(f"item{i}_fault",""),co+(i-1)*2+1,TEXT_MUTED)
            co+=ni*2
            col_fin=co; col_total=co+1; col_roz=co+2

            if r_idx not in self._finale_score_vars:
                self._finale_score_vars[r_idx]=tk.StringVar(value=d.get("finale_score",""))
            fsv=self._finale_score_vars[r_idx]
            e=cell_entry(inner,fsv,col_widths[col_fin],BG_INPUT)
            e.configure(justify="center",highlightbackground=ACCENT,highlightcolor=ACCENT)
            e.bind("<FocusOut>",lambda _: self._autosave())
            e.grid(row=r_idx+1,column=col_fin,padx=1,pady=1,sticky="nsew")

            tv=tk.StringVar(); base=float(d.get("total",0) or 0)
            def make_upd(bv=base,sv=fsv,tvv=tv):
                def _u(*_):
                    try: t=bv+float(sv.get() or 0)
                    except: t=bv
                    tvv.set(str(int(t)) if t==int(t) else str(round(t,4)))
                sv.trace_add("write",_u); _u()
            make_upd()
            cell_label(inner,textvariable=tv,width=col_widths[col_total],
                       bg=rb,fg=GOLD,bold=True,border=bdr
                       ).grid(row=r_idx+1,column=col_total,padx=1,pady=1,sticky="nsew")

            if r_idx not in self._finale_roz_vars:
                self._finale_roz_vars[r_idx]=tk.StringVar(value=d.get("finale_rozstrel",""))
            rv=self._finale_roz_vars[r_idx]
            e2=cell_entry(inner,rv,col_widths[col_roz],BG_INPUT)
            e2.configure(justify="center",highlightbackground=ACCENT,highlightcolor=ACCENT)
            e2.bind("<FocusOut>",lambda _: self._autosave())
            e2.grid(row=r_idx+1,column=col_roz,padx=1,pady=1,sticky="nsew")

    def _find_finale_ties(self,finalists):
        ni=self.num_items.get()
        if not finalists: return set()
        def fkey(d):
            base=float(d.get("total",0) or 0)
            try: fin=float(d.get("finale_score","") or 0)
            except: fin=0
            tb=[]
            for i in range(ni,0,-1):
                try: sc=float(d.get(f"item{i}_score",0) or 0)
                except: sc=0
                tb.append(-sc)
                ft_raw=d.get(f"item{i}_fault","")
                try: ft=float(ft_raw) if ft_raw else -1.0
                except: ft=-1.0
                tb.append(-ft)
            return (-(base+fin),*tb,-fin)
        keys=[fkey(d) for d in finalists]; cnts=Counter(keys)
        boundary=fkey(finalists[min(5,len(finalists)-1)])
        return {i for i,(d,k) in enumerate(zip(finalists,keys)) if k==boundary or cnts[k]>1}

    def _sort_finale(self):
        ni=self.num_items.get()
        for r_idx,d in enumerate(self.finale_finalists):
            d["finale_score"]    =self._finale_score_vars.get(r_idx,tk.StringVar()).get()
            d["finale_rozstrel"] =self._finale_roz_vars.get(r_idx,tk.StringVar()).get()
        def fkey(d):
            base=float(d.get("total",0) or 0)
            try: fin=float(d.get("finale_score","") or 0)
            except: fin=0
            tb=[]
            for i in range(ni,0,-1):
                try: sc=float(d.get(f"item{i}_score",0) or 0)
                except: sc=0
                tb.append(-sc)
                ft=d.get(f"item{i}_fault","")
                try: ft=float(ft) if ft else -1.0
                except: ft=-1.0
                tb.append(-ft)
            return (-(base+fin),*tb,-fin)
        self._finale_score_vars={}; self._finale_roz_vars={}
        self.finale_finalists=sorted(self.finale_finalists,key=fkey)
        self._autosave()
        self._build_finale_table(order=self.finale_finalists)

    def _eval_finale_rozstrel(self):
        ni = self.num_items.get()
        for r_idx, d in enumerate(self.finale_finalists):
            d["finale_score"]    = self._finale_score_vars.get(r_idx, tk.StringVar()).get().strip()
            d["finale_rozstrel"] = self._finale_roz_vars.get(r_idx, tk.StringVar()).get().strip()

        result = list(self.finale_finalists)
        total_to_indices = {}
        for i, d in enumerate(result):
            base = float(d.get("total", 0) or 0)
            try:   fin = float(d.get("finale_score", "") or 0)
            except: fin = 0
            combined = round(base + fin, 6)
            total_to_indices.setdefault(combined, []).append(i)

        for combined_total, idxs in total_to_indices.items():
            if len(idxs) < 2: continue
            group = [result[i] for i in idxs]
            if not any(d.get("finale_rozstrel", "") for d in group): continue

            def roz_val(d):
                rv = d.get("finale_rozstrel", "")
                try:    return -float(rv)
                except: return float("inf")

            group_sorted = sorted(group, key=roz_val)
            for new_pos, item in zip(idxs, group_sorted):
                result[new_pos] = item

        self._finale_score_vars = {}; self._finale_roz_vars = {}
        self.finale_finalists = result
        self._autosave()
        self._build_finale_table(order=self.finale_finalists)

    # ══════════════════════════════════════════════════════════════════════════
    # PDF helpers
    # ══════════════════════════════════════════════════════════════════════════
    def _cs(self,v):
        try: f=float(v); return str(int(f)) if f==int(f) else str(round(f,4))
        except: return str(v) if v else ""

    def _pdf_style(self):
        return [
            ("BACKGROUND",(0,0),(-1,0),colors.black),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("FONTNAME",(0,0),(-1,0),PDF_FONT_BOLD),("FONTSIZE",(0,0),(-1,0),9),
            ("FONTNAME",(0,1),(-1,-1),PDF_FONT),     ("FONTSIZE",(0,1),(-1,-1),8),
            ("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("GRID",(0,0),(-1,-1),0.5,colors.black),
            ("LINEBELOW",(0,0),(-1,0),1.0,colors.black),
            ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F2F2F2")]),
        ]

    def _pdf_header(self,extra=""):
        ts=ParagraphStyle("t",fontSize=14,alignment=TA_CENTER,fontName=PDF_FONT_BOLD,spaceAfter=2)
        ss=ParagraphStyle("s",fontSize=9, alignment=TA_CENTER,fontName=PDF_FONT,spaceAfter=10)
        t="Shooting Results App"+(f"  –  {extra}" if extra else "")
        disc_line = f"{self._discipline_text()}  •  Max. {self.max_score.get()} terčů/položku  •  {datetime.now().strftime('%d.%m.%Y')}"
        return [Paragraph(t,ts),Paragraph(self.competition_name.get(),ts),
                Paragraph(disc_line,ss)]

    def _make_results_table(self, data, ni, show_finale_cols=False):
        hdrs = ["Poř.", "Příjmení", "Jméno", "Kat."]
        for i in range(1, ni+1):
            hdrs.append(f"Pol. {i}")
        hdrs.append("Součet")
        if show_finale_cols:
            hdrs += ["Fin.pol.", "Celkem"]

        rows = [hdrs]
        for ri, d in enumerate(data):
            r = [str(ri+1), d.get("surname",""), d.get("name",""),
                 cat_short(d.get("category",""))]
            for i in range(1, ni+1):
                r.append(self._cs(d.get(f"item{i}_score","")))
            r.append(self._cs(d.get("total", 0)))
            if show_finale_cols:
                fs = d.get("finale_score","")
                r.append(self._cs(fs))
                base = float(d.get("total", 0) or 0)
                try:   full = base + float(fs or 0)
                except: full = base
                r.append(self._cs(full))
            rows.append(r)

        usable   = 17.0 * cm
        w_rank   = 1.0  * cm
        w_name   = 3.8  * cm
        w_first  = 3.2  * cm
        w_cat    = 1.0  * cm
        w_total  = 1.8  * cm
        w_fin    = 1.8  * cm
        w_celkem = 1.8  * cm
        fixed = w_rank + w_name + w_first + w_cat + w_total
        if show_finale_cols:
            fixed += w_fin + w_celkem
        item_w = max(min((usable - fixed) / max(ni, 1), 2.2*cm), 1.4*cm)

        cw = [w_rank, w_name, w_first, w_cat] + [item_w]*ni + [w_total]
        if show_finale_cols:
            cw += [w_fin, w_celkem]

        sty = self._pdf_style()
        for i in range(1, min(7, len(rows))):
            sty.append(("FONTNAME", (0,i), (-1,i), PDF_FONT_BOLD))
        if len(rows) > 7:
            sty.append(("LINEBELOW", (0,6), (-1,6), 1.5, colors.black))
        if show_finale_cols:
            fc = 4 + ni
            sty.append(("BACKGROUND", (fc,0), (-1,0), colors.HexColor("#404040")))
        num_start = 4
        sty.append(("ALIGN", (num_start,0), (-1,-1), "CENTER"))

        tbl = Table(rows, colWidths=cw, repeatRows=1)
        tbl.setStyle(TableStyle(sty))
        return tbl

    def _print_sorted_pdf(self):
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Chyba","pip install reportlab"); return
        path=self._save_path("pdf","vysledky")
        try:
            ni=self.num_items.get(); use_cat=self.use_categories.get()
            doc=SimpleDocTemplate(path,pagesize=A4,
                                  leftMargin=1.5*cm,rightMargin=1.5*cm,
                                  topMargin=2*cm,bottomMargin=2*cm)
            story=self._pdf_header("Výsledky")
            hs=ParagraphStyle("h",fontSize=10,fontName=PDF_FONT_BOLD,spaceBefore=10,spaceAfter=4)

            if use_cat:
                cats=sorted({d.get("category","") for d in self.sorted_results})
                for cat in cats:
                    group=[d for d in self.sorted_results if d.get("category","")==cat]
                    if not group: continue
                    story.append(Paragraph(cat if cat else "Bez kategorie",hs))
                    story.append(self._make_results_table(group,ni,show_finale_cols=True))
                    story.append(Spacer(1,0.3*cm))
            else:
                story.append(self._make_results_table(self.sorted_results,ni,show_finale_cols=True))
            doc.build(story)
            self._toast("PDF uloženo ✔")
        except Exception as e:
            messagebox.showerror("Chyba PDF",str(e))

    def _print_finale_pdf(self):
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Chyba","pip install reportlab"); return
            
        # 1. Nejprve uložíme aktuální hodnoty z políček na obrazovce
        for r_idx, d in enumerate(self.finale_finalists):
            d["finale_score"]   = self._finale_score_vars.get(r_idx, tk.StringVar()).get()
            d["finale_rozstrel"] = self._finale_roz_vars.get(r_idx, tk.StringVar()).get()
            
        path = self._save_path("pdf", "finale")
        try:
            ni = self.num_items.get(); use_cat = self.use_categories.get()
            doc = SimpleDocTemplate(path, pagesize=A4,
                                  leftMargin=1.5*cm, rightMargin=1.5*cm,
                                  topMargin=2*cm, bottomMargin=2*cm)
            story = self._pdf_header("Finále – Celkové výsledky")
            hs = ParagraphStyle("h", fontSize=10, fontName=PDF_FONT_BOLD, spaceBefore=10, spaceAfter=4)

            # 2. Sestavíme výsledný seznam tak, aby respektoval pořadí z finále
            # Vytvoříme si množinu klíčů finalistů pro rychlou identifikaci
            finalists_keys = {d.get("surname", "") + d.get("name", "") for d in self.finale_finalists}
            
            # Vezmeme kompletní seřazené finalisty (včetně bodů z finále)
            combined = [dict(d) for d in self.finale_finalists]
            
            # Přidáme zbytek střelců, kteří ve finále nebyli, z původního pořadí kvalifikace
            for d in self.sorted_results:
                key = d.get("surname", "") + d.get("name", "")
                if key not in finalists_keys:
                    dd = dict(d)
                    dd["finale_score"] = ""  # Nebyl ve finále
                    combined.append(dd)

            # 3. Vygenerování tabulek (podle kategorií nebo celkově)
            if use_cat:
                cats = sorted({d.get("category", "") for d in combined})
                for cat in cats:
                    group = [d for d in combined if d.get("category", "") == cat]
                    if not group: continue
                    story.append(Paragraph(cat if cat else "Bez kategorie", hs))
                    story.append(self._make_results_table(group, ni, show_finale_cols=True))
                    story.append(Spacer(1, 0.3*cm))
            else:
                story.append(self._make_results_table(combined, ni, show_finale_cols=True))

            ns = ParagraphStyle("n", fontSize=7, fontName=PDF_FONT,
                              textColor=colors.grey, spaceBefore=6, alignment=TA_LEFT)
            story.append(Paragraph(
                "* Fin.pol. = finálová položka;  Celkem = součet kvalifikace + finálová položka", ns))
            doc.build(story)
            self._toast("PDF uloženo ✔")
        except Exception as e:
            messagebox.showerror("Chyba PDF", str(e))


# ══════════════════════════════════════════════════════════════════════════════
if __name__=="__main__":
    app=ShootingApp()
    app.mainloop()