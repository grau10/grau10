# Reels: laudo cautelar de vizinhança (estilo neon)

Segunda referência visual: palavra em sans branca + destaque verde-limão (sans + serifa itálica com traço desenhado),
rótulos de capítulo dourados no topo ("1. o pedido", "2. o risco"...), cards escuros estilo app.

- Vídeo acelerado para **1,1x** com o tom de voz preservado (`atempo`), já embutido em `assets/fala.mp4`.
- `assets/fala.mp4` **não vai para o git**. Para recriar a partir do vídeo original:
  `ffmpeg -i ORIGINAL.MP4 -filter_complex "[0:v]setpts=PTS/1.1,scale=1080:1920,format=yuv420p[v];[0:a]atempo=1.1[a]" -map "[v]" -map "[a]" -r 30 -c:v libx264 -crf 18 -g 30 -c:a aac -b:a 192k assets/fala.mp4`
- `compositions/`: `t*` títulos neon, `c*` rótulos de capítulo, `k*` cards (documento, citação, mensagem da construtora).
- Renderizar: `npm run render`.
