ALTER TABLE "Periodo" ADD COLUMN "permiteCancelacionEstudiante" BOOLEAN;
-- Ampliación aditiva, preserva historiales, inscripciones y certificados previos.
ALTER TYPE "TipoCertificado" ADD VALUE IF NOT EXISTS 'CONCLUSION';
CREATE TABLE "HorarioGrupo" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "grupoId" UUID NOT NULL,
 "diaSemana" INTEGER NOT NULL, "inicioMinuto" INTEGER NOT NULL, "finMinuto" INTEGER NOT NULL,
 "aula" VARCHAR(80) NOT NULL, CONSTRAINT "HorarioGrupo_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "HorarioGrupo_hora_valida" CHECK ("diaSemana" BETWEEN 1 AND 7 AND "inicioMinuto" BETWEEN 0 AND 1439 AND "finMinuto" BETWEEN 1 AND 1440 AND "finMinuto" > "inicioMinuto"),
 CONSTRAINT "HorarioGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HorarioGrupo_grupoId_diaSemana_inicioMinuto_key" ON "HorarioGrupo"("grupoId","diaSemana","inicioMinuto");
CREATE INDEX "HorarioGrupo_diaSemana_inicioMinuto_finMinuto_idx" ON "HorarioGrupo"("diaSemana","inicioMinuto","finMinuto");
CREATE TABLE "ListaEspera" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "grupoId" UUID NOT NULL, "estudianteId" UUID NOT NULL,
 "estado" VARCHAR(20) NOT NULL DEFAULT 'ESPERANDO', "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "actualizadoEn" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "ListaEspera_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ListaEspera_estado_valido" CHECK ("estado" IN ('ESPERANDO','OFRECIDO','ATENDIDO','CANCELADO')),
 CONSTRAINT "ListaEspera_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ListaEspera_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ListaEspera_grupoId_estudianteId_key" ON "ListaEspera"("grupoId","estudianteId");
CREATE INDEX "ListaEspera_grupoId_estado_creadoEn_idx" ON "ListaEspera"("grupoId","estado","creadoEn");
CREATE TABLE "Evaluacion" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),"grupoId" UUID NOT NULL,
 "nombre" VARCHAR(120) NOT NULL,"ponderacion" DECIMAL(5,2) NOT NULL,
 "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Evaluacion_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Evaluacion_ponderacion_valida" CHECK ("ponderacion" > 0 AND "ponderacion" <= 100),
 CONSTRAINT "Evaluacion_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Evaluacion_grupoId_nombre_key" ON "Evaluacion"("grupoId","nombre");
CREATE TABLE "NotaEvaluacion" (
 "evaluacionId" UUID NOT NULL,"inscripcionId" UUID NOT NULL,
 "nota" DECIMAL(7,3) NOT NULL,"actualizadoEn" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "NotaEvaluacion_pkey" PRIMARY KEY ("evaluacionId","inscripcionId"),
 CONSTRAINT "NotaEvaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "NotaEvaluacion_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "Notificacion" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "usuarioId" UUID NOT NULL,
 "titulo" VARCHAR(160) NOT NULL,"mensaje" VARCHAR(500) NOT NULL,
 "leidaEn" TIMESTAMPTZ(3),"creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Notificacion_usuarioId_creadoEn_idx" ON "Notificacion"("usuarioId","creadoEn");
CREATE TABLE "SesionClase" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),"grupoId" UUID NOT NULL,
 "fecha" DATE NOT NULL,"tema" VARCHAR(160) NOT NULL,
 CONSTRAINT "SesionClase_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SesionClase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SesionClase_grupoId_fecha_key" ON "SesionClase"("grupoId","fecha");
CREATE TABLE "RegistroAsistencia" (
 "sesionId" UUID NOT NULL,"inscripcionId" UUID NOT NULL,
 "presente" BOOLEAN NOT NULL,"actualizadoEn" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "RegistroAsistencia_pkey" PRIMARY KEY ("sesionId","inscripcionId"),
 CONSTRAINT "RegistroAsistencia_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionClase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "RegistroAsistencia_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "RecuperacionAcceso" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),"usuarioId" UUID NOT NULL,
 "tokenHash" VARCHAR(64) NOT NULL,"expiraEn" TIMESTAMPTZ(3) NOT NULL,
 "usadoEn" TIMESTAMPTZ(3),"creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RecuperacionAcceso_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RecuperacionAcceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecuperacionAcceso_tokenHash_key" ON "RecuperacionAcceso"("tokenHash");
CREATE INDEX "RecuperacionAcceso_usuarioId_expiraEn_idx" ON "RecuperacionAcceso"("usuarioId","expiraEn");
