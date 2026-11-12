BEGIN;
CREATE FUNCTION siga_persona_rol() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rol_actual "Rol";
BEGIN
  SELECT rol INTO rol_actual FROM "Usuario" WHERE id = NEW."usuarioId" FOR UPDATE;
  IF rol_actual IS NOT NULL AND
    ((TG_TABLE_NAME = 'Estudiante' AND rol_actual <> 'ESTUDIANTE') OR
     (TG_TABLE_NAME = 'Docente' AND rol_actual <> 'DOCENTE')) THEN
    RAISE EXCEPTION 'El rol de la cuenta no corresponde a la persona' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER estudiante_rol BEFORE INSERT OR UPDATE OF "usuarioId" ON "Estudiante"
FOR EACH ROW EXECUTE FUNCTION siga_persona_rol();
CREATE TRIGGER docente_rol BEFORE INSERT OR UPDATE OF "usuarioId" ON "Docente"
FOR EACH ROW EXECUTE FUNCTION siga_persona_rol();

CREATE FUNCTION siga_usuario_conservar_rol() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.rol <> 'ESTUDIANTE' AND EXISTS (SELECT 1 FROM "Estudiante" WHERE "usuarioId" = NEW.id))
    OR (NEW.rol <> 'DOCENTE' AND EXISTS (SELECT 1 FROM "Docente" WHERE "usuarioId" = NEW.id)) THEN
    RAISE EXCEPTION 'El rol tiene una persona asociada' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER usuario_conservar_rol BEFORE UPDATE OF rol ON "Usuario"
FOR EACH ROW EXECUTE FUNCTION siga_usuario_conservar_rol();

CREATE FUNCTION siga_plan_conservar_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."programaId", NEW.version, NEW.nombre) IS DISTINCT FROM (OLD."programaId", OLD.version, OLD.nombre)
    AND EXISTS (SELECT 1 FROM "Inscripcion" WHERE "planId" = OLD.id) THEN
    RAISE EXCEPTION 'El plan tiene historial: conservar su identidad y version' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER plan_conservar_version BEFORE UPDATE ON "PlanEstudio"
FOR EACH ROW EXECUTE FUNCTION siga_plan_conservar_version();
COMMIT;
