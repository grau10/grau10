# EngLink Síndico: aplicativo para celular (Android e iPhone)

O aplicativo é a mesma ferramenta do calendário, em versão que se instala no celular, abre em tela cheia com ícone próprio e funciona sem internet.

## Como está organizado
| Pasta / arquivo | O que é |
|---|---|
| `app/` | O aplicativo pronto para publicar (PWA): `index.html`, ícones, `manifest.webmanifest`, `sw.js` (funcionamento sem internet) e `demo.json` (Edifício Vogue de demonstração) |
| `calendario-condominio/src/` | Código-fonte único, usado pelo app e pela página do Claude |
| `calendario-condominio/build.mjs` | Gera as duas versões: `node calendario-condominio/build.mjs` |
| `android/` | Projeto Android nativo (Capacitor), para gerar o app da Play Store |
| `capacitor.config.json`, `package.json` | Configuração do app nativo |

## 1. Publicar o aplicativo (necessário para instalar no celular)
O celular só instala o aplicativo se ele estiver em um endereço com **https**. Qualquer hospedagem de site estático serve; publique o conteúdo da pasta `app/`:
- **Netlify** (mais simples): entre em app.netlify.com/drop e arraste a pasta `app`. Sai um endereço https na hora; depois você pode usar um domínio próprio, como `app.englink.com.br`.
- **Vercel** ou **Cloudflare Pages**: importe este repositório e indique `app` como pasta de publicação.
- **GitHub Pages**: publique a pasta `app` (para repositório privado, exige plano pago do GitHub).

## 2. Instalar no celular
- **Android (Chrome):** abra o endereço. Aparece o aviso "Instale o EngLink Síndico"; toque em **Instalar**. Se não aparecer: menu ⋮ → **Instalar app**.
- **iPhone (Safari):** abra o endereço. Toque em **Compartilhar** → **Adicionar à Tela de Início**. O próprio app mostra essa instrução na primeira visita.

Na primeira abertura, o app oferece **"Ver demonstração"** (Edifício Vogue), ideal para apresentar a síndicos.

## 3. Lojas (Play Store e App Store), quando quiser
- **Android:** instale o Android Studio, rode `npm install` e `npm run android`. No Android Studio: *Build → Generate Signed Bundle* e envie o `.aab` ao Google Play Console (taxa única de US$ 25).
- **iPhone:** exige um Mac com Xcode. Rode `npm install`, `npx cap add ios` e `npm run ios`; no Xcode, *Product → Archive* e envie à App Store Connect (Apple Developer: US$ 99 por ano).
- Antes de enviar às lojas: trocar o ícone padrão do projeto nativo pelo da pasta `app/icons/` e adicionar o plugin `@capacitor/share`, porque a exportação de arquivos (livro, OS para imprimir, cópia de segurança) usa o compartilhamento do navegador, que a versão nativa não tem.
- A Apple costuma recusar apps que são apenas um site empacotado. A versão de loja ganha força quando o app tiver contas de usuário e sincronização (item 4).

## 4. Limite desta versão
Os dados ficam **guardados no próprio aparelho** do síndico. Funciona bem para o síndico usar e enviar as ordens de serviço pelo WhatsApp, mas **não sincroniza** entre pessoas ou aparelhos. Para síndico, subsíndico, conselho e administradora verem os mesmos dados, a próxima etapa é ligar o app a um banco de dados na nuvem com login (por exemplo, Supabase, que o Lovable já usa). Enquanto isso, use **Ajustes → Livro de manutenção → Cópia de segurança** para guardar e transferir o histórico.
