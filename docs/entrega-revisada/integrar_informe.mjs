import { PDFDocument, StandardFonts, rgb, PDFName, PDFHexString, PDFArray } from 'pdf-lib';
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const originalPath = join(root, 'EntregablesPI-Ing-Software-completado.pdf');
const supplementPath = join(root, 'docs/entrega-revisada/COMPLEMENTO_INFORME_SIGA.pdf');
const outputPath = join(root, 'EntregablesPI-Ing-Software-revisado.pdf');
const source = await PDFDocument.load(await readFile(originalPath));
const supplement = await PDFDocument.load(await readFile(supplementPath));
if (source.getPageCount() !== 35)
  throw new Error('La fuente original debe conservar sus 35 páginas.');
const text = execFileSync('pdftotext', ['-layout', supplementPath, '-'], { encoding: 'utf8' });
const textPages = text.split('\f');
function startOf(title) {
  const index = textPages.findIndex((page) => page.trimStart().startsWith(title));
  if (index < 0) throw new Error('Sección no encontrada: ' + title);
  return index;
}
const conclusionsStart = startOf('Capítulo V.');
const annexStart = startOf('Anexo A.');
const result = await PDFDocument.create();
async function append(document, indices) {
  for (const page of await result.copyPages(document, indices)) result.addPage(page);
}
await append(
  source,
  Array.from({ length: 34 }, (_, i) => i),
);
await append(
  supplement,
  Array.from({ length: annexStart - conclusionsStart }, (_, i) => conclusionsStart + i),
);
const bibliography = result.getPageCount();
await append(source, [34]);
const firstAnnex = result.getPageCount();
await append(
  supplement,
  Array.from({ length: supplement.getPageCount() - annexStart }, (_, i) => annexStart + i),
);
const sections = [
  ['Capítulo V. Conclusiones y recomendaciones', 34],
  ['Bibliografía', bibliography],
  ...[
    ['A', 'Requisitos y casos de aceptación'],
    ['B', 'Arquitectura e integración'],
    ['C', 'Evidencias y versiones'],
    ['D', 'Manual de usuario'],
    ['E', 'Manual técnico'],
    ['F', 'Capacitación y evaluación'],
    ['G', 'Decisiones y exclusiones'],
    ['H', 'Trabajo restante'],
    ['I', 'Registro de aceptación'],
  ].map(([letter, title]) => [
    'Anexo ' + letter + '. ' + title,
    firstAnnex + startOf('Anexo ' + letter + '.') - annexStart,
  ]),
];

// Reconstruir el índice: eliminar de verdad la línea «Pendiente», sin ocultarla con un rectángulo.
const oldIndex = execFileSync('pdftotext', ['-f', '3', '-l', '3', originalPath, '-'], {
  encoding: 'utf8',
});
const entries = oldIndex
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .flatMap((line) => {
    const match = /^(.*?)\s*\.{2,}\s*(\d+|Pendiente)$/.exec(line);
    if (!match || match[1].startsWith('CAPÍTULO V') || match[1].startsWith('BIBLIOGRAFÍA'))
      return [];
    return [[match[1].trim(), Number(match[2]) - 1]];
  });
if (entries.length !== 28)
  throw new Error('El índice previo cambió; revisar sus entradas antes de integrar.');
entries.push(...sections);
const size = result.getPage(2).getSize();
result.removePage(2);
const indexPage = result.insertPage(2, [size.width, size.height]);
const font = await result.embedFont(StandardFonts.Helvetica);
const bold = await result.embedFont(StandardFonts.HelveticaBold);
indexPage.drawText('ÍNDICE (continuación)', {
  x: 55,
  y: 792,
  font: bold,
  size: 13,
  color: rgb(0.09, 0.2, 0.3),
});
for (const [i, [title, pageIndex]] of entries.entries()) {
  const y = 763 - i * 17.4;
  const heading =
    title.startsWith('CAPÍTULO') || title.startsWith('Capítulo') || title.startsWith('Anexo');
  const selectedFont = heading ? bold : font;
  const size = 8.7;
  indexPage.drawText(title, { x: 55, y, font: selectedFont, size });
  const number = String(pageIndex + 1);
  indexPage.drawText(number, { x: 540 - font.widthOfTextAtSize(number, size), y, font, size });
  const annotation = result.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [53, y - 3, 545, y + 12],
    Border: [0, 0, 0],
    A: { S: 'GoTo', D: [result.getPage(pageIndex).ref, PDFName.of('Fit')] },
  });
  const reference = result.context.register(annotation);
  const annotations = indexPage.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (annotations) annotations.push(reference);
  else indexPage.node.set(PDFName.of('Annots'), result.context.obj([reference]));
}
for (const [i, page] of result.getPages().entries()) {
  const width = page.getWidth();
  page.drawRectangle({ x: 0, y: 0, width, height: 38, color: rgb(1, 1, 1) });
  const number = String(i + 1);
  page.drawText(number, {
    x: (width - font.widthOfTextAtSize(number, 9)) / 2,
    y: 20,
    font,
    size: 9,
  });
}
// Marcadores para encontrar las secciones directamente en el visor del PDF.
const outline = result.context.obj({ Type: 'Outlines', Count: sections.length });
const outlineRef = result.context.register(outline);
const nodes = sections.map(([title, index]) =>
  result.context.obj({
    Title: PDFHexString.fromText(title),
    Parent: outlineRef,
    Dest: [result.getPage(index).ref, PDFName.of('Fit')],
  }),
);
const refs = nodes.map((node) => result.context.register(node));
for (const [i, node] of nodes.entries()) {
  if (i > 0) node.set(PDFName.of('Prev'), refs[i - 1]);
  if (i + 1 < refs.length) node.set(PDFName.of('Next'), refs[i + 1]);
}
outline.set(PDFName.of('First'), refs[0]);
outline.set(PDFName.of('Last'), refs.at(-1));
result.catalog.set(PDFName.of('Outlines'), outlineRef);
result.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
result.setTitle('SIGA · Informe completo: conclusiones, anexos y manuales');
result.setSubject('Informe integrado con índice actualizado y numeración continua');
const backup = join(
  root,
  '.local/documentos/EntregablesPI-Ing-Software-revisado-antes-integrar.pdf',
);
await mkdir(join(root, '.local/documentos'), { recursive: true });
try {
  await access(backup);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await copyFile(outputPath, backup);
}
await writeFile(outputPath, await result.save());
console.log(
  JSON.stringify(
    {
      archivo: outputPath,
      paginas: result.getPageCount(),
      secciones: sections.map(([titulo, indice]) => ({ titulo, pagina: indice + 1 })),
    },
    null,
    2,
  ),
);
