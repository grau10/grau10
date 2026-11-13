// Gera as duas versões a partir de src/:
//   calendario-condominio.html  → página publicada no Claude (artifact)
//   ../app/index.html           → aplicativo para celular (PWA, Android e iOS)
// Uso: node build.mjs
import {readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = f => readFileSync(join(here, "src", f), "utf8");
const parts = ["part_head.html", "part_logic.js", "part_render.js", "part_extra.js", "part_envio.js", "part_os.js", "part_lote.js", "part_write.js", "part_tail.js"];
const page = parts.map(src).join("");

writeFileSync(join(here, "calendario-condominio.html"), page);

const cut = page.indexOf('<div class="app">');
const headBits = page.slice(0, cut).replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, "");
const body = page.slice(cut);
const app = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Calendário de manutenção do condomínio, ordens de serviço para a administradora e histórico do edifício.">
<meta name="theme-color" content="#ffffff">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="EngLink">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html,body{-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}
body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}
img{max-width:100%}
[hidden]{display:none!important}
.demo-offer{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between;border:1px solid var(--ink,#222);border-radius:12px;padding:14px 16px}
.demo-offer b{display:block;font-size:16px}
.demo-offer span{display:block;font-size:14px;color:var(--muted,#6a6a6a)}
.demo-act{display:flex;gap:14px;align-items:center}
.install-tip{position:fixed;z-index:60;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));
  background:#fff;border:1px solid #ddd;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:12px 12px 12px 16px;display:flex;gap:10px;align-items:center}
.install-tip > div{flex:1;min-width:0}
.install-tip > div > b{display:block;font-size:15px}
.install-tip span{display:block;font-size:13.5px;color:#6a6a6a}
.install-tip .btn{padding:10px 16px;font-size:15px}
@media (display-mode: standalone){body{padding-top:6px}}
</style>
<script>
${src("shim-local.js")}
</script>
${headBits}</head>
<body>
${body}
</body>
</html>
`;
writeFileSync(join(here, "..", "app", "index.html"), app);
console.log("ok:", page.length, "bytes (artifact),", app.length, "bytes (app)");
