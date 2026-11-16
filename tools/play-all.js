/* Spielt jede Lektion im Browser mit lauter richtigen Antworten durch (Erwartung: 100 %)
   und öffnet danach alle wichtigen Ansichten. Meldet Laufzeitfehler.
   Aufruf: python3 -m http.server 8765 &   dann   node tools/play-all.js */
const { chromium } = require('playwright');
const URL = process.env.PICOPA_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; let cur = 'laden';
  p.on('pageerror', e => errs.push(cur + ': ' + e.message));
  await p.goto(URL); await p.waitForTimeout(500);
  cur = 'lektionen';
  const log = await p.evaluate(async () => {
    const out = [], sl = ms => new Promise(r => setTimeout(r, ms));
    const NM = /^(Pedro|Ana|Rita|Maria|João|Lisboa|Porto|Portugal|Faro|Tiago|Inês|Rui|Marta|Joana|Miguel|Lena|Alemanha|Berlim|Sintra|Alfama)$/;
    for (let i = 0; i < LS.length; i++) {
      li = i; ei = 0; sc = 0; tot = 0; ovw(1); document.getElementById('go').click(); let guard = 0;
      while (document.getElementById('bk') && guard++ < 250) {
        const e = Q[ei]; if (!e) break;
        try {
          if (e.k === 'c') document.getElementById('sh').click();
          else if (e.o) { const t = [...document.querySelectorAll('#op button')].find(x => x.textContent === e.o[e.a]); if (!t) { out.push('Option fehlt ' + LS[i].id + ' #' + ei); break } t.click() }
          else if (e.k === 'w' || e.k === 'd') { document.getElementById('in').value = e.k === 'd' ? e.p : e.a[0]; document.getElementById('ck').click() }
          else if (e.k === 'o') {
            const words = e.p.split(' ').map((w, j) => { w = w.replace(/[.,!?¿¡;:"“”…]/g, ''); return j === 0 && !NM.test(w) ? w.toLowerCase() : w }).filter(Boolean);
            for (const w of words) { const c = [...document.querySelectorAll('#chips button')].find(x => x.textContent === w && !x.disabled); if (!c) { out.push('Baustein fehlt ' + LS[i].id); break } c.click() }
            document.getElementById('ck').click();
          }
          else if (e.k === 'x') for (const pr of e.pairs) { [...document.querySelectorAll('#mx button')].find(x => x.textContent === pr[0] && !x.disabled).click(); [...document.querySelectorAll('#mx button')].filter(x => x.textContent === pr[1] && !x.disabled).pop().click() }
        } catch (err) { out.push('Fehler ' + LS[i].id + ' #' + ei + ' ' + e.k + ': ' + err.message); break }
        const g = document.getElementById('go'); if (!g) { out.push('kein Weiter-Button ' + LS[i].id + ' #' + ei + ' ' + e.k); break }
        if (/Nicht ganz/.test(document.getElementById('fb').textContent)) out.push('als falsch gewertet: ' + LS[i].id + ' #' + ei + ' ' + (e.q || e.p));
        g.click(); await sl(1);
      }
      if (P[LS[i].id] !== 100) out.push(LS[i].id + ' endete mit ' + P[LS[i].id] + ' % (' + sc + '/' + tot + ')');
    }
    return out;
  });
  const screens = ['home()', 'hub()', 'chat()', 'refTab()', 'settings()', 'weekly()', 'trophies()', 'calScreen()', 'wordsScreen()', 'lessonsScreen()', 'numMenu()', 'dialogs()', 'stories()', 'story(0)', 'packs()', 'rev()', 'placement()', 'verbTrainer()', 'shadow()', 'pronDrill()', 'daily()', "ktStart('A1')", 'RT=0;ref()', 'RT=1;ref()', 'RT=2;ref()', 'RT=3;ref()', 'RT=4;ref()', 'RT=5;ref()'];
  for (const s of screens) { cur = s; await p.evaluate(s).catch(e => errs.push(s + ': ' + e.message.split('\n')[0])); await p.waitForTimeout(250) }
  console.log(log.length ? log.join('\n') : 'Alle ' + await p.evaluate(() => LS.length) + ' Lektionen mit 100 % durchgespielt.');
  console.log(errs.length ? errs.join('\n') : 'Keine Laufzeitfehler.');
  await b.close();
  process.exit(log.length || errs.length ? 1 : 0);
})();
