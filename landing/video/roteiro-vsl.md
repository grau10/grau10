# VSL de 40 segundos: EngLink Síndico

**Arquivo:** `englink-vsl-40s.mp4` · vertical 9:16 · 1080×1920 · 30 qps · 40 s · sem áudio, com legendas na tela.
**Capa (thumbnail):** `englink-vsl-capa.jpg`
**Dados mostrados:** Edifício Vogue de demonstração (fictício).

## Roteiro e locução sugerida
As legendas já estão no vídeo, então ele funciona sem som (como a maioria das pessoas assiste no celular). Se quiser gravar sua voz por cima, use o texto da coluna "Locução": ele cabe no tempo de cada cena.

| Tempo | Na tela | Legenda | Locução (opcional) |
|---|---|---|---|
| 0–4,5 s | Calendário do mês com o dia de hoje e as pendências | Síndico: o prédio avisa você do que precisa ser feito | "Síndico, a manutenção do prédio é responsabilidade sua. Com o EngLink, o prédio avisa você do que precisa ser feito." |
| 4,5–10 s | Abre a verificação das bombas de recalque: por que e como fazer | Cada manutenção explicada em linguagem simples | "Cada manutenção vem explicada em linguagem simples: o que fazer, por que fazer e qual a norma." |
| 10–14 s | Bloco de notas com as execuções registradas | Histórico: quem fez, quando e quanto custou | "E tudo fica registrado: quem fez, quando e quanto custou." |
| 14–21 s | "Encomendar manutenções programadas" → escolhe 2 meses | Encomende 1, 2 ou 3 meses de manutenção | "Na hora de contratar, você escolhe um, dois ou três meses…" |
| 21–26 s | Mensagem da ordem de serviço pronta, botão do WhatsApp | Ordem de serviço pronta para a administradora, pelo WhatsApp | "…e a ordem de serviço sai pronta para a administradora, direto no WhatsApp." |
| 26–31,5 s | Visão geral: indicadores e custo por mês | Custos e pendências prontos para a assembleia | "Na assembleia, você mostra o que foi feito e quanto custou." |
| 31,5–36 s | Aba Edifício → Livro de manutenção | O histórico fica com o condomínio, de síndico para síndico | "E o histórico fica com o condomínio, de síndico para síndico." |
| 36–40 s | Tela final: ícone, nome, preço e botão | — | "EngLink Síndico. Duzentos e noventa e sete reais por mês, sem fidelidade." |

Para juntar a voz ao vídeo: grave no celular (num cômodo silencioso) e una no CapCut, ou mande o áudio que eu junto e ajusto o volume.

## Como colocar na página de vendas (Lovable)
Envie o vídeo e a capa ao projeto e cole este pedido no chat do Lovable:

> Na primeira dobra da página, ao lado do título no computador e logo abaixo dele no celular, coloque o vídeo `englink-vsl-40s.mp4` dentro de uma moldura de celular arredondada (cantos de 32 px, sombra suave). O vídeo deve começar sozinho, sem som, em repetição, com `playsinline` para funcionar no iPhone, e usar `englink-vsl-capa.jpg` como imagem de capa. Largura máxima de 360 px. Abaixo do vídeo, o botão "Quero no meu condomínio". Dispare o evento "ViewContent" do Meta Pixel quando o vídeo chegar a 75% (30 segundos).

Código equivalente, se alguém for colocar à mão:
```html
<video src="englink-vsl-40s.mp4" poster="englink-vsl-capa.jpg" autoplay muted loop playsinline preload="metadata"
  style="width:100%;max-width:360px;border-radius:32px;box-shadow:0 20px 50px rgba(0,0,0,.18)"></video>
```

## Também serve para
- **Anúncios do Meta (Reels e Stories):** já está no formato vertical e com legenda. Use na variação A ou B dos anúncios.
- **Status do WhatsApp** e conversa com síndicos: envie o vídeo antes de marcar a demonstração.

## Regravar o vídeo
Se o aplicativo mudar, o vídeo é regravado automaticamente com `gravar-video.js` (precisa do app rodando em `localhost:8765`, do Playwright e do ffmpeg).
