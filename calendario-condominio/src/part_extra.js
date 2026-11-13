/* ---------- abas ---------- */
const TABS = ["calendario","visao","edificio"];
const DEFAULT_LINK = window.__ENGLINK_APP_URL || "https://claude.ai/artifact/PGTQE8oM7WEx1iUApxCdUP";
function setTab(t){
  if (!TABS.includes(t)) t = "calendario";
  S.tab = t; lsSet("cal.tab", t); render(); window.scrollTo({top:0});
}
function renderTabs(){
  document.querySelectorAll(".tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === S.tab));
  TABS.forEach(t => { $("#tab-" + t).hidden = t !== S.tab; });
  $("#monthNav").style.visibility = S.tab === "calendario" ? "visible" : "hidden";
  $("#vToggle").hidden = S.tab !== "calendario";
}

/* ---------- dica flutuante dos gráficos ---------- */
const tip = document.createElement("div");
tip.className = "tip"; tip.hidden = true; document.body.appendChild(tip);
function showTip(el, x, y){
  tip.innerHTML = el.dataset.tip; tip.hidden = false;
  const r = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  let left = x + 14; if (left + r.width > vw - 8) left = x - r.width - 14;
  tip.style.left = Math.max(8, left) + "px"; tip.style.top = Math.max(8, y - r.height - 10) + "px";
}
document.addEventListener("pointermove", ev => { const el = ev.target.closest?.("[data-tip]"); if (el) showTip(el, ev.clientX, ev.clientY); else tip.hidden = true; });
document.addEventListener("pointerdown", ev => { const el = ev.target.closest?.("[data-tip]"); if (el) showTip(el, ev.clientX, ev.clientY); });
window.addEventListener("scroll", () => { tip.hidden = true; }, {passive:true});

/* ---------- visão geral ---------- */
const brlShort = v => v >= 1000 ? `R$ ${(v/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mil` : `R$ ${Math.round(v)}`;
function last12(){ const t = todayD(), out = []; for (let i = 11; i >= 0; i--) out.push(new Date(t.getFullYear(), t.getMonth()-i, 1, 12)); return out; }
function dashData(){
  const t = todayD(), months = last12(), from = months[0];
  const regs = S.registros.filter(r => S.atividades.has(r.atividadeId) && (r.dataExecucao || r.ocorrencia || "") >= ymd(from));
  const series = months.map(m => {
    const key = `${m.getFullYear()}-${pad(m.getMonth()+1)}`, vals = {preventiva:0, corretiva:0, outras:0};
    regs.forEach(r => { if ((r.dataExecucao || r.ocorrencia || "").startsWith(key) && typeof r.custo === "number") vals[S.atividades.get(r.atividadeId).categoria] += r.custo; });
    return {key, label:MESES[m.getMonth()].slice(0,3), year:m.getFullYear(), vals, total:vals.preventiva + vals.corretiva + vals.outras};
  });
  const past = eventsBetween(from, addDays(t,-1), true);
  const prev = past.filter(e => e.a.categoria === "preventiva");
  return {
    series, months,
    prevTotal:prev.length, prevDone:prev.filter(e => e.st === "done").length,
    late:lateList(true), prox:eventsBetween(t, addDays(t,30), true).filter(e => e.st !== "done"),
    cost:series.reduce((s,d) => s + d.total, 0),
    costBy:Object.fromEntries(Object.keys(CAT).map(c => [c, series.reduce((s,d) => s + d.vals[c], 0)]))
  };
}

function renderVisao(){
  const box = $("#tab-visao");
  if (!S.db || (S.loaded.a && !S.atividades.size)){
    box.innerHTML = `<div class="head"><span class="condo">${esc(S.nome || "Manutenção das áreas comuns")}</span><h1>Visão geral</h1></div>
      <div class="notice"><b>Ainda não há dados para mostrar.</b> A visão geral se forma a partir das atividades do calendário e das anotações registradas no bloco de notas.</div>`;
    return;
  }
  const D = S.dash = dashData();
  const conf = D.prevTotal ? Math.round(D.prevDone / D.prevTotal * 100) : null;
  const plan = Object.fromEntries(Object.keys(CAT).map(c => [c, [...S.atividades.values()].filter(a => a.categoria === c).length]));
  const planTotal = Object.values(plan).reduce((a,b) => a+b, 0);

  // situação por sistema
  const sis = {};
  for (const a of S.atividades.values()) (sis[a.sistema || "Sem sistema"] = sis[a.sistema || "Sem sistema"] || []).push(a);
  const t = todayD();
  const sisRows = Object.entries(sis).map(([nome, list]) => {
    const ids = new Set(list.map(a => a.id));
    const ult = S.registros.filter(r => ids.has(r.atividadeId) && r.concluida).map(r => r.dataExecucao || r.ocorrencia).sort().pop();
    const prox = list.map(a => nextOcc(a, t)).filter(Boolean).sort()[0];
    const late = D.late.filter(e => ids.has(e.a.id)).length;
    return {nome, n:list.length, ult, prox, late};
  }).sort((a,b) => b.late - a.late || a.nome.localeCompare(b.nome));

  const recentes = S.registros.filter(r => S.atividades.has(r.atividadeId)).sort((a,b) => (b.criadoEm||0) - (a.criadoEm||0)).slice(0,6);

  box.innerHTML = `
    <div class="head"><span class="condo">${esc(S.nome || "Manutenção das áreas comuns")}</span><h1>Visão geral</h1>
      <p class="summary">Últimos 12 meses, de ${MESES[D.months[0].getMonth()]} de ${D.months[0].getFullYear()} até hoje. Todas as classificações.</p></div>

    <div class="kpis">
      <div class="kpi"><span>Programadas em dia</span><b class="num">${conf == null ? "—" : conf + "%"}</b><small>${D.prevTotal ? `${D.prevDone} de ${D.prevTotal} ocorrências concluídas` : "Nenhuma ocorrência vencida no período"}</small></div>
      <div class="kpi"><span>Atrasadas</span><b class="num ${D.late.length ? "crit" : ""}">${D.late.length}</b><small>${D.late.length ? "sem registro de conclusão" : "tudo em dia"}</small></div>
      <div class="kpi"><span>Próximos 30 dias</span><b class="num">${D.prox.length}</b><small>atividades previstas</small></div>
      <div class="kpi"><span>Custo registrado</span><b class="num">${brl(D.cost) || "R$ 0,00"}</b><small>${D.cost ? `${Math.round(D.costBy.corretiva / D.cost * 100)}% em reparos` : "nenhum custo anotado"}</small></div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Custo de manutenção por mês</h3>
        <div class="legend-row">${Object.keys(CAT).map(c => `<span class="c-${c}"><i class="sw"></i>${CAT_SHORT[c]}</span>`).join("")}</div></div>
      ${D.cost ? `<div id="costChart" class="chart"></div>
        <details class="tbl"><summary>Ver tabela</summary><div class="scroll"><table>
          <thead><tr><th>Mês</th>${Object.keys(CAT).map(c => `<th>${CAT_SHORT[c]}</th>`).join("")}<th>Total</th></tr></thead>
          <tbody>${D.series.map(d => `<tr><td>${d.label}/${String(d.year).slice(2)}</td>${Object.keys(CAT).map(c => `<td class="num">${brl(d.vals[c])}</td>`).join("")}<td class="num"><b>${brl(d.total)}</b></td></tr>`).join("")}</tbody>
        </table></div></details>`
      : `<p class="empty" style="border:0">Nenhum custo registrado nos últimos 12 meses. Os valores aparecem aqui quando alguém anota o custo no bloco de notas de uma atividade.</p>`}
    </div>

    <div class="cols2">
      <div class="card">
        <div class="card-h"><h3>Composição do plano</h3><span class="muted num">${planTotal} atividades</span></div>
        <div class="stack">${Object.keys(CAT).filter(c => plan[c]).map(c => `<i class="c-${c}" style="flex:${plan[c]}" data-tip="<b>${CAT[c]}</b><br>${plan[c]} atividade${plan[c]===1?"":"s"} (${Math.round(plan[c]/planTotal*100)}%)"></i>`).join("")}</div>
        <div class="stack-labels">${Object.keys(CAT).map(c => `<div class="c-${c}"><i class="sw"></i><span>${CAT_SHORT[c]}</span><b class="num">${plan[c]}</b></div>`).join("")}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Últimos registros</h3></div>
        ${recentes.length ? recentes.map(r => { const a = S.atividades.get(r.atividadeId); return `<button class="mini c-${a.categoria}" data-open="${esc(a.id)}" data-oc="${esc(r.ocorrencia)}">
          <span class="ring ${r.concluida ? "on" : ""}"></span><span style="min-width:0"><span class="rt" style="font-size:15px">${esc(a.titulo)}</span><span class="rs" style="display:block">${fmtD(r.dataExecucao || r.ocorrencia)}${r.executor ? " · " + esc(r.executor) : ""}</span></span>
          <span class="rr num">${typeof r.custo === "number" ? brl(r.custo) : ""}</span></button>`; }).join("") : `<p class="empty" style="border:0">Nenhuma anotação registrada ainda.</p>`}
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Situação por sistema</h3></div>
      <div class="scroll"><table class="sis">
        <thead><tr><th>Sistema</th><th>Atividades</th><th>Última execução</th><th>Próxima</th><th>Situação</th></tr></thead>
        <tbody>${sisRows.map(r => `<tr><td><b>${esc(r.nome)}</b></td><td class="num">${r.n}</td><td class="num">${r.ult ? fmtD(r.ult) : "—"}</td><td class="num">${r.prox ? fmtD(r.prox) : "—"}</td>
          <td>${r.late ? `<span class="st crit">! ${r.late} atrasada${r.late===1?"":"s"}</span>` : `<span class="st ok">✓ Em dia</span>`}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>`;
  drawCostChart();
}

function drawCostChart(){
  const box = $("#costChart"); if (!box || !S.dash) return;
  const data = S.dash.series, W = Math.max(300, box.clientWidth), H = 250, m = {t:14, r:6, b:30, l:62};
  const max = Math.max(...data.map(d => d.total), 1);
  const raw = max / 4, p = 10 ** Math.floor(Math.log10(raw)), step = [1,2,2.5,5,10].map(x => x*p).find(s => s >= raw);
  const top = Math.ceil(max / step) * step, ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const iw = W - m.l - m.r, ih = H - m.t - m.b, band = iw / data.length, bw = Math.min(30, band * .58);
  const y = v => m.t + ih - v / top * ih;
  const thisKey = ymd(todayD()).slice(0,7);
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Custo de manutenção por mês, por classificação">`;
  ticks.forEach(v => { svg += `<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" class="${v ? "grid" : "base"}"/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end" class="ax">${v ? brlShort(v) : "0"}</text>`; });
  data.forEach((d, i) => {
    const cx = m.l + band*i + band/2, x = cx - bw/2;
    let acc = 0; const segs = Object.keys(CAT).filter(c => d.vals[c] > 0);
    segs.forEach((c, j) => {
      const y0 = y(acc), y1 = y(acc + d.vals[c]); acc += d.vals[c];
      const isTop = j === segs.length - 1, h = Math.max(1, y0 - y1 - (j ? 2 : 0)), yy = y1;
      const col = `var(--${c === "preventiva" ? "prev" : c === "corretiva" ? "corr" : "outr"})`;
      if (isTop && h > 4){ const r = 4; svg += `<path fill="${col}" d="M${x},${yy+h} V${yy+r} Q${x},${yy} ${x+r},${yy} H${x+bw-r} Q${x+bw},${yy} ${x+bw},${yy+r} V${yy+h} Z"/>`; }
      else svg += `<rect x="${x}" y="${yy}" width="${bw}" height="${h}" fill="${col}"/>`;
    });
    const tipHTML = `<b>${esc(d.label)}/${d.year}</b>${Object.keys(CAT).map(c => `<div class='tr c-${c}'><i class='sw'></i>${CAT_SHORT[c]}<span>${brl(d.vals[c])}</span></div>`).join("")}<div class='tr tot'>Total<span>${brl(d.total)}</span></div>`;
    svg += `<rect x="${m.l + band*i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent" class="hit" data-tip="${esc(tipHTML)}"/>`;
    svg += `<text x="${cx}" y="${H-10}" text-anchor="middle" class="ax ${d.key === thisKey ? "cur" : ""}">${d.label}</text>`;
  });
  box.innerHTML = svg + "</svg>";
}
let rsz; window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => { if (S.tab === "visao") drawCostChart(); }, 150); });

/* ---------- edifício ---------- */
const DOC_TIPOS = ["Habite-se","Alvará de funcionamento","Certificado do Corpo de Bombeiros","Regimento interno","Convenção do condomínio","Manual do proprietário (áreas comuns)","Projeto de arquitetura","Projeto estrutural","Projetos complementares","Laudo técnico","Contrato de manutenção","Ata de assembleia","Apólice de seguro","Outro"];
const CONTATO_FUNCOES = ["Equipe técnica / responsável técnico","Fornecedora de gás","Empresa de elevador","Zeladoria","Portaria / segurança","Manutenção predial"];
const INFRA_SISTEMAS = ["Reservatórios de água","Central de gás","Elevadores","Gerador","Combate a incêndio","Entrada de energia e quadro geral","SPDA (para-raios)","Bombas de recalque"];
const val = v => (v == null || v === "") ? `<span class="na">Não informado</span>` : esc(v);
function docStatus(d){
  if (!d.validade || !parse(d.validade)) return "";
  const days = Math.round((parse(d.validade) - todayD()) / 864e5);
  if (days < 0) return `<span class="st crit">! Vencido em ${fmtD(d.validade)}</span>`;
  if (days <= 60) return `<span class="st warn">! Vence em ${days} dia${days===1?"":"s"}</span>`;
  return `<span class="st ok">✓ Válido até ${fmtD(d.validade)}</span>`;
}
function docHref(d){
  if (d.assetId && /^[0-9a-f]{32}$/.test(d.assetId)) return "/_blob/" + d.assetId;
  return /^https?:\/\//i.test(d.link || "") ? d.link : "";
}
const hasEd = () => { const e = S.ed || {}; return !!(e.ano || e.unidades || e.endereco || e.sistemaConstrutivo || e.sindico?.nome || e.administradora?.nome); };

function renderEdificio(){
  const e = S.ed || {}, own = S.isOwner;
  const person = (rot, p) => `<div class="pcard"><span>${rot}</span><b>${val(p?.nome)}</b>${p?.contato ? `<small class="sel">${esc(p.contato)}</small>` : ""}${p?.extra ? `<small>${esc(p.extra)}</small>` : ""}</div>`;
  const docs = Array.isArray(e.documentos) ? e.documentos : [];
  const contatos = (e.contatos || []).filter(c => c.funcao || c.nome);
  const infra = (e.infra || []).filter(x => x.sistema);
  $("#tab-edificio").innerHTML = `
    <div class="head"><span class="condo">Ficha do empreendimento</span><h1>${esc(S.nome || "Edifício")}</h1>
      <p class="summary">${e.endereco ? esc(e.endereco) : "Endereço não informado"}</p></div>
    ${own ? `<div><button class="btn sec" data-go="edificio-edit">Editar informações do edifício</button></div>` : ""}

    <div class="kpis">
      <div class="kpi"><span>Ano de construção</span><b class="num">${e.ano ? esc(e.ano) : "—"}</b><small>${e.ano && +e.ano > 1900 ? `${todayD().getFullYear() - +e.ano} anos de uso` : "&nbsp;"}</small></div>
      <div class="kpi"><span>Unidades</span><b class="num">${e.unidades ? esc(e.unidades) : "—"}</b><small>${e.pavimentos ? "Pavimentos: " + esc(e.pavimentos) : "&nbsp;"}</small></div>
      <div class="kpi wide"><span>Sistema construtivo</span><b style="font-size:20px">${e.sistemaConstrutivo ? esc(e.sistemaConstrutivo) : "—"}</b><small>${e.area ? esc(e.area) + " de área construída" : "&nbsp;"}</small></div>
    </div>

    <div class="cols2">
      <div class="card"><div class="card-h"><h3>Ficha técnica</h3></div>
        <div class="facts">
          <div class="fact"><span>Construtora / incorporadora</span><b>${val(e.construtora)}</b></div>
          <div class="fact"><span>Projeto de arquitetura</span><b>${val(e.arquitetura)}</b></div>
          <div class="fact"><span>Área construída</span><b>${val(e.area)}</b></div>
          <div class="fact"><span>Pavimentos</span><b>${val(e.pavimentos)}</b></div>
          <div class="fact"><span>Vagas de garagem</span><b>${val(e.vagas)}</b></div>
        </div></div>
      <div class="card"><div class="card-h"><h3>Gestão</h3></div>
        <div class="pgrid">${person("Síndico(a)", e.sindico)}${person("Subsíndico(a)", e.subsindico)}${person("Administradora", e.administradora)}
        ${(e.sindicosAnteriores || []).filter(s => s.nome).length ? `<div class="pcard"><span>Síndicos anteriores</span>${e.sindicosAnteriores.filter(s => s.nome).map(s => `<small style="color:var(--ink)">${esc(s.nome)}${s.periodo ? " · " + esc(s.periodo) : ""}</small>`).join("")}</div>` : ""}</div></div>
    </div>

    <div class="card"><div class="card-h"><h3>Livro de manutenção</h3><button class="tlink" data-go="livro">Exportar histórico</button></div>
      <p style="margin:0;font-size:15px">O histórico de manutenção pertence ao condomínio e passa de um síndico para o próximo. ${S.ultimoBackup ? `Última cópia de segurança em ${new Date(S.ultimoBackup).toLocaleDateString("pt-BR")}.` : `<span class="st warn">! Nenhuma cópia de segurança feita ainda.</span>`}</p></div>

    <div class="card"><div class="card-h"><h3>Equipe técnica e fornecedores</h3></div>
      ${contatos.length ? contatos.map(c => `<div class="crow"><span>${esc(c.funcao)}</span><b>${val(c.nome)}</b><small class="sel">${esc(c.contato || "")}</small></div>`).join("") : `<p class="empty" style="border:0">Nenhum contato cadastrado.</p>`}</div>

    <div class="card"><div class="card-h"><h3>Documentos</h3>${own ? `<button class="tlink" data-go="doc-add">Adicionar documento</button>` : ""}</div>
      ${docs.length ? docs.map(d => { const h = docHref(d); return `<div class="drow">
        <span class="dicon" aria-hidden="true"><svg class="i" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg></span>
        <span style="min-width:0"><b>${esc(d.nome || d.tipo)}</b><small>${esc(d.tipo || "")}</small>${docStatus(d)}</span>
        <span class="dact">${h ? `<a class="tlink" href="${esc(h)}" target="_blank" rel="noopener">Abrir</a>` : `<span class="na">Sem arquivo</span>`}
        ${own ? (S.delDoc === d.id ? `<button class="tlink red" data-deldocyes="${esc(d.id)}">Confirmar exclusão</button>` : `<button class="tlink red" data-deldoc="${esc(d.id)}">Excluir</button>`) : ""}</span></div>`; }).join("")
      : `<p class="empty" style="border:0">Nenhum documento anexado. Sugestões: habite-se, alvarás, certificado do Corpo de Bombeiros, regimento interno, convenção, manual do proprietário e projeto de arquitetura.</p>`}</div>

    <div class="card"><div class="card-h"><h3>Infraestrutura do edifício</h3><span class="muted">Exibida no painel em modo descanso</span></div>
      ${infra.length ? `<div class="igrid">${infra.map(x => `<div class="icard"><b>${esc(x.sistema)}</b>${x.descricao ? `<p>${esc(x.descricao)}</p>` : ""}${x.local ? `<small>Local: ${esc(x.local)}</small>` : ""}</div>`).join("")}</div>`
      : `<p class="empty" style="border:0">Nenhum sistema descrito. Informe capacidade dos reservatórios, central de gás, elevadores, gerador e onde ficam registros e quadros.</p>`}</div>`;
}

/* ----- edição ----- */
function edDraftInit(){
  const e = JSON.parse(JSON.stringify(S.ed || {}));
  e.sindico = e.sindico || {}; e.subsindico = e.subsindico || {}; e.administradora = e.administradora || {};
  if (!Array.isArray(e.contatos) || !e.contatos.length) e.contatos = CONTATO_FUNCOES.map(f => ({funcao:f, nome:"", contato:""}));
  if (!Array.isArray(e.infra) || !e.infra.length) e.infra = INFRA_SISTEMAS.map(s => ({sistema:s, descricao:"", local:""}));
  if (!Array.isArray(e.sindicosAnteriores)) e.sindicosAnteriores = [];
  e.nome = S.nome; e.linkAcesso = e.linkAcesso || DEFAULT_LINK;
  S.edDraft = e;
}
const F = (id, label, v, ph, full) => `<label class="fld ${full ? "full" : ""}"><span>${label}</span><input data-ef="${id}" value="${esc(v)}" placeholder="${esc(ph || "")}" maxlength="200"></label>`;
function renderEdForm(){
  const e = S.edDraft;
  const listEd = (key, cols) => `${e[key].map((row, i) => `<div class="lrow">${cols.map(([f, ph]) => `<input data-list="${key}" data-i="${i}" data-f="${f}" value="${esc(row[f])}" placeholder="${esc(ph)}" maxlength="300">`).join("")}<button type="button" class="x" data-rmrow="${key}" data-i="${i}" aria-label="Remover linha">✕</button></div>`).join("")}
    <button type="button" class="tlink" data-addrow="${key}">Adicionar linha</button>`;
  shell("Informações do edifício", `
    <form id="eForm" class="form">
      <h3 class="full fh">Identificação</h3>
      ${F("nome","Nome do condomínio",e.nome,"Residencial …",true)}
      ${F("endereco","Endereço",e.endereco,"Rua, número, bairro, cidade",true)}
      ${F("ano","Ano de construção",e.ano,"Ex.: 2012")}
      ${F("unidades","Número de unidades",e.unidades,"Ex.: 48")}
      ${F("pavimentos","Pavimentos",e.pavimentos,"Ex.: 12 + 2 subsolos")}
      ${F("vagas","Vagas de garagem",e.vagas,"Ex.: 60")}
      ${F("area","Área construída",e.area,"Ex.: 6.200 m²")}
      ${F("sistemaConstrutivo","Sistema construtivo",e.sistemaConstrutivo,"Ex.: concreto armado com vedação em alvenaria")}
      ${F("construtora","Construtora / incorporadora",e.construtora,"")}
      ${F("arquitetura","Projeto de arquitetura (autor)",e.arquitetura,"Escritório ou profissional")}
      <h3 class="full fh">Gestão</h3>
      ${F("sindico.nome","Síndico(a)",e.sindico.nome,"Nome")}${F("sindico.contato","Contato do síndico(a)",e.sindico.contato,"Telefone ou e-mail")}
      ${F("sindico.extra","Mandato",e.sindico.extra,"Ex.: 2025–2027",true)}
      ${F("subsindico.nome","Subsíndico(a)",e.subsindico.nome,"Nome")}${F("subsindico.contato","Contato do subsíndico(a)",e.subsindico.contato,"Telefone ou e-mail")}
      ${F("administradora.nome","Administradora",e.administradora.nome,"Empresa")}${F("administradora.contato","Contato da administradora",e.administradora.contato,"Telefone ou e-mail")}
      <h3 class="full fh">Síndicos anteriores</h3>
      <div class="full lst">${listEd("sindicosAnteriores", [["nome","Nome"],["periodo","Período, ex.: 2021–2023"]])}</div>
      <h3 class="full fh">Equipe técnica e fornecedores</h3>
      <div class="full lst">${listEd("contatos", [["funcao","Função"],["nome","Empresa ou pessoa"],["contato","Telefone"]])}</div>
      <h3 class="full fh">Infraestrutura (painel em modo descanso)</h3>
      <div class="full lst">${listEd("infra", [["sistema","Sistema"],["descricao","Descrição, ex.: 2 caixas de 15.000 L"],["local","Local"]])}</div>
      <h3 class="full fh">Painel</h3>
      ${F("linkAcesso","Link de acesso no QR code",e.linkAcesso,DEFAULT_LINK,true)}
      <div class="actions full"><button type="button" class="tlink" data-x>Cancelar</button><span class="err" id="eErr"></span><button class="btn" type="submit">Salvar</button></div>
    </form>`);
}
function setPath(o, path, v){ const ks = path.split("."); let t = o; ks.slice(0,-1).forEach(k => t = t[k] = t[k] || {}); t[ks.at(-1)] = v; }
async function saveEdificio(ev){
  ev.preventDefault();
  const e = S.edDraft, nome = String(e.nome || "").trim();
  const clean = rows => rows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, String(v||"").trim()]))).filter(r => Object.entries(r).some(([k,v]) => v && k !== "funcao" && k !== "sistema"));
  const body = {...e, contatos:clean(e.contatos), infra:clean(e.infra), documentos:(S.ed?.documentos || [])};
  delete body.nome;
  const ok = await guard(async () => { await S.db.doc("config/edificio").set(body); if (nome !== S.nome) await S.db.doc("config/geral").set({nome}); }, $("#eErr"));
  if (ok){ S.ed = body; S.nome = nome; closeSheet(); render(); }
}

function renderDocForm(){
  shell("Adicionar documento", `
    <form id="dForm" class="form">
      <label class="fld full"><span>Tipo</span><select id="dTipo">${DOC_TIPOS.map(t => `<option>${esc(t)}</option>`).join("")}</select></label>
      <label class="fld full"><span>Nome do documento</span><input id="dNome" maxlength="140" placeholder="Ex.: Habite-se nº 123/2012"></label>
      <label class="fld"><span>Validade (se houver)</span><input type="date" id="dValidade"></label>
      ${S.assets ? `<label class="fld"><span>Arquivo (PDF ou imagem, até 20 MB)</span><input type="file" id="dArq" accept="application/pdf,image/png,image/jpeg,image/webp"></label>` : ""}
      <label class="fld full"><span>${S.assets ? "Ou link externo" : "Link do documento"}</span><input id="dLink" type="url" placeholder="https://…"></label>
      <div class="actions full"><button type="button" class="tlink" data-x>Cancelar</button><span class="err" id="dErr"></span><button class="btn" type="submit">Salvar documento</button></div>
    </form>`);
}
async function saveDoc(ev){
  ev.preventDefault();
  const err = $("#dErr"), file = $("#dArq")?.files?.[0], link = $("#dLink").value.trim();
  if (!file && !link){ err.textContent = "Anexe um arquivo ou informe um link."; return; }
  if (link && !/^https?:\/\//i.test(link)){ err.textContent = "O link precisa começar com https://"; return; }
  const btn = ev.submitter; if (btn){ btn.disabled = true; btn.textContent = "Salvando…"; }
  let assetId = "";
  if (file){
    try { assetId = (await S.assets.upload(file)).id; }
    catch (e){
      err.textContent = e?.code === "too_large" ? "Arquivo maior que 20 MB." : e?.code === "unsupported_type" ? "Use PDF, PNG, JPG ou WEBP." : "Não foi possível enviar o arquivo. Tente de novo.";
      if (btn){ btn.disabled = false; btn.textContent = "Salvar documento"; } return;
    }
  }
  const d = {id:"d" + Date.now().toString(36), tipo:$("#dTipo").value, nome:$("#dNome").value.trim(), validade:$("#dValidade").value || "", assetId, link:file ? "" : link, criadoEm:Date.now()};
  const docs = [...(S.ed?.documentos || []), d];
  const ok = await guard(() => S.db.doc("config/edificio").set({...(S.ed || {}), documentos:docs}), err);
  if (ok){ S.ed = {...(S.ed || {}), documentos:docs}; closeSheet(); render(); }
  else if (btn){ btn.disabled = false; btn.textContent = "Salvar documento"; }
}
async function deleteDoc(id){
  const d = (S.ed?.documentos || []).find(x => x.id === id); if (!d) return;
  const docs = S.ed.documentos.filter(x => x.id !== id);
  const ok = await guard(() => S.db.doc("config/edificio").set({...S.ed, documentos:docs}), null);
  if (ok){
    if (d.assetId && S.assets){ try { await S.assets.delete(d.assetId); } catch {} }
    S.ed = {...S.ed, documentos:docs}; S.delDoc = null; render();
  }
}

/* ---------- painel: telas em rotação ---------- */
let slide = 0, slideTimer = null;
function kioskSlides(){
  const e = S.ed || {}, s = ["agenda"];
  if (hasEd()) s.push("edificio");
  if ((e.infra || []).some(x => x.sistema && (x.descricao || x.local))) s.push("infra");
  s.push("contatos");
  return s;
}
function scheduleSlide(){
  clearTimeout(slideTimer);
  if (!document.body.classList.contains("painel")) return;
  const list = kioskSlides(), cur = list[slide % list.length];
  slideTimer = setTimeout(() => { slide = (slide + 1) % kioskSlides().length; renderKiosk(); scheduleSlide(); }, cur === "agenda" ? 45000 : 15000);
}
function kioskSlideHTML(kind){
  const t = todayD(), tk = ymd(t), e = S.ed || {};
  if (kind === "agenda"){
    const semana = eventsBetween(t, addDays(t,7), true).filter(x => x.st !== "done");
    const lateAll = lateList(true), seen = new Map();
    lateAll.forEach(l => { const c = seen.get(l.a.id); seen.set(l.a.id, {...l, n:(c?.n || 0) + 1, first:c?.first || l.oc}); });
    const late = [...seen.values()];
    const recentes = S.registros.filter(r => r.concluida && S.atividades.has(r.atividadeId)).sort((a,b) => (b.criadoEm||0) - (a.criadoEm||0)).slice(0,5);
    const k = x => `<div class="k-row c-${x.a.categoria}"><span class="ring"></span><div>
      <div class="d ${x.st === "late" ? "late" : ""}">${x.n > 1 ? `${x.n} ocorrências pendentes desde ${shortDay(x.first)}` : (x.oc === tk ? "Hoje" : longDay(x.oc))} · ${CAT_SHORT[x.a.categoria]}</div>
      <div class="tt">${esc(x.a.titulo)}</div><div class="w">${esc(x.a.porque || "")}</div></div></div>`;
    const hoje = eventsBetween(t, t, true);
    const first = new Date(t.getFullYear(), t.getMonth(), 1, 12), last = new Date(t.getFullYear(), t.getMonth()+1, 0, 12);
    const by = {}; eventsBetween(first, last, true).forEach(x => (by[x.oc] = by[x.oc] || []).push(x));
    let cells = "";
    for (let i = 0; i < first.getDay(); i++) cells += `<div class="kc blank"></div>`;
    for (let d = new Date(first); d <= last; d = addDays(d,1)){
      const key = ymd(d), list = by[key] || [];
      cells += `<div class="kc ${key < tk ? "past" : ""} ${key === tk ? "today" : ""}"><span class="kn">${d.getDate()}</span>
        ${list.slice(0,3).map(x => `<span class="ke c-${x.a.categoria} ${x.st}">${esc(x.a.titulo)}</span>`).join("")}
        ${list.length > 3 ? `<span class="km">+${list.length-3} atividades</span>` : ""}</div>`;
    }
    const rest = (7 - (first.getDay() + last.getDate()) % 7) % 7;
    for (let i = 0; i < rest; i++) cells += `<div class="kc blank"></div>`;
    const rows = Math.ceil((first.getDay() + last.getDate()) / 7);
    return `<div class="k-calwrap">
      <div class="k-month"><h2>${cap(MESES[t.getMonth()])} <span>${t.getFullYear()}</span></h2>
        <div class="k-dow">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => `<div>${d}</div>`).join("")}</div>
        <div class="k-grid" style="grid-template-rows:repeat(${rows},minmax(0,1fr))">${cells}</div></div>
      <div class="k-side">
        <div class="k-col"><h2>Hoje <small>${hoje.length}</small></h2>${hoje.length ? hoje.slice(0,3).map(k).join("") : `<p class="empty">Nenhuma atividade hoje.</p>`}
          ${semana.filter(x => x.oc !== tk).length ? `<p class="k-next">Próxima: <b>${esc(semana.find(x => x.oc !== tk).a.titulo)}</b> · ${longDay(semana.find(x => x.oc !== tk).oc)}</p>` : ""}</div>
        <div class="k-col"><h2>Atrasadas <small>${lateAll.length}</small></h2>${late.length ? late.slice(0,3).map(k).join("") : `<p class="empty">Tudo em dia.</p>`}</div>
      </div></div>`;
  }
  if (kind === "edificio"){
    const tile = (l, v, s) => `<div class="k-tile"><span>${l}</span><b class="${String(v || "").length > 18 ? "long" : ""}">${v ? esc(v) : "—"}</b>${s ? `<small>${s}</small>` : ""}</div>`;
    const p = (l, o) => `<div class="k-person"><span>${l}</span><b>${o?.nome ? esc(o.nome) : "—"}</b>${o?.contato ? `<small>${esc(o.contato)}</small>` : ""}</div>`;
    return `<div class="k-ed"><div class="k-tiles">
        ${tile("Ano de construção", e.ano, e.ano && +e.ano > 1900 ? `${t.getFullYear() - +e.ano} anos` : "")}
        ${tile("Unidades", e.unidades, e.pavimentos ? "Pavimentos: " + esc(e.pavimentos) : "")}
        ${tile("Sistema construtivo", e.sistemaConstrutivo, "")}
        ${tile("Área construída", e.area, "")}
        ${tile("Projeto de arquitetura", e.arquitetura, "")}
        ${tile("Construtora", e.construtora, "")}
      </div><div class="k-people"><h2>Gestão do condomínio</h2>${p("Síndico(a)", e.sindico)}${p("Subsíndico(a)", e.subsindico)}${p("Administradora", e.administradora)}</div></div>`;
  }
  if (kind === "infra"){
    const infra = (e.infra || []).filter(x => x.sistema && (x.descricao || x.local)).slice(0,9);
    return `<div class="k-infra">${infra.map(x => `<div class="k-icard"><b>${esc(x.sistema)}</b>${x.descricao ? `<p>${esc(x.descricao)}</p>` : ""}${x.local ? `<small>Local: ${esc(x.local)}</small>` : ""}</div>`).join("")}</div>`;
  }
  const contatos = (e.contatos || []).filter(c => c.nome || c.contato).slice(0,7);
  return `<div class="k-ed"><div class="k-people" style="flex:1.4"><h2>Equipe técnica e fornecedores</h2>
      ${contatos.length ? contatos.map(c => `<div class="k-person"><span>${esc(c.funcao)}</span><b>${esc(c.nome || "—")}</b>${c.contato ? `<small>${esc(c.contato)}</small>` : ""}</div>`).join("") : `<p class="empty">Contatos ainda não cadastrados.</p>`}</div>
    <div class="k-people k-emerg"><h2>Emergência</h2>
      <div class="k-person"><span>Corpo de Bombeiros</span><b class="big">193</b></div>
      <div class="k-person"><span>SAMU</span><b class="big">192</b></div>
      <div class="k-person"><span>Polícia Militar</span><b class="big">190</b></div>
      ${e.administradora?.contato ? `<div class="k-person"><span>Administradora</span><b>${esc(e.administradora.contato)}</b></div>` : ""}</div></div>`;
}
const SLIDE_T = {agenda:"Manutenção das áreas comuns", edificio:"Conheça o edifício", infra:"Infraestrutura do edifício", contatos:"Contatos úteis"};
function renderKiosk(){
  if (!document.body.classList.contains("painel")) return;
  const list = kioskSlides(); slide = slide % list.length;
  const kind = list[slide], t = todayD(), now = new Date();
  $("#kiosk").innerHTML = `
    <div class="k-top"><div><div class="condo">${SLIDE_T[kind]}</div><h1>${esc(S.nome || "Calendário do Condomínio")}</h1></div>
      <div class="k-clock"><b id="kClock">${pad(now.getHours())}:${pad(now.getMinutes())}</b><span>${longDay(ymd(t))} de ${t.getFullYear()}</span></div></div>
    <div class="k-stage" data-kstage>${kioskSlideHTML(kind)}</div>
    <div class="k-foot">
      <div class="k-dots">${list.map((k,i) => `<i class="${i === slide ? "on" : ""}" title="${SLIDE_T[k]}"></i>`).join("")}</div>
      <div class="legend">${kind === "agenda" ? Object.keys(CAT).map(c => `<div class="c-${c}"><span class="dot"></span>${CAT[c]}</div>`).join("") : ""}</div>
      <div class="k-qr"><div><b>Acesse pelo celular</b><span>Calendário, documentos e contatos</span><button class="tlink" id="exitKiosk">Sair do modo painel</button></div><div id="kQR"></div></div>
    </div>`;
  const q = $("#kQR"), link = (S.ed?.linkAcesso && /^https?:\/\//.test(S.ed.linkAcesso)) ? S.ed.linkAcesso : DEFAULT_LINK;
  if (q && window.QRCode){ try { new QRCode(q, {text:link, width:108, height:108, colorDark:"#222222", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.M}); } catch {} }
  else if (q) q.textContent = link;
}
