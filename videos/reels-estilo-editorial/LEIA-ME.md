# Reels: nova fonte de renda na engenharia

Edição no estilo editorial da referência (títulos serifados branco + amarelo itálico, mockup de celular,
caixa de pergunta em 3D, texto cromado, adesivo "APRENDER?", link na bio), feita com HyperFrames.

- `index.html`: vídeo base, punch-ins (cortes de zoom) e efeitos sonoros.
- `compositions/s01…s13.html`: uma cena por bloco de texto/elemento.
- `assets/fala.mp4` **não vai para o git** (69 MB). Para recriar a partir do vídeo original:
  `ffmpeg -i ORIGINAL.MP4 -vf "scale=1080:1920,format=yuv420p" -c:v libx264 -crf 18 -g 30 -c:a aac -b:a 192k assets/fala.mp4`
- Renderizar: `npm run render` (ou `npx hyperframes render -q delivery`).
