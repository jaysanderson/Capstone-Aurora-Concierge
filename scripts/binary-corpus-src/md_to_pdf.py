#!/usr/bin/env python3
"""Convert a small subset of markdown to PDF via reportlab.

Supports: H1/H2/H3, paragraphs, **bold**, *italic*, simple |table|s, - bullets, --- HR.
Tailored for the Aurora corpus docs.
"""
import re
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
)


def inline_format(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    text = re.sub(r'`(.+?)`', r'<font face="Courier">\1</font>', text)
    return text


def parse_table(lines, i):
    """Parse a markdown table starting at lines[i]. Returns (table_data, next_index)."""
    rows = []
    while i < len(lines) and lines[i].strip().startswith('|'):
        line = lines[i].strip().strip('|')
        cells = [c.strip() for c in line.split('|')]
        # Skip separator row like |---|---|
        if not all(re.match(r'^:?-+:?$', c.replace(' ', '')) for c in cells):
            rows.append(cells)
        i += 1
    return rows, i


def md_to_pdf(md_path, pdf_path):
    with open(md_path) as f:
        text = f.read()
    lines = text.split('\n')

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle('h1', parent=styles['Heading1'], fontSize=20, spaceAfter=12, textColor=colors.HexColor('#1a4a6b'))
    h2 = ParagraphStyle('h2', parent=styles['Heading2'], fontSize=14, spaceAfter=8, textColor=colors.HexColor('#1a4a6b'))
    h3 = ParagraphStyle('h3', parent=styles['Heading3'], fontSize=12, spaceAfter=6, textColor=colors.HexColor('#444'))
    body = ParagraphStyle('body', parent=styles['BodyText'], fontSize=10, leading=14, spaceAfter=6)
    bullet = ParagraphStyle('bullet', parent=body, leftIndent=18, bulletIndent=6, spaceAfter=3)
    italic_centered = ParagraphStyle('ic', parent=body, alignment=1, fontName='Helvetica-Oblique', textColor=colors.HexColor('#666'))

    flowables = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            i += 1
            continue
        if stripped == '---':
            flowables.append(Spacer(1, 0.1 * inch))
            flowables.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#999')))
            flowables.append(Spacer(1, 0.1 * inch))
            i += 1
            continue
        if stripped.startswith('# '):
            flowables.append(Paragraph(inline_format(stripped[2:]), h1))
            i += 1
            continue
        if stripped.startswith('## '):
            flowables.append(Paragraph(inline_format(stripped[3:]), h2))
            i += 1
            continue
        if stripped.startswith('### '):
            flowables.append(Paragraph(inline_format(stripped[4:]), h3))
            i += 1
            continue
        if stripped.startswith('|'):
            rows, next_i = parse_table(lines, i)
            if rows:
                # Format cells with inline formatting wrapped in Paragraph for wrapping
                cell_style = ParagraphStyle('cell', parent=body, fontSize=9, leading=11, spaceAfter=0)
                header_style = ParagraphStyle('hcell', parent=cell_style, fontName='Helvetica-Bold', textColor=colors.white)
                table_data = []
                for ri, row in enumerate(rows):
                    if ri == 0:
                        table_data.append([Paragraph(inline_format(c), header_style) for c in row])
                    else:
                        table_data.append([Paragraph(inline_format(c), cell_style) for c in row])
                num_cols = len(rows[0])
                page_w = A4[0] - 1.5 * inch
                col_widths = [page_w / num_cols] * num_cols
                tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
                tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a4a6b')),
                    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#bbb')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7f7f7')]),
                ]))
                flowables.append(tbl)
                flowables.append(Spacer(1, 0.12 * inch))
                i = next_i
                continue
            i += 1
            continue
        if stripped.startswith('- ') or stripped.startswith('* '):
            content = stripped[2:]
            flowables.append(Paragraph(f"• {inline_format(content)}", bullet))
            i += 1
            continue
        if re.match(r'^\d+\.\s', stripped):
            flowables.append(Paragraph(inline_format(stripped), bullet))
            i += 1
            continue
        if stripped.startswith('*') and stripped.endswith('*') and len(stripped) > 2:
            flowables.append(Paragraph(inline_format(stripped), italic_centered))
            i += 1
            continue
        # collect paragraph
        para_lines = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(('#', '|', '-', '*', '>', '```')) and not re.match(r'^\d+\.\s', lines[i].strip()) and lines[i].strip() != '---':
            para_lines.append(lines[i].strip())
            i += 1
        flowables.append(Paragraph(inline_format(' '.join(para_lines)), body))

    doc = SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=0.75 * inch, bottomMargin=0.75 * inch, title='Aurora Outfitters')
    doc.build(flowables)


if __name__ == '__main__':
    md_to_pdf(sys.argv[1], sys.argv[2])
    print(f"Generated {sys.argv[2]}")
