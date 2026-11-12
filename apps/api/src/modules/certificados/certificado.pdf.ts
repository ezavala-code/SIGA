import { readFile } from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';

export type CertificadoInstantanea = {
  version: 1;
  codigo: string;
  tipo: 'ESTUDIOS' | 'CONCLUSION';
  emitidoEn: string;
  estudiante: { nombre: string; matricula: string };
  plan: { nombre: string; version: number };
  programa: { clave: string; nombre: string };
  calificaciones: {
    periodoClave: string;
    periodoNombre: string;
    asignaturaClave: string;
    asignaturaNombre: string;
    notaFinal: string;
    creditos: string;
    minimaAprobatoria: string;
    resultado: 'APROBADA' | 'REPROBADA';
    politicaPropuesta: boolean;
  }[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 38;
const RIGHT = PAGE_WIDTH - 38;
const INK = rgb(0.09, 0.22, 0.19);
const MUTED = rgb(0.36, 0.42, 0.38);
const PALE = rgb(0.94, 0.96, 0.92);
const GOLD = rgb(0.68, 0.51, 0.24);

export class CaracterNoAdmitidoEnConstancia extends Error {}

type InstanciaFontkit = ReturnType<typeof fontkit.create>;

type RecursosFuentes = {
  regularData: Buffer;
  boldData: Buffer;
  fallbackData: Buffer;
  regular: Set<number>;
  bold: Set<number>;
  fallback: Set<number>;
  fontkitCacheado: {
    create: (data: Uint8Array) => InstanciaFontkit;
  };
};

const fontDirectory = new URL('../../../assets/fonts/', import.meta.url);
let recursosFuentes: Promise<RecursosFuentes> | undefined;
let caracteresLatinCache: Set<number> | undefined;
let caracteresLatinBoldCache: Set<number> | undefined;

function cargarRecursosFuentes(): Promise<RecursosFuentes> {
  recursosFuentes ??= Promise.all(
    ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf', 'DroidSansFallbackFull.ttf'].map((name) =>
      readFile(new URL(name, fontDirectory)),
    ),
  )
    .then(([regularData, boldData, fallbackData]) => {
      const regularFont = fontkit.create(regularData!);
      const boldFont = fontkit.create(boldData!);
      const fallbackFont = fontkit.create(fallbackData!);
      regularFont.layout('AЖ');
      boldFont.layout('AЖ');
      fallbackFont.layout('李');
      return {
        regularData: regularData!,
        boldData: boldData!,
        fallbackData: fallbackData!,
        regular: new Set(regularFont.characterSet),
        bold: new Set(boldFont.characterSet),
        fallback: new Set(fallbackFont.characterSet),
        fontkitCacheado: {
          create(data: Uint8Array) {
            if (data === regularData) return regularFont;
            if (data === boldData) return boldFont;
            if (data === fallbackData) return fallbackFont;
            return fontkit.create(data);
          },
        },
      };
    })
    .catch((error: unknown) => {
      recursosFuentes = undefined;
      throw error;
    });
  return recursosFuentes;
}

export async function precargarFuentesConstancia(): Promise<void> {
  await cargarRecursosFuentes();
}

export async function validarCaracteresConstancia(instantanea: CertificadoInstantanea) {
  const { regular, bold, fallback } = await cargarRecursosFuentes();
  const values: unknown[] = [instantanea];
  while (values.length) {
    const value = values.pop();
    if (typeof value === 'string') {
      for (const character of value) {
        const codepoint = character.codePointAt(0)!;
        if ((!regular.has(codepoint) || !bold.has(codepoint)) && !fallback.has(codepoint)) {
          throw new CaracterNoAdmitidoEnConstancia(
            'La constancia contiene caracteres sin fuente disponible.',
          );
        }
      }
    } else if (value && typeof value === 'object') {
      values.push(...Object.values(value));
    }
  }
}

type Fuentes = {
  estandar: PDFFont;
  caracteresEstandar: Set<number>;
  unicode?: PDFFont;
  caracteresUnicode?: Set<number>;
  alternativa?: PDFFont;
  caracteresAlternativos?: Set<number>;
};

function seleccionarFuente(codepoint: number, fuentes: Fuentes): PDFFont {
  if (fuentes.caracteresEstandar.has(codepoint)) {
    return fuentes.estandar;
  }
  if (fuentes.unicode && fuentes.caracteresUnicode?.has(codepoint)) {
    return fuentes.unicode;
  }
  if (fuentes.alternativa && fuentes.caracteresAlternativos?.has(codepoint)) {
    return fuentes.alternativa;
  }
  throw new CaracterNoAdmitidoEnConstancia(
    'La constancia contiene caracteres sin fuente disponible.',
  );
}

function segmentos(text: string, fuentes: Fuentes): { text: string; font: PDFFont }[] {
  const result: { text: string; font: PDFFont }[] = [];
  for (const character of text) {
    const codepoint = character.codePointAt(0)!;
    const font = seleccionarFuente(codepoint, fuentes);
    const previous = result.at(-1);
    if (previous?.font === font) previous.text += character;
    else result.push({ text: character, font });
  }
  return result;
}

function ancho(text: string, fuentes: Fuentes, size: number): number {
  return segmentos(text, fuentes).reduce(
    (total, segment) => total + segment.font.widthOfTextAtSize(segment.text, size),
    0,
  );
}

function wrap(text: string, font: Fuentes, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const pieces: string[] = [];
    let piece = '';
    if (ancho(word, font, size) <= width) {
      pieces.push(word);
    } else {
      for (const character of word) {
        if (piece && ancho(`${piece}${character}`, font, size) > width) {
          pieces.push(piece);
          piece = '';
        }
        piece += character;
      }
      if (piece) pieces.push(piece);
    }
    pieces.forEach((part, index) => {
      const next = `${line}${line && index === 0 ? ' ' : ''}${part}`;
      if (line && ancho(next, font, size) > width) {
        lines.push(line);
        line = part;
      } else {
        line = next;
      }
    });
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function lineText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: Fuentes,
  size: number,
  color = INK,
) {
  const parts = segmentos(text, font);
  for (const [index, segment] of parts.entries()) {
    page.drawText(segment.text, { x, y, font: segment.font, size, color });
    if (index < parts.length - 1) x += segment.font.widthOfTextAtSize(segment.text, size);
  }
}

function analizarRequerimientosFuentes(
  instantanea: CertificadoInstantanea,
  caracteresLatin: Set<number>,
  caracteresLatinBold: Set<number>,
  recursos?: RecursosFuentes,
): {
  requierePersonalizadas: boolean;
  usaNotoRegular: boolean;
  usaNotoBold: boolean;
  usaFallback: boolean;
} {
  let requierePersonalizadas = false;
  let usaNotoRegular = false;
  let usaNotoBold = false;
  let usaFallback = false;
  const entradas: { texto: string; esBold: boolean }[] = [
    { texto: instantanea.estudiante.nombre, esBold: true },
    { texto: instantanea.programa.nombre, esBold: true },
    { texto: instantanea.codigo, esBold: true },
    { texto: instantanea.tipo, esBold: false },
    { texto: instantanea.emitidoEn, esBold: false },
    { texto: instantanea.estudiante.matricula, esBold: false },
    { texto: instantanea.plan.nombre, esBold: false },
    { texto: instantanea.programa.clave, esBold: false },
  ];
  for (const calificacion of instantanea.calificaciones) {
    entradas.push(
      { texto: calificacion.periodoClave, esBold: false },
      { texto: calificacion.periodoNombre, esBold: false },
      { texto: calificacion.asignaturaClave, esBold: false },
      { texto: calificacion.asignaturaNombre, esBold: false },
      { texto: calificacion.notaFinal, esBold: false },
      { texto: calificacion.creditos, esBold: false },
      { texto: calificacion.minimaAprobatoria, esBold: false },
      { texto: calificacion.resultado, esBold: false },
    );
  }
  for (const { texto, esBold } of entradas) {
    const conjuntoEstandar = esBold ? caracteresLatinBold : caracteresLatin;
    for (const character of texto) {
      const codepoint = character.codePointAt(0)!;
      if (conjuntoEstandar.has(codepoint)) {
        continue;
      }
      requierePersonalizadas = true;
      if (!recursos) {
        return {
          requierePersonalizadas: true,
          usaNotoRegular: false,
          usaNotoBold: false,
          usaFallback: false,
        };
      }
      if (recursos.regular.has(codepoint) && recursos.bold.has(codepoint)) {
        if (esBold) usaNotoBold = true;
        else usaNotoRegular = true;
      } else if (recursos.fallback.has(codepoint)) {
        usaFallback = true;
      } else {
        throw new CaracterNoAdmitidoEnConstancia(
          'La constancia contiene caracteres sin fuente disponible.',
        );
      }
    }
  }
  return { requierePersonalizadas, usaNotoRegular, usaNotoBold, usaFallback };
}

export async function generarPdfConstancia(
  instantanea: CertificadoInstantanea,
  urlVerificacion: string,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `${instantanea.tipo === 'CONCLUSION' ? 'Certificado de conclusión' : 'Constancia de estudios'} ${instantanea.codigo}`,
  );
  pdf.setSubject('Constancia académica verificable');
  pdf.setCreator('SIGA');
  pdf.setLanguage('es-MX');
  const [latinRegular, latinBold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ]);
  caracteresLatinCache ??= new Set(latinRegular.getCharacterSet());
  caracteresLatinBoldCache ??= new Set(latinBold.getCharacterSet());
  const caracteresLatin = caracteresLatinCache;
  const caracteresLatinBold = caracteresLatinBoldCache;
  let regular: Fuentes = {
    estandar: latinRegular,
    caracteresEstandar: caracteresLatin,
  };
  let bold: Fuentes = {
    estandar: latinBold,
    caracteresEstandar: caracteresLatinBold,
  };
  if (
    analizarRequerimientosFuentes(instantanea, caracteresLatin, caracteresLatinBold)
      .requierePersonalizadas
  ) {
    const recursos = await cargarRecursosFuentes();
    const { usaNotoRegular, usaNotoBold, usaFallback } = analizarRequerimientosFuentes(
      instantanea,
      caracteresLatin,
      caracteresLatinBold,
      recursos,
    );
    pdf.registerFontkit(
      recursos.fontkitCacheado as unknown as Parameters<typeof pdf.registerFontkit>[0],
    );
    const [regularFont, boldFont, fallbackFont] = await Promise.all([
      usaNotoRegular
        ? pdf.embedFont(recursos.regularData, { subset: true })
        : Promise.resolve(undefined),
      usaNotoBold ? pdf.embedFont(recursos.boldData, { subset: true }) : Promise.resolve(undefined),
      usaFallback
        ? pdf.embedFont(recursos.fallbackData, { subset: true })
        : Promise.resolve(undefined),
    ]);
    regular = {
      estandar: latinRegular,
      caracteresEstandar: caracteresLatin,
      ...(regularFont ? { unicode: regularFont, caracteresUnicode: recursos.regular } : {}),
      ...(fallbackFont
        ? { alternativa: fallbackFont, caracteresAlternativos: recursos.fallback }
        : {}),
    };
    bold = {
      estandar: latinBold,
      caracteresEstandar: caracteresLatinBold,
      ...(boldFont ? { unicode: boldFont, caracteresUnicode: recursos.bold } : {}),
      ...(fallbackFont
        ? { alternativa: fallbackFont, caracteresAlternativos: recursos.fallback }
        : {}),
    };
  }
  const qrBytes = await QRCode.toBuffer(urlVerificacion, {
    type: 'png',
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#173d35', light: '#ffffff' },
  });
  const qr = await pdf.embedPng(qrBytes);
  const qrDims = qr.scale(0.38);
  const pages: PDFPage[] = [];

  const addPage = (continuation: boolean) => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 9, width: PAGE_WIDTH, height: 9, color: INK });
    page.drawRectangle({ x: LEFT, y: 40, width: PAGE_WIDTH - LEFT * 2, height: 1, color: PALE });
    lineText(page, 'SIGA', LEFT, 798, bold, 9, MUTED);
    if (continuation)
      lineText(
        page,
        instantanea.tipo === 'CONCLUSION'
          ? 'CERTIFICADO DE CONCLUSIÓN - CONTINUACIÓN'
          : 'CONSTANCIA DE ESTUDIOS - CONTINUACIÓN',
        LEFT,
        782,
        bold,
        12,
      );
    lineText(page, 'Verificación en línea mediante el código o QR.', LEFT, 24, regular, 8, MUTED);
    return page;
  };

  let page = addPage(false);
  lineText(
    page,
    instantanea.tipo === 'CONCLUSION' ? 'CERTIFICADO DE CONCLUSIÓN' : 'CONSTANCIA DE ESTUDIOS',
    LEFT,
    746,
    bold,
    21,
  );
  page.drawRectangle({ x: LEFT, y: 730, width: 72, height: 2, color: GOLD });
  lineText(page, 'Se hace constar que', LEFT, 698, regular, 11, MUTED);
  let detailsY = 668;
  for (const line of wrap(instantanea.estudiante.nombre, bold, 19, 380)) {
    lineText(page, line, LEFT, detailsY, bold, 19);
    detailsY -= 23;
  }
  lineText(page, `con matrícula ${instantanea.estudiante.matricula}`, LEFT, detailsY, regular, 10);
  detailsY -= 24;
  lineText(
    page,
    instantanea.tipo === 'CONCLUSION'
      ? 'ha acreditado la totalidad de las asignaturas del plan:'
      : 'cuenta con los siguientes intentos académicos con nota final:',
    LEFT,
    detailsY,
    regular,
    10,
  );
  detailsY -= 32;
  for (const line of wrap(instantanea.programa.nombre, bold, 12, 340)) {
    lineText(page, line, LEFT, detailsY, bold, 12);
    detailsY -= 15;
  }
  detailsY -= 15;
  for (const line of wrap(
    `${instantanea.plan.nombre} - versión ${instantanea.plan.version}`,
    regular,
    9,
    RIGHT - LEFT,
  )) {
    lineText(page, line, LEFT, detailsY, regular, 9, MUTED);
    detailsY -= 12;
  }
  const issueDate = new Date(instantanea.emitidoEn).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  lineText(page, `Emitida el ${issueDate}`, LEFT, detailsY - 5, regular, 9, MUTED);

  page.drawImage(qr, {
    x: RIGHT - qrDims.width,
    y: 626,
    width: qrDims.width,
    height: qrDims.height,
  });
  lineText(page, 'CÓDIGO DE VERIFICACIÓN', RIGHT - 100, 614, bold, 6.5, MUTED);
  lineText(page, instantanea.codigo.slice(0, 16), RIGHT - 100, 602, bold, 6.2, INK);
  lineText(page, instantanea.codigo.slice(16), RIGHT - 100, 592, bold, 6.2, INK);

  const columns = [
    { name: 'PERÍODO', key: 'periodo', width: 92 },
    { name: 'ASIGNATURA', key: 'asignatura', width: 224 },
    { name: 'NOTA', key: 'nota', width: 48 },
    { name: 'RESULTADO', key: 'resultado', width: 83 },
    { name: 'CRÉDITOS', key: 'creditos', width: 72 },
  ] as const;
  const tableLeft = LEFT;
  const rowLineHeight = 10;
  let y = detailsY - 32;
  const drawTableHeader = (target: PDFPage) => {
    target.drawRectangle({ x: tableLeft, y: y - 5, width: RIGHT - LEFT, height: 21, color: PALE });
    let x = tableLeft + 7;
    for (const column of columns) {
      lineText(target, column.name, x, y + 2, bold, 6.8, MUTED);
      x += column.width;
    }
    y -= 22;
  };
  drawTableHeader(page);

  for (const record of instantanea.calificaciones) {
    const cells = [
      `${record.periodoClave} ${record.periodoNombre}`,
      `${record.asignaturaClave} ${record.asignaturaNombre}`,
      record.notaFinal,
      record.resultado === 'APROBADA' ? 'Aprobada' : 'Reprobada',
      record.creditos,
    ];
    const lines = cells.map((cell, index) => wrap(cell, regular, 7.7, columns[index]!.width - 10));
    const height = Math.max(...lines.map((items) => items.length)) * rowLineHeight + 7;
    if (y - height < 72) {
      page = addPage(true);
      y = 758;
      drawTableHeader(page);
    }
    let x = tableLeft + 7;
    for (let i = 0; i < lines.length; i += 1) {
      lines[i]!.forEach((line, index) =>
        lineText(page, line, x, y - 8 - index * rowLineHeight, regular, 7.7),
      );
      x += columns[i]!.width;
    }
    page.drawRectangle({
      x: tableLeft,
      y: y - height + 2,
      width: RIGHT - LEFT,
      height: 0.5,
      color: PALE,
    });
    y -= height;
  }

  lineText(
    page,
    instantanea.tipo === 'CONCLUSION'
      ? 'Acreditación conforme al plan y a las políticas académicas registradas.'
      : 'Documento de consulta académica; no acredita la conclusión del programa.',
    LEFT,
    53,
    regular,
    8,
    MUTED,
  );
  pages.forEach((target, index) => {
    lineText(target, `Pagina ${index + 1} de ${pages.length}`, RIGHT - 70, 24, regular, 8, MUTED);
  });
  return Buffer.from(await pdf.save());
}
