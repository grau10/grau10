---
name: editar-reels
description: Edita vídeos brutos da Monike em Reels prontos para o @engmonike no padrão "Preto Arquitetônico" — enquadramento vertical 1080x1920, tratamento de cor e áudio, legendas automáticas em português, título serifado com filete vinho e capa a partir de frame real. Use quando a Monike enviar um vídeo para editar, pedir cortes, legendas, capa ou ajustes num Reel.
---

# Editar Reels do @engmonike

Ferramenta: `tools/editar_reels.py` (ffmpeg + faster-whisper). Fontes da marca em `tools/fonts/` (Playfair Display para títulos, Lato para legendas).

## Antes de editar

1. Leia `CLAUDE.md` (diretrizes editoriais) — em especial "Identidade visual", "Gravação de Reels" e o calendário aprovado.
2. Descubra qual post do calendário é este vídeo e qual roteiro/legenda foi aprovado.
3. Pegue o vídeo:
   - anexado na conversa → caminho em `/root/.claude/uploads/...`;
   - no Google Drive → baixe pelo conector do Google Drive;
   - link público → `curl -L -o bruto.mp4 "<link>"` numa pasta nova da scratchpad.
4. Verifique dependências: `python3 -c "import faster_whisper"`; se faltar, `pip install faster-whisper`.

## Editar

```bash
python3 tools/editar_reels.py <bruto.mp4> --saida <pasta> \
  [--inicio S] [--fim S] \
  [--titulo "..." --subtitulo "..." --dur-titulo 3] \
  [--capa-tempo S] [--capa-com-titulo] \
  [--legenda-srt revisada.srt] [--sem-legenda] [--modelo small]
```

- **Corte:** use `--inicio`/`--fim` para tirar respiros, "pode gravar?", etc. Para cortes no meio, rode `ffmpeg` com `-ss/-to` em trechos e `concat` antes do script.
- **Título de abertura:** só se necessário (diretriz: texto de capa apenas quando ajuda a contextualizar). Use o texto de capa aprovado.
- **Legendas:** o script transcreve e salva um `.srt`. **Sempre revise o SRT** contra o roteiro aprovado (termos técnicos, "perita", "vícios construtivos", nomes de normas) e, se precisar corrigir, rode de novo com `--legenda-srt`.
- **Capa:** escolha um frame com expressão natural, olhos abertos, boca neutra (`--capa-tempo`). Para achar bons frames: `ffmpeg -i final.mp4 -vf "fps=1,scale=270:-1,tile=6x4" grade.jpg` e olhe a grade.

## Conferir antes de entregar (obrigatório)

1. Extraia 3 frames (abertura, meio, fim) e olhe: legenda legível, fora da área coberta pelo Instagram, título sem cortar, pele natural.
2. `ffprobe` do final: 1080x1920, h264, aac, ≤ 90 s.
3. Checklist de aprovação do `CLAUDE.md`: nada de patologia explícita na capa, sem decoração genérica, sem texto inventado.

## Entregar

- Envie `*_final.mp4` e `*_capa.jpg` à Monike (SendUserFile) com a legenda aprovada.
- Para agendar no Metricool o vídeo precisa de URL pública ou do Google Drive: suba o arquivo no Drive dela pelo conector e use esse link em `media` no `createScheduledPost` (tipo `REEL`), no melhor horário do dia (`getBestTimeToPostByNetwork`, fuso America/Sao_Paulo).
- Nunca publique sem a Monike aprovar o vídeo final.
