// Запуск: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcPrice } = require('./calc.js');

const ALL = ['transfer', 'school', 'studio', 'outdoor', 'issyk', 'ribbons', 'heli'];

// [N, R, выбрано, тариф, S, P, Total] — раздел 11 ТЗ
const cases = [
  [18, 3, [], 'A', 833.33, 890, 16020],
  [12, 3, [], 'B', 933.33, 990, 11880],
  [25, 5, ['transfer', 'studio', 'ribbons'], 'A', 3253.00, 3290, 82250],
  [15, 5, ['transfer', 'school', 'studio', 'ribbons'], 'B', 3710.00, 3790, 56850],
  [23, 8, ['transfer', 'studio', 'outdoor', 'ribbons'], 'A', 4316.74, 4390, 100970],
  [10, 7, ['transfer', 'school', 'studio', 'outdoor', 'ribbons'], 'B', 6090.00, 6090, 60900],
  [30, 10, ALL, 'A', 9835.00, 9890, 296700],
  [14, 6, ALL, 'B', 12092.86, 12190, 170660],
  [17, 5, ['studio'], 'B', 2247.06, 2290, 38930],
  [18, 5, ['studio'], 'A', 2183.33, 2190, 39420],
  [20, 4, ['issyk'], 'A', 975.00, 990, 19800],
  [20, 6, ALL, 'A', 10305.00, 10390, 207800],
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
