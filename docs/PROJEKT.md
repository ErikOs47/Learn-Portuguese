# PiCoPa – Projektdokumentation

Stand: 16.11.2026 · Branch `claude/busy-rubin-a6smde`

## 1. Was die App ist
- Lern-App für **europäisches Portugiesisch**, Oberfläche Deutsch, Ziel „Schritt für Schritt bis C1“.
- Wird auf dem iPhone über Safari → „Zum Home-Bildschirm“ als PWA benutzt. Kein Server, kein Konto, alle Daten im Gerät (`localStorage`).
- Umfang: 141 Lektionen. A1 54 (13 Themen à 4 + 2 Hörlektionen), A2 50 (12 à 4 + 2), B1 37 (9 à 4 + 1), dazu Karteikarten (SRS), Fehler-Training, Verb-Trainer, Zahlen-Trainer, Dialoge, Geschichten, Shadowing, Chat (offline-Bot „Tiago“ oder KI), Nachschlagen (Wörterbuch, 126 Verben, Aussprache, PT↔BR, 291 Floskeln), Statistik.

## 2. Architektur

### Laden
1. `index.html` lädt `inhalte.js` (setzt globale `XL, XB, XD, XS, XG`), danach das Hauptskript.
2. Das Hauptskript definiert `LS` (33 Grundlagen-Lektionen), vergibt IDs aus `LID`, fügt dann `XB` (neue B1-Themen, vor `b1-pod5`) und `XL` (Vertiefungen, direkt hinter ihre Basis) in `LS` ein. Fehlt `inhalte.js`, läuft die App mit 33 Lektionen weiter.
3. Danach `migrate()` → alte Spielstände (nummerierte Schlüssel) werden auf IDs umgestellt.
4. **Laufzeit-Erweiterung jeder Lektion** (am Ende des Kernskripts, `LS.forEach(… if(l.pod)return; …)`): Aus Hör-Aufgaben `l` werden zusätzlich Diktat `d` bzw. Satzbau `o` erzeugt, aus bis zu 4 Vokabeln ohne „/“ eine Zuordnung `x`. Diese Aufgaben stehen also **nicht** in den Daten.
5. Dialoge/Geschichten/Glossar aus `inhalte.js` werden nach der Definition von `DL`, `ST`, `CG` angehängt.
6. `home()` rendert den Start.

### Aufbau von `index.html` (Reihenfolge)
- `<style>` Ladebildschirm, dann **ein** konsolidiertes Stylesheet („Design v8“) mit Farb-Tokens für hell/dunkel.
- `<script>`: Lektionen `LS` → IDs/Einbindung/`migrate` → Kernlogik (`home`, `step`, `fin`, SRS, Statistik) → Premium-Stimmen (`ttsCfg`, `playTTS` …) → Sprachausgabe `say`/`pod` → „v3“-Block (Chat, Trainer, Nachschlagen, Einstellungen, Daten: Verben, Dialoge, Geschichten, Themenpakete) → „v4“-Block (Zahlen, Kapiteltest, Floskeln, Wochenrückblick, Karteikarten, Fortschritts-Ansichten) → `home()`.
- Die Kommentare „v3/v4/v7“ sind historische Schichten, keine Module. Funktionen werden teils später überschrieben bzw. umhüllt (z. B. `numMenu`, `packs`, `dialogs`, `stories` am Ende).

### Navigation & Zustand
- Einzelne Seite, Ansichten werden per `A.innerHTML = …` neu gezeichnet (`A` = `<main id="app">`). Nur `main` scrollt (iOS-Menüleisten-Problem).
- Menüleiste über `tb(i)`: 0 Start, 1 Üben, 2 Chat, 3 Nachschlagen; `tb(-1)` blendet sie in Aufgaben aus.
- Laufende Lektion: `li` (Index in `LS`, −1 = freie Übung `VL`), `ei` (Aufgabenindex), `Q` (Aufgaben-Warteschlange; falsche Aufgaben werden hinten wieder angehängt), `sc`/`tot` (Punkte).
- Sonderläufe über Flags: `PLC` (Einstufungstest), `KT` (Kapiteltest), `ZN` (Zahlen), `SH` (Shadowing), `D` (Dialog).

### Speicher (`localStorage`)
| Schlüssel | Inhalt |
|---|---|
| `pt-pt-v1` | Alles in `P` (Fortschritt, SRS, Statistik, Einstellungen) |
| `pt-pt-ai` | KI-Chat: Anbieter, Schlüssel, Modell |
| `pt-pt-tts` | Premium-Stimmen: Anbieter, Schlüssel, Region, Stimmen, Stimmliste |

Cache Storage: Service-Worker-Cache `pt-vNN` (App-Dateien) und `pt-tts` (geladene Audios der Premium-Stimmen).

Wichtige Felder in `P`:
- `P[lessonId]` Bestwert 0–100 (bestanden ab `PASS` = 70), `P.idv` = Migration erledigt
- `P.srs[portugiesisch] = {d, s?, ease, iv, due, n}` Karteikarten (SM-2-ähnlich, `calc()`)
- `P.err[aufgabenschlüssel]` Fehlerzähler fürs Fehler-Training, `P.alt[aufgabenschlüssel]` vom Nutzer als richtig markierte Antworten
- `P.days`, `P.hist`, `P.ha`, `P.today`, `P.wc`, `P.lp` Statistik; `P.st[typ]` Trefferquote je Aufgabentyp
- `P.kt[level]` Kapiteltest, `P.dl` Dialoge erledigt, `P.co` eingeklappte Kapitel
- `P.goal`, `P.quiet` (Leise-Modus), `P.rate`, `P.theme`, `P.v0`/`P.v1` (Gerätestimmen), `P.rm`, `P.chT`
- `P.inst`, `P.lb` (letzte Sicherung), `P.lbs` (Erinnerung verschoben bis)

### Freischaltung (Lernpfad)
- `ovOpen(i)`: Grundlagen-Lektion eines Themas öffnet sich, wenn die **Grundlagen-Lektion des vorigen Themas** bestanden ist. Vertiefungen öffnen sich nacheinander innerhalb ihres Themas. **Vertiefungen sind optional** (bewusste Entscheidung, damit bestehende Spielstände nicht gesperrt werden).
- „Weiter“ (`cu`) zeigt auf die erste nicht bestandene Lektion in Reihenfolge, auch wenn das eine Vertiefung weit vorne ist.
- Kapiteltest: frei, wenn alle Grundlagen-Lektionen des Levels bestanden sind; 2 Fragen pro Thema.

### Sprachausgabe
- `say(text, langsam)` / `pod()` (Podcast mit 2 Sprechern) / `sayV()` (Probehören Gerätestimme).
- Sind Premium-Stimmen aktiv (`ttsOn()`), läuft alles über `playTTS()`: Audio vom Anbieter holen (`ttsFetch`), in Cache `pt-tts` speichern, über **ein** wiederverwendetes `Audio`-Element abspielen (iOS-Freigabe bei erster Berührung). Bei Fehlern Rückfall auf die Gerätestimme.
- **iOS-Einschränkung (belegt):** Web-Apps sehen nur vorinstallierte Stimmen (meist Joana pt-PT, Luciana pt-BR). Nachgeladene „Verbessert/Premium“-Stimmen und Siri sind über die Web Speech API nicht erreichbar. Quelle: Apple-Entwickler in https://developer.apple.com/forums/thread/723503. Deshalb die Premium-Stimmen.
- Spracherkennung (Shadowing „Aussprache prüfen“) über `webkitSpeechRecognition`, nur wenn vorhanden.

## 3. Datenmodell der Lektionen

Lektion: `{id, tp, sub?, pod?, lv:"A1|A2|B1", t, ov (HTML), ex:[Aufgaben]}`. `tp` = Themen-ID (= ID der Grundlagen-Lektion), `sub:1` = Vertiefung.

| `k` | Typ | Felder |
|---|---|---|
| `c` | Vokabelkarte | `p` PT, `d` DE, `s` optional: Text für Sprachausgabe |
| `m` | Lückentext | `q` mit `___`, `o` Optionen, `a` Index, `n` Erklärung |
| `l` | Hören (Bedeutung wählen) | `p` PT (wird gesprochen), `o`, `a` |
| `r` | Lesen | `x` Text, `q` Frage, `o`, `a` |
| `w` | Schreiben DE→PT | `q` DE, `a` **normalisierte** Lösungen (`norm()`), `n` Musterlösung, `ac` Originale mit Akzenten (nur inhalte.js) |
| `d` | Diktat | `p`, `de` (automatisch erzeugt) |
| `o` | Satzbau | `q` DE, `p` PT (automatisch erzeugt) |
| `x` | Zuordnen | `pairs` (automatisch erzeugt) |
| `p`/`q`/`t` | Podcast / Podcast-Frage / Transkript | nur in Hörlektionen |

**Bewertung:** `norm()` entfernt Akzente, Satzzeichen, Groß/Klein → Akzentfehler zählen als richtig (mit Hinweis „Achte auf die Akzente“). `typo()` toleriert genau einen Tippfehler in **einem** Wort ab 5 Buchstaben, gleicher Anfangsbuchstabe, **gleiche letzte zwei Buchstaben** (Endungen müssen stimmen).

**Aufgabenschlüssel `ek(e)`** = Fragetext (`p` oder `q`). Daran hängen `P.err` und `P.alt`. → Wird ein Fragetext geändert, gehen Fehlerzähler und eigene Antworten zu dieser Aufgabe verloren (harmlos, aber bekannt).

## 4. Konventionen
- Kein Build, keine Abhängigkeiten, keine CDN-Skripte. Vanilla-JS im vorhandenen Stil (`var`, `function`, kurze Namen), CSS über Tokens.
- Deutsche UI-Texte, deutsche Commit-Messages; PT-PT-Inhalte; brasilianische Varianten nur zum Vergleich.
- Inhalte in `inhalte.js`: richtige Option zuerst; bei `w` alle gültigen Varianten; Hinweise (`n`) erklären die Regel, nicht nur die Lösung.
- IDs: `a1-thema`, Vertiefungen `a1-thema-2`, `-3` … Niemals umbenennen.
- Nach Änderungen: `tools/check-data.js` und `tools/play-all.js` grün, `sw.js`-Cache hochzählen, `APPV` aktualisieren.
- Änderungen am Markup per eindeutigem Kontext ersetzen (siehe CLAUDE.md, Regel 5).
- Icons: `I("name")`, neue Icons ins Objekt `IC` (24×24-Linien-SVG).

## 5. Bekannte Schwachstellen
1. **Monolith:** `index.html` ≈ 320 KB, ~190 globale Funktionen, kurze globale Namen. Namenskollisionen sind real passiert (lokale Variable `near` verdeckte gleichnamige Funktion; Ersetzen von `P[i]` traf `VBP[i]`).
2. **Inhalte nicht muttersprachlich geprüft.** Alle Vertiefungen (103), die 6 neuen B1-Themen, 6 Dialoge und 5 Geschichten wurden von KI geschrieben und automatisch geprüft, aber nicht von einem Muttersprachler. Die 291 Floskeln wurden nie inhaltlich gegengelesen.
3. **Premium-Stimmen teilweise ungetestet:** Google nur gegen einen simulierten Dienst getestet (CORS live bestätigt); **Azure gar nicht** (Netz der Cloud-Umgebung blockiert es); Abspielen auf echtem iPhone ungetestet. Cache `pt-tts` wächst unbegrenzt (nur manuell löschbar).
4. **Spracherkennung** auf iPhone als Home-Bildschirm-App unsicher; nicht auf echtem Gerät getestet.
5. **API-Schlüssel** (KI-Chat, Stimmen) im Klartext in `localStorage`, Aufrufe direkt aus dem Browser. Für eine Privat-App akzeptiert; Nutzer soll Schlüssel beim Anbieter einschränken.
6. **iOS kann Web-App-Daten löschen** → einzige Sicherung sind Datei/Zwischenablage (Erinnerung nach 14 Tagen eingebaut).
7. **„Weiter“ zeigt bei alten Spielständen weit nach vorne** (erste offene Vertiefung in A1), weil Vertiefungen nachträglich kamen.
8. **Akzente werden nie als Fehler gewertet** (nur Hinweis) – z. B. `esta`/`está`, `tem`/`têm` im Schreiben gleichwertig. Bewusst, aber didaktisch diskutabel.
9. Kein automatischer Test im Repo außer `tools/`; keine CI.

## 6. Offene To-dos
- [ ] Auf echtem iPhone testen: Premium-Stimmen (Google mit echtem Schlüssel, Azure), Audio-Freigabe, Spracherkennung, Ladezeit mit `inhalte.js`.
- [ ] Muttersprachliche Durchsicht: `inhalte.js` und Floskeln.
- [ ] Optional 5. Lektion pro Thema (Wunsch des Nutzers: 3–5; umgesetzt sind 4).
- [ ] B1 abrunden: indirekte Rede, persönlicher Infinitiv, Gerúndio; danach B2/C1 (stehen als „in Planung“ in `OUT`).
- [ ] Größengrenze/Aufräumen für Cache `pt-tts`.
- [ ] Optional: „Weiter“-Logik für Bestandsnutzer überdenken (z. B. auf das aktuelle Thema zeigen).
- [ ] Optional: Hauptskript in mehrere Dateien aufteilen (ohne Build: mehrere `<script>`-Tags, Reihenfolge beachten, alle in `sw.js` vorab cachen).

## 7. Historie (kurz)
- bis PR #8: 33 Lektionen, Chat, Trainer, Statistik.
- `d090336` Neues Design (ein Stylesheet, SVG-Icons), inhaltliche und technische Fehler behoben.
- `4056fe9` 98 Lektionen, Fortschritt per ID, strengere Tippfehler-Regel, Satzbau ohne Hinweise, Ausspracheprüfung, Sicherungs-Erinnerung.
- `8e8cd2f` Premium-Stimmen; Service Worker fängt nur noch eigene Dateien ab.
- PR #10 und #11 gemergt. Danach `ae41be3`: 4. Lektion für jedes Thema, neue B1-Themen Conjuntivo der Vergangenheit, Condicional, Passiv (141 Lektionen).
