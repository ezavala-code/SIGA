# Informe de SIGA con formato académico

> El informe PDF/DOCX de esta carpeta refleja el estado del 9 de noviembre; los resultados posteriores y reservas vigentes están en [avance de cierre](../AVANCE_CIERRE_20261110.md). Aún debe actualizarse el informe académico para incorporarlos.

Edición documental del 9 de noviembre de 2026, adaptada a `INDICE o estructura del proyecto.pdf` y `Presentacion y contenido del trabajo.docx`.

## Entregables actuales

- [PDF completo revisado](../../EntregablesPI-Ing-Software-revisado.pdf).
- [DOCX editable del informe completo](../../EntregablesPI-Ing-Software-revisado.docx).
- [Fuente Markdown completa](INFORME_SIGA_FORMATO_ACADEMICO.md) y [ODT con índices actualizados](INFORME_SIGA_FORMATO_ACADEMICO.odt).
- [Explicación sencilla del formato](../EXPLICACION_FORMATO_ACADEMICO.md).
- [Validación del formato](../evidencias/formato-academico-20261109.json) y [manifiesto](../evidencias/entrega-revisada-20261109.sha256).

La versión actual contiene preliminares, tres índices automáticos, cinco capítulos, bibliografía y anexos con equipos y ambos manuales. Las fuentes del complemento anterior y sus manuales separados se conservan como antecedentes; sus paginaciones anteriores no corresponden a esta edición.

## Formato y límite de fuente

DOCX: Arial 12, texto justificado, interlineado 1,5; títulos centrados en negrita de 14; subtítulos de 12 en negrita a la izquierda; márgenes normales de 2,54 cm. Preliminares en romanos y cuerpo reiniciado en arábigos. Arial no está instalada aquí: PDF con sustitución Liberation Sans, declarada expresamente. Los índices se actualizan antes de exportar.

## Regeneración local

Se usaron Python 3, Markdown y BeautifulSoup ya disponibles, LibreOffice con pyuno en `/usr/bin/python3`, y las utilidades Poppler. No se instalaron dependencias. Los SVG de `figuras/` son diagramas propios del proyecto.

Desde la raíz:

```bash
python3 docs/entrega-revisada/generar_documentos.py
node node_modules/prettier/bin/prettier.cjs --write "docs/entrega-revisada/*.md" "docs/entrega-revisada/*.html"
```

El comando prepara fuentes y leyendas, genera los índices con un proceso propio de LibreOffice y exporta PDF/DOCX/ODT. Usa una tubería y perfil temporales propios; no cierra sesiones de Office ajenas ni modifica bases de datos. La fuente de capítulos I–III está en `CAPITULOS_I_II_III_FORMATO.md`; los manuales parten de las fuentes revisadas en `docs/manuales/`. El diccionario deriva de `schema.prisma` y la bibliografía del PDF original, conservado intacto.

Después de cualquier cambio, revisar tablas, gráficos, formato e índices, y actualizar el manifiesto. Los archivos `integrar_informe.mjs` y `COMPLEMENTO_INFORME_SIGA.*` pertenecen al método anterior de integración y no son el comando de generación vigente.

```bash
sha256sum --check docs/evidencias/entrega-revisada-20261109.sha256
```

No confundir integridad del documento con aceptación funcional del sistema: el piloto, la capacitación efectiva, las reservas técnicas y las firmas siguen sus criterios reales.
