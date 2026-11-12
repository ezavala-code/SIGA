-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "EstadoEstudiante" AS ENUM ('ACTIVO', 'INACTIVO', 'EGRESADO');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('PLANIFICADO', 'ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('PENDIENTE', 'CALIFICADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoCertificado" AS ENUM ('PENDIENTE', 'EMITIDO', 'REVOCADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "TipoCertificado" AS ENUM ('ESTUDIOS');

-- CreateEnum
CREATE TYPE "PoliticaIntentos" AS ENUM ('TODOS', 'ULTIMO', 'MEJOR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correo" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMPTZ(3) NOT NULL,
    "revocadaEn" TIMESTAMPTZ(3),

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clave" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEstudio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programaId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlanEstudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estudiante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "matricula" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "planId" UUID NOT NULL,
    "fechaIngreso" DATE NOT NULL,
    "estado" "EstadoEstudiante" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "Estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Docente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "numeroEmpleado" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "departamento" VARCHAR(160) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clave" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAsignatura" (
    "planId" UUID NOT NULL,
    "asignaturaId" UUID NOT NULL,
    "creditos" DECIMAL(8,2) NOT NULL,
    "semestreSugerido" INTEGER NOT NULL,

    CONSTRAINT "PlanAsignatura_pkey" PRIMARY KEY ("planId","asignaturaId")
);

-- CreateTable
CREATE TABLE "Prerrequisito" (
    "planId" UUID NOT NULL,
    "asignaturaId" UUID NOT NULL,
    "requeridaId" UUID NOT NULL,

    CONSTRAINT "Prerrequisito_pkey" PRIMARY KEY ("planId","asignaturaId","requeridaId")
);

-- CreateTable
CREATE TABLE "PoliticaAcademica" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" VARCHAR(60) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "escalaMinima" DECIMAL(7,3) NOT NULL,
    "escalaMaxima" DECIMAL(7,3) NOT NULL,
    "minimaAprobatoria" DECIMAL(7,3) NOT NULL,
    "decimales" INTEGER NOT NULL,
    "intentosPromedio" "PoliticaIntentos" NOT NULL,
    "permiteReinscripcionAprobada" BOOLEAN NOT NULL DEFAULT false,
    "permiteCancelacionEstudiante" BOOLEAN NOT NULL DEFAULT false,
    "esPropuesta" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliticaAcademica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clave" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "inicio" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "inscripcionInicio" TIMESTAMPTZ(3) NOT NULL,
    "inscripcionFin" TIMESTAMPTZ(3) NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'PLANIFICADO',
    "politicaId" UUID NOT NULL,

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clave" VARCHAR(40) NOT NULL,
    "planId" UUID NOT NULL,
    "asignaturaId" UUID NOT NULL,
    "periodoId" UUID NOT NULL,
    "politicaId" UUID NOT NULL,
    "docenteId" UUID NOT NULL,
    "cupo" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "estudianteId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "grupoId" UUID NOT NULL,
    "asignaturaId" UUID NOT NULL,
    "periodoId" UUID NOT NULL,
    "politicaId" UUID NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'PENDIENTE',
    "notaFinal" DECIMAL(7,3),
    "creditosSnapshot" DECIMAL(8,2) NOT NULL,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "estudianteId" UUID NOT NULL,
    "tipo" "TipoCertificado" NOT NULL DEFAULT 'ESTUDIOS',
    "codigo" VARCHAR(32) NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
    "estado" "EstadoCertificado" NOT NULL DEFAULT 'PENDIENTE',
    "solicitadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emitidoEn" TIMESTAMPTZ(3),
    "instantanea" JSONB NOT NULL,
    "archivoRuta" TEXT,
    "archivoSha256" VARCHAR(64),
    "revocadoEn" TIMESTAMPTZ(3),
    "motivoRevocacion" TEXT,
    "reemplazaId" UUID,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID,
    "accion" VARCHAR(80) NOT NULL,
    "recurso" VARCHAR(80) NOT NULL,
    "recursoId" VARCHAR(100) NOT NULL,
    "motivo" TEXT,
    "anterior" JSONB,
    "posterior" JSONB,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_expiraEn_idx" ON "Sesion"("usuarioId", "expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "Programa_clave_key" ON "Programa"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEstudio_programaId_version_key" ON "PlanEstudio"("programaId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_usuarioId_key" ON "Estudiante"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_matricula_key" ON "Estudiante"("matricula");

-- CreateIndex
CREATE INDEX "Estudiante_planId_idx" ON "Estudiante"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_id_planId_key" ON "Estudiante"("id", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "Docente_usuarioId_key" ON "Docente"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Docente_numeroEmpleado_key" ON "Docente"("numeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "Asignatura_clave_key" ON "Asignatura"("clave");

-- CreateIndex
CREATE INDEX "PlanAsignatura_asignaturaId_idx" ON "PlanAsignatura"("asignaturaId");

-- CreateIndex
CREATE INDEX "Prerrequisito_planId_requeridaId_idx" ON "Prerrequisito"("planId", "requeridaId");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticaAcademica_version_key" ON "PoliticaAcademica"("version");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_clave_key" ON "Periodo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_id_politicaId_key" ON "Periodo"("id", "politicaId");

-- CreateIndex
CREATE INDEX "Grupo_planId_asignaturaId_idx" ON "Grupo"("planId", "asignaturaId");

-- CreateIndex
CREATE INDEX "Grupo_periodoId_politicaId_idx" ON "Grupo"("periodoId", "politicaId");

-- CreateIndex
CREATE INDEX "Grupo_docenteId_periodoId_idx" ON "Grupo"("docenteId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_periodoId_clave_key" ON "Grupo"("periodoId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_id_planId_asignaturaId_periodoId_politicaId_key" ON "Grupo"("id", "planId", "asignaturaId", "periodoId", "politicaId");

-- CreateIndex
CREATE INDEX "Inscripcion_grupoId_planId_asignaturaId_periodoId_politicaI_idx" ON "Inscripcion"("grupoId", "planId", "asignaturaId", "periodoId", "politicaId");

-- CreateIndex
CREATE INDEX "Inscripcion_estudianteId_planId_idx" ON "Inscripcion"("estudianteId", "planId");

-- CreateIndex
CREATE INDEX "Inscripcion_periodoId_estado_idx" ON "Inscripcion"("periodoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_estudianteId_asignaturaId_periodoId_key" ON "Inscripcion"("estudianteId", "asignaturaId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_codigo_key" ON "Certificado"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_reemplazaId_key" ON "Certificado"("reemplazaId");

-- CreateIndex
CREATE INDEX "Certificado_estudianteId_solicitadoEn_idx" ON "Certificado"("estudianteId", "solicitadoEn");

-- CreateIndex
CREATE INDEX "Auditoria_recurso_recursoId_creadoEn_idx" ON "Auditoria"("recurso", "recursoId", "creadoEn");

-- CreateIndex
CREATE INDEX "Auditoria_actorId_creadoEn_idx" ON "Auditoria"("actorId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PlanEstudio" ADD CONSTRAINT "PlanEstudio_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Estudiante" ADD CONSTRAINT "Estudiante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Estudiante" ADD CONSTRAINT "Estudiante_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanEstudio"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Docente" ADD CONSTRAINT "Docente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PlanAsignatura" ADD CONSTRAINT "PlanAsignatura_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanEstudio"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PlanAsignatura" ADD CONSTRAINT "PlanAsignatura_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Prerrequisito" ADD CONSTRAINT "Prerrequisito_planId_asignaturaId_fkey" FOREIGN KEY ("planId", "asignaturaId") REFERENCES "PlanAsignatura"("planId", "asignaturaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Prerrequisito" ADD CONSTRAINT "Prerrequisito_planId_requeridaId_fkey" FOREIGN KEY ("planId", "requeridaId") REFERENCES "PlanAsignatura"("planId", "asignaturaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Periodo" ADD CONSTRAINT "Periodo_politicaId_fkey" FOREIGN KEY ("politicaId") REFERENCES "PoliticaAcademica"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_planId_asignaturaId_fkey" FOREIGN KEY ("planId", "asignaturaId") REFERENCES "PlanAsignatura"("planId", "asignaturaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_periodoId_politicaId_fkey" FOREIGN KEY ("periodoId", "politicaId") REFERENCES "Periodo"("id", "politicaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_estudianteId_planId_fkey" FOREIGN KEY ("estudianteId", "planId") REFERENCES "Estudiante"("id", "planId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_grupoId_planId_asignaturaId_periodoId_politica_fkey" FOREIGN KEY ("grupoId", "planId", "asignaturaId", "periodoId", "politicaId") REFERENCES "Grupo"("id", "planId", "asignaturaId", "periodoId", "politicaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_reemplazaId_fkey" FOREIGN KEY ("reemplazaId") REFERENCES "Certificado"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
