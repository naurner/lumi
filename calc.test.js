// Запуск: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcPrice } = require('./calc.js');

const ALL = ['transfer', 'school', 'studio', 'outdoor', 'issyk', 'ribbons', 'heli'];

// [N, R, выбрано, тариф, S, P, Total] — раздел 11 ТЗ; трансфер с 19.10.2026: 8 000 сом за каждые 18 человек
const cases = [
  [18, 3, [], 'A', 833.33, 890, 16020],
  [12, 3, [], 'B', 933.33, 990, 11880],
  [25, 5, ['transfer', 'studio', 'ribbons'], 'A', 3368.00, 3390, 84750],
  [15, 5, ['transfer', 'school', 'studio', 'ribbons'], 'B', 3710.00, 3790, 56850],
  [23, 8, ['transfer', 'studio', 'outdoor', 'ribbons'], 'A', 4487.39, 4490, 103270],
  [10, 7, ['transfer', 'school', 'studio', 'outdoor', 'ribbons'], 'B', 6090.00, 6090, 60900],
  [30, 10, ALL, 'A', 9843.33, 9890, 296700],
  [14, 6, ALL, 'B', 12092.86, 12190, 170660],
  [17, 5, ['studio'], 'B', 2247.06, 2290, 38930],
  [18, 5, ['studio'], 'A', 2183.33, 2190, 39420],
  [20, 4, ['issyk'], 'A', 975.00, 990, 19800],
  [20, 6, ALL, 'A', 10580.00, 10590, 211800],
];

cases.forEach(([N, R, picked, tariff, exact, perPerson, total], i) => {
  test(`кейс ${i + 1}: N=${N}, R=${R}, [${picked.join(', ') || 'ничего'}]`, () => {
    const answers = { N, R };
    ALL.forEach((k) => { answers[k] = picked.includes(k); });
    assert.deepEqual(calcPrice(answers), { tariff, exact, perPerson, total });
  });
});

// Несколько выездных локаций: каждая считается отдельно, фотограф (тариф B) — один раз
test('2 локации, тариф A: N=20, R=3', () => {
  assert.deepEqual(calcPrice({ N: 20, R: 3, outdoor: 2 }),
    { tariff: 'A', exact: 1625, perPerson: 1690, total: 33800 });
});
test('трансфер без студии и локаций не начисляется', () => {
  assert.deepEqual(calcPrice({ N: 18, R: 3, school: true, transfer: true }),
    calcPrice({ N: 18, R: 3, school: true }));
});
test('2 локации, тариф B: N=10, R=3', () => {
  assert.deepEqual(calcPrice({ N: 10, R: 3, outdoor: 2 }),
    { tariff: 'B', exact: 3320, perPerson: 3390, total: 33900 });
});

test('трансфер к вертолёту: N=18 — одна машина, N=19 — две', () => {
  const t = (N) => calcPrice({ N, R: 3, heli: true, transfer: true }).exact - calcPrice({ N, R: 3, heli: true }).exact;
  assert.ok(Math.abs(t(18) - 8000 / 18) <= 0.011);
  assert.ok(Math.abs(t(19) - 16000 / 19) <= 0.011);
});
