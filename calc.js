// Калькулятор цен на выпускные альбомы (см. ТЗ).
// Все цены и пороги — в CONFIG, логика расчёта — в calcPrice.

const CONFIG = {
  tariffThreshold: 18,      // N >= 18 → тариф A, иначе B
  spreads: { min: 3, max: 10, default: 3 },
  layoutSurchargeFrom: 6,   // доплата за вёрстку при R > 5
  issykFrom: 5,             // Иссык-Куль доступен при R >= 5
  maxLocations: 2,          // максимум выездных локаций (включая студию)
  roundingEnding: 90,       // цена округляется вверх до окончания на 90

  prices: {
    transfer:      { perBus: 8000, seats: 18 },  // машина на каждые 18 человек, делится на всех
    spread:        150,                          // за разворот с человека
    layout:        { A: 220, B: 250 },
    studio:        { surchargeA: 400, rent: 11700 },
    vignette:      { A: 150, B: 2500 },          // A — с человека, B — на класс
    outdoor:       8000,
    issyk:         { base: 4000, A: 4000, B: 6700 },
    ribbons:       750,
    designer:      { fixed: 1500, perPerson: 150 },
    heli:          39000,
    horse:         2800,                         // конный тур в Чон-Кемин, с человека
    photographerB: 7200,
  },
};

function calcPrice(answers, cfg = CONFIG) {
  const { N, R, school, studio, outdoor, ribbons, heli, horse } = answers;
  const p = cfg.prices;
  const A = N >= cfg.tariffThreshold;
  const issyk = answers.issyk && R >= cfg.issykFrom;
  const transfer = answers.transfer && (studio || outdoor || heli);  // трансфер — к студии, локации или вертолёту

  let S = 0;
  if (transfer) S += Math.ceil(N / p.transfer.seats) * p.transfer.perBus / N; // 1. трансфер
  S += R * p.spread;                                                   // 2. развороты
  if (R >= cfg.layoutSurchargeFrom) S += A ? p.layout.A : p.layout.B;  // 3. доплата за вёрстку
                                                                       // 4. школа: 0
  if (studio) S += (A ? p.studio.surchargeA : 0) + p.studio.rent / N;  // 5. студия
  S += A ? p.vignette.A : p.vignette.B / N;                            // 6. виньетка
  S += Number(outdoor || 0) * p.outdoor / N;                           // 7. выезд: outdoor = число локаций (true = 1)
  if (issyk) S += p.issyk.base + (A ? p.issyk.A : p.issyk.B) / N;      // 8. Иссык-Куль
  if (ribbons) S += p.ribbons;                                         // 9. ленты
  S += p.designer.fixed / N + p.designer.perPerson;                    // 10. дизайнер
  if (heli) S += p.heli / N;                                           // 11. вертолёт
  if (horse) S += p.horse;                                             // 11а. конный тур в Чон-Кемин
  if (!A && (school || studio || outdoor)) S += p.photographerB / N;   // 12. фотограф

  const exact = Math.round(S * 100) / 100;
  const end = cfg.roundingEnding;
  const perPerson = Math.ceil((exact - end) / 100) * 100 + end;

  return { tariff: A ? 'A' : 'B', exact, perPerson, total: perPerson * N };
}

if (typeof module !== 'undefined') module.exports = { CONFIG, calcPrice };
