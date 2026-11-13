// Grava o vídeo de 40 s do aplicativo (9:16, 1080x1920) a partir de quadros do navegador.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = __dirname, FR = path.join(DIR, 'frames');
const FONTS = path.join(DIR, 'node_modules/@fontsource/figtree/files');

(async () => {
  fs.rmSync(FR, {recursive: true, force: true}); fs.mkdirSync(FR);
  const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium'});
  const ctx = await b.newContext({viewport: {width: 432, height: 768}, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: 'pt-BR'});
  await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({contentType: 'text/css', body:
    [400, 500, 600, 700, 800].map(w => `@font-face{font-family:"Figtree";font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/figtree-${w}.woff2) format("woff2")}`).join('\n')}));
  await ctx.route(/fonts\.gstatic\.com\/figtree-(\d+)\.woff2/, r => {
    const w = r.request().url().match(/figtree-(\d+)/)[1];
    r.fulfill({contentType: 'font/woff2', body: fs.readFileSync(path.join(FONTS, `figtree-latin-${w}-normal.woff2`))});
  });
  await ctx.route(/cdnjs/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('englink.install.dismiss', '1'); } catch {} });
  const p = await ctx.newPage();

  // prepara a demonstração (fora da gravação)
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(800);
  if (await p.$('#demoLoad')) { await p.click('#demoLoad'); await p.waitForLoadState('load'); }
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);

  // camada de vídeo: legenda, toque e tela final
  await p.addStyleTag({content: `
    .dock,.install-tip,.demo-offer{display:none!important}
    #vsl-cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%) translateY(10px);z-index:9999;width:calc(100% - 40px);max-width:400px;
      background:#222;color:#fff;font:700 21px/1.25 Figtree,sans-serif;text-align:center;padding:14px 18px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.25);
      opacity:0;transition:opacity .35s,transform .35s;pointer-events:none;text-wrap:balance}
    #vsl-cap.on{opacity:1;transform:translateX(-50%) translateY(0)}
    .vsl-tap{position:fixed;z-index:9998;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(0,150,138,.28);border:3px solid rgba(0,150,138,.9);
      pointer-events:none;animation:vslTap .6s ease-out forwards}
    @keyframes vslTap{0%{transform:scale(.4);opacity:1}70%{transform:scale(1.1);opacity:.9}100%{transform:scale(1.35);opacity:0}}
    #vsl-end{position:fixed;inset:0;z-index:10000;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;
      padding:0 32px;opacity:0;transition:opacity .5s;pointer-events:none;font-family:Figtree,sans-serif;color:#222}
    #vsl-end.on{opacity:1}
    #vsl-end img{width:96px;height:96px;border-radius:22px}
    #vsl-end h1{font-size:34px;font-weight:800;letter-spacing:-.02em;margin:6px 0 0}
    #vsl-end p{font-size:19px;color:#6a6a6a;margin:0;line-height:1.35;text-wrap:balance}
    #vsl-end .price{margin-top:14px;font-size:26px;font-weight:800;color:#222}
    #vsl-end .price small{display:block;font-size:16px;font-weight:600;color:#6a6a6a;margin-top:4px}
    #vsl-end .cta{margin-top:18px;background:#222;color:#fff;border-radius:12px;padding:14px 26px;font-size:18px;font-weight:700}`});
  await p.evaluate(() => {
    const c = document.createElement('div'); c.id = 'vsl-cap'; document.body.appendChild(c);
    const e = document.createElement('div'); e.id = 'vsl-end';
    e.innerHTML = `<img src="icons/icon-512.png" alt=""><h1>EngLink Síndico</h1><p>Manutenção do prédio em dia, sem dor de cabeça</p>
      <div class="price">R$ 297/mês<small>Sem fidelidade · cancele quando quiser</small></div><div class="cta">Quero no meu condomínio</div>`;
    document.body.appendChild(e);
    window.scrollTo(0, 0);
  });

  const cap = async t => p.evaluate(t => { const c = document.getElementById('vsl-cap');
    if (!t){ c.classList.remove('on'); return; }
    c.classList.remove('on'); setTimeout(() => { c.textContent = t; c.classList.add('on'); }, c.textContent ? 250 : 0); }, t);
  const ripple = async (x, y) => p.evaluate(([x, y]) => { const d = document.createElement('div'); d.className = 'vsl-tap';
    d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); }, [x, y]);
  const tap = async (sel, {click = true} = {}) => {
    const el = typeof sel === 'string' ? await p.$(sel) : sel;
    await el.scrollIntoViewIfNeeded();
    const bx = await el.boundingBox();
    await ripple(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await p.waitForTimeout(280);
    if (click) await el.click({force: true});
  };
  const closeSheet = async () => {
    await p.evaluate(() => document.querySelector('.sheet')?.scrollTo({top: 0, behavior: 'smooth'}));
    await p.waitForTimeout(250);
    const x = await p.$('[data-x]'), bx = x && await x.boundingBox();
    await ripple(bx ? bx.x + bx.width / 2 : 36, bx ? bx.y + bx.height / 2 : 60);
    await p.waitForTimeout(250);
    await p.keyboard.press('Escape');
  };
  const scrollWin = async y => p.evaluate(y => window.scrollTo({top: y, behavior: 'smooth'}), y);
  const scrollSheet = async (y, sel) => p.evaluate(([y, sel]) => {
    const s = document.querySelector('.sheet'); if (!s) return;
    const top = sel ? (s.querySelector(sel)?.offsetTop ?? y) - 70 : y;
    s.scrollTo({top, behavior: 'smooth'});
  }, [y, sel]);

  // gravação por quadros
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    frames.push({ts: f.metadata.timestamp, data: f.data});
    try { await cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}); } catch {}
  });
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1});
  const t0 = Date.now();
  const at = async s => { const w = t0 + s * 1000 - Date.now(); if (w > 0) await p.waitForTimeout(w); };

  console.log("celulas:", await p.evaluate(() => [...document.querySelectorAll(".cell[data-day]")].slice(0,3).map(c => c.dataset.day)), await p.evaluate(() => document.querySelector("#monthTitle")?.textContent));
  // 0–4,5 s: calendário
  await at(0.3); await cap('Síndico: o prédio avisa você do que precisa ser feito');
  await at(2.0); await tap('.cell[data-day$="-20"]');
  await at(2.8); await scrollWin(560);
  // 4,5–10 s: atividade explicada
  await at(4.5); await cap('Cada manutenção explicada em linguagem simples');
  await at(5.2); await tap((await p.$$('.row[data-open="modelo-bombas"]'))[0]);
  await at(6.8); await scrollSheet(0, '.facts');
  await at(8.4); await scrollSheet(0, '.blk');  // 10–14 s: histórico
  await at(10.0); await cap('Histórico: quem fez, quando e quanto custou');
  await at(10.6); await scrollSheet(0, '.note');
  await at(12.3); await scrollSheet(0, '.note:nth-of-type(4)');
  // 14–21 s: encomendar 1, 2 ou 3 meses
  await at(14.0); await closeSheet();
  await at(14.4); await cap('Encomende 1, 2 ou 3 meses de manutenção');
  await at(14.9); await tap('.cta');
  await at(16.3); await tap('[data-n="2"]');
  await at(17.8); await scrollSheet(0, '.lm:not(.venc)');
  await at(19.6); await scrollSheet(99999);
  // 21–26 s: ordem de serviço pronta
  await at(21.0); await cap('Ordem de serviço pronta para a administradora, pelo WhatsApp');
  await p.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('#ltWa')) e.preventDefault(); }, true));
  await at(21.3); await scrollSheet(0, 'details.tbl');
  await at(22.1); await tap('details.tbl summary');
  await at(22.9); await scrollSheet(0, 'details.tbl');
  await at(24.6); await tap('#ltWa', {click: false});
  // 26–31,5 s: visão geral
  await at(26.0); await closeSheet();
  await at(26.4); await cap('Custos e pendências prontos para a assembleia');
  await at(26.9); await scrollWin(0);
  await at(27.4); await tap('[data-tab="visao"]');
  await at(28.6); await scrollWin(330);
  await at(30.2); await scrollWin(560);
  // 31,5–36 s: o histórico é do condomínio
  await at(31.5); await cap('O histórico fica com o condomínio, de síndico para síndico');
  await at(31.8); await scrollWin(0);
  await at(32.0); await tap('[data-tab="edificio"]');
  await at(32.9);
  if (!(await p.$('#tab-edificio [data-go="livro"]'))) { await p.screenshot({path: path.join(DIR, 'dbg-33.png')}); console.log('tab:', await p.evaluate(() => [...document.querySelectorAll('.tabs [aria-selected="true"]')].map(b => b.dataset.tab)), 'sheet:', !!(await p.$('.sheet'))); }
  await tap('#tab-edificio [data-go="livro"]');
  // 36–40 s: tela final
  await at(36.0); await cap('');
  await p.evaluate(() => document.getElementById('vsl-end').classList.add('on'));
  await at(40.3);
  await cdp.send('Page.stopScreencast');

  // grava os quadros e a lista com a duração de cada um
  const start = frames[0].ts;
  let list = '';
  frames.forEach((f, i) => {
    const file = `f${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(FR, file), Buffer.from(f.data, 'base64'));
    const next = i + 1 < frames.length ? frames[i + 1].ts : start + 40.3;
    list += `file '${file}'\nduration ${Math.max(0.001, next - f.ts).toFixed(4)}\n`;
  });
  list += `file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`;
  fs.writeFileSync(path.join(FR, 'list.txt'), list);
  console.log('quadros:', frames.length, 'primeiro em', ((start * 1000) - t0).toFixed(0), 'ms');
  await b.close();
})();
