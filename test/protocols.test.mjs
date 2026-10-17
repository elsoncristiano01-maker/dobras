import assert from 'node:assert/strict';
import { calcAll, classifyBf, targetWeight, ageAt } from '../js/protocols.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const get = (r, id) => r.find((x) => x.id === id);

// JP7 homem 30a, soma 100 mm: D=1.06535 -> Siri 14.63%
let r = calcAll({ sex: 'M', age: 30, weight: 80, folds: { peitoral: 10, axilar: 12, triceps: 14, subescapular: 15, abdominal: 20, suprailiaca: 16, coxa: 13 } });
near(get(r, 'jp7').density, 1.06535, 1e-4, 'JP7 densidade');
near(get(r, 'jp7').bf, 14.63, 0.05, 'JP7 %G');

// Faulkner: soma 40 -> 40*0.153+5.783 = 11.903
r = calcAll({ sex: 'M', age: 25, weight: 70, folds: { triceps: 10, subescapular: 10, suprailiaca: 10, abdominal: 10 } });
near(get(r, 'faulkner').bf, 11.903, 1e-9, 'Faulkner');

// Parrillo: 9 dobras x 10 = 90, 80 kg -> 27*90/176.37 = 13.78
r = calcAll({ sex: 'M', age: 25, weight: 80, folds: Object.fromEntries(['peitoral','abdominal','coxa','triceps','subescapular','suprailiaca','lombar','biceps','panturrilha'].map((k) => [k, 10])) });
near(get(r, 'parrillo').bf, 13.78, 0.01, 'Parrillo');

// D&W mulher 25a, soma 4 = 60: D = 1.1599 - 0.0717*log10(60)
r = calcAll({ sex: 'F', age: 25, weight: 60, folds: { biceps: 10, triceps: 20, subescapular: 15, suprailiaca: 15 } });
near(get(r, 'dw').density, 1.1599 - 0.0717 * Math.log10(60), 1e-9, 'DW');
assert.equal(get(r, 'jp7').status, 'missing');

// Slaughter T+C menino
r = calcAll({ sex: 'M', age: 12, weight: 40, folds: { triceps: 10, panturrilha: 8 } });
near(get(r, 'slaughter-tc').bf, 0.735 * 18 + 1, 1e-9, 'Slaughter TC');
// Aviso de faixa etária
r = calcAll({ sex: 'M', age: 40, weight: 70, folds: { triceps: 10, panturrilha: 8 } });
assert.ok(get(r, 'slaughter-tc').warnings.length > 0);

assert.equal(classifyBf('M', 12, 30).label, 'Atleta');
assert.equal(classifyBf('F', 28, 30).label, 'Médio');
near(targetWeight(80, 20, 15).weight, 64 / 0.85, 1e-9, 'peso-alvo');
assert.equal(ageAt('2000-06-15', '2026-06-14'), 25);
console.log('OK');
