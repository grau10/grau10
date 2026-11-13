/* EngLink Síndico: modo aplicativo (PWA).
   Fornece window.claude.use() com dados guardados no próprio aparelho,
   para o mesmo código do calendário rodar fora do Claude. */
(() => {
  "use strict";
  const KEY = "englink.db.v1";
  const ME = "local-sindico";
  window.__ENGLINK_APP_URL = location.origin + location.pathname.replace(/index\.html$/, "");

  /* ---------- armazenamento ---------- */
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { store = {}; }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { console.warn("Sem espaço para salvar", e); } };
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const parentOf = p => p.split("/").slice(0, -1).join("/");
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const docListeners = new Map(), colListeners = new Map();
  const on = (map, key, fn) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(fn); return () => map.get(key)?.delete(fn); };
  const snapDoc = path => { const v = store[path]; return {id:path.split("/").pop(), exists:v !== undefined, data:() => clone(v), metadata:{fromCache:false, hasPendingWrites:false}}; };
  const snapCol = col => {
    const docs = Object.keys(store).filter(p => parentOf(p) === col).sort().map(snapDoc);
    return {docs, size:docs.length, empty:!docs.length, docChanges:() => [], metadata:{fromCache:false, hasPendingWrites:false}};
  };
  const notify = path => {
    queueMicrotask(() => {
      docListeners.get(path)?.forEach(fn => { try { fn(snapDoc(path)); } catch (e) { console.error(e); } });
      const col = parentOf(path);
      colListeners.get(col)?.forEach(fn => { try { fn(snapCol(col)); } catch (e) { console.error(e); } });
    });
  };
  const check = (path, even) => {
    const n = String(path).split("/").filter(Boolean).length;
    if ((n % 2 === 0) !== even) throw new TypeError(`Caminho inválido: ${path}`);
  };

  function docRef(path){
    check(path, true);
    return {
      id:path.split("/").pop(), path,
      async get(){ return snapDoc(path); },
      async set(data){ store[path] = clone(data); persist(); notify(path); },
      async update(data){
        if (store[path] === undefined) throw {code:"invalid_argument", message:"Documento não existe"};
        const merge = (a, b) => { for (const k of Object.keys(b)){ const v = b[k]; if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], v); else a[k] = clone(v); } return a; };
        merge(store[path], data); persist(); notify(path);
      },
      async delete(){ delete store[path]; persist(); notify(path); },
      async acquire(){ return {acquired:true}; },
      onSnapshot(next){ const off = on(docListeners, path, next); queueMicrotask(() => next(snapDoc(path))); return off; },
      collection(sub){ return colRef(path + "/" + sub); }
    };
  }
  function colRef(path){
    check(path, false);
    const q = {
      path,
      doc(id){ return docRef(path + "/" + (id || rid())); },
      async add(data){ const r = q.doc(); await r.set(data); return r; },
      async get(){ return snapCol(path); },
      onSnapshot(next){ const off = on(colListeners, path, next); queueMicrotask(() => next(snapCol(path))); return off; },
      where(){ return q; }, orderBy(){ return q; }, limit(){ return q; }
    };
    return q;
  }
  const db = {doc:docRef, collection:colRef};

  /* sincroniza entre abas do mesmo aparelho */
  addEventListener("storage", e => {
    if (e.key !== KEY) return;
    try { store = JSON.parse(e.newValue || "{}") || {}; } catch { return; }
    [...docListeners.keys()].forEach(notify);
    [...colListeners.keys()].forEach(c => colListeners.get(c).forEach(fn => fn(snapCol(c))));
  });

  /* ---------- pessoa (o síndico deste aparelho) ---------- */
  const avatar = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#222"/><circle cx="20" cy="16" r="7" fill="#fff"/><path d="M7 35c2-8 8-11 13-11s11 3 13 11" fill="#fff"/></svg>');
  const nome = () => { try { return store["config/edificio"]?.sindico?.nome || ""; } catch { return ""; } };
  const user = {
    async isOwner(){ return true; }, async canEdit(){ return true; }, async can(){ return true; },
    async id(){ return ME; }, async name(){ return nome(); }, async avatarUrl(){ return avatar; }, async email(){ return null; },
    async me(){ return {id:ME, name:nome(), avatarUrl:avatar, color:"#222222", email:null, isOwner:true, canEdit:true}; },
    async profiles(ids){ return Object.fromEntries([].concat(ids).map(i => [i, {id:i, name:i === ME ? (nome() || "Síndico(a)") : "", avatarUrl:avatar, color:"#222222", email:null, isMe:i === ME, guest:false}])); },
    async search(){ return []; }
  };

  /* ---------- salvar arquivos (livro, OS, cópia de segurança) ---------- */
  const TYPES = {html:"text/html", csv:"text/csv", json:"application/json", txt:"text/plain", pdf:"application/pdf"};
  const downloads = {
    async save({filename, data}){
      const ext = String(filename).split(".").pop().toLowerCase();
      const blob = data instanceof Blob ? data : new Blob([data], {type:(TYPES[ext] || "application/octet-stream") + ";charset=utf-8"});
      const file = new File([blob], filename, {type:blob.type});
      if (navigator.canShare?.({files:[file]})){
        try { await navigator.share({files:[file], title:filename}); return {status:"saved"}; }
        catch (e){ if (e?.name === "AbortError") throw {code:"declined", message:"Cancelado"}; }
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return {status:"saved"};
    }
  };

  const caps = {db, user, downloads};
  window.claude = {use:async name => caps[name] || null};

  /* ---------- primeira abertura: oferecer a demonstração ---------- */
  const vazio = !Object.keys(store).some(p => p.startsWith("atividades/"));
  if (vazio){
    addEventListener("DOMContentLoaded", () => {
      const bar = document.createElement("div");
      bar.className = "demo-offer";
      bar.innerHTML = `<div><b>Primeira vez por aqui?</b><span>Veja o aplicativo funcionando com o Edifício Vogue de demonstração, ou comece pelo plano-modelo em Ajustes.</span></div>
        <div class="demo-act"><button class="btn" id="demoLoad">Ver demonstração</button><button class="tlink" id="demoSkip">Agora não</button></div>`;
      document.querySelector(".app")?.prepend(bar);
      bar.querySelector("#demoSkip").onclick = () => bar.remove();
      bar.querySelector("#demoLoad").onclick = async () => {
        bar.querySelector("#demoLoad").textContent = "Carregando…";
        try {
          const d = await (await fetch("demo.json")).json();
          (d.atividades || []).forEach(a => { store["atividades/" + a.id] = a; });
          (d.registros || []).forEach(r => { store["registros/" + r.id] = r; });
          (d.envios || []).forEach(r => { store["envios/" + r.id] = r; });
          if (d.edificio) store["config/edificio"] = d.edificio;
          if (d.condominio) store["config/geral"] = {nome:d.condominio};
          persist(); location.reload();
        } catch { bar.querySelector("#demoLoad").textContent = "Tente de novo"; }
      };
    });
  }

  /* atalho do ícone: "Encomendar manutenções" abre direto a tela do pedido */
  if (new URLSearchParams(location.search).get("acao") === "encomendar"){
    let n = 0; const t = setInterval(() => { const b = document.getElementById("sendBtn"); if ((b && !b.hidden) || ++n > 50){ clearInterval(t); b && !b.hidden && b.click(); } }, 100);
  }

  /* ---------- instalação e funcionamento sem internet ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  /* convite para instalar: Android mostra o botão do sistema; iPhone recebe a instrução */
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const visto = () => { try { return localStorage.getItem("englink.install.dismiss") === "1"; } catch { return false; } };
  const fechar = el => { try { localStorage.setItem("englink.install.dismiss", "1"); } catch {} el.remove(); };
  const convite = (html, onInstall) => {
    if (standalone || visto() || document.querySelector(".install-tip")) return;
    const el = document.createElement("div"); el.className = "install-tip"; el.innerHTML = html;
    document.body.appendChild(el);
    el.querySelector("[data-fechar]").onclick = () => fechar(el);
    const b = el.querySelector("[data-instalar]"); if (b && onInstall) b.onclick = () => onInstall(el);
  };
  addEventListener("beforeinstallprompt", ev => {
    ev.preventDefault();
    convite(`<div><b>Instale o EngLink Síndico</b><span>Ícone na tela inicial e funciona sem internet.</span></div><button class="btn" data-instalar>Instalar</button><button class="x" data-fechar aria-label="Fechar">✕</button>`,
      async el => { ev.prompt(); try { await ev.userChoice; } catch {} el.remove(); });
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !standalone) addEventListener("load", () => setTimeout(() => convite(
    `<div><b>Instale no iPhone</b><span>Toque em <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg> Compartilhar e depois em <b>Adicionar à Tela de Início</b>.</span></div><button class="x" data-fechar aria-label="Fechar">✕</button>`), 1500));
})();
