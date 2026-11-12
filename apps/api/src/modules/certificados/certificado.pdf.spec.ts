import { PDFDocument } from 'pdf-lib';
import { jest } from '@jest/globals';
import {
  CaracterNoAdmitidoEnConstancia,
  generarPdfConstancia,
  type CertificadoInstantanea,
} from './certificado.pdf.js';

jest.setTimeout(30000);

const instantanea: CertificadoInstantanea = {
  version: 1,
  codigo: '0123456789abcdef0123456789abcdef',
  tipo: 'ESTUDIOS',
  emitidoEn: '2026-01-01T00:00:00.000Z',
  estudiante: { nombre: 'Ana Ejemplo', matricula: '123456' },
  plan: { nombre: 'Plan de estudios', version: 1 },
  programa: { clave: 'DEMO', nombre: 'Desarrollo de Software (demostración)' },
  calificaciones: [
    {
      periodoClave: '2026A',
      periodoNombre: 'Primer periodo',
      asignaturaClave: 'P01',
      asignaturaNombre: 'Programación',
      notaFinal: '9.000',
      creditos: '6',
      minimaAprobatoria: '6.000',
      resultado: 'APROBADA',
      politicaPropuesta: true,
    },
  ],
};

describe('constancia PDF', () => {
  it('usa fuentes estándar para acentos y símbolos latinos admitidos', async () => {
    const bytes = await generarPdfConstancia(
      {
        ...instantanea,
        estudiante: { ...instantanea.estudiante, nombre: 'María Muñoz López' },
        programa: { clave: 'PRUEBA', nombre: 'Informática y tecnología €' },
      },
      `http://localhost/verificar/${instantanea.codigo}`,
    );
    const pdf = await PDFDocument.load(bytes);
    const objetos = pdf.context.enumerateIndirectObjects().map(([, object]) => object.toString());
    expect(objetos.some((object) => object.includes('/BaseFont /Helvetica'))).toBe(true);
    expect(objetos.some((object) => object.includes('/BaseFont /NotoSans'))).toBe(false);
  });

  it.each(['Desarrollo de Software (demostración)', 'Ingeniería en Computación'])(
    'genera un documento sin metadatos de otro programa: %s',
    async (nombre) => {
      const bytes = await generarPdfConstancia(
        { ...instantanea, programa: { clave: 'PRUEBA', nombre } },
        `http://localhost/verificar/${instantanea.codigo}`,
      );
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getSubject()).toBe('Constancia académica verificable');
      expect(pdf.getCreator()).toBe('SIGA');
      expect(pdf.getPageCount()).toBeGreaterThan(0);
    },
  );

  it('admite nombres largos, acentos y múltiples páginas de calificaciones', async () => {
    const pdf = await PDFDocument.load(
      await generarPdfConstancia(
        {
          ...instantanea,
          estudiante: { ...instantanea.estudiante, nombre: 'María José '.repeat(14).trim() },
          programa: { clave: 'PRUEBA', nombre: 'Ingeniería y tecnología '.repeat(6).trim() },
          plan: { nombre: 'Plan académico de formación '.repeat(5).trim(), version: 1 },
          calificaciones: Array.from({ length: 80 }, () => instantanea.calificaciones[0]!),
        },
        `http://localhost/verificar/${instantanea.codigo}`,
      ),
    );
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it('genera un PDF con nombres chinos y cirílicos mezclados con texto latino', async () => {
    const bytes = await generarPdfConstancia(
      {
        ...instantanea,
        estudiante: { ...instantanea.estudiante, nombre: 'María 李 Жан' },
        programa: { clave: 'PRUEBA', nombre: 'Ingeniería 计算机 Программа' },
      },
      `http://localhost/verificar/${instantanea.codigo}`,
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(
      pdf.context
        .enumerateIndirectObjects()
        .some(([, object]) => object.toString().includes('/BaseFont /DroidSansFallback')),
    ).toBe(true);
  });

  it('rechaza de forma explícita caracteres sin glifo', async () => {
    await expect(
      generarPdfConstancia(
        { ...instantanea, estudiante: { ...instantanea.estudiante, nombre: 'Ana 🦄' } },
        `http://localhost/verificar/${instantanea.codigo}`,
      ),
    ).rejects.toBeInstanceOf(CaracterNoAdmitidoEnConstancia);
  });
});
