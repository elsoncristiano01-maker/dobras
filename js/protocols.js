// Núcleo de cálculo: protocolos de dobras cutâneas, conversões de densidade e classificações.
// Todas as dobras em mm, peso em kg, altura em cm.

export const SITES = {
  peitoral: 'Peitoral',
  axilar: 'Axilar média',
  triceps: 'Tríceps',
  subescapular: 'Subescapular',
  abdominal: 'Abdominal',
  suprailiaca: 'Suprailíaca',
  coxa: 'Coxa',
  panturrilha: 'Panturrilha medial',
  biceps: 'Bíceps',
  lombar: 'Lombar',
};

export const PERIMETERS = {
  pescoco: 'Pescoço',
  braco: 'Braço relaxado',
  cintura: 'Cintura',
  abdome: 'Abdome',
  quadril: 'Quadril',
  coxa: 'Coxa',
  panturrilha: 'Panturrilha',
};

// Densidade corporal (g/cm³) -> %G
export const EQUATIONS = {
  siri: { label: 'Siri (1961)', fn: (d) => (4.95 / d - 4.5) * 100 },
  brozek: { label: 'Brozek (1963)', fn: (d) => (4.57 / d - 4.142) * 100 },
};

const log10 = Math.log10;

// Durnin & Womersley (1974): D = c - m * log10(soma de 4 dobras)
const DW = {
  M: [[17, 19, 1.162, 0.063], [20, 29, 1.1631, 0.0632], [30, 39, 1.1422, 0.0544], [40, 49, 1.162, 0.07], [50, 200, 1.1715, 0.0779]],
  F: [[17, 19, 1.1549, 0.0678], [20, 29, 1.1599, 0.0717], [30, 39, 1.1423, 0.0632], [40, 49, 1.1333, 0.0612], [50, 200, 1.1339, 0.0645]],
};

const BOTH = (a) => ({ M: a, F: a });

export const PROTOCOLS = [
  {
    id: 'jp7', name: 'Jackson & Pollock – 7 dobras', kind: 'density', ages: [18, 61],
    ref: 'Jackson AS, Pollock ML. Br J Nutr 1978;40:497-504 (homens); Jackson AS, Pollock ML, Ward A. Med Sci Sports Exerc 1980;12:175-81 (mulheres).',
    population: 'Adultos de 18 a 61 anos, ambos os sexos, população geral e ativa.',
    sites: BOTH(['peitoral', 'axilar', 'triceps', 'subescapular', 'abdominal', 'suprailiaca', 'coxa']),
    density: ({ sex, age, S }) => sex === 'M'
      ? 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * age
      : 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * age,
  },
  {
    id: 'jp3', name: 'Jackson & Pollock – 3 dobras', kind: 'density', ages: [18, 61],
    ref: 'Jackson AS, Pollock ML. Br J Nutr 1978;40:497-504; Jackson AS, Pollock ML, Ward A. Med Sci Sports Exerc 1980;12:175-81.',
    population: 'Adultos de 18 a 61 anos. Homens: peitoral, abdominal e coxa. Mulheres: tríceps, suprailíaca e coxa.',
    sites: { M: ['peitoral', 'abdominal', 'coxa'], F: ['triceps', 'suprailiaca', 'coxa'] },
    density: ({ sex, age, S }) => sex === 'M'
      ? 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * age
      : 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * age,
  },
  {
    id: 'dw', name: 'Durnin & Womersley – 4 dobras', kind: 'density', ages: [17, 72],
    ref: 'Durnin JVGA, Womersley J. Br J Nutr 1974;32:77-97.',
    population: 'Adultos de 17 a 72 anos, ambos os sexos. Coeficientes por faixa etária.',
    sites: BOTH(['biceps', 'triceps', 'subescapular', 'suprailiaca']),
    density: ({ sex, age, S }) => {
      const row = DW[sex].find(([lo, hi]) => age >= lo && age <= hi) || DW[sex][0];
      return row[2] - row[3] * log10(S);
    },
  },
  {
    id: 'petroski', name: 'Petroski – 4 dobras', kind: 'density', ages: [18, 66],
    ref: 'Petroski EL. Desenvolvimento e validação de equações generalizadas para a estimativa da densidade corporal em adultos. Tese, UFSM, 1995.',
    population: 'Adultos brasileiros de 18 a 66 anos. Homens: subescapular, tríceps, suprailíaca, panturrilha. Mulheres: axilar média, suprailíaca, coxa, panturrilha.',
    sites: { M: ['subescapular', 'triceps', 'suprailiaca', 'panturrilha'], F: ['axilar', 'suprailiaca', 'coxa', 'panturrilha'] },
    density: ({ sex, age, S }) => sex === 'M'
      ? 1.10726863 - 0.00081201 * S + 0.00000212 * S * S - 0.00041761 * age
      : 1.1954713 - 0.07513507 * log10(S) - 0.00041072 * age,
  },
  {
    id: 'guedes', name: 'Guedes – 3 dobras', kind: 'density', ages: [17, 27],
    ref: 'Guedes DP. Estudo da gordura corporal através da mensuração dos valores da densidade corporal e da espessura do tecido adiposo subcutâneo. Dissertação, UFSM, 1985.',
    population: 'Jovens brasileiros de 17 a 27 anos. Homens: tríceps, suprailíaca, abdominal. Mulheres: subescapular, suprailíaca, coxa.',
    sites: { M: ['triceps', 'suprailiaca', 'abdominal'], F: ['subescapular', 'suprailiaca', 'coxa'] },
    density: ({ sex, S }) => sex === 'M'
      ? 1.17136 - 0.06706 * log10(S)
      : 1.1665 - 0.07063 * log10(S),
  },
  {
    id: 'faulkner', name: 'Faulkner – 4 dobras', kind: 'direct', ages: null,
    ref: 'Faulkner JA. In: Falls HB (ed). Exercise Physiology. New York: Academic Press, 1968.',
    population: 'Adultos jovens e atletas (desenvolvida a partir de nadadores). Fórmula única para ambos os sexos.',
    sites: BOTH(['triceps', 'subescapular', 'suprailiaca', 'abdominal']),
    bf: ({ S }) => S * 0.153 + 5.783,
  },
  {
    id: 'yuhasz', name: 'Yuhasz – 6 dobras', kind: 'direct', ages: null,
    ref: 'Yuhasz MS. Physical Fitness Manual. London, Ontario: University of Western Ontario, 1974.',
    population: 'Adultos jovens e atletas, ambos os sexos.',
    sites: BOTH(['triceps', 'subescapular', 'suprailiaca', 'abdominal', 'coxa', 'panturrilha']),
    bf: ({ sex, S }) => sex === 'M' ? S * 0.1051 + 2.585 : S * 0.1548 + 3.58,
  },
  {
    id: 'parrillo', name: 'Parrillo – 9 dobras', kind: 'direct', ages: null, needsWeight: true,
    ref: 'Parrillo J. The Parrillo Performance Press, 1993. %G = (27 × Σ9 dobras) ÷ peso em libras.',
    population: 'Adultos treinados (musculação), ambos os sexos. Equação popular, com menor validação científica.',
    sites: BOTH(['peitoral', 'abdominal', 'coxa', 'triceps', 'subescapular', 'suprailiaca', 'lombar', 'biceps', 'panturrilha']),
    bf: ({ S, weight }) => (27 * S) / (weight * 2.20462),
  },
  {
    id: 'slaughter-tc', name: 'Slaughter – tríceps + panturrilha', kind: 'direct', ages: [8, 18],
    ref: 'Slaughter MH, Lohman TG, Boileau RA et al. Hum Biol 1988;60:709-23.',
    population: 'Crianças e adolescentes de 8 a 18 anos, ambos os sexos.',
    sites: BOTH(['triceps', 'panturrilha']),
    bf: ({ sex, S }) => sex === 'M' ? 0.735 * S + 1.0 : 0.61 * S + 5.0,
  },
  {
    id: 'slaughter-ts', name: 'Slaughter – tríceps + subescapular', kind: 'direct', ages: [8, 18], needsMaturity: true,
    ref: 'Slaughter MH, Lohman TG, Boileau RA et al. Hum Biol 1988;60:709-23.',
    population: 'Crianças e adolescentes de 8 a 18 anos. Usa o estágio maturacional (meninos) quando a soma é ≤ 35 mm.',
    sites: BOTH(['triceps', 'subescapular']),
    bf: ({ sex, S, maturity }) => {
      if (S > 35) return sex === 'M' ? 0.783 * S + 1.6 : 0.546 * S + 9.7;
      if (sex === 'F') return 1.33 * S - 0.013 * S * S - 2.5;
      const c = { pre: 3.2, pub: 3.4, pos: 5.5 }[maturity || 'pub'];
      return 1.21 * S - 0.008 * S * S - c;
    },
  },
];

export const byId = (id) => PROTOCOLS.find((p) => p.id === id);

export function median(arr) {
  const a = arr.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * input: { sex:'M'|'F', age, weight, height, folds:{site:number|null}, maturity }
 * Retorna um resultado por protocolo.
 */
export function calcAll(input, eq = 'siri') {
  const toBf = EQUATIONS[eq].fn;
  return PROTOCOLS.map((p) => {
    const res = { id: p.id, name: p.name, status: 'ok', warnings: [], missing: [], bf: null, density: null };
    const sites = p.sites[input.sex];
    if (!sites) return { ...res, status: 'na' };
    res.missing = sites.filter((s) => !(Number(input.folds?.[s]) > 0));
    if (p.needsWeight && !(input.weight > 0)) res.missing.push('peso');
    if (!(input.age > 0)) res.missing.push('idade');
    if (res.missing.length) return { ...res, status: 'missing' };

    const S = sites.reduce((t, s) => t + Number(input.folds[s]), 0);
    const ctx = { sex: input.sex, age: input.age, S, weight: input.weight, maturity: input.maturity };
    if (p.kind === 'density') {
      res.density = p.density(ctx);
      res.bf = toBf(res.density);
    } else {
      res.bf = p.bf(ctx);
    }
    res.sum = S;
    if (p.ages && (input.age < p.ages[0] || input.age > p.ages[1])) {
      res.warnings.push(`Idade fora da faixa validada (${p.ages[0]}–${p.ages[1]} anos).`);
    }
    if (res.bf < 2 || res.bf > 60) res.warnings.push('Resultado fisiologicamente improvável; revise as medidas.');
    return res;
  });
}

export function composition(weight, bf) {
  if (!(weight > 0) || !Number.isFinite(bf)) return null;
  const fat = (weight * bf) / 100;
  return { fat, lean: weight - fat };
}

/** Peso-alvo para atingir um %G desejado mantendo a massa magra. */
export function targetWeight(weight, bf, targetBf) {
  const c = composition(weight, bf);
  if (!c || !(targetBf > 0 && targetBf < 60)) return null;
  const w = c.lean / (1 - targetBf / 100);
  return { weight: w, delta: w - weight, fatToLose: c.fat - (w - c.lean) };
}

// Classificação do %G (ACE / Pollock & Wilmore), adultos.
const BANDS = {
  M: [[2, 'Abaixo do essencial', 0], [6, 'Gordura essencial', 1], [14, 'Atleta', 2], [18, 'Fitness', 3], [25, 'Médio', 4], [Infinity, 'Obesidade', 5]],
  F: [[10, 'Abaixo do essencial', 0], [14, 'Gordura essencial', 1], [21, 'Atleta', 2], [25, 'Fitness', 3], [32, 'Médio', 4], [Infinity, 'Obesidade', 5]],
};
export const BAND_LIMITS = { M: [2, 6, 14, 18, 25], F: [10, 14, 21, 25, 32] };

export function classifyBf(sex, bf, age) {
  if (!Number.isFinite(bf)) return null;
  if (age != null && age < 18) return { label: 'Tabela adulta não se aplica', level: -1 };
  const [, label, level] = BANDS[sex].find(([lim]) => bf < lim);
  return { label, level };
}

export function bmi(weight, height) {
  if (!(weight > 0 && height > 0)) return null;
  return weight / Math.pow(height / 100, 2);
}

export function classifyBmi(v, age) {
  if (v == null) return null;
  if (age != null && age < 18) return 'Use curvas de IMC por idade (OMS)';
  if (v < 18.5) return 'Baixo peso';
  if (v < 25) return 'Eutrófico';
  if (v < 30) return 'Sobrepeso';
  if (v < 35) return 'Obesidade grau I';
  if (v < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

export function whr(waist, hip) {
  return waist > 0 && hip > 0 ? waist / hip : null;
}

/** Risco pela circunferência da cintura (OMS). */
export function classifyWaist(sex, waist) {
  if (!(waist > 0)) return null;
  const [mid, high] = sex === 'M' ? [94, 102] : [80, 88];
  if (waist >= high) return 'Risco muito aumentado';
  if (waist >= mid) return 'Risco aumentado';
  return 'Sem risco aumentado';
}

export function ageAt(birth, date) {
  if (!birth) return null;
  const b = new Date(birth), d = new Date(date || Date.now());
  let a = d.getFullYear() - b.getFullYear();
  const m = d.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) a--;
  return a;
}
