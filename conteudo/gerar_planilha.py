"""Gera calendario-postagens-engmonike.xlsx a partir dos CSVs desta pasta."""
import csv
import os
from collections import OrderedDict

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

D = os.path.dirname(os.path.abspath(__file__))
reels = list(csv.reader(open(f"{D}/calendario-reels-engmonike.csv", encoding="utf-8")))
stories = list(csv.reader(open(f"{D}/rotina-stories-engmonike.csv", encoding="utf-8")))

HEAD = PatternFill("solid", fgColor="1F2A37")
DONE = PatternFill("solid", fgColor="D9F2DD")
LIGHT = PatternFill("solid", fgColor="FFF4CC")
URGENT = PatternFill("solid", fgColor="FDE2E1")
BAND = PatternFill("solid", fgColor="F4F6F8")
thin = Side(style="thin", color="D0D5DB")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)


def sheet(ws, rows, widths, status_col=None, week_col=None):
    for r in rows:
        ws.append(r)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = HEAD
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
    ws.row_dimensions[1].height = 34
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        fill = None
        if week_col is not None and int(row[week_col].value) % 2 == 0:
            fill = BAND
        if status_col is not None:
            v = row[status_col].value or ""
            if v.startswith("PRONTO"):
                fill = DONE
            elif "urgente" in v:
                fill = URGENT
            elif "leve" in v:
                fill = LIGHT
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.border = BOX
            if fill:
                c.fill = fill
    ws.freeze_panes = "B2" if week_col is not None else "A2"
    ws.auto_filter.ref = ws.dimensions


wb = Workbook()
ws = wb.active
ws.title = "Reels (8 semanas)"
reels[1:] = [[int(r[0])] + r[1:] for r in reels[1:]]
sheet(ws, reels, [8, 11, 9, 10, 15, 20, 22, 34, 38, 55, 36, 30, 11, 16], status_col=4, week_col=0)

ws2 = wb.create_sheet("Rotina de Stories")
sheet(ws2, stories, [11, 20, 60, 20, 40])

ws3 = wb.create_sheet("Dias de gravação")
batches = OrderedDict()
for r in reels[1:]:
    if r[12] != "—":
        batches.setdefault(r[12], []).append(f"{r[1]} · {r[7]}")
rows = [["Gravar em", "Reels do lote (data de postagem · tema)", "Quantidade"]]
for k, v in batches.items():
    rows.append([k, "\n".join(v), len(v)])
sheet(ws3, rows, [18, 80, 12])

ws4 = wb.create_sheet("Como usar")
guia = [
    ["Item", "Orientação"],
    ["Perfil", "@engmonike, com repost no perfil da empresa quando o público for síndico ou proprietário"],
    ["Público", "Clientes da perícia particular: síndicos, proprietários e advogados. Sem conteúdo de curso ou de renda extra na engenharia"],
    ["Frequência", "3 Reels por semana (terça, quinta e sábado) + stories todos os dias"],
    ["Gravação", "2 dias por semana: segunda (Reels da semana seguinte) e quarta (stories e telas dos laudos)"],
    ["Material de apoio", "Somente páginas dos seus laudos, sempre anonimizadas: sem nome, endereço, CPF ou fotos que identifiquem cliente ou imóvel"],
    ["CTA", "Todo conteúdo termina chamando para o contato pelo link na bio"],
    ["Tom", "Criticar a prática e a técnica, nunca o profissional; valorizar a especialização e a equipe multidisciplinar"],
    ["Horários", "Sugestões iniciais; ajuste depois de 3 semanas olhando os Insights do Instagram"],
    ["Cores da aba Reels", "Verde = já editado; vermelho = gravar com urgência; amarelo = semana de feriado, conteúdo mais leve"],
    ["Edição", "Alternar o estilo editorial (branco/amarelo) e o neon (branco/verde-limão), já prontos como modelo"],
]
sheet(ws4, guia, [20, 100])
wb.save(f"{D}/calendario-postagens-engmonike.xlsx")
print("ok")
