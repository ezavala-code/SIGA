type Account = { email: string; password: string };
type Role = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE' | 'ESTUDIANTE_2';
type Journey = { student: Account; teacher: Account; studentId: string; groupId: string };
type CertificateJourney = { student: Account; administrator: Account; studentId: string };

export function account(role: Role): Account {
  if (!process.env.SIGA_E2E_ACCOUNTS) {
    throw new Error(
      'Faltan fixtures E2E. Ejecuta scripts/test-e2e-isolated.mjs con TEST_DATABASE_URL.',
    );
  }
  const accounts = JSON.parse(process.env.SIGA_E2E_ACCOUNTS) as Partial<Record<Role, Account>>;
  const user = accounts[role];
  if (!user?.email || !user.password) throw new Error(`Falta fixture para ${role}.`);
  return user;
}

export function journey(project: string, program: 'software' | 'diseno' = 'software'): Journey {
  const data =
    program === 'software' ? process.env.SIGA_E2E_JOURNEYS : process.env.SIGA_E2E_DESIGN_JOURNEYS;
  if (!data) throw new Error('Faltan fixtures de recorrido E2E.');
  const journeys = JSON.parse(data) as Record<string, Journey>;
  const fixture = journeys[project];
  if (
    !fixture?.student?.email ||
    !fixture.student.password ||
    !fixture.teacher?.email ||
    !fixture.teacher.password ||
    !fixture.studentId ||
    !fixture.groupId
  )
    throw new Error(`Falta fixture de recorrido para ${project}.`);
  return fixture;
}

export function certificateJourney(project: string): CertificateJourney {
  if (!process.env.SIGA_E2E_CERTIFICATE_JOURNEYS)
    throw new Error('Faltan fixtures de constancias E2E.');
  const fixtures = JSON.parse(process.env.SIGA_E2E_CERTIFICATE_JOURNEYS) as Record<
    string,
    CertificateJourney
  >;
  const fixture = fixtures[project];
  if (
    !fixture?.student?.email ||
    !fixture.student.password ||
    !fixture.administrator?.email ||
    !fixture.administrator.password ||
    !fixture.studentId
  )
    throw new Error(`Falta fixture de constancias para ${project}.`);
  return fixture;
}
