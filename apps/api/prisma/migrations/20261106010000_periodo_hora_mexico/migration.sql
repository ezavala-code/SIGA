-- La fecha limite del periodo se interpreta en la zona elegida para la demostracion.
ALTER TABLE "Periodo" DROP CONSTRAINT periodo_fechas;
ALTER TABLE "Periodo" ADD CONSTRAINT periodo_fechas CHECK
  (inicio <= fin AND "inscripcionInicio" < "inscripcionFin"
   AND ("inscripcionFin" AT TIME ZONE 'America/Mexico_City')::date <= fin);
