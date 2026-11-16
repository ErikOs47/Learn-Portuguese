/* Prüft alle Lektionsdaten im laufenden Browser.
   Aufruf (im Repo-Ordner):  python3 -m http.server 8765 &   dann   node tools/check-data.js
   Braucht Playwright (require('playwright')). URL über PICOPA_URL änderbar. */
const { chromium } = require('playwright');
const URL = process.env.PICOPA_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(600);
  const out = await p.evaluate(() => {
    const R = [], ids = {};
    LS.forEach(l => {
      if (!l.id) R.push('Lektion ohne id: ' + l.t);
      if (ids[l.id]) R.push('doppelte id ' + l.id); ids[l.id] = 1;
      l.ex.forEach((e, j) => {
        const id = `${l.id}#${j}(${e.k})`;
        if (e.o) {
          if (!(e.a >= 0 && e.a < e.o.length)) R.push(id + ' Antwortindex ungültig');
          if (new Set(e.o).size !== e.o.length) R.push(id + ' doppelte Optionen ' + e.o);
        }
        if (e.k === 'w') {
          e.a.forEach(a => { if (norm(a) !== a) R.push(id + ' Antwort nicht normalisiert: ' + a) });
          const n = norm(String(e.n).split(' (')[0]);
          if (e.a.indexOf(n) < 0) R.push(id + ' Musterlösung wird nicht akzeptiert: ' + e.n);
        }
        if (e.k === 'm' && !/___/.test(e.q)) R.push(id + ' Lückentext ohne ___');
        if (e.k === 'x') { const a = e.pairs.map(x => x[0]), d = e.pairs.map(x => x[1]); if (new Set(a).size !== a.length || new Set(d).size !== d.length) R.push(id + ' Zuordnung doppelt') }
        if (e.k === 'o' && e.p.split(' ').length < 2) R.push(id + ' Satzbau mit nur einem Wort');
      });
      if (!l.pod && l.ex.length < 12) R.push(l.id + ' hat nur ' + l.ex.length + ' Aufgaben');
    });
    DL.forEach((d, i) => d.tn.forEach(t => { if (t.c.length !== 3) R.push('Dialog ' + d.t + ': nicht 3 Antworten') }));
    ST.forEach(s => (s.qs || []).forEach(q => { if (q.o.length !== 3) R.push('Geschichte ' + s.t + ': Frage ohne 3 Optionen') }));
    const miss = {}; ST.forEach(s => s.x.split(/\s+/).forEach(tk => { const w = tk.toLowerCase().replace(/[.,!?;:"]/g, ''); if (w && !CG[w] && !lookup(w)) miss[w] = 1 }));
    const lv = {}; LS.forEach(l => { lv[l.lv] = lv[l.lv] || { t: new Set(), n: 0 }; lv[l.lv].t.add(l.tp); lv[l.lv].n++ });
    return { probleme: R, ohneUebersetzungInGeschichten: Object.keys(miss),
      umfang: Object.keys(lv).map(k => k + ': ' + lv[k].n + ' Lektionen, ' + lv[k].t.size + ' Themen') };
  });
  console.log(JSON.stringify(out, null, 1));
  if (errs.length) console.log('Laufzeitfehler:', errs);
  await b.close();
  process.exit(out.probleme.length || errs.length ? 1 : 0);
})();
