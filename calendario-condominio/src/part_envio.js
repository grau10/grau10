/* ---------- programação para a administradora ---------- */
const MES_ABR = m => `${MESES[m.getMonth()].slice(0,3)}/${m.getFullYear()}`;
function envioRange(kind){
  const t = todayD();
  if (kind === "proximo") return [new Date(t.getFullYear(), t.getMonth()+1, 1, 12), new Date(t.getFullYear(), t.getMonth()+2, 0, 12)];
  if (kind === "tres") return [t, new Date(t.getFullYear(), t.getMonth()+3, 0, 12)];
  return [t, new Date(t.getFullYear(), t.getMonth()+1, 0, 12)];
}
function periodoLabel(from, to){
  return from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()
    ? `${MESES[from.getMonth()]} de ${from.getFullYear()}`
    : `${MESES[from.getMonth()]}/${from.getFullYear()} a ${MESES[to.getMonth()]}/${to.getFullYear()}`;
}
const ddmm = k => { const d = parse(k); return d ? `${pad(d.getDate())}/${pad(d.getMonth()+1)}` : ""; };
function buildMensagem(o){
  const [from, to] = envioRange(o.kind);
  const ev = eventsBetween(from, to, true).filter(e => e.st !== "done");
  const months = {};
  ev.forEach(e => { const k = e.oc.slice(0,7); (months[k] = months[k] || new Map()); const m = months[k]; const g = m.get(e.a.id) || {a:e.a, dias:[]}; g.dias.push(e.oc); m.set(e.a.id, g); });
  const nome = S.nome || "Condomínio";
  const L = [];
  L.push(`*${nome} · Programação de manutenção*`);
  L.push(`Período: ${periodoLabel(from, to)}`);
  L.push("");
  L.push(`Prezados(as) da ${S.ed?.administradora?.nome || "administradora"},`);
  L.push(`segue a programação de manutenção das áreas comuns prevista no plano de manutenção do edifício (NBR 5674). Solicito o agendamento e a contratação dos serviços abaixo e o retorno com datas e orçamentos.`);
  Object.keys(months).sort().forEach(k => {
    const d = parse(k + "-01");
    L.push(""); L.push(`*${MESES[d.getMonth()].toUpperCase()}/${d.getFullYear()}*`);
    [...months[k].values()].sort((x,y) => x.dias[0].localeCompare(y.dias[0])).forEach(g => {
      const dias = g.dias.length > 1 ? g.dias.map(x => x.slice(8)).join(", ") + "/" + k.slice(5) : ddmm(g.dias[0]);
      L.push(`• ${dias} – ${g.a.titulo} (${CAT_SHORT[g.a.categoria].toLowerCase()})${g.a.responsavel ? " – " + g.a.responsavel : ""}`);
      if (o.porque && g.a.porque) L.push(`   _${g.a.porque}_`);
    });
  });
  if (!ev.length){ L.push(""); L.push("Não há atividades previstas no período."); }
  if (o.atrasadas){
    const seen = new Map();
    lateList(true).forEach(l => { const c = seen.get(l.a.id); seen.set(l.a.id, {a:l.a, n:(c?.n || 0) + 1, first:c?.first || l.oc}); });
    if (seen.size){
      L.push(""); L.push("*PENDENTES (já venceram e não têm registro de conclusão)*");
      [...seen.values()].forEach(x => L.push(`• ${x.a.titulo} – desde ${ddmm(x.first)}${x.n > 1 ? ` (${x.n} ocorrências)` : ""}`));
    }
  }
  L.push("");
  L.push(`Calendário completo e histórico: ${(S.ed?.linkAcesso && /^https?:\/\//.test(S.ed.linkAcesso)) ? S.ed.linkAcesso : DEFAULT_LINK}`);
  L.push("");
  L.push(`Atenciosamente,`);
  L.push(`${S.ed?.sindico?.nome || "Síndico(a)"} · Síndico(a)${S.nome ? " do " + S.nome : ""}`);
  return {texto:L.join("\n"), itens:ev.length, from, to};
}
function adminPhone(){
  const d = String(S.ed?.administradora?.contato || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return "55" + d;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return "";
}
function renderEnvio(){
  const o = S.open; o.kind = o.kind || "tres"; o.atrasadas = o.atrasadas ?? true; o.porque = o.porque ?? false;
  const m = buildMensagem(o); S.open.msg = m;
  const ph = adminPhone(), wa = `https://wa.me/${ph}?text=${encodeURIComponent(m.texto)}`;
  const hist = S.envios.slice().sort((a,b) => (b.criadoEm||0) - (a.criadoEm||0)).slice(0,8);
  shell("Enviar programação", `
    <p style="margin:0;font-size:16px">Gera a mensagem com as manutenções do período para a síndica encaminhar à administradora pelo WhatsApp ou por SMS.</p>
    <div class="seg3" role="group" aria-label="Período">
      ${[["mes","Este mês"],["proximo","Próximo mês"],["tres","Próximos 3 meses"]].map(([k,l]) => `<button type="button" data-kind="${k}" aria-pressed="${o.kind === k}">${l}</button>`).join("")}
    </div>
    <div class="opts">
      <label class="check"><input type="checkbox" id="oAtr" ${o.atrasadas ? "checked" : ""}> Incluir pendências atrasadas</label>
      <label class="check"><input type="checkbox" id="oPq" ${o.porque ? "checked" : ""}> Incluir o motivo de cada serviço</label>
    </div>
    <div class="msgbox"><div class="msgmeta">${m.itens} ocorrência${m.itens===1?"":"s"} · ${periodoLabel(m.from, m.to)}</div><pre id="msgText">${esc(m.texto)}</pre></div>
    <div class="actions" style="justify-content:flex-start">
      <button class="btn" id="copyMsg">Copiar mensagem</button>
      <a class="btn sec" href="${esc(wa)}" target="_blank" rel="noopener">${ph ? "Abrir WhatsApp da administradora" : "Abrir no WhatsApp"}</a>
      <span class="hint" id="copyOk"></span>
    </div>
    ${podeEditar() ? `<div class="notice" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Depois de enviar, registre o envio. Ele fica no histórico do edifício como comprovante da solicitação.</span><button class="btn sec" id="logEnvio">Registrar envio</button></div>` : ""}
    <span class="err" id="envErr"></span>
    <div class="blk"><h3>Envios registrados</h3>
      ${hist.length ? hist.map(h => `<div class="fact"><span>${h.criadoEm ? new Date(h.criadoEm).toLocaleDateString("pt-BR") : ""} · ${esc(h.periodo || "")}</span><b>${h.itens ?? "—"} ocorrências</b></div>`).join("") : `<p class="empty">Nenhum envio registrado ainda.</p>`}
    </div>`);
}
async function copyMsg(){
  const txt = S.open?.msg?.texto || "";
  try { await navigator.clipboard.writeText(txt); $("#copyOk").textContent = "Mensagem copiada."; }
  catch {
    const pre = $("#msgText"), r = document.createRange(); r.selectNodeContents(pre);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    $("#copyOk").textContent = "Texto selecionado. Use Copiar do seu aparelho.";
  }
}
async function logEnvio(){
  const m = S.open.msg; if (!m) return;
  const btn = $("#logEnvio"); btn.disabled = true;
  const ok = await guard(async () => { const ref = S.db.collection("envios").doc(); await ref.set({id:ref.id, periodo:periodoLabel(m.from, m.to), de:ymd(m.from), ate:ymd(m.to), itens:m.itens, texto:m.texto, destino:"administradora", autor:S.myId, criadoEm:Date.now()}); }, $("#envErr"));
  btn.disabled = false;
  if (ok){ btn.textContent = "Envio registrado"; btn.disabled = true; }
}

/* ---------- livro de manutenção: exportar e restaurar ---------- */
const slug = s => (String(s || "condominio").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase() || "condominio");
function livroJSON(){
  return JSON.stringify({formato:"livro-manutencao", versao:1, exportadoEm:new Date().toISOString(), condominio:S.nome || "",
    edificio:S.ed || {}, atividades:[...S.atividades.values()], registros:S.registros, envios:S.envios, ordens:S.ordens}, null, 2);
}
function livroCSV(){
  const q = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const rows = [["Ocorrência","Data da execução","Atividade","Sistema","Classificação","Executado por","Custo (R$)","Concluída","Anotações"].map(q).join(";")];
  S.registros.slice().sort((a,b) => (a.ocorrencia||"").localeCompare(b.ocorrencia||"")).forEach(r => {
    const a = S.atividades.get(r.atividadeId) || {};
    rows.push([fmtD(r.ocorrencia), r.dataExecucao ? fmtD(r.dataExecucao) : "", a.titulo || "(atividade excluída)", a.sistema || "", CAT[a.categoria] || "",
      r.executor || "", typeof r.custo === "number" ? r.custo.toLocaleString("pt-BR",{minimumFractionDigits:2}) : "", r.concluida ? "Sim" : "Não", r.texto || ""].map(q).join(";"));
  });
  return "﻿" + rows.join("\r\n");
}
function livroHTML(){
  const e = S.ed || {}, nome = S.nome || "Condomínio";
  const acts = [...S.atividades.values()].sort((a,b) => (a.sistema||"").localeCompare(b.sistema||"") || a.titulo.localeCompare(b.titulo));
  const regs = S.registros.slice().sort((a,b) => (a.ocorrencia||"").localeCompare(b.ocorrencia||""));
  const total = regs.reduce((s,r) => s + (typeof r.custo === "number" ? r.custo : 0), 0);
  const row = (l, v) => v ? `<tr><th>${l}</th><td>${esc(v)}</td></tr>` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Livro de manutenção · ${esc(nome)}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;color:#222;max-width:960px;margin:40px auto;padding:0 24px;font-size:13px;line-height:1.45}
h1{font-size:28px;margin:0}h2{font-size:18px;margin:32px 0 8px;border-bottom:2px solid #222;padding-bottom:4px}
.sub{color:#6a6a6a}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:6px 8px 6px 0;border-bottom:1px solid #ddd}
th{color:#6a6a6a;font-weight:600}.ficha th{width:220px}.r{text-align:right;white-space:nowrap}pre{white-space:pre-wrap;font-family:inherit;margin:0}
@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}</style></head><body>
<p class="sub">Livro de manutenção do edifício · histórico de propriedade do condomínio</p>
<h1>${esc(nome)}</h1><p class="sub">${esc(e.endereco || "")}<br>Gerado em ${new Date().toLocaleString("pt-BR")}. Conforme ABNT NBR 5674, este registro deve ser mantido pelo condomínio e transmitido a cada nova gestão.</p>
<h2>Ficha do edifício</h2><table class="ficha">${row("Ano de construção", e.ano)}${row("Unidades", e.unidades)}${row("Pavimentos", e.pavimentos)}${row("Área construída", e.area)}${row("Sistema construtivo", e.sistemaConstrutivo)}${row("Construtora", e.construtora)}${row("Projeto de arquitetura", e.arquitetura)}
${row("Síndico(a)", [e.sindico?.nome, e.sindico?.extra].filter(Boolean).join(" · "))}${row("Subsíndico(a)", e.subsindico?.nome)}${row("Administradora", e.administradora?.nome)}
${(e.sindicosAnteriores || []).map(s => row("Síndico(a) anterior", [s.nome, s.periodo].filter(Boolean).join(" · "))).join("")}</table>
<h2>Plano de manutenção (${acts.length} atividades)</h2><table><tr><th>Atividade</th><th>Sistema</th><th>Classificação</th><th>Periodicidade</th><th>Item do manual / normas</th></tr>
${acts.map(a => `<tr><td><b>${esc(a.titulo)}</b><br><span class="sub">${esc(a.porque || "")}</span></td><td>${esc(a.sistema || "")}</td><td>${CAT[a.categoria]}</td><td>${esc(PER[a.periodicidade]?.l || "")}</td><td>${esc([a.manual, a.referencia].filter(Boolean).join(" · "))}</td></tr>`).join("")}</table>
<h2>Registros de execução (${regs.length}) · total ${brl(total) || "R$ 0,00"}</h2><table><tr><th>Ocorrência</th><th>Atividade</th><th>Executado por</th><th class="r">Custo</th><th>Anotações</th></tr>
${regs.map(r => { const a = S.atividades.get(r.atividadeId) || {}; return `<tr><td>${fmtD(r.ocorrencia)}${r.concluida ? "<br><span class='sub'>concluída</span>" : ""}</td><td>${esc(a.titulo || "(atividade excluída)")}</td><td>${esc(r.executor || "")}</td><td class="r">${typeof r.custo === "number" ? brl(r.custo) : ""}</td><td><pre>${esc(r.texto || "")}</pre></td></tr>`; }).join("")}</table>
<h2>Solicitações enviadas à administradora (${S.envios.length})</h2><table><tr><th>Data</th><th>Período</th><th class="r">Ocorrências</th></tr>
${S.envios.slice().sort((a,b) => (a.criadoEm||0) - (b.criadoEm||0)).map(h => `<tr><td>${h.criadoEm ? new Date(h.criadoEm).toLocaleDateString("pt-BR") : ""}</td><td>${esc(h.periodo || "")}</td><td class="r">${h.itens ?? ""}</td></tr>`).join("")}</table>
<h2>Ordens de serviço (${S.ordens.length})</h2><table><tr><th>Nº</th><th>Emissão</th><th>Serviço</th><th>Data prevista</th><th>Prioridade</th></tr>
${S.ordens.slice().sort((a,b) => (a.criadoEm||0) - (b.criadoEm||0)).map(o => `<tr><td>${esc(o.numero)}</td><td>${o.criadoEm ? new Date(o.criadoEm).toLocaleDateString("pt-BR") : ""}</td><td>${o.tipo === "programadas" ? `Manutenções programadas: ${(o.itens || []).length} serviços` : esc(S.atividades.get(o.atividadeId)?.titulo || "")}</td><td>${o.tipo === "programadas" ? esc(o.periodo || "") : fmtD(o.ocorrencia)}</td><td>${esc(PRIO[o.prioridade] || "")}</td></tr>`).join("")}</table>
<h2>Documentos</h2><table>${(e.documentos || []).map(d => `<tr><td>${esc(d.nome || d.tipo)}</td><td>${esc(d.tipo || "")}</td><td>${d.validade ? "Validade " + fmtD(d.validade) : ""}</td></tr>`).join("") || "<tr><td>Nenhum documento cadastrado.</td></tr>"}</table>
</body></html>`;
}
async function exportar(fmt){
  const err = $("#xErr"); if (err) err.textContent = "";
  if (!S.downloads){ if (err) err.textContent = "Exportar não está disponível nesta visualização."; return; }
  const base = `livro-manutencao-${slug(S.nome)}-${ymd(todayD())}`;
  const file = fmt === "json" ? {filename:base + ".json", data:livroJSON()} : fmt === "csv" ? {filename:base + "-registros.csv", data:livroCSV()} : {filename:base + ".html", data:livroHTML()};
  try {
    await S.downloads.save(file);
    if (fmt === "json" && S.isOwner){ try { await S.db.doc("config/backup").set({ultimo:Date.now()}); S.ultimoBackup = Date.now(); renderLivro(); } catch {} }
  } catch (e){
    if (e?.code !== "declined" && err) err.textContent = e?.code === "rate_limited" ? "Já há um download aguardando confirmação." : "Não foi possível gerar o arquivo.";
  }
}
function renderLivro(){
  if (S.open?.type !== "livro") return;
  const dias = S.ultimoBackup ? Math.floor((Date.now() - S.ultimoBackup) / 864e5) : null;
  shell("Livro de manutenção", `
    <p style="margin:0;font-size:16px">O histórico de manutenção pertence ao condomínio e deve acompanhar o edifício por toda a sua vida útil, passando de um síndico para o próximo (NBR 5674).</p>
    <div class="facts">
      <div class="fact"><span>Atividades no plano</span><b class="num">${S.atividades.size}</b></div>
      <div class="fact"><span>Registros de execução</span><b class="num">${S.registros.length}</b></div>
      <div class="fact"><span>Solicitações à administradora</span><b class="num">${S.envios.length}</b></div>
      <div class="fact"><span>Ordens de serviço emitidas</span><b class="num">${S.ordens.length}</b></div>
      <div class="fact"><span>Última cópia de segurança</span><b>${S.ultimoBackup ? new Date(S.ultimoBackup).toLocaleDateString("pt-BR") + (dias > 30 ? ` <span class="st warn">! há ${dias} dias</span>` : "") : `<span class="st warn">! Nunca feita</span>`}</b></div>
    </div>
    <div class="menu">
      <button data-exp="html"><span>Livro para imprimir ou salvar em PDF<small>Ficha do edifício, plano, registros, solicitações e documentos (.html)</small></span>›</button>
      <button data-exp="csv"><span>Planilha de registros<small>Abre no Excel ou Google Planilhas (.csv)</small></span>›</button>
      <button data-exp="json"><span>Cópia de segurança completa<small>Arquivo para restaurar o calendário em outra conta (.json)</small></span>›</button>
      ${S.isOwner ? `<button data-go="restore"><span>Restaurar de uma cópia de segurança<small>Importa um arquivo .json exportado deste calendário</small></span>›</button>` : ""}
    </div>
    <span class="err" id="xErr"></span>
    <div class="notice"><b>Na troca de síndico:</b> exporte a cópia de segurança e o livro em PDF, anexe ao termo de transmissão de gestão e entregue ao novo síndico e à administradora.</div>`);
}

let restoreData = null;
function renderRestore(){
  const d = restoreData;
  shell("Restaurar cópia de segurança", `
    <p style="margin:0;font-size:16px">Importa atividades, registros, solicitações e a ficha do edifício de um arquivo .json gerado em "Cópia de segurança completa". Itens com o mesmo identificador são substituídos; nada é apagado.</p>
    <label class="fld"><span>Arquivo .json</span><input type="file" id="rFile" accept="application/json,.json"></label>
    ${d ? `<div class="facts">
      <div class="fact"><span>Condomínio</span><b>${esc(d.condominio || "—")}</b></div>
      <div class="fact"><span>Exportado em</span><b>${d.exportadoEm ? new Date(d.exportadoEm).toLocaleString("pt-BR") : "—"}</b></div>
      <div class="fact"><span>Atividades · registros · envios</span><b class="num">${d.atividades.length} · ${d.registros.length} · ${d.envios.length}</b></div></div>
      <div class="actions"><span class="err" id="rErr"></span><button class="btn" id="doRestore">Importar para este calendário</button></div>` : `<span class="err" id="rErr"></span>`}`);
}
async function readRestore(file){
  restoreData = null;
  try {
    const j = JSON.parse(await file.text());
    if (j?.formato !== "livro-manutencao" || !Array.isArray(j.atividades)) throw 0;
    restoreData = {...j, registros:Array.isArray(j.registros) ? j.registros : [], envios:Array.isArray(j.envios) ? j.envios : [], ordens:Array.isArray(j.ordens) ? j.ordens : []};
    renderRestore();
  } catch { renderRestore(); $("#rErr").textContent = "Este arquivo não é uma cópia de segurança do calendário."; }
}
async function doRestore(){
  const d = restoreData, btn = $("#doRestore"), err = $("#rErr"); if (!d) return;
  const okId = id => typeof id === "string" && /^(?!\.\.?$)[A-Za-z0-9_\-.~:@+]{1,200}$/.test(id);
  const jobs = [
    ...d.atividades.filter(a => okId(a.id)).map(a => ["atividades/" + a.id, a]),
    ...d.registros.filter(r => okId(r.id)).map(r => ["registros/" + r.id, r]),
    ...d.envios.filter(h => okId(h.id)).map(h => ["envios/" + h.id, h]),
    ...d.ordens.filter(h => okId(h.id)).map(h => ["ordens/" + h.id, h])
  ];
  if (d.edificio && typeof d.edificio === "object") jobs.push(["config/edificio", d.edificio]);
  if (d.condominio) jobs.push(["config/geral", {nome:String(d.condominio)}]);
  btn.disabled = true; let n = 0;
  for (const [path, body] of jobs){
    const ok = await guard(() => S.db.doc(path).set(body), err);
    if (!ok){ btn.disabled = false; return; }
    n++; btn.textContent = `Importando ${n}/${jobs.length}…`;
  }
  restoreData = null; closeSheet(); render();
}
