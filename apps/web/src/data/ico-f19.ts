export type Nucleo = 'Básico' | 'Sustantivo' | 'Integral';

export type PeriodoCurricular = {
  numero: number;
  asignaturas: string[];
  optativas?: string[];
};

export const planIcoF19 = {
  clave: 'ICO-F19',
  nombre: 'Licenciatura en Ingeniería en Computación',
  generacion: '2022B',
  periodos: 10,
  creditosTotales: 410,
  asignaturasObligatorias: 55,
  actividadesAcademicas: 2,
  optativasAcreditar: 3,
  fuente: 'Mapa curricular ICO-F19 · UAEMex',
  urlFuente: 'https://uaptianguistenco.uaemex.mx/images/ico/mapacurricular_ico_f19.pdf',
};

export const periodosIcoF19: PeriodoCurricular[] = [
  {
    numero: 1,
    asignaturas: [
      'Álgebra superior',
      'Cálculo I',
      'El ingeniero y su entorno socioeconómico',
      'Física',
      'Geometría analítica',
      'Programación I',
    ],
  },
  {
    numero: 2,
    asignaturas: [
      'Álgebra lineal',
      'Cálculo II',
      'Ecuaciones diferenciales',
      'Epistemología',
      'Inglés 5',
      'Programación II',
      'Química',
    ],
  },
  {
    numero: 3,
    asignaturas: [
      'Bases de datos I',
      'Cálculo III',
      'Comunicación y relaciones humanas',
      'Inglés 6',
      'Matemáticas discretas',
      'Paradigmas de programación I',
      'Probabilidad y estadística',
    ],
  },
  {
    numero: 4,
    asignaturas: [
      'Arquitectura de computadoras',
      'Bases de datos II',
      'Electromagnetismo',
      'Inglés 7',
      'Métodos estadísticos',
      'Métodos numéricos',
      'Paradigmas de programación II',
    ],
  },
  {
    numero: 5,
    asignaturas: [
      'Circuitos eléctricos y electrónicos',
      'Ensambladores',
      'Ingeniería de software I',
      'Inglés 8',
      'Inteligencia artificial',
      'Investigación de operaciones',
      'Transmisión de datos',
    ],
  },
  {
    numero: 6,
    asignaturas: [
      'Administración de recursos informáticos',
      'Compiladores',
      'Ingeniería de software II',
      'Procesamiento de imágenes digitales',
      'Protocolos de comunicación de datos',
      'Sistemas analógicos',
    ],
  },
  {
    numero: 7,
    asignaturas: [
      'Administración de proyectos informáticos',
      'Arquitectura de redes',
      'Ciencia de los datos',
      'Graficación computacional',
      'Robótica',
      'Sistemas digitales',
      'Sistemas operativos',
    ],
  },
  {
    numero: 8,
    asignaturas: [
      'Ética profesional y sustentabilidad',
      'Gestión de proyectos de investigación',
      'Integrativa profesional',
      'Seguridad de la información',
      'Sistemas embebidos',
      'Tecnologías computacionales I',
    ],
    optativas: [
      'Análisis y diseño de redes',
      'Auditoría informática',
      'Diseño y programación de videojuegos',
      'Gobernanza de TI',
      'Microservicios',
      'Normatividad de la inteligencia artificial',
      'Realidad virtual y aumentada',
      'Reconocimiento de patrones',
      'Visión artificial',
      'Web services',
    ],
  },
  {
    numero: 9,
    asignaturas: [
      'Proyecto integral de comunicación de datos',
      'Proyecto integral de ingeniería de software',
      'Tecnologías computacionales II',
    ],
    optativas: [
      'Artificial intelligence IoT',
      'Ciberseguridad',
      'Computing in industry',
      'Deep learning',
      'Gestión de redes',
      'Instrumentación y automatización',
      'Interacción hombre-máquina',
      'Knowledge representation',
      'Machine learning',
      'Principios SOLID y patrones de diseño',
      'Tecnologías emergentes',
      'Tópicos de tecnologías de datos',
      'Cómputo cuántico',
      'Sistemas interactivos',
    ],
  },
  { numero: 10, asignaturas: ['Práctica profesional'] },
];

export function nucleoDePeriodo(numero: number): Nucleo {
  if (numero <= 3) return 'Básico';
  if (numero <= 6) return 'Sustantivo';
  return 'Integral';
}

export function nucleoClass(numero: number): string {
  if (numero <= 3) return 'nucleus-basico';
  if (numero <= 6) return 'nucleus-sustantivo';
  return 'nucleus-integral';
}
