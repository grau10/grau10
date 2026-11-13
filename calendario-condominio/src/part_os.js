/* ---------- ordem de serviço ---------- */
const PRIO = {urgente:"Urgente", alta:"Alta", normal:"Normal"};
function osPrioridade(a, oc){
  if (status(a.id, oc) === "late") return "urgente";
  return a.categoria === "corretiva" ? "alta" : "normal";
}
function osNumero(){
  const ano = todayD().getFullYear();
  const n = S.ordens.filter(o => String(o.numero || "").startsWith(ano + "/")).map(o => +String(o.numero).split("/")[1] || 0);
  return `${ano}/${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, "0")}`;
}
function osTexto(o){
  const a = o.a, late = status(a.id, o.oc) === "late";
  const passos = String(a.como || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
  const L = [];
  L.push(`*ORDEM DE SERVIÇO Nº ${o.numero}*`);
  L.push(`*${S.nome || "Condomínio"}*${S.ed?.endereco ? " · " + S.ed.endereco : ""}`);
  L.push(`Emitida em ${fmtD(ymd(todayD()))} · Prioridade: *${PRIO[o.prio]}*`);
  L.push("");
  L.push(`*Serviço:* ${a.titulo}`);
  L.push(`*Tipo:* ${CAT[a.categoria]}`);
  if (a.sistema) L.push(`*Local / sistema:* ${a.sistema}`);
  L.push(`*${late ? "Data prevista (já vencida)" : "Data prevista"}:* ${fmtD(o.oc)}`);
  if (a.responsavel) L.push(`*Quem executa:* ${a.responsavel}`);
  if (passos.length){ L.push(""); L.push("*O que deve ser feito:*"); passos.forEach((p, i) => L.push(`${i+1}. ${p}`)); }
  if (a.porque){ L.push(""); L.push(`*Por que é necessário:* ${a.porque}`); }
  if (a.referencia || a.manual) L.push(`*Referência técnica:* ${[a.manual && "Manual, " + a.manual, a.referencia].filter(Boolean).join(" · ")}`);
  if (o.obs){ L.push(""); L.push(`*Observações do(a) síndico(a):* ${o.obs}`); }
  L.push("");
  L.push(`Favor providenciar orçamento e agendamento e confirmar a data com o(a) síndico(a). Após a execução, enviar nota fiscal, garantia e relatório do serviço para arquivo no histórico do edifício.`);
  L.push("");
  L.push(`Solicitante: ${S.ed?.sindico?.nome || "Síndico(a)"} · Síndico(a)`);
  L.push(`Acompanhe: ${(S.ed?.linkAcesso && /^https?:\/\//.test(S.ed.linkAcesso)) ? S.ed.linkAcesso : DEFAULT_LINK}`);
  return L.join("\n");
}
function osHTML(o){
  const a = o.a, passos = String(a.como || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
  const row = (l, v) => v ? `<tr><th>${l}</th><td>${esc(v)}</td></tr>` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>OS ${esc(o.numero)} · ${esc(S.nome || "")}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;color:#222;max-width:760px;margin:40px auto;padding:0 24px;font-size:14px;line-height:1.5}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #222;padding-bottom:10px}h1{margin:0;font-size:26px}
.sub{color:#6a6a6a}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{text-align:left;vertical-align:top;padding:8px 10px 8px 0;border-bottom:1px solid #ddd}
th{width:190px;color:#6a6a6a;font-weight:600}h2{font-size:16px;margin:24px 0 6px}.sig{display:flex;gap:40px;margin-top:60px}.sig div{flex:1;border-top:1px solid #222;padding-top:6px;font-size:12px;color:#6a6a6a}</style></head><body>
<div class="top"><div><div class="sub">${esc(S.nome || "")}${S.ed?.endereco ? " · " + esc(S.ed.endereco) : ""}</div><h1>Ordem de serviço nº ${esc(o.numero)}</h1></div><div class="sub">Emitida em ${fmtD(ymd(todayD()))}</div></div>
<table>${row("Serviço", a.titulo)}${row("Tipo", CAT[a.categoria])}${row("Local / sistema", a.sistema)}${row("Data prevista", fmtD(o.oc) + (status(a.id, o.oc) === "late" ? " (vencida)" : ""))}${row("Prioridade", PRIO[o.prio])}${row("Quem executa", a.responsavel)}${row("Referência técnica", [a.manual && "Manual, " + a.manual, a.referencia].filter(Boolean).join(" · "))}${row("Administradora", S.ed?.administradora?.nome)}</table>
${passos.length ? `<h2>O que deve ser feito</h2><ol>${passos.map(p => `<li>${esc(p)}</li>`).join("")}</ol>` : ""}
${a.porque ? `<h2>Por que é necessário</h2><p>${esc(a.porque)}</p>` : ""}${o.obs ? `<h2>Observações do(a) síndico(a)</h2><p>${esc(o.obs)}</p>` : ""}
<h2>Execução (preencher pelo prestador)</h2><table>${["Empresa / profissional","Data de execução","Valor","Garantia","Observações"].map(l => `<tr><th>${l}</th><td>&nbsp;</td></tr>`).join("")}</table>
<div class="sig"><div>Síndico(a): ${esc(S.ed?.sindico?.nome || "")}</div><div>Administradora</div><div>Prestador do serviço</div></div></body></html>`;
}
function renderOS(){
  const o = S.open, a = S.atividades.get(o.id);
  if (!a){ shell("Ordem de serviço", `<p>Esta atividade não existe mais.</p>`); return; }
  o.a = a; o.oc = o.oc || nextOcc(a, todayD()) || a.data; o.prio = o.prio || osPrioridade(a, o.oc); o.obs = o.obs ?? ""; o.numero = o.saved?.numero || osNumero();
  const txt = osTexto(o), ph = adminPhone(), wa = `https://wa.me/${ph}?text=${encodeURIComponent(txt)}`;
  shell(`Ordem de serviço nº ${o.numero}`, `
    <div><div class="d-cat c-${a.categoria}"><span class="dot"></span>${CAT[a.categoria]}</div><h2 class="d-title">${esc(a.titulo)}</h2>
      <p class="d-status">Data prevista: <b>${fmtD(o.oc)}</b>${status(a.id, o.oc) === "late" ? ` · <b class="late">vencida</b>` : ""}</p></div>
    <div class="form">
      <label class="fld"><span>Prioridade</span><select id="osPrio">${Object.keys(PRIO).map(k => `<option value="${k}" ${o.prio === k ? "selected" : ""}>${PRIO[k]}</option>`).join("")}</select></label>
      <label class="fld"><span>Enviar para</span><input value="${esc(S.ed?.administradora?.nome || "Administradora")}" disabled></label>
      <label class="fld full"><span>Observação (opcional)</span><textarea id="osObs" maxlength="600" placeholder="Ex.: preferência por manhã; avisar moradores do bloco B">${esc(o.obs)}</textarea></label>
    </div>
    <div class="msgbox"><div class="msgmeta">Prévia da mensagem</div><pre id="msgText">${esc(txt)}</pre></div>
    <div class="actions" style="justify-content:flex-start">
      <a class="btn" href="${esc(wa)}" target="_blank" rel="noopener" id="osWa">${ph ? "Enviar à administradora pelo WhatsApp" : "Enviar pelo WhatsApp"}</a>
      <button class="btn sec" id="osCopy">Copiar</button>
      ${S.downloads ? `<button class="btn sec" id="osPdf">Baixar para imprimir</button>` : ""}
    </div>
    <p class="hint" id="osMsg">${o.saved ? `Registrada no histórico em ${new Date(o.saved.criadoEm).toLocaleDateString("pt-BR")}.` : "Ao enviar, copiar ou baixar, a ordem fica registrada no histórico do edifício."}</p>
    ${!ph ? `<p class="hint">Cadastre o telefone da administradora em Edifício para o WhatsApp abrir direto na conversa dela.</p>` : ""}`);
}
async function osRegistrar(){
  const o = S.open; if (o.saved || !S.db || !podeEditar()) return;
  const body = {numero:o.numero, atividadeId:o.a.id, ocorrencia:o.oc, prioridade:o.prio, obs:o.obs, texto:osTexto(o), destino:S.ed?.administradora?.nome || "administradora", autor:S.myId, criadoEm:Date.now()};
  try { const ref = S.db.collection("ordens").doc(); await ref.set({...body, id:ref.id}); o.saved = {...body, id:ref.id}; const m = $("#osMsg"); if (m) m.textContent = "Ordem registrada no histórico do edifício."; }
  catch { const m = $("#osMsg"); if (m) m.textContent = "Não foi possível registrar a ordem no histórico."; }
}
async function osCopy(){
  try { await navigator.clipboard.writeText($("#msgText").textContent); $("#osMsg").textContent = "Mensagem copiada."; }
  catch { const r = document.createRange(); r.selectNodeContents($("#msgText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("#osMsg").textContent = "Texto selecionado. Use Copiar do seu aparelho."; }
  osRegistrar();
}
async function osPdf(){
  const o = S.open;
  try { await S.downloads.save({filename:`OS-${o.numero.replace("/","-")}-${slug(S.nome)}.html`, data:osHTML(o)}); osRegistrar(); }
  catch (e){ if (e?.code !== "declined") $("#osMsg").textContent = "Não foi possível gerar o arquivo."; }
}
function osListHTML(id){
  const list = S.ordens.filter(o => o.atividadeId === id || (Array.isArray(o.itens) && o.itens.some(i => i.atividadeId === id))).sort((a,b) => (b.criadoEm||0) - (a.criadoEm||0));
  if (!list.length) return "";
  return `<div class="blk"><h3>Ordens de serviço</h3>${list.map(o => {
    const ocs = o.atividadeId === id ? [o.ocorrencia] : (o.itens.find(i => i.atividadeId === id)?.ocorrencias || []);
    const feito = ocs.length && ocs.every(oc => done(id, oc));
    return `<div class="fact"><span>Nº ${esc(o.numero)} · ${o.criadoEm ? new Date(o.criadoEm).toLocaleDateString("pt-BR") : ""} · para ${ocs.map(fmtD).join(", ")}${o.tipo === "programadas" ? " · pedido de " + esc(o.periodo || "") : ""}</span><b>${feito ? `<span class="st ok">✓ Executada</span>` : `<span class="st warn">Aguardando execução</span>`}</b></div>`; }).join("")}</div>`;
}
