# CLAUDE.md – PiCoPa (Portugiesisch lernen)

Lern-App für **europäisches Portugiesisch (PT-PT)** mit deutscher Oberfläche, als Web-App (PWA) für das iPhone gebaut. Kein Build, keine Abhängigkeiten, läuft offline.

Ausführliche Doku: **[docs/PROJEKT.md](docs/PROJEKT.md)** (Architektur, Datenmodell, Schwachstellen, offene To-dos). Vor größeren Änderungen lesen.

## Dateien
| Datei | Inhalt |
|---|---|
| `index.html` | Die ganze App: CSS, Logik, die 33 Grundlagen-Lektionen (`LS`) und alle übrigen Daten (Verben, Floskeln, Themenpakete …) |
| `inhalte.js` | Zusatzinhalte: 62 Vertiefungslektionen, 3 neue B1-Themen, Dialoge, Geschichten. Wird **vor** dem Hauptskript geladen |
| `sw.js` | Service Worker (Netz zuerst, Cache als Rückfall) |
| `tools/` | Prüfskripte (Playwright) |

## Harte Regeln
1. **Lektions-IDs nie ändern, nie wiederverwenden, nie neu sortieren.** Der Fortschritt hängt an `P[lesson.id]`. Die 33 Grundlagen-Lektionen bekommen ihre ID über die Position im Array `LID` → Einträge in `LS` und `LID` nur **hinten anhängen**.
2. **Nur europäisches Portugiesisch.** Brasilianische Formen nur im Vergleich (PT ↔ BR). In Portugal: `estar a + Infinitiv` (nicht -ndo), Pronomen nach dem Verb (`levanto-me`), `comboio`, `autocarro`, `pequeno-almoço`, `falámos` (Perfeito mit Akzent).
3. **Bei jeder Auslieferung** `const C` in `sw.js` hochzählen (sonst sehen Nutzer die alte Version) und `APPV` in `index.html` aktualisieren.
4. **Keine Build-Tools, keine Frameworks, keine externen Skripte.** Stil wie vorhanden: `var`, `function`, keine Pfeilfunktionen.
5. **Kein breites Suchen-und-Ersetzen auf kurzen Tokens.** Globale Namen sind kurz (`P`, `A`, `Q`, `LS`, `li`, `ei`). Ein Ersetzen von `P[i]` hat schon einmal `VBP[i]` zerstört. Immer mit eindeutigem Kontext ersetzen.
6. **Texte, die in `.innerHTML` landen und von Nutzern oder APIs stammen**, durch `esc()` schicken.
7. **Schlüssel (KI-Chat, Premium-Stimmen) nie in `P`** – sie liegen bewusst getrennt in `localStorage` (`pt-pt-ai`, `pt-pt-tts`) und gehören nicht in Sicherungen.

## Prüfen nach jeder Änderung
```bash
python3 -m http.server 8765 &        # im Repo-Ordner
node tools/check-data.js             # Lektionsdaten: Antwortindizes, Musterlösungen, Dubletten
node tools/play-all.js               # alle Lektionen durchspielen + alle Ansichten öffnen
```
Beide müssen ohne Meldungen enden („Alle 98 Lektionen mit 100 % durchgespielt“, „Keine Laufzeitfehler“). Playwright ist in der Cloud-Umgebung vorinstalliert. Syntax schnell prüfen: Hauptskript aus `index.html` extrahieren und `node --check` darauf.

## Neue Lektion anlegen
In `inhalte.js` mit `L("basis-id","neue-id","Titel",[…Aufgaben…],"optionaler Hinweis")`. Richtige Antwort steht in der Kurzschreibweise **immer an erster Stelle** (wird beim Anzeigen gemischt). Schreibaufgaben `w(…)`: **alle** gültigen Varianten mit `|` angeben, die erste ist die angezeigte Musterlösung. Details und Aufgabentypen: docs/PROJEKT.md → „Datenmodell“.

## Sprache & Stil
- Oberfläche, Kommentare, Commit-Messages: **Deutsch**.
- UI-Icons über `I("name")` (SVG-Set `IC`), Farben nur über CSS-Variablen (`--ac`, `--ok`, `--kv` …). Keine neuen Emojis in Bedienelementen.
- Der Nutzer will kurze, direkte Antworten mit Quellen und Begründung, und dass man ihn korrigiert, wenn er falsch liegt.
