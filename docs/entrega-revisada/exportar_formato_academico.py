"""Exporta DOCX/ODT/PDF con formato académico e índices paginados usando LibreOffice UNO.
Ejecutar con /usr/bin/python3, que proporciona pyuno en este entorno.
"""
from pathlib import Path
import subprocess
import tempfile
import time
import uuid
import shutil
import json
import re
from zipfile import ZipFile
import uno

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/entrega-revisada'
# Mantener referencias PyUNO evita que se liberen estilos recién insertados antes de exportar.
CREATED_STYLES = []

def prop(name, value):
    result = uno.createUnoStruct('com.sun.star.beans.PropertyValue')
    result.Name = name
    result.Value = value
    return result

def format_text(target, size=12, adjust='BLOCK', bold=False):
    target.CharFontName = 'Arial'
    target.CharFontNameAsian = 'Arial'
    target.CharFontNameComplex = 'Arial'
    target.CharHeight = size
    target.CharWeight = 150 if bold else 100
    target.ParaAdjust = uno.Enum('com.sun.star.style.ParagraphAdjust', adjust)
    spacing = uno.createUnoStruct('com.sun.star.style.LineSpacing')
    spacing.Mode = 0
    spacing.Height = 150
    target.ParaLineSpacing = spacing

def page_style(doc, name, numbering):
    styles = doc.StyleFamilies.getByName('PageStyles')
    if not styles.hasByName(name):
        created = doc.createInstance('com.sun.star.style.PageStyle')
        styles.insertByName(name, created)
        CREATED_STYLES.append(created)
    style = styles.getByName(name)
    style.Width = 21000
    style.Height = 29700
    for field in ['TopMargin', 'BottomMargin', 'LeftMargin', 'RightMargin']:
        setattr(style, field, 2540)
    style.NumberingType = numbering
    style.FollowStyle = name
    style.FooterIsOn = True
    style.FooterHeight = 500
    style.FooterBodyDistance = 300
    footer = style.FooterText
    footer.String = ''
    cursor = footer.createTextCursor()
    format_text(cursor, 12, 'CENTER')
    field = doc.createInstance('com.sun.star.text.TextField.PageNumber')
    field.NumberingType = uno.getConstantByName('com.sun.star.style.NumberingType.PAGE_DESCRIPTOR')
    field.SubType = uno.Enum('com.sun.star.text.PageNumberType', 'CURRENT')
    footer.insertTextContent(cursor, field, False)
    return style

def paragraphs(text):
    iterator = text.createEnumeration()
    while iterator.hasMoreElements():
        item = iterator.nextElement()
        if item.supportsService('com.sun.star.text.Paragraph'):
            yield item


def normal_margins(docx):
    temporary = docx.with_suffix('.normal.docx')
    with ZipFile(docx) as source, ZipFile(temporary, 'w') as target:
        for entry in source.infolist():
            data = source.read(entry.filename)
            if entry.filename == 'word/document.xml':
                text, count = re.subn(r'<w:pgMar\b[^>]*/>',
                    '<w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440" w:header="720" w:footer="720" w:gutter="0"/>',
                    data.decode('utf-8'))
                if not count:
                    raise RuntimeError('No se encontraron márgenes de sección.')
                data = text.encode('utf-8')
            target.writestr(entry, data)
    temporary.replace(docx)

def generate():
    pipe = 'siga_documento_' + uuid.uuid4().hex
    with tempfile.TemporaryDirectory(prefix='siga-documento-academico-') as profile:
        converted = Path(profile) / 'INFORME_SIGA_FORMATO_ACADEMICO.docx'
        subprocess.run(['libreoffice', '-env:UserInstallation=' + (Path(profile) / 'conversion').as_uri(),
                        '--headless', '--convert-to', 'docx:Office Open XML Text', '--outdir', profile,
                        str(OUT / 'INFORME_SIGA_FORMATO_ACADEMICO.html')], check=True, capture_output=True, text=True)
        if not converted.is_file():
            raise RuntimeError('La conversión inicial a DOCX no produjo archivo.')
        error_log = open('/tmp/siga-lo-academico-errors.log', 'w')
        process = subprocess.Popen([
            'libreoffice', '-env:UserInstallation=' + (Path(profile) / 'writer').as_uri(), '--headless',
            '--accept=pipe,name=' + pipe + ';urp;StarOffice.ServiceManager',
            '--norestore', '--nodefault', '--nofirststartwizard'],
            stdout=subprocess.DEVNULL, stderr=error_log)
        desktop = None
        doc = None
        try:
            local = uno.getComponentContext()
            resolver = local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', local)
            for attempt in range(80):
                try:
                    context = resolver.resolve('uno:pipe,name=' + pipe + ';urp;StarOffice.ComponentContext')
                    break
                except uno.getClass('com.sun.star.connection.NoConnectException'):
                    if attempt == 79:
                        raise
                    time.sleep(.15)
            desktop = context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', context)
            doc = desktop.loadComponentFromURL(converted.as_uri(), '_blank', 0,
                                              (prop('Hidden', True), prop('ReadOnly', False)))
            if doc is None:
                raise RuntimeError('LibreOffice no abrió el documento base.')
            doc.lockControllers()
            all_text = doc.Text.createTextCursor()
            all_text.gotoEnd(True)
            format_text(all_text)
            all_text.ParaBottomMargin = 200
            all_text.ParaTopMargin = 0
            styles = doc.StyleFamilies.getByName('ParagraphStyles')
            for name in ['Standard', 'Text body', 'Heading 1', 'Heading 2', 'Heading 3', 'Contents 1', 'Contents 2', 'Contents 3', 'Index 1']:
                if not styles.hasByName(name):
                    continue
                style = styles.getByName(name)
                format_text(style)
                if name.startswith(('Contents', 'Index')):
                    style.ParaAdjust = uno.Enum('com.sun.star.style.ParagraphAdjust', 'LEFT')
            print('Estilos generales aplicados', flush=True)
            for name in ['SIGA Tabla', 'SIGA Grafico']:
                if not styles.hasByName(name):
                    created = doc.createInstance('com.sun.star.style.ParagraphStyle')
                    styles.insertByName(name, created)
                    CREATED_STYLES.append(created)
                style = styles.getByName(name)
                format_text(style, 12, 'LEFT')
                style.ParaKeepTogether = True
                style.OutlineLevel = 0
            for level in [1, 2, 3]:
                style = styles.getByName('Heading ' + str(level))
                format_text(style, 14 if level == 1 else 12, 'CENTER' if level == 1 else 'LEFT', True)
                style.OutlineLevel = level
                style.ParaKeepTogether = True
                if level == 1:
                    style.BreakType = uno.Enum('com.sun.star.style.BreakType', 'PAGE_BEFORE')
            roman = uno.getConstantByName('com.sun.star.style.NumberingType.ROMAN_UPPER')
            arabic = uno.getConstantByName('com.sun.star.style.NumberingType.ARABIC')
            page_style(doc, 'SIGA Preliminares', roman)
            page_style(doc, 'SIGA Cuerpo', arabic)
            covering = True
            first = True
            for paragraph in paragraphs(doc.Text):
                paragraph.PageDescName = ''
                if first:
                    paragraph.PageDescName = 'SIGA Preliminares'
                    paragraph.PageNumberOffset = 1
                    first = False
                title = paragraph.String.strip()
                if title == 'CONTENIDO':
                    covering = False
                if covering:
                    format_text(paragraph, 14, 'CENTER', True)
                elif paragraph.ParaStyleName in ['Heading 1', 'Heading 2', 'Heading 3']:
                    level = int(paragraph.ParaStyleName[-1])
                    format_text(paragraph, 14 if level == 1 else 12, 'CENTER' if level == 1 else 'LEFT', True)
                    paragraph.ParaKeepTogether = True
                    if level == 1:
                        paragraph.BreakType = uno.Enum('com.sun.star.style.BreakType', 'PAGE_BEFORE')
                if title.startswith('Tabla ') and title[6:7].isdigit():
                    paragraph.ParaStyleName = 'SIGA Tabla'
                    format_text(paragraph, 12, 'LEFT')
                if title.startswith('Gráfico ') and title[8:9].isdigit():
                    paragraph.ParaStyleName = 'SIGA Grafico'
                    format_text(paragraph, 12, 'LEFT')
                if title.startswith('CAPÍTULO I.'):
                    paragraph.PageDescName = 'SIGA Cuerpo'
                    paragraph.PageNumberOffset = 1
            print('Párrafos y paginación configurados', flush=True)
            for name in doc.TextTables.getElementNames():
                table = doc.TextTables.getByName(name)
                table.Width = 15920
                table.RelativeWidth = 100
                table.RepeatHeadline = True
                table.HeaderRowCount = 1
                table.Split = True
                for cell_name in table.getCellNames():
                    cell = table.getCellByName(cell_name)
                    cursor = cell.createTextCursor()
                    cursor.gotoEnd(True)
                    format_text(cursor, 12, 'LEFT')
            for name in doc.GraphicObjects.getElementNames():
                graphic = doc.GraphicObjects.getByName(name)
                ratio = min(15920 / graphic.Width, 17500 / graphic.Height, 1)
                graphic.Width = int(graphic.Width * ratio)
                graphic.Height = int(graphic.Height * ratio)
            print('Tablas y gráficos configurados', flush=True)
            for marker, caption_style in [('[[CONTENIDO]]', None), ('[[TABLAS]]', 'SIGA Tabla'), ('[[GRAFICOS]]', 'SIGA Grafico')]:
                search = doc.createSearchDescriptor()
                search.SearchString = marker
                match = doc.findFirst(search)
                if match is None:
                    raise RuntimeError('Marcador no encontrado: ' + marker)
                match.String = ''
                index = doc.createInstance('com.sun.star.text.ContentIndex')
                index.Title = ''
                index.CreateFromOutline = caption_style is None
                index.CreateFromMarks = False
                index.CreateFromLevelParagraphStyles = caption_style is not None
                index.Level = 3 if caption_style is None else 1
                if caption_style:
                    uno.invoke(index.LevelParagraphStyles, 'replaceByIndex', (0, uno.Any('[]string', (caption_style,))))
                doc.Text.insertTextContent(match, index, False)
            doc.unlockControllers()
            print('Índices insertados', flush=True)
            for _ in range(3):
                doc.refresh()
                for index in range(doc.DocumentIndexes.Count):
                    doc.DocumentIndexes.getByIndex(index).update()
            target = ROOT / 'EntregablesPI-Ing-Software-revisado'
            backup = ROOT / '.local/documentos/EntregablesPI-Ing-Software-revisado-antes-formato-academico.pdf'
            backup.parent.mkdir(parents=True, exist_ok=True)
            if target.with_suffix('.pdf').exists() and not backup.exists():
                shutil.copy2(target.with_suffix('.pdf'), backup)
            doc.DocumentProperties.Title = 'Sistema Integral de Gestión Académica'
            doc.DocumentProperties.Subject = 'Informe académico con conclusiones, anexos y manuales'
            doc.storeAsURL((OUT / 'INFORME_SIGA_FORMATO_ACADEMICO.odt').as_uri(), (prop('FilterName', 'writer8'), prop('Overwrite', True)))
            doc.storeToURL(target.with_suffix('.docx').as_uri(), (prop('FilterName', 'Office Open XML Text'), prop('Overwrite', True)))
            normal_margins(target.with_suffix('.docx'))
            doc.close(True)
            doc = desktop.loadComponentFromURL(target.with_suffix('.docx').as_uri(), '_blank', 0, (prop('Hidden', True),))
            for _ in range(3):
                doc.refresh()
                for item in range(doc.DocumentIndexes.Count):
                    doc.DocumentIndexes.getByIndex(item).update()
            doc.store()
            normal_margins(target.with_suffix('.docx'))
            doc.storeToURL((OUT / 'INFORME_SIGA_FORMATO_ACADEMICO.odt').as_uri(), (prop('FilterName', 'writer8'), prop('Overwrite', True)))
            doc.storeToURL(target.with_suffix('.pdf').as_uri(), (prop('FilterName', 'writer_pdf_Export'), prop('Overwrite', True), prop('FilterData', (prop('ExportBookmarks', True), prop('UseTaggedPDF', True)))))
            pdf_info = subprocess.run(['pdfinfo', str(target.with_suffix('.pdf'))], check=True, capture_output=True, text=True).stdout
            actual_pages = int(re.search(r'^Pages:\s+(\d+)', pdf_info, re.M)[1])
            record = {'fecha': '2026-11-09', 'indices': doc.DocumentIndexes.Count,
                      'tablas': doc.TextTables.Count, 'graficos': doc.GraphicObjects.Count,
                      'fuente_declarada': 'Arial', 'texto_pt': 12, 'titulo_pt': 14, 'interlineado': 1.5,
                      'margenes_cm': 2.54, 'paginas': actual_pages,
                      'fuente_pdf_disponible': 'Liberation Sans (sustitución de Arial en este entorno)'}
            (ROOT / 'docs/evidencias/formato-academico-20261109.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
            print(json.dumps(record, ensure_ascii=False, indent=2))
        finally:
            if process.poll() is None:
                if doc is not None:
                    doc.close(True)
                if desktop is not None:
                    desktop.terminate()
            process.wait(timeout=15)
            error_log.close()

if __name__ == '__main__':
    generate()
