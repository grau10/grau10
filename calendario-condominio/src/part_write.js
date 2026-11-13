/* ---------- escrita ---------- */
async function guard(fn, errEl){
  try { await fn(); return true; }
  catch (e){
    const code = e?.code;
    if (code === "invalid_argument" && S.canWrite == null){ S.writeRefused = true; render(); }
    const msg = code === "invalid_argument" ? "Você não tem permissão para salvar. Peça ao síndico acesso de Colaborador ou superior."
      : code === "quota_exceeded" ? "O calendário atingiu o limite de armazenamento. Exclua registros antigos para continuar."
      : "Não foi possível salvar agora. Verifique a conexão e tente de novo.";
    if (errEl) errEl.textContent = msg;
    return false;
  }
}
const numBR = s => { s = String(s||"").trim(); if (!s) return null; const n = Number(s.replace(/[R$\s]/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",", ".")); return isFinite(n) ? Math.round(n*100)/100 : NaN; };

async function saveActivity(ev){
  ev.preventDefault();
  const id = S.open.id, err = $("#fErr");
  const body = {
    titulo:$("#fTitulo").value.trim(), sistema:$("#fSistema").value.trim(), categoria:$("#fCat").value,
    data:$("#fData").value, periodicidade:$("#fPer").value, porque:$("#fPorque").value.trim(), como:$("#fComo").value.trim(),
    responsavel:$("#fResp").value.trim(), manual:$("#fManual").value.trim(), referencia:$("#fRef").value.trim(), atualizadoEm:Date.now()
  };
  if (!body.titulo || !parse(body.data) || !body.porque){ err.textContent = "Preencha atividade, data e por que fazer."; return; }
  const ok = await guard(async () => {
    if (id) await S.db.doc("atividades/" + id).update(body);
    else { const ref = S.db.collection("atividades").doc(); await ref.set({...body, id:ref.id, criadoPor:S.myId, criadoEm:Date.now()}); S.newId = ref.id; }
  }, err);
  if (ok){ const nid = id || S.newId; S.sel = body.data; const d = parse(body.data); S.cursor = new Date(d.getFullYear(), d.getMonth(), 1, 12); openSheet("detail", {id:nid, oc:body.data}); render(); }
}

async function saveNote(ev){
  ev.preventDefault();
  const err = $("#nErr"), custo = numBR($("#nCusto").value);
  if (Number.isNaN(custo)){ err.textContent = "Custo inválido. Use apenas números, por exemplo 1.250,00."; return; }
  const body = { atividadeId:S.open.id, ocorrencia:$("#nOc").value, dataExecucao:$("#nData").value || null, executor:$("#nExec").value.trim(),
    custo, texto:$("#nTexto").value.trim(), concluida:$("#nDone").checked, autor:S.myId, criadoEm:Date.now() };
  if (!body.executor && !body.texto && custo == null && !body.concluida){ err.textContent = "Escreva algo antes de salvar."; return; }
  const btn = ev.submitter; if (btn) btn.disabled = true;
  const ok = await guard(async () => { const ref = S.db.collection("registros").doc(); await ref.set({...body, id:ref.id}); }, err);
  if (btn) btn.disabled = false;
  if (ok){ S.lastDetailId = null; S.open.oc = body.ocorrencia; renderDetail(); }
}

async function doImport(){
  const start = parse($("#iData").value), err = $("#iErr");
  if (!start){ err.textContent = "Escolha a primeira data."; return; }
  const keys = [...document.querySelectorAll(".tpl input:checked:not(:disabled)")].map(i => i.dataset.k);
  if (!keys.length){ err.textContent = "Selecione ao menos uma atividade."; return; }
  const btn = $("#doImport"); btn.disabled = true;
  let n = 0;
  for (const k of keys){
    const x = TEMPLATE.find(t => t.k === k);
    const ok = await guard(async () => {
      const ref = S.db.collection("atividades").doc("modelo-" + k);
      await ref.set({id:ref.id, modelo:k, titulo:x.t, sistema:x.s, categoria:x.c, periodicidade:x.p, data:ymd(start),
        porque:x.pq, como:x.como, responsavel:x.r, referencia:x.ref, manual:"", criadoPor:S.myId, criadoEm:Date.now(), atualizadoEm:Date.now()});
    }, err);
    if (!ok) break;
    n++; btn.textContent = `Importando ${n}/${keys.length}…`;
  }
  if (n === keys.length){ S.cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12); S.sel = ymd(start); closeSheet(); render(); }
  else btn.disabled = false;
}

async function deleteActivity(){
  const id = S.open.id, regs = regsFor(id);
  const ok = await guard(async () => { for (const r of regs) await S.db.doc("registros/" + r.id).delete(); await S.db.doc("atividades/" + id).delete(); }, null);
  if (ok){ closeSheet(); render(); }
}

async function saveTeam(list){
  const ok = await guard(() => S.db.doc("config/equipe").set({membros:list}), $("#tErr"));
  if (ok){ S.equipe = list; renderTeam(); render(); }
}

