/* ---------- renderização ---------- */
const CAT_SHORT = {preventiva:"Programada", corretiva:"Reparo", outras:"Vistoria"};
const DIAS_LONG = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const longDay = k => { const d = parse(k); return d ? `${cap(DIAS_LONG[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]}` : ""; };
const shortDay = k => { const d = parse(k); return d ? `${pad(d.getDate())} ${MESES[d.getMonth()].slice(0,3)}` : ""; };
const monthRange = () => { const m = S.cursor; return [new Date(m.getFullYear(), m.getMonth(), 1, 12), new Date(m.getFullYear(), m.getMonth()+1, 0, 12)]; };

function renderHeader(){
  $("#condoName").textContent = S.nome || "Manutenção das áreas comuns";
  const m = S.cursor;
  $("#monthTitle").innerHTML = `${cap(MESES[m.getMonth()])} <span>${m.getFullYear()}</span>`;
  const [from, to] = monthRange(), ev = eventsBetween(from, to);
  const feitas = ev.filter(e => e.st === "done").length, late = lateList().length;
  const ano = m.getFullYear();
  const custo = S.registros.filter(r => (r.dataExecucao || r.ocorrencia || "").startsWith(String(ano)) && S.cats.has(S.atividades.get(r.atividadeId)?.categoria))
    .reduce((s,r) => s + (typeof r.custo === "number" ? r.custo : 0), 0);
  $("#summary").innerHTML = S.db && S.atividades.size
    ? `<b>${ev.length}</b> previstas · <b>${feitas}</b> concluídas · <span class="${late ? "late" : ""}"><b>${late}</b> atrasada${late === 1 ? "" : "s"}</span> · <b>${brl(custo) || "R$ 0,00"}</b> gastos em ${ano}`
    : "Somente itens do Manual de Uso, Operação e Manutenção das áreas comuns.";
  const v = $("#vToggle");
  v.setAttribute("aria-pressed", S.view === "agenda");
  v.setAttribute("aria-label", S.view === "agenda" ? "Ver em grade" : "Ver em lista");
  document.querySelectorAll("#filters .chip").forEach(b => b.setAttribute("aria-pressed", S.cats.has(b.dataset.cat)));
  $("#addBtn").hidden = !podeEditar();
  $("#sendBtn").hidden = !S.db;
}

function renderBanner(){
  const b = $("#banner");
  if (!S.db){
    b.innerHTML = `<div class="notice"><b>Calendário sem conexão.</b> Entre com uma conta que tenha acesso a este calendário para ver e registrar as atividades.</div>`;
  } else if (S.loaded.a && S.atividades.size === 0){
    b.innerHTML = `<div class="notice"><b>Nenhuma atividade cadastrada.</b> ${podeEditar()
      ? `<button data-go="import">Importe o plano-modelo</button> e mantenha só o que consta no manual do seu condomínio, ou cadastre cada item em <button data-go="add">Nova atividade</button>.`
      : "Quando o síndico ou uma pessoa autorizada cadastrar as atividades do manual, elas aparecem aqui."}</div>`;
  } else b.innerHTML = "";
}

function rowHTML(e, right){
  const a = e.a, isDone = e.st === "done";
  const r = right === "date" ? (e.st === "late" ? `<span class="rr late">${shortDay(e.oc)}</span>` : `<span class="rr">${shortDay(e.oc)}</span>`)
    : `<span class="rr ${e.st === "late" ? "late" : e.st === "today" ? "today" : ""}">${e.st === "next" ? CAT_SHORT[a.categoria] : STATUS_L[e.st]}</span>`;
  return `<button class="row c-${a.categoria} ${isDone ? "done" : ""}" data-open="${esc(a.id)}" data-oc="${e.oc}">
    <span class="ring ${isDone ? "on" : ""}"></span>
    <span style="min-width:0"><span class="rt">${esc(a.titulo)}</span><span class="rs" style="display:block">${esc(a.sistema || CAT[a.categoria])} · ${esc(PER[a.periodicidade]?.l || "")}</span></span>
    ${r}</button>`;
}

function renderMonth(){
  const m = S.cursor, [first, last] = monthRange();
  const ev = eventsBetween(first, last), by = {};
  ev.forEach(e => (by[e.oc] = by[e.oc] || []).push(e));
  const t = ymd(todayD());
  let html = `<div class="dow">${["D","S","T","Q","Q","S","S"].map(d => `<div>${d}</div>`).join("")}</div><div class="grid">`;
  for (let i = 0; i < first.getDay(); i++) html += `<div class="cell blank"></div>`;
  for (let d = new Date(first); d <= last; d = addDays(d,1)){
    const k = ymd(d), list = by[k] || [];
    const cls = ["cell", k < t && "past", k === t && "today", k === S.sel && "sel"].filter(Boolean).join(" ");
    html += `<button class="${cls}" data-day="${k}" aria-label="${d.getDate()} de ${MESES[d.getMonth()]}, ${list.length} atividade${list.length === 1 ? "" : "s"}">
      ${list.some(e => e.st === "late") ? `<span class="flag"></span>` : ""}
      <span class="n">${d.getDate()}</span>
      <span class="marks">${list.slice(0,4).map(e => `<i class="c-${e.a.categoria} ${e.st === "done" ? "done" : ""}"></i>`).join("")}</span>
      <span class="labels">${list.slice(0,2).map(e => `<span class="c-${e.a.categoria} ${e.st === "done" ? "done" : ""}">${esc(e.a.titulo)}</span>`).join("")}${list.length > 2 ? `<em>+${list.length-2}</em>` : ""}</span>
    </button>`;
  }
  $("#view").innerHTML = html + "</div>";
}

function renderAgenda(){
  const [from, to] = monthRange(), ev = eventsBetween(from, to), by = {};
  ev.forEach(e => (by[e.oc] = by[e.oc] || []).push(e));
  const days = Object.keys(by).sort(), t = ymd(todayD());
  $("#view").innerHTML = days.length
    ? days.map(k => `<div class="daygroup"><h4 class="${k === t ? "is-today" : ""}">${longDay(k)}</h4>${by[k].map(e => rowHTML(e)).join("")}</div>`).join("")
    : `<p class="empty">Nenhuma atividade prevista em ${MESES[S.cursor.getMonth()]}.</p>`;
}

function renderList(){
  const sd = parse(S.sel), t = todayD();
  const daily = sd ? eventsBetween(sd, sd) : [];
  const late = lateList();
  const prox = eventsBetween(addDays(t,1), addDays(t,30)).filter(e => e.st !== "done").slice(0,8);
  const daySec = S.view === "agenda" ? "" : `<div class="sec"><h3>${longDay(S.sel)}</h3>
      ${daily.length ? daily.map(e => rowHTML(e)).join("") : `<p class="empty">Nada previsto neste dia.</p>`}
      ${podeEditar() && sd ? `<button class="link" data-new="${S.sel}">Adicionar atividade neste dia</button>` : ""}</div>`;
  const nProg = S.db ? loteResumo() : 0;
  const cta = nProg ? `<button class="cta" data-go="envio"><span><b>Encomendar manutenções programadas</b><small>${nProg} programada${nProg===1?"":"s"} nos próximos 3 meses · gerar ordem de serviço</small></span>›</button>` : "";
  $("#list").innerHTML = `${cta}${daySec}
    ${late.length ? `<div class="sec"><h3>Atrasadas</h3><p class="sub">Previstas nos últimos 6 meses e ainda sem registro de conclusão.</p>${late.slice(0,8).map(e => rowHTML(e,"date")).join("")}${late.length > 8 ? `<p class="empty">e mais ${late.length-8}.</p>` : ""}</div>` : ""}
    <div class="sec"><h3>Próximos 30 dias</h3>${prox.length ? prox.map(e => rowHTML(e,"date")).join("") : `<p class="empty">Nada previsto.</p>`}</div>`;
}

function render(){
  renderTabs(); renderHeader();
  if (S.tab === "calendario"){ renderBanner(); S.view === "agenda" ? renderAgenda() : renderMonth(); renderList(); }
  else if (S.tab === "visao") renderVisao();
  else renderEdificio();
  renderKiosk();
  if (S.open?.type === "detail") renderDetail();
}

/* ---------- folhas ---------- */
function openSheet(type, data){ S.open = {type, ...data}; drawSheet(); }
function closeSheet(){ S.open = null; $("#overlay").innerHTML = ""; }
function drawSheet(){
  if (!S.open) return;
  ({detail:renderDetail, form:renderForm, import:renderImport, team:renderTeam, config:renderConfig, menu:renderMenu, search:renderSearch, edificio:renderEdForm, doc:renderDocForm, envio:renderLote, livro:renderLivro, restore:renderRestore, os:renderOS})[S.open.type]();
}
function shell(title, body){
  const prevScroll = $("#overlay .sheet")?.scrollTop || 0, same = $("#overlay .sheet")?.dataset.key === S.open?.type;
  $("#overlay").innerHTML = `<div class="ov" data-close><div class="sheet" data-key="${esc(S.open?.type)}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-h"><button class="x" data-x aria-label="Fechar"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6L6 18"/></svg></button><h2>${esc(title)}</h2><span></span></div>
    <div class="sheet-b">${body}</div></div></div>`;
  if (same) $("#overlay .sheet").scrollTop = prevScroll;
}

async function names(ids){
  ids = [...new Set(ids.filter(Boolean))];
  if (!S.user || !ids.length) return {};
  try { return await S.user.profiles(ids); } catch { return {}; }
}

function stepsHTML(txt){
  const lines = String(txt || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) return `<p>—</p>`;
  return lines.length === 1 ? `<p>${esc(lines[0])}</p>` : `<ol>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ol>`;
}

async function renderDetail(){
  const {id} = S.open; const a = S.atividades.get(id);
  if (!a){ shell("Atividade", `<p>Esta atividade não existe mais.</p>`); return; }
  const t = todayD();
  const oc = S.open.oc || nextOcc(a, t) || a.data;
  const st = status(a.id, oc);
  const regs = regsFor(a.id).sort((x,y) => (y.ocorrencia||"").localeCompare(x.ocorrencia||"") || (y.criadoEm||0)-(x.criadoEm||0));
  const total = regs.reduce((s,r) => s + (typeof r.custo === "number" ? r.custo : 0), 0);
  const ps = await names(regs.map(r => r.autor));
  if (S.open?.type !== "detail" || S.open.id !== id) return;
  const prox = occurrences(a, t, addMonths(t, 61)).slice(0,3);
  const ocOpts = [...new Set([...occurrences(a, addMonths(t,-12), addDays(t,-1)).slice(-6), ...prox, oc])].sort();
  const ed = podeEditar();
  const keep = id === S.lastDetailId ? collectNoteDraft() : null;
  S.lastDetailId = id;

  const notes = regs.map(r => `<div class="note">
      <div class="nh"><span>Ocorrência de <b class="num">${fmtD(r.ocorrencia)}</b>${r.concluida ? ` · <span class="ok">Concluída</span>` : ""}</span>
      <span>${esc(ps[r.autor]?.name || "Alguém")}${r.criadoEm ? " · " + new Date(r.criadoEm).toLocaleDateString("pt-BR") : ""}</span></div>
      ${(r.executor || typeof r.custo === "number" || r.dataExecucao) ? `<div class="kv">
        ${r.executor ? `<div><span>Executado por</span> ${esc(r.executor)}</div>` : ""}
        ${typeof r.custo === "number" ? `<div><span>Custo</span> <b class="num">${brl(r.custo)}</b></div>` : ""}
        ${r.dataExecucao ? `<div><span>Data</span> <span class="num" style="color:var(--ink)">${fmtD(r.dataExecucao)}</span></div>` : ""}</div>` : ""}
      ${r.texto ? `<p>${esc(r.texto)}</p>` : ""}
      ${ed && (S.isOwner || r.autor === S.myId) ? `<button class="del" style="align-self:flex-start" data-delreg="${esc(r.id)}">Excluir anotação</button>` : ""}
    </div>`).join("");

  const form = ed ? `<form class="form" id="noteForm">
      <label class="fld"><span>Ocorrência</span><select id="nOc">${ocOpts.map(o => `<option value="${esc(o)}" ${o===oc?"selected":""}>${fmtD(o)}</option>`).join("")}</select></label>
      <label class="fld"><span>Data da execução</span><input type="date" id="nData" value="${ymd(t)}"></label>
      <label class="fld"><span>Executado por</span><input id="nExec" placeholder="Pessoa ou empresa" maxlength="120"></label>
      <label class="fld"><span>Custo (R$)</span><input id="nCusto" inputmode="decimal" placeholder="0,00"></label>
      <label class="fld full"><span>Anotações</span><textarea id="nTexto" placeholder="Nota fiscal, garantia, materiais, anomalias encontradas, próximos passos" maxlength="4000"></textarea></label>
      <label class="check full"><input type="checkbox" id="nDone" checked> Marcar esta ocorrência como concluída</label>
      <div class="actions full"><span class="err" id="nErr"></span><button class="btn" type="submit">Salvar anotação</button></div>
    </form>` : "";

  const stTxt = st === "late" ? `<b class="late">Atrasada</b>` : `<b>${STATUS_L[st]}</b>`;
  shell(CAT[a.categoria], `
    <div>
      <div class="d-cat c-${a.categoria}"><span class="dot"></span>${esc(a.sistema || CAT[a.categoria])}</div>
      <h2 class="d-title">${esc(a.titulo)}</h2>
      <p class="d-status">${stTxt} · ${longDay(oc)} de ${oc.slice(0,4)}</p>
    </div>
    ${S.db && st !== "done" ? `<button class="btn" data-os="${esc(a.id)}" data-oc="${esc(oc)}" style="align-self:flex-start">Gerar ordem de serviço</button>` : ""}
    <div class="facts">
      <div class="fact"><span>Periodicidade</span><b>${esc(PER[a.periodicidade]?.l || "—")}</b></div>
      <div class="fact"><span>Próximas datas</span><b class="num">${prox.length ? prox.map(fmtD).join(" · ") : "—"}</b></div>
      <div class="fact"><span>Quem executa</span><b>${esc(a.responsavel || "—")}</b></div>
      <div class="fact"><span>Item do manual</span><b>${a.manual ? esc(a.manual) : `<span class="warn">Não informado</span>`}</b></div>
      ${a.referencia ? `<div class="fact"><span>Normas</span><b>${esc(a.referencia)}</b></div>` : ""}
    </div>
    <div class="hr"></div>
    <div class="blk"><h3>Por que fazer</h3><p>${esc(a.porque || "—")}</p></div>
    <div class="blk"><h3>Como fazer</h3>${stepsHTML(a.como)}</div>
    <div class="hr"></div>
    ${osListHTML(a.id)}
    <div class="blk"><h3>Bloco de notas</h3>
      <p class="notes-sum">${regs.length ? `${regs.length} registro${regs.length===1?"":"s"} · total <b class="num" style="color:var(--ink)">${brl(total) || "R$ 0,00"}</b>` : "Registre quem executou, quanto custou, notas fiscais, garantias e observações do serviço."}</p>
      ${notes}${form}
    </div>
    ${ed ? `<div class="hr"></div><div class="actions" id="actRow"><button class="tlink" data-edit="${esc(a.id)}">Editar atividade</button><button class="tlink red" data-delask>Excluir atividade</button></div>` : ""}
  `);
  if (keep) restoreNoteDraft(keep);
}
function collectNoteDraft(){
  if (!$("#noteForm")) return null;
  return {e:$("#nExec").value, c:$("#nCusto").value, t:$("#nTexto").value, d:$("#nData").value, done:$("#nDone").checked, oc:$("#nOc").value};
}
function restoreNoteDraft(k){
  if (!$("#noteForm")) return;
  $("#nExec").value = k.e; $("#nCusto").value = k.c; $("#nTexto").value = k.t; $("#nData").value = k.d; $("#nDone").checked = k.done;
  if ([...$("#nOc").options].some(o => o.value === k.oc)) $("#nOc").value = k.oc;
}

function renderForm(){
  const a = S.open.id ? S.atividades.get(S.open.id) : null;
  const v = a || {categoria:"preventiva", periodicidade:"mensal", data:S.open.date || ymd(todayD())};
  shell(a ? "Editar atividade" : "Nova atividade", `
    <form id="aForm" class="form">
      <label class="fld full"><span>Atividade</span><input id="fTitulo" required maxlength="140" value="${esc(v.titulo)}" placeholder="Ex.: Limpeza dos reservatórios"></label>
      <label class="fld"><span>Área ou sistema</span><input id="fSistema" list="sistemas" maxlength="80" value="${esc(v.sistema)}" placeholder="Escolha ou digite"></label>
      <label class="fld"><span>Classificação</span><select id="fCat">${Object.keys(CAT).map(c => `<option value="${c}" ${v.categoria===c?"selected":""}>${CAT[c]}</option>`).join("")}</select></label>
      <label class="fld"><span>${a ? "Data de referência" : "Primeira data"}</span><input type="date" id="fData" required value="${esc(v.data)}"></label>
      <label class="fld"><span>Periodicidade</span><select id="fPer">${Object.keys(PER).map(p => `<option value="${p}" ${v.periodicidade===p?"selected":""}>${PER[p].l}</option>`).join("")}</select></label>
      <label class="fld full"><span>Por que fazer</span><textarea id="fPorque" required maxlength="1500" placeholder="Qual risco ou dano esta atividade evita?">${esc(v.porque)}</textarea></label>
      <label class="fld full"><span>Como fazer (um passo por linha)</span><textarea id="fComo" maxlength="4000" placeholder="Passo a passo conforme o manual">${esc(v.como)}</textarea></label>
      <label class="fld"><span>Quem executa</span><input id="fResp" maxlength="120" value="${esc(v.responsavel)}" placeholder="Zelador, empresa especializada"></label>
      <label class="fld"><span>Item do manual</span><input id="fManual" maxlength="120" value="${esc(v.manual)}" placeholder="Ex.: seção 6.2, pág. 34"></label>
      <label class="fld full"><span>Normas e referências</span><input id="fRef" maxlength="200" value="${esc(v.referencia)}" placeholder="Ex.: NBR 5674"></label>
      <p class="hint full">O item do manual mantém o calendário restrito ao que consta no manual das áreas comuns.</p>
      <datalist id="sistemas">${SISTEMAS.map(s => `<option value="${esc(s)}">`).join("")}</datalist>
      <div class="actions full"><button type="button" class="tlink" data-x>Cancelar</button><span class="err" id="fErr"></span><button class="btn" type="submit">${a ? "Salvar alterações" : "Adicionar ao calendário"}</button></div>
    </form>`);
}

function renderImport(){
  const existing = new Set([...S.atividades.values()].map(a => a.modelo).filter(Boolean));
  const groups = {};
  TEMPLATE.forEach(x => (groups[x.s] = groups[x.s] || []).push(x));
  const n = new Date(todayD().getFullYear(), todayD().getMonth()+1, 1, 12);
  shell("Importar plano-modelo", `
    <p style="margin:0;font-size:16px">Itens típicos de manuais de áreas comuns, já com como fazer, por que fazer e normas. Marque somente o que consta no manual do seu condomínio e, depois, informe o item do manual em cada atividade.</p>
    <label class="fld" style="max-width:260px"><span>Primeira data das atividades</span><input type="date" id="iData" value="${ymd(n)}"></label>
    ${Object.entries(groups).map(([g, list]) => `<div class="tpl-group"><h4>${esc(g)}</h4>
      ${list.map(x => `<label class="tpl c-${x.c}"><input type="checkbox" data-k="${x.k}" ${existing.has(x.k) ? "disabled" : "checked"}>
        <span>${esc(x.t)} <span class="per">· ${PER[x.p].l}</span><span class="m">${existing.has(x.k) ? "Já está no calendário" : esc(x.pq)}</span></span></label>`).join("")}</div>`).join("")}
    <div class="actions"><button class="tlink" data-x>Cancelar</button><span class="err" id="iErr"></span><button class="btn" id="doImport">Importar selecionadas</button></div>`);
}

async function renderTeam(){
  const ps = await names(S.equipe);
  if (S.open?.type !== "team") return;
  const own = S.isOwner;
  shell("Pessoas autorizadas", `
    <p style="margin:0;font-size:16px">O síndico escolhe quem pode incluir e editar atividades e registrar anotações. As demais pessoas apenas consultam.</p>
    <div class="notice">Para salvar, a pessoa autorizada também precisa de acesso de <b>Colaborador</b> ou superior no botão Compartilhar deste calendário. Quem só consulta pode ficar como Leitor.</div>
    <div>${S.equipe.length ? S.equipe.map(id => `<div class="person"><img alt="" src="${esc(ps[id]?.avatarUrl || "")}"><div class="n">${esc(ps[id]?.name || "Pessoa sem nome visível")}</div>${own ? `<button class="tlink" data-rm="${esc(id)}">Remover</button>` : ""}</div>`).join("") : `<p class="empty">Por enquanto, apenas o síndico edita.</p>`}</div>
    ${own ? `<label class="fld"><span>Adicionar pessoa</span><input id="tSearch" autocomplete="off" placeholder="Digite o nome ou e-mail"></label><div class="results" id="tResults" hidden></div><span class="err" id="tErr"></span>` : ""}`);
}

function renderConfig(){
  shell("Nome do condomínio", `<form id="cForm" class="form">
    <label class="fld full"><span>Nome exibido no calendário e no painel</span><input id="cNome" maxlength="80" value="${esc(S.nome)}" placeholder="Ex.: Residencial Jardim das Araucárias"></label>
    <div class="actions full"><button type="button" class="tlink" data-x>Cancelar</button><span class="err" id="cErr"></span><button class="btn">Salvar</button></div></form>`);
}

function renderMenu(){
  const ed = podeEditar();
  const role = S.isOwner ? "Síndico" : ed ? "Pessoa autorizada" : "Consulta";
  shell("Ajustes", `
    ${S.me ? `<div class="me"><img alt="" src="${esc(S.me.avatarUrl)}"><div><b>${esc(S.me.name || "Você")}</b><small>${role}</small></div></div>` : ""}
    <div class="menu">
      ${ed ? `<button data-go="import"><span>Importar plano-modelo<small>Itens típicos do manual das áreas comuns, com base na NBR 5674</small></span>›</button>` : ""}
      ${S.db ? `<button data-go="envio"><span>Encomendar manutenções programadas<small>Visão dos próximos 3 meses e ordem de serviço para a administradora</small></span>›</button>` : ""}
      ${S.db ? `<button data-go="livro"><span>Livro de manutenção<small>Exportar o histórico do edifício e cópia de segurança</small></span>›</button>` : ""}
      <button data-go="team"><span>Pessoas autorizadas<small>Quem pode incluir atividades e anotar</small></span>›</button>
      ${S.isOwner ? `<button data-go="config"><span>Nome do condomínio<small>${esc(S.nome || "Não definido")}</small></span>›</button>` : ""}
      ${S.isOwner ? `<button data-go="edificio-edit"><span>Informações do edifício<small>Ficha técnica, gestão, fornecedores e infraestrutura</small></span>›</button>` : ""}
      <button data-go="kiosk"><span>Modo painel<small>Tela cheia para o display da área comum</small></span>›</button>
    </div>
    <div class="blk"><h3>Classificação</h3><div class="legend">
      ${Object.keys(CAT).map(c => `<div class="c-${c}"><span class="dot"></span><span><b>${CAT[c]}.</b> ${CAT_DESC[c]}</span></div>`).join("")}
    </div></div>`);
}

function renderSearch(){
  const q = S.open.q || "";
  shell("Buscar atividade", `
    <label class="fld"><span>Atividade, sistema ou norma</span><input id="sQ" autocomplete="off" value="${esc(q)}" placeholder="Ex.: extintores, NBR 5419"></label>
    <div id="sRes"></div>`);
  drawSearchResults(q);
  const i = $("#sQ"); i.focus(); i.setSelectionRange(q.length, q.length);
}
function drawSearchResults(q){
  const norm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const nq = norm(q.trim()), t = todayD();
  const list = [...S.atividades.values()].filter(a => !nq || norm(`${a.titulo} ${a.sistema} ${a.referencia} ${a.manual}`).includes(nq))
    .sort((a,b) => a.titulo.localeCompare(b.titulo)).slice(0,40);
  $("#sRes").innerHTML = list.length ? list.map(a => { const oc = nextOcc(a, t) || a.data; return rowHTML({a, oc, st:status(a.id, oc)}, "date"); }).join("")
    : `<p class="empty">Nenhuma atividade encontrada.</p>`;
}
