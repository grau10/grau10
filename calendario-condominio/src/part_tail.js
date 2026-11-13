/* ---------- eventos ---------- */
function go(where){
  if (where === "import") return openSheet("import", {});
  if (where === "add") return openSheet("form", {date:S.sel});
  if (where === "team") return openSheet("team", {});
  if (where === "config") return openSheet("config", {});
  if (where === "kiosk") return enterKiosk();
  if (where === "edificio-edit"){ edDraftInit(); return openSheet("edificio", {}); }
  if (where === "doc-add") return openSheet("doc", {});
  if (where === "envio") return openSheet("envio", {});
  if (where === "livro") return openSheet("livro", {});
  if (where === "restore"){ restoreData = null; return openSheet("restore", {}); }
}
document.addEventListener("click", async ev => {
  if (ev.target.closest("#osWa")){ osRegistrar(); return; }
  if (ev.target.closest("#ltWa")){ loteRegistrar(); return; }
  const el = ev.target.closest("button,[data-close],[data-kstage]");
  if (!el) return;
  if (el.dataset.kstage !== undefined){ slide = 0; renderKiosk(); scheduleSlide(); return; }
  if (el.dataset.tab) return setTab(el.dataset.tab);
  if (el.dataset.addrow){ const k = el.dataset.addrow; S.edDraft[k].push(k === "infra" ? {sistema:"", descricao:"", local:""} : k === "sindicosAnteriores" ? {nome:"", periodo:""} : {funcao:"", nome:"", contato:""}); return renderEdForm(); }
  if (el.dataset.rmrow){ S.edDraft[el.dataset.rmrow].splice(+el.dataset.i, 1); return renderEdForm(); }
  if (el.dataset.n && S.open?.type === "envio"){ loteEscolher(S.open, +el.dataset.n); return renderLote(); }
  if (el.id === "ltCopy") return loteCopy();
  if (el.id === "ltPdf") return lotePdf();
  if (el.dataset.os) return openSheet("os", {id:el.dataset.os, oc:el.dataset.oc});
  if (el.id === "osCopy") return osCopy();
  if (el.id === "osPdf") return osPdf();
  if (el.dataset.kind){ S.open.kind = el.dataset.kind; return renderEnvio(); }
  if (el.dataset.exp) return exportar(el.dataset.exp);
  if (el.id === "copyMsg") return copyMsg();
  if (el.id === "logEnvio") return logEnvio();
  if (el.id === "doRestore") return doRestore();
  if (el.id === "sendBtn") return openSheet("envio", {});
  if (el.dataset.deldoc){ S.delDoc = el.dataset.deldoc; return render(); }
  if (el.dataset.deldocyes) return deleteDoc(el.dataset.deldocyes);
  if (el.matches("[data-close]") && ev.target !== el) return;
  if (el.matches("[data-close],[data-x]")) return closeSheet();
  if (el.dataset.open) return openSheet("detail", {id:el.dataset.open, oc:el.dataset.oc});
  if (el.dataset.day){ S.sel = el.dataset.day; return render(); }
  if (el.dataset.go) return go(el.dataset.go);
  if (el.dataset.new) return openSheet("form", {date:el.dataset.new});
  if (el.dataset.edit) return openSheet("form", {id:el.dataset.edit});
  if (el.dataset.delreg){ await guard(() => S.db.doc("registros/" + el.dataset.delreg).delete(), $("#nErr")); return; }
  if (el.dataset.rm) return saveTeam(S.equipe.filter(x => x !== el.dataset.rm));
  if (el.dataset.add){ if (!S.equipe.includes(el.dataset.add)) await saveTeam([...S.equipe, el.dataset.add]); return; }
  if (el.matches("[data-delask]")){
    const n = regsFor(S.open.id).length;
    $("#actRow").outerHTML = `<div class="confirm"><span>Excluir esta atividade${n ? ` e ${n} anotação(ões)` : ""}? Não dá para desfazer.</span>
      <span style="display:flex;gap:12px;align-items:center"><button class="tlink" data-delno>Cancelar</button><button class="btn red" data-delyes>Excluir</button></span></div>`;
    return;
  }
  if (el.matches("[data-delyes]")) return deleteActivity();
  if (el.matches("[data-delno]")) return renderDetail();
  if (el.dataset.cat){
    S.cats.has(el.dataset.cat) ? S.cats.delete(el.dataset.cat) : S.cats.add(el.dataset.cat);
    if (!S.cats.size) S.cats.add(el.dataset.cat);
    return render();
  }
  switch (el.id){
    case "prev": S.cursor = new Date(S.cursor.getFullYear(), S.cursor.getMonth()-1, 1, 12); return render();
    case "next": S.cursor = new Date(S.cursor.getFullYear(), S.cursor.getMonth()+1, 1, 12); return render();
    case "todayBtn": { const t = todayD(); S.cursor = new Date(t.getFullYear(), t.getMonth(), 1, 12); S.sel = ymd(t); render(); window.scrollTo({top:0, behavior:"smooth"}); return; }
    case "vToggle": S.view = S.view === "agenda" ? "mes" : "agenda"; lsSet("cal.view", S.view); return render();
    case "addBtn": return openSheet("form", {date:S.sel});
    case "searchBtn": return openSheet("search", {q:""});
    case "menuBtn": return openSheet("menu", {});
    case "doImport": return doImport();
    case "kioskBtn": return enterKiosk();
    case "exitKiosk": return exitKiosk();
  }
});
document.addEventListener("change", ev => {
  if (ev.target.dataset.lk && S.open?.type === "envio"){ const k = ev.target.dataset.lk; ev.target.checked ? S.open.sel.add(k) : S.open.sel.delete(k); renderLote(); }
  if (ev.target.id === "ltVist"){ S.open.vist = ev.target.checked; if (S.open.n) loteEscolher(S.open, S.open.n); renderLote(); }
  if (ev.target.id === "osPrio"){ S.open.prio = ev.target.value; renderOS(); }
  if (ev.target.id === "oAtr"){ S.open.atrasadas = ev.target.checked; renderEnvio(); }
  if (ev.target.id === "oPq"){ S.open.porque = ev.target.checked; renderEnvio(); }
  if (ev.target.id === "rFile" && ev.target.files?.[0]) readRestore(ev.target.files[0]);
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && S.open) closeSheet(); });
document.addEventListener("submit", ev => {
  if (ev.target.id === "aForm") return saveActivity(ev);
  if (ev.target.id === "noteForm") return saveNote(ev);
  if (ev.target.id === "eForm") return saveEdificio(ev);
  if (ev.target.id === "dForm") return saveDoc(ev);
  if (ev.target.id === "cForm"){
    ev.preventDefault();
    const nome = $("#cNome").value.trim();
    guard(() => S.db.doc("config/geral").set({nome}), $("#cErr")).then(ok => { if (ok){ S.nome = nome; closeSheet(); render(); } });
  }
});
document.addEventListener("input", async ev => {
  const d = ev.target.dataset;
  if (d.ef && S.edDraft) return setPath(S.edDraft, d.ef, ev.target.value);
  if (d.list && S.edDraft){ S.edDraft[d.list][+d.i][d.f] = ev.target.value; return; }
  if (ev.target.id === "ltObs"){ S.open.obs = ev.target.value; if (S.open.n){ const D = loteDados(S.open), t = loteTexto(S.open, D), p = $("#msgText"), w = $("#ltWa"); if (p) p.textContent = t; if (w) w.href = `https://wa.me/${adminPhone()}?text=${encodeURIComponent(t)}`; } return; }
  if (ev.target.id === "osObs"){ S.open.obs = ev.target.value; $("#msgText").textContent = osTexto(S.open); const w = $("#osWa"); if (w) w.href = `https://wa.me/${adminPhone()}?text=${encodeURIComponent(osTexto(S.open))}`; return; }
  if (ev.target.id === "sQ"){ S.open.q = ev.target.value; return drawSearchResults(ev.target.value); }
  if (ev.target.id !== "tSearch" || !S.user) return;
  const hits = await S.user.search(ev.target.value.trim());
  const box = $("#tResults"); if (!box) return;
  const list = hits.filter(h => h.id && !S.equipe.includes(h.id) && !h.isMe);
  box.hidden = !list.length;
  box.innerHTML = list.map(h => `<button data-add="${esc(h.id)}"><img alt="" src="${esc(h.avatarUrl)}"><span>${esc(h.name)}${h.email ? ` <span style="color:var(--muted)">· ${esc(h.email)}</span>` : ""}</span></button>`).join("");
});
document.addEventListener("focusin", ev => { if (ev.target.id === "tSearch") ev.target.dispatchEvent(new Event("input", {bubbles:true})); });

/* ---------- modo painel ---------- */
let wakeLock = null, clockTimer = null, lastDay = ymd(todayD());
async function keepAwake(){ try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
function enterKiosk(){
  closeSheet(); document.body.classList.add("painel"); slide = 0; renderKiosk(); scheduleSlide(); keepAwake();
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const n = new Date(), c = $("#kClock"); if (c) c.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
    if (ymd(todayD()) !== lastDay){ lastDay = ymd(todayD()); render(); }
  }, 15000);
}
function exitKiosk(){
  document.body.classList.remove("painel"); clearInterval(clockTimer); clearTimeout(slideTimer);
  try { wakeLock?.release(); } catch {} wakeLock = null;
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  render();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && document.body.classList.contains("painel")) keepAwake(); });

/* ---------- inicialização ---------- */
{ const h = location.hash.slice(1); if (TABS.includes(h)) S.tab = h; }
render();
if (location.hash === "#painel") enterKiosk();

(async () => {
  const use = n => window.claude?.use ? window.claude.use(n).catch(() => null) : null;
  const [db, user, assets, downloads] = await Promise.all([use("db"), use("user"), use("assets"), use("downloads")]);
  S.db = db; S.user = user; S.assets = assets; S.downloads = downloads;
  if (user){
    S.me = await user.me(); S.myId = S.me.id; S.isOwner = S.me.isOwner;
    S.canWrite = await user.can("data.write");
  }
  if (!db){ render(); return; }
  const onErr = () => {};
  db.collection("atividades").onSnapshot(snap => {
    S.atividades = new Map(snap.docs.map(d => { const v = d.data(); return [d.id, {...v, id:d.id, titulo:String(v.titulo||"Sem título"), categoria: CAT[v.categoria] ? v.categoria : "outras"}]; }));
    S.loaded.a = true; render();
  }, onErr);
  db.collection("registros").onSnapshot(snap => {
    S.registros = snap.docs.map(d => ({...d.data(), id:d.id}));
    S.loaded.r = true; render();
  }, onErr);
  db.doc("config/equipe").onSnapshot(s => { const m = s.exists ? s.data().membros : []; S.equipe = Array.isArray(m) ? m.filter(x => typeof x === "string") : []; render(); if (S.open?.type === "team") renderTeam(); }, onErr);
  db.collection("ordens").onSnapshot(snap => { S.ordens = snap.docs.map(d => ({...d.data(), id:d.id})); if (S.open?.type === "detail") renderDetail(); }, onErr);
  db.collection("envios").onSnapshot(snap => { S.envios = snap.docs.map(d => ({...d.data(), id:d.id})); if (S.open?.type === "livro") renderLivro(); }, onErr);
  db.doc("config/backup").onSnapshot(s => { S.ultimoBackup = s.exists ? Number(s.data().ultimo) || null : null; if (S.tab === "edificio") renderEdificio(); }, onErr);
  db.doc("config/edificio").onSnapshot(s => { S.ed = s.exists ? s.data() : {}; render(); }, onErr);
  db.doc("config/geral").onSnapshot(s => { S.nome = s.exists ? String(s.data().nome || "") : ""; render(); }, onErr);
  render();
})();
})();
</script>
