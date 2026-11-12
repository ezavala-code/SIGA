-- Reglas que Prisma no representa: conservar este SQL al crear migraciones futuras.
BEGIN;
ALTER TABLE "Usuario" ADD CONSTRAINT usuario_correo_normalizado CHECK
  (correo = lower(btrim(correo)) AND correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
ALTER TABLE "Usuario" ADD CONSTRAINT usuario_hash_no_vacio CHECK (length("passwordHash") > 0);
ALTER TABLE "Sesion" ADD CONSTRAINT sesion_fechas CHECK
  ("expiraEn" > "creadoEn" AND ("revocadaEn" IS NULL OR "revocadaEn" >= "creadoEn"));
ALTER TABLE "PlanEstudio" ADD CONSTRAINT plan_version_positiva CHECK (version > 0 AND revision > 0);
ALTER TABLE "PlanAsignatura" ADD CONSTRAINT plan_creditos_positivos CHECK (creditos > 0 AND creditos <> 'NaN'::numeric AND "semestreSugerido" > 0);
ALTER TABLE "Prerrequisito" ADD CONSTRAINT prerrequisito_no_propio CHECK ("asignaturaId" <> "requeridaId");
ALTER TABLE "PoliticaAcademica" ADD CONSTRAINT politica_escala CHECK
  ("escalaMinima" < "escalaMaxima" AND "escalaMaxima" <> 'NaN'::numeric AND "minimaAprobatoria" BETWEEN "escalaMinima" AND "escalaMaxima"
   AND decimales BETWEEN 0 AND 3
   AND round("escalaMinima", decimales) = "escalaMinima"
   AND round("escalaMaxima", decimales) = "escalaMaxima"
   AND round("minimaAprobatoria", decimales) = "minimaAprobatoria");
ALTER TABLE "Periodo" ADD CONSTRAINT periodo_fechas CHECK
  (inicio <= fin AND "inscripcionInicio" < "inscripcionFin"
   AND ("inscripcionFin" AT TIME ZONE 'UTC')::date <= fin);
ALTER TABLE "Grupo" ADD CONSTRAINT grupo_cupo_positivo CHECK (cupo > 0);
ALTER TABLE "Inscripcion" ADD CONSTRAINT inscripcion_creditos_version CHECK ("creditosSnapshot" > 0 AND version > 0);
ALTER TABLE "Inscripcion" ADD CONSTRAINT inscripcion_nota_estado CHECK
  ((estado = 'CALIFICADA' AND "notaFinal" IS NOT NULL)
   OR (estado IN ('PENDIENTE', 'CANCELADA') AND "notaFinal" IS NULL));
ALTER TABLE "Certificado" ADD CONSTRAINT certificado_formato CHECK
  (codigo ~ '^[0-9a-f]{32}$' AND jsonb_typeof(instantanea) = 'object'
   AND ("archivoSha256" IS NULL OR "archivoSha256" ~ '^[0-9a-f]{64}$')
   AND ("archivoRuta" IS NULL OR length(btrim("archivoRuta")) > 0)
   AND ("reemplazaId" IS NULL OR "reemplazaId" <> id));
ALTER TABLE "Certificado" ADD CONSTRAINT certificado_estado_archivo CHECK
  ((estado IN ('EMITIDO', 'REVOCADO') AND "emitidoEn" IS NOT NULL AND "archivoRuta" IS NOT NULL AND "archivoSha256" IS NOT NULL)
   OR (estado IN ('PENDIENTE', 'FALLIDO') AND "emitidoEn" IS NULL AND "archivoRuta" IS NULL AND "archivoSha256" IS NULL));
ALTER TABLE "Certificado" ADD CONSTRAINT certificado_revocacion CHECK
  ((estado = 'REVOCADO' AND "revocadoEn" IS NOT NULL AND "motivoRevocacion" IS NOT NULL AND length(btrim("motivoRevocacion")) > 0)
   OR (estado <> 'REVOCADO' AND "revocadoEn" IS NULL AND "motivoRevocacion" IS NULL));
ALTER TABLE "Certificado" ADD CONSTRAINT certificado_fechas CHECK
  (("emitidoEn" IS NULL OR "emitidoEn" >= "solicitadoEn")
   AND ("revocadoEn" IS NULL OR "revocadoEn" >= "emitidoEn"));

-- Las claves visibles tienen una sola representación; se normalizan antes de persistir.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('Programa', 'clave'), ('Asignatura', 'clave'), ('Periodo', 'clave'),
    ('Grupo', 'clave'), ('Estudiante', 'matricula'), ('Docente', 'numeroEmpleado')
  ) AS campos(tabla, campo) LOOP
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%I = upper(btrim(%I)) AND length(%I) > 0)',
      item.tabla, item.tabla || '_clave_normalizada', item.campo, item.campo, item.campo);
  END LOOP;
END $$;

CREATE FUNCTION siga_politica_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Las politicas se versionan; no se modifican ni eliminan' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER politica_inmutable BEFORE UPDATE OR DELETE ON "PoliticaAcademica"
FOR EACH ROW EXECUTE FUNCTION siga_politica_inmutable();

-- El UPDATE del plan serializa cambios del grafo y matrículas. También produce
-- conflicto de serialización si dos transacciones usan snapshots incompatibles.
CREATE FUNCTION siga_plan_conservar_historial() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE plan uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN plan := OLD."planId"; ELSE plan := NEW."planId"; END IF;
  IF TG_OP = 'UPDATE' AND NEW."planId" <> OLD."planId" THEN
    RAISE EXCEPTION 'Crear una nueva version del plan' USING ERRCODE = '23514';
  END IF;
  UPDATE "PlanEstudio" SET revision = revision + 1 WHERE id = plan;
  IF EXISTS (SELECT 1 FROM "Inscripcion" WHERE "planId" = plan) THEN
    RAISE EXCEPTION 'El plan tiene historial: crear una nueva version' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER plan_asignatura_historial BEFORE INSERT OR UPDATE OR DELETE ON "PlanAsignatura"
FOR EACH ROW EXECUTE FUNCTION siga_plan_conservar_historial();
CREATE TRIGGER prerrequisito_01_historial BEFORE INSERT OR UPDATE OR DELETE ON "Prerrequisito"
FOR EACH ROW EXECUTE FUNCTION siga_plan_conservar_historial();

CREATE FUNCTION siga_prerrequisito_sin_ciclo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE camino(id) AS (
      SELECT NEW."requeridaId"
      UNION
      SELECT p."requeridaId" FROM "Prerrequisito" p JOIN camino c ON p."asignaturaId" = c.id
      WHERE p."planId" = NEW."planId"
        AND (TG_OP <> 'UPDATE' OR (p."planId", p."asignaturaId", p."requeridaId")
             IS DISTINCT FROM (OLD."planId", OLD."asignaturaId", OLD."requeridaId"))
    ) SELECT 1 FROM camino WHERE id = NEW."asignaturaId"
  ) THEN
    RAISE EXCEPTION 'El prerrequisito produce un ciclo' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER prerrequisito_02_ciclo BEFORE INSERT OR UPDATE ON "Prerrequisito"
FOR EACH ROW EXECUTE FUNCTION siga_prerrequisito_sin_ciclo();

CREATE FUNCTION siga_inscripcion_validar() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE politica "PoliticaAcademica"%ROWTYPE; creditos numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "PlanEstudio" SET revision = revision + 1 WHERE id = NEW."planId";
    SELECT pa.creditos INTO creditos FROM "PlanAsignatura" pa
      WHERE pa."planId" = NEW."planId" AND pa."asignaturaId" = NEW."asignaturaId";
    IF NEW."creditosSnapshot" IS DISTINCT FROM creditos THEN
      RAISE EXCEPTION 'Los creditos deben coincidir con el plan' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF (NEW."estudianteId", NEW."planId", NEW."grupoId", NEW."asignaturaId", NEW."periodoId", NEW."politicaId", NEW."creditosSnapshot", NEW."creadoEn")
      IS DISTINCT FROM
       (OLD."estudianteId", OLD."planId", OLD."grupoId", OLD."asignaturaId", OLD."periodoId", OLD."politicaId", OLD."creditosSnapshot", OLD."creadoEn") THEN
      RAISE EXCEPTION 'No se puede reinterpretar una inscripcion existente' USING ERRCODE = '23514';
    END IF;
    NEW.version := OLD.version + 1;
    NEW."actualizadoEn" := clock_timestamp();
  END IF;
  SELECT * INTO politica FROM "PoliticaAcademica" WHERE id = NEW."politicaId";
  IF NEW."notaFinal" IS NOT NULL AND (NEW."notaFinal" < politica."escalaMinima"
    OR NEW."notaFinal" > politica."escalaMaxima" OR round(NEW."notaFinal", politica.decimales) <> NEW."notaFinal") THEN
    RAISE EXCEPTION 'Nota fuera de escala o precision' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER inscripcion_validar BEFORE INSERT OR UPDATE ON "Inscripcion"
FOR EACH ROW EXECUTE FUNCTION siga_inscripcion_validar();

CREATE FUNCTION siga_no_borrar_historial() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Conservar el historial; utilizar estado o revocacion' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER inscripcion_no_borrar BEFORE DELETE ON "Inscripcion"
FOR EACH ROW EXECUTE FUNCTION siga_no_borrar_historial();
CREATE TRIGGER auditoria_inmutable BEFORE UPDATE OR DELETE ON "Auditoria"
FOR EACH ROW EXECUTE FUNCTION siga_no_borrar_historial();
CREATE TRIGGER certificado_no_borrar BEFORE DELETE ON "Certificado"
FOR EACH ROW EXECUTE FUNCTION siga_no_borrar_historial();

CREATE FUNCTION siga_certificado_conservar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW."estudianteId", NEW.tipo, NEW.codigo, NEW."solicitadoEn", NEW."reemplazaId")
      IS DISTINCT FROM (OLD."estudianteId", OLD.tipo, OLD.codigo, OLD."solicitadoEn", OLD."reemplazaId")
      OR (OLD.estado IN ('EMITIDO', 'REVOCADO') AND
        (NEW.instantanea, NEW."archivoRuta", NEW."archivoSha256", NEW."emitidoEn")
        IS DISTINCT FROM (OLD.instantanea, OLD."archivoRuta", OLD."archivoSha256", OLD."emitidoEn"))
      OR (OLD.estado = 'REVOCADO' AND NEW IS DISTINCT FROM OLD)
      OR (OLD.estado = 'EMITIDO' AND NEW.estado NOT IN ('EMITIDO', 'REVOCADO')) THEN
      RAISE EXCEPTION 'Conservar la emision; revocar y reemitir' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW."reemplazaId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Certificado" WHERE id = NEW."reemplazaId"
      AND "estudianteId" = NEW."estudianteId" AND estado = 'REVOCADO'
  ) THEN
    RAISE EXCEPTION 'Solo reemplazar un certificado revocado del mismo estudiante' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER certificado_conservar BEFORE INSERT OR UPDATE ON "Certificado"
FOR EACH ROW EXECUTE FUNCTION siga_certificado_conservar();
COMMIT;
