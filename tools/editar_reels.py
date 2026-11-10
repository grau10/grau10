#!/usr/bin/env python3
"""Editor de Reels do @engmonike (identidade "Preto Arquitetônico").

Faz, a partir do vídeo bruto gravado no celular:
  1. corte opcional de início/fim;
  2. enquadramento vertical 1080x1920 (corta ao centro se vier na horizontal);
  3. tratamento leve de cor (contraste e saturação contidos, pele natural);
  4. áudio: filtro de ruído, voz limpa e volume padrão do Instagram (-14 LUFS);
  5. legendas automáticas em português (faster-whisper), queimadas no vídeo,
     dentro da área segura da interface do Instagram;
  6. título de abertura opcional (serifada Playfair + filete vinho);
  7. capa .jpg a partir de um frame real (com ou sem título).

Saída numa pasta: <nome>_final.mp4, <nome>_capa.jpg, <nome>.srt (para revisão).

Exemplos:
  python3 tools/editar_reels.py bruto.mov
  python3 tools/editar_reels.py bruto.mov --titulo "A gente resolve problemas o dia inteiro." \
      --subtitulo "Mas como apresenta o próprio trabalho?" --capa-tempo 3.2
  python3 tools/editar_reels.py bruto.mov --inicio 1.5 --fim 47 --legenda-srt revisada.srt
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
FONTES = RAIZ / "fonts"

# Paleta Preto Arquitetônico (ASS usa &HAABBGGRR)
BRANCO = "&H00FFFFFF"
PRETO_SOMBRA = "&H66000000"
VINHO = "&H00271A5C"  # #5C1A27

W, H = 1080, 1920
# Área segura: o Instagram cobre ~250px no topo e ~420px na base (legenda, botões)
LEGENDA_MARGEM_BASE = 520
TITULO_MARGEM_TOPO = 300


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-3000:])
        raise SystemExit(f"Falhou: {' '.join(cmd[:4])} ...")
    return r.stdout


def probe(path: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)])
    info = json.loads(out)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if not v:
        raise SystemExit("O arquivo não tem trilha de vídeo.")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = abs(int(sd["rotation"]))
    if rot in (90, 270):
        w, h = h, w
    tem_audio = any(s["codec_type"] == "audio" for s in info["streams"])
    return {"w": w, "h": h, "dur": float(info["format"]["duration"]), "audio": tem_audio}


# ---------------------------------------------------------------- legendas
def ts_srt(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def ts_ass(t: float) -> str:
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02}:{s:02}.{cs:02}"


def transcrever(audio: Path, modelo: str) -> list[tuple[float, float, str]]:
    from faster_whisper import WhisperModel

    import numpy as np

    # Decodifica com o ffmpeg (evita incompatibilidades da biblioteca "av")
    bruto = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(audio), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True, check=True,
    ).stdout
    amostras = np.frombuffer(bruto, dtype=np.float32)
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(amostras, language="pt", word_timestamps=True, vad_filter=True)
    palavras = [(w.start, w.end, w.word.strip()) for s in segs for w in (s.words or []) if w.word.strip()]
    # Agrupa em blocos curtos (até ~32 caracteres / 6 palavras), quebrando em pausas e pontuação
    blocos, atual = [], []
    for p in palavras:
        if atual:
            texto = " ".join(x[2] for x in atual + [p])
            pausa = p[0] - atual[-1][1]
            fim_frase = re.search(r"[.!?…:;]$", atual[-1][2])
            if len(texto) > 32 or len(atual) >= 6 or pausa > 0.6 or fim_frase:
                blocos.append(atual)
                atual = []
        atual.append(p)
    if atual:
        blocos.append(atual)
    return [(b[0][0], b[-1][1], " ".join(x[2] for x in b)) for b in blocos]


def ler_srt(path: Path) -> list[tuple[float, float, str]]:
    def t(x: str) -> float:
        h, m, rest = x.strip().split(":")
        s, ms = rest.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

    itens = []
    for bloco in re.split(r"\n\s*\n", path.read_text(encoding="utf-8").strip()):
        linhas = bloco.strip().splitlines()
        if len(linhas) >= 3 and "-->" in linhas[1]:
            a, b = linhas[1].split("-->")
            itens.append((t(a), t(b), " ".join(linhas[2:]).strip()))
    return itens


def escrever_srt(itens, path: Path) -> None:
    path.write_text(
        "\n".join(f"{i}\n{ts_srt(a)} --> {ts_srt(b)}\n{txt}\n" for i, (a, b, txt) in enumerate(itens, 1)),
        encoding="utf-8",
    )


def escrever_ass(itens, path: Path, titulo: str | None, subtitulo: str | None, dur_titulo: float,
                 fade: bool = True) -> None:
    def esc(s: str) -> str:
        return s.replace("{", "(").replace("}", ")").replace("\n", "\\N")

    linhas = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {W}",
        f"PlayResY: {H}",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, "
        "MarginR, MarginV, Encoding",
        # Legenda: Lato, branca, sombra suave (sem caixa colorida)
        f"Style: Legenda,Lato,62,{BRANCO},{BRANCO},{PRETO_SOMBRA},{PRETO_SOMBRA},1,0,0,0,100,100,0,0,1,2.2,2,2,90,90,{LEGENDA_MARGEM_BASE},1",
        # Título: Playfair, serifada editorial
        f"Style: Titulo,Playfair Display,78,{BRANCO},{BRANCO},{PRETO_SOMBRA},{PRETO_SOMBRA},0,0,0,0,100,100,0,0,1,0,3,7,90,140,{TITULO_MARGEM_TOPO},1",
        f"Style: Subtitulo,Playfair Display,60,{BRANCO},{BRANCO},{PRETO_SOMBRA},{PRETO_SOMBRA},0,1,0,0,100,100,0,0,1,0,3,7,90,140,{TITULO_MARGEM_TOPO},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    if titulo:
        fim = ts_ass(dur_titulo)
        fade = "{\\fad(250,350)}" if fade else ""
        t_lin = textwrap.fill(titulo, 20).split("\n")
        linhas.append(f"Dialogue: 2,0:00:00.00,{fim},Titulo,,0,0,0,,{fade}{esc(chr(10).join(t_lin))}")
        y_fim_titulo = TITULO_MARGEM_TOPO + len(t_lin) * 96
        if subtitulo:
            s_lin = textwrap.fill(subtitulo, 26).split("\n")
            linhas.append(
                f"Dialogue: 2,0:00:00.00,{fim},Subtitulo,,0,0,0,,{fade}{{\\pos(90,{y_fim_titulo + 24})\\an7}}"
                f"{esc(chr(10).join(s_lin))}"
            )
            y_fim_titulo += 24 + len(s_lin) * 76
        # filete vinho (assinatura gráfica)
        linhas.append(
            f"Dialogue: 1,0:00:00.00,{fim},Titulo,,0,0,0,,{fade}{{\\an7\\pos(92,{y_fim_titulo + 34})\\bord0\\shad0"
            f"\\1c{VINHO}\\p1}}m 0 0 l 120 0 l 120 7 l 0 7{{\\p0}}"
        )
    for a, b, txt in itens:
        if titulo and b <= dur_titulo:
            continue  # não sobrepõe legenda ao título de abertura
        inicio = max(a, dur_titulo) if titulo else a
        linhas.append(f"Dialogue: 0,{ts_ass(inicio)},{ts_ass(b)},Legenda,,0,0,0,,{esc(txt)}")
    path.write_text("\n".join(linhas) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- vídeo
def filtro_video(info: dict) -> str:
    # Preenche 1080x1920: escala para cobrir e corta ao centro
    base = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    # Tratamento discreto: leve contraste, saturação contida (pele natural), nitidez suave
    cor = "eq=contrast=1.06:brightness=0.005:saturation=0.92,unsharp=5:5:0.4:5:5:0.0"
    return f"{base},{cor},fps=30,format=yuv420p"


FILTRO_AUDIO = (
    "highpass=f=80,lowpass=f=12000,afftdn=nf=-25,"
    "acompressor=threshold=-20dB:ratio=3:attack=10:release=200,"
    "loudnorm=I=-14:TP=-1.5:LRA=11"
)


def main() -> None:
    ap = argparse.ArgumentParser(description="Edita um Reel no padrão Preto Arquitetônico do @engmonike.")
    ap.add_argument("video", type=Path)
    ap.add_argument("--saida", type=Path, help="Pasta de saída (padrão: ./saida_reels)")
    ap.add_argument("--inicio", type=float, default=0.0, help="Cortar antes deste segundo")
    ap.add_argument("--fim", type=float, help="Cortar depois deste segundo")
    ap.add_argument("--titulo", help="Texto de abertura (só se necessário)")
    ap.add_argument("--subtitulo", help="Segunda linha do título, em itálico")
    ap.add_argument("--dur-titulo", type=float, default=3.0, help="Segundos com o título na tela")
    ap.add_argument("--sem-legenda", action="store_true")
    ap.add_argument("--legenda-srt", type=Path, help="Usar este SRT (já revisado) em vez de transcrever")
    ap.add_argument("--modelo", default="small", help="Modelo do faster-whisper (tiny/base/small/medium)")
    ap.add_argument("--capa-tempo", type=float, help="Segundo do frame da capa (padrão: 1/3 do vídeo)")
    ap.add_argument("--capa-com-titulo", action="store_true", help="Escrever o título também na capa")
    a = ap.parse_args()

    if not a.video.exists():
        raise SystemExit(f"Não encontrei {a.video}")
    for exe in ("ffmpeg", "ffprobe"):
        if not shutil.which(exe):
            raise SystemExit(f"{exe} não está instalado.")

    saida = a.saida or Path.cwd() / "saida_reels"
    saida.mkdir(parents=True, exist_ok=True)
    nome = re.sub(r"[^\w-]+", "_", a.video.stem)
    final = saida / f"{nome}_final.mp4"
    srt = saida / f"{nome}.srt"
    ass = saida / f"{nome}.ass"
    capa = saida / f"{nome}_capa.jpg"
    tmp = saida / f".{nome}_tmp.mp4"

    info = probe(a.video)
    fim = min(a.fim, info["dur"]) if a.fim else info["dur"]
    dur = fim - a.inicio
    print(f"Entrada: {info['w']}x{info['h']}, {info['dur']:.1f}s → usando {a.inicio:.1f}s a {fim:.1f}s ({dur:.1f}s)")
    if dur > 90:
        print("Aviso: Reels acima de 90s perdem alcance; considere cortar.")

    # 1) Corte + enquadramento + cor + áudio
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", str(a.inicio), "-to", str(fim), "-i", str(a.video),
           "-vf", filtro_video(info)]
    if info["audio"]:
        cmd += ["-af", FILTRO_AUDIO, "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "18", str(tmp)]
    print("1/4 Enquadrando, tratando cor e áudio...")
    run(cmd)

    # 2) Legendas
    itens: list = []
    if not a.sem_legenda:
        if a.legenda_srt:
            itens = ler_srt(a.legenda_srt)
            print(f"2/4 Usando legendas de {a.legenda_srt} ({len(itens)} blocos)")
        elif info["audio"]:
            print("2/4 Transcrevendo a fala (pode levar alguns minutos)...")
            wav = saida / f".{nome}.wav"
            run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-ac", "1", "-ar", "16000", str(wav)])
            itens = transcrever(wav, a.modelo)
            wav.unlink(missing_ok=True)
            print(f"    {len(itens)} blocos de legenda")
        escrever_srt(itens, srt)
    else:
        print("2/4 Sem legendas")

    # 3) Queimar legendas e título
    print("3/4 Aplicando legendas e título...")
    if itens or a.titulo:
        escrever_ass(itens, ass, a.titulo, a.subtitulo, a.dur_titulo)
        vf = f"subtitles={ass.as_posix()}:fontsdir={FONTES.as_posix()}"
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-vf", vf,
               "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p"]
        cmd += ["-c:a", "copy"] if info["audio"] else ["-an"]
        cmd += ["-movflags", "+faststart", str(final)]
        run(cmd)
        tmp.unlink(missing_ok=True)
    else:
        run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-c", "copy", "-movflags", "+faststart", str(final)])
        tmp.unlink(missing_ok=True)

    # 4) Capa a partir de frame real
    print("4/4 Gerando capa...")
    t_capa = a.capa_tempo if a.capa_tempo is not None else dur / 3
    t_capa = min(max(t_capa, 0), max(dur - 0.1, 0))
    if a.capa_com_titulo and a.titulo:
        capa_ass = saida / f".{nome}_capa.ass"
        escrever_ass([], capa_ass, a.titulo, a.subtitulo, 9999, fade=False)
        vf = f"subtitles={capa_ass.as_posix()}:fontsdir={FONTES.as_posix()}"
        # gera a partir do vídeo sem título (frame limpo) para não pegar o fade
        run(["ffmpeg", "-y", "-v", "error", "-ss", str(a.inicio + t_capa), "-i", str(a.video),
             "-vf", f"{filtro_video(info)},{vf}", "-frames:v", "1", "-q:v", "2", str(capa)])
        capa_ass.unlink(missing_ok=True)
    else:
        run(["ffmpeg", "-y", "-v", "error", "-ss", str(a.inicio + t_capa), "-i", str(a.video),
             "-vf", filtro_video(info), "-frames:v", "1", "-q:v", "2", str(capa)])

    print("\nPronto:")
    print(f"  Vídeo: {final}")
    print(f"  Capa:  {capa}")
    if itens:
        print(f"  Legendas para revisar: {srt}")


if __name__ == "__main__":
    main()
