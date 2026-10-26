# Reels: prazo para reclamar de vício oculto

Mesmo estilo editorial do `reels-estilo-editorial`, adaptado a um vídeo que já tem legendas embutidas:
títulos serifados na faixa de cima (acima da cabeça), cards na altura do peito, sem cobrir as legendas.

- `index.html`: vídeo base, punch-ins leves (até 1,1× para as legendas não saírem do quadro) e efeitos sonoros.
- `compositions/s01…s14.html`: uma cena por bloco (títulos, barra de prazo, caixa de pergunta 3D, "não." cromado, checklist, "LAUDO!").
- `assets/fala.mp4` **não vai para o git**. Para recriar a partir do vídeo original:
  `ffmpeg -i ORIGINAL.MP4 -vf "scale=1080:1920,format=yuv420p" -c:v libx264 -crf 18 -g 30 -c:a aac -b:a 192k assets/fala.mp4`
- Renderizar: `npm run render`.
