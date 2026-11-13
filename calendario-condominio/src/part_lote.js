/* ---------- ordem de serviço das programadas (1, 2 ou 3 meses) ---------- */
function loteMeses(){
  const t = todayD(), fimMes = new Date(t.getFullYear(), t.getMonth()+1, 0, 12);
  const restam = Math.round((fimMes - t) / 864e5) + 1, pula = restam < 10 ? 1 : 0;
  return [0,1,2].map(i => {
    const m = new Date(t.getFullYear(), t.getMonth() + pula + i, 1, 12);
    return {i, from:i === 0 ? t : m, to:new Date(m.getFullYear(), m.getMonth()+1, 0, 12), nome:cap(MESES[m.getMonth()]), ano:m.getFullYear(),
      extra:i === 0 && pula ? `inclui os últimos ${restam} dias de ${MESES[t.getMonth()]}` : ""};
  });
}
const loteCat = (a, vist) => a.categoria === "preventiva" || (vist && a.categoria === "outras");
function loteDados(o){
  const meses = loteMeses().map(m => {
    const g = new Map();
    eventsBetween(m.from, m.to, true).filter(e => e.st !== "done" && loteCat(e.a, o.vist)).forEach(e => {
      const x = g.get(e.a.id) || {a:e.a, dias:[]}; x.dias.push(e.oc); g.set(e.a.id, x);
    });
    return {...m, itens:[...g.values()].sort((x,y) => x.dias[0].localeCompare(y.dias[0]))};
  });
  const v = new Map();
  lateList(true).filter(l => loteCat(l.a, o.vist)).forEach(l => { const x = v.get(l.a.id) || {a:l.a, dias:[]}; x.dias.push(l.oc); v.set(l.a.id, x); });
  return {meses, vencidas:[...v.values()]};
}
const diasTxt = (dias, venc) => {
  if (venc) return dias.length > 1 ? `desde ${ddmm(dias[0])} (${dias.length}x)` : ddmm(dias[0]);
  if (dias.length === 1) return ddmm(dias[0]);
  return dias.every(d => d.slice(5,7) === dias[0].slice(5,7)) ? dias.map(d => d.slice(8)).join(", ") + "/" + dias[0].slice(5,7) : dias.map(ddmm).join(", ");
};
function loteSelecionados(o, D){
  const out = [];
  D.vencidas.forEach(x => { if (o.sel.has("v|" + x.a.id)) out.push({grupo:"Vencidas", ...x}); });
  D.meses.forEach(m => m.itens.forEach(x => { if (m.i < o.n && o.sel.has(m.i + "|" + x.a.id)) out.push({grupo:`${m.nome}/${m.ano}`, ...x}); }));
  return out;
}
function lotePeriodo(o, D){ const a = D.meses[0], b = D.meses[Math.max(0, (o.n || 1) - 1)]; return a.i === b.i ? `${a.nome.toLowerCase()} de ${a.ano}` : `${a.nome.toLowerCase()}/${a.ano} a ${b.nome.toLowerCase()}/${b.ano}`; }
function loteTexto(o, D){
  const sel = loteSelecionados(o, D), L = [];
  L.push(`*ORDEM DE SERVIÇO Nº ${o.numero}*`);
  L.push(`*Manutenções programadas · ${S.nome || "Condomínio"}*`);
  L.push(`Período: ${lotePeriodo(o, D)} · Emitida em ${fmtD(ymd(todayD()))}`);
  L.push("");
  L.push(`Prezados(as) da ${S.ed?.administradora?.nome || "administradora"}, solicito a contratação e o agendamento das manutenções programadas abaixo, previstas no plano de manutenção do edifício (NBR 5674):`);
  let g = "";
  sel.forEach(x => {
    if (x.grupo !== g){ g = x.grupo; L.push(""); L.push(`*${g === "Vencidas" ? "JÁ VENCIDAS (prioridade)" : g.toUpperCase()}*`); }
    L.push(`• ${diasTxt(x.dias, x.grupo === "Vencidas")} – ${x.a.titulo}${x.a.responsavel ? " – " + x.a.responsavel : ""}`);
  });
  if (o.obs){ L.push(""); L.push(`*Observações do(a) síndico(a):* ${o.obs}`); }
  L.push("");
  L.push("Favor confirmar as datas com o(a) síndico(a) e, após cada serviço, enviar nota fiscal, garantia e relatório para o histórico do edifício.");
  L.push("");
  L.push(`Solicitante: ${S.ed?.sindico?.nome || "Síndico(a)"} · Síndico(a)`);
  L.push(`Detalhes de cada serviço: ${(S.ed?.linkAcesso && /^https?:\/\//.test(S.ed.linkAcesso)) ? S.ed.linkAcesso : DEFAULT_LINK}`);
  return L.join("\n");
}
function loteHTML(o, D){
  const sel = loteSelecionados(o, D);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>OS ${esc(o.numero)} · ${esc(S.nome || "")}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;color:#222;max-width:900px;margin:40px auto;padding:0 24px;font-size:13px;line-height:1.45}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #222;padding-bottom:10px}h1{margin:0;font-size:24px}.sub{color:#6a6a6a}
table{border-collapse:collapse;width:100%;margin-top:16px}th,td{text-align:left;vertical-align:top;padding:7px 8px 7px 0;border-bottom:1px solid #ddd}th{color:#6a6a6a;font-weight:600}
td.e{border-bottom:1px solid #999;min-width:90px}h2{font-size:15px;margin:22px 0 4px}.sig{display:flex;gap:40px;margin-top:60px}.sig div{flex:1;border-top:1px solid #222;padding-top:6px;font-size:12px;color:#6a6a6a}
@media print{tr{break-inside:avoid}}</style></head><body>
<div class="top"><div><div class="sub">${esc(S.nome || "")}${S.ed?.endereco ? " · " + esc(S.ed.endereco) : ""}</div><h1>Ordem de serviço nº ${esc(o.numero)} · Manutenções programadas</h1></div><div class="sub">Período: ${esc(lotePeriodo(o, D))}<br>Emitida em ${fmtD(ymd(todayD()))}</div></div>
<table><tr><th>Mês</th><th>Data(s)</th><th>Serviço</th><th>Quem executa</th><th>Norma</th><th>Executado em</th><th>Valor</th></tr>
${sel.map(x => `<tr><td>${esc(x.grupo)}</td><td>${diasTxt(x.dias, x.grupo === "Vencidas")}</td><td><b>${esc(x.a.titulo)}</b><br><span class="sub">${esc(x.a.sistema || "")}</span></td><td>${esc(x.a.responsavel || "")}</td><td>${esc(x.a.referencia || "")}</td><td class="e"></td><td class="e"></td></tr>`).join("")}</table>
${o.obs ? `<h2>Observações do(a) síndico(a)</h2><p>${esc(o.obs)}</p>` : ""}
<div class="sig"><div>Síndico(a): ${esc(S.ed?.sindico?.nome || "")}</div><div>Administradora${S.ed?.administradora?.nome ? ": " + esc(S.ed.administradora.nome) : ""}</div></div></body></html>`;
}
function loteEscolher(o, n){
  o.n = n; const D = loteDados(o); o.sel = new Set();
  D.vencidas.forEach(x => o.sel.add("v|" + x.a.id));
  D.meses.forEach(m => { if (m.i < n) m.itens.forEach(x => o.sel.add(m.i + "|" + x.a.id)); });
}
function renderLote(){
  const o = S.open; o.vist = o.vist ?? false; o.obs = o.obs ?? ""; o.n = o.n || 0; o.sel = o.sel || new Set();
  const D = loteDados(o); o.numero = o.saved?.numero || osNumero();
  const sel = o.n ? loteSelecionados(o, D) : [], txt = o.n ? loteTexto(o, D) : "";
  const ph = adminPhone(), wa = `https://wa.me/${ph}?text=${encodeURIComponent(txt)}`;
  const row = (key, x, on) => `<label class="lt ${on ? "" : "off"}"><input type="checkbox" data-lk="${esc(key)}" ${on && o.sel.has(key) ? "checked" : ""} ${on ? "" : "disabled"}>
    <span class="ld num">${diasTxt(x.dias, key.startsWith("v|"))}</span><span style="min-width:0"><b>${esc(x.a.titulo)}</b><small>${esc(x.a.responsavel || x.a.sistema || "")}</small></span></label>`;
  const ate = i => D.meses[i].nome;
  shell("Encomendar manutenções programadas", `
    <p style="margin:0;font-size:16px">Estas são as manutenções programadas dos próximos 3 meses. Escolha até quando quer encomendar e envie uma única ordem de serviço para a administradora.</p>
    <div class="seg3" role="group" aria-label="Quantos meses encomendar">
      ${[1,2,3].map(n => `<button type="button" data-n="${n}" aria-pressed="${o.n === n}"><b>${n} ${n === 1 ? "mês" : "meses"}</b><small>${n === 1 ? ate(0) : "até " + ate(n-1)}</small></button>`).join("")}
    </div>
    ${D.vencidas.length ? `<div class="lm venc"><h4>Já vencidas <span>${D.vencidas.length} serviço${D.vencidas.length===1?"":"s"} sem registro de execução</span></h4>${D.vencidas.map(x => row("v|" + x.a.id, x, !!o.n)).join("")}</div>` : ""}
    ${D.meses.map(m => { const on = !!o.n && m.i < o.n; return `<div class="lm ${o.n && !on ? "fora" : ""}"><h4>${m.nome} ${m.ano} <span>${m.itens.length} serviço${m.itens.length===1?"":"s"}${m.extra ? " · " + m.extra : ""}${o.n && !on ? " · fora deste pedido" : ""}</span></h4>
      ${m.itens.length ? m.itens.map(x => row(m.i + "|" + x.a.id, x, on)).join("") : `<p class="empty">Nada programado.</p>`}</div>`; }).join("")}
    <label class="check"><input type="checkbox" id="ltVist" ${o.vist ? "checked" : ""}> Incluir também vistorias e obrigações</label>
    <label class="fld"><span>Observação para a administradora (opcional)</span><textarea id="ltObs" maxlength="600" placeholder="Ex.: priorizar o que for vencido; serviços na cobertura só pela manhã">${esc(o.obs)}</textarea></label>
    <div class="ltbar">
      <div><b>${o.n ? `OS nº ${esc(o.numero)} · ${sel.length} serviço${sel.length===1?"":"s"}` : "Escolha 1, 2 ou 3 meses"}</b><small>${o.n ? lotePeriodo(o, D) : "Os serviços do período são marcados automaticamente. Desmarque o que não quiser."}</small></div>
      ${o.n && sel.length ? `<a class="btn" id="ltWa" href="${esc(wa)}" target="_blank" rel="noopener">${ph ? "Enviar à administradora pelo WhatsApp" : "Enviar pelo WhatsApp"}</a>` : `<button class="btn" disabled>Enviar pelo WhatsApp</button>`}
    </div>
    ${o.n && sel.length ? `<div class="actions" style="justify-content:flex-start"><button class="btn sec" id="ltCopy">Copiar mensagem</button>${S.downloads ? `<button class="btn sec" id="ltPdf">Baixar para imprimir</button>` : ""}</div>
      <details class="tbl"><summary>Ver a mensagem</summary><div class="msgbox" style="margin-top:10px"><pre id="msgText">${esc(txt)}</pre></div></details>` : ""}
    <p class="hint" id="ltMsg">${o.saved ? `Ordem nº ${esc(o.saved.numero)} registrada no histórico do edifício.` : "Ao enviar, copiar ou baixar, a ordem fica registrada no histórico do edifício."}</p>`);
}
async function loteRegistrar(){
  const o = S.open; if (o.saved || !S.db || !podeEditar()) return;
  const D = loteDados(o), sel = loteSelecionados(o, D); if (!sel.length) return;
  const body = {numero:o.numero, tipo:"programadas", periodo:lotePeriodo(o, D), meses:o.n, itens:sel.map(x => ({atividadeId:x.a.id, ocorrencias:x.dias})),
    obs:o.obs, texto:loteTexto(o, D), destino:S.ed?.administradora?.nome || "administradora", autor:S.myId, criadoEm:Date.now()};
  try { const ref = S.db.collection("ordens").doc(); await ref.set({...body, id:ref.id}); o.saved = {...body, id:ref.id}; const m = $("#ltMsg"); if (m) m.textContent = `Ordem nº ${o.numero} registrada no histórico do edifício.`; }
  catch { const m = $("#ltMsg"); if (m) m.textContent = "Não foi possível registrar a ordem no histórico."; }
}
async function loteCopy(){
  const t = loteTexto(S.open, loteDados(S.open));
  try { await navigator.clipboard.writeText(t); $("#ltMsg").textContent = "Mensagem copiada."; }
  catch { const d = document.querySelector("details.tbl"); if (d) d.open = true; const r = document.createRange(); r.selectNodeContents($("#msgText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("#ltMsg").textContent = "Texto selecionado. Use Copiar do seu aparelho."; }
  loteRegistrar();
}
async function lotePdf(){
  const o = S.open;
  try { await S.downloads.save({filename:`OS-${o.numero.replace("/","-")}-programadas-${slug(S.nome)}.html`, data:loteHTML(o, loteDados(o))}); loteRegistrar(); }
  catch (e){ if (e?.code !== "declined") $("#ltMsg").textContent = "Não foi possível gerar o arquivo."; }
}
function loteResumo(){
  const t = todayD(), ms = loteMeses();
  return eventsBetween(t, ms[2].to, true).filter(e => e.st !== "done" && e.a.categoria === "preventiva").length;
}
