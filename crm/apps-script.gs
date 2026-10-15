/**
 * Приём заявок с сайта Lumi Vinetka в CRM.
 *
 * Скрипт добавляет строку на лист «Заказы» со статусом «Лид» — так же, как кнопка
 * «➕ Новый заказ» в боте. Бот замечает новую строку при следующем опросе таблицы
 * и дальше заказ идёт по обычному циклу CRM.
 *
 * Установка — в landing/README.md.
 */

const SHEET_NAME = "Заказы";
const MAX_LEN = 300;

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "bad_json" });
  }

  // Поле-ловушка: люди его не видят и не заполняют, боты — заполняют.
  if (data.website) return reply({ ok: true });

  const clean = (v) => String(v == null ? "" : v).trim().slice(0, MAX_LEN);
  const name = clean(data.name);
  const phone = clean(data.phone);
  const school = clean(data.school);
  const grade = clean(data.grade);
  if (!name || !phone || !school || !grade) {
    return reply({ ok: false, error: "missing_fields" });
  }

  const notes = [
    "Заявка с сайта",
    data.type && "Пакет: " + clean(data.type),
    data.estimate && "Расчёт: " + clean(data.estimate),
  ].filter(Boolean).join("\n");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const idCol = header.indexOf("ID") + 1;

    // Следующий ID — максимум среди существующих плюс один (как в боте).
    let maxId = 0;
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues().forEach((r) => {
        const n = parseInt(String(r[0]).trim(), 10);
        if (String(n) === String(r[0]).trim() && n > maxId) maxId = n;
      });
    }
    const id = String(maxId + 1);

    const values = {
      "ID": id,
      "Школа/класс": school + ", " + grade,
      "Контактное лицо": name,
      "Телефон": phone,
      "Кол-во человек": clean(data.count),
      "Статус": "Лид",
      "Примечания": notes,
    };
    const row = header.map((col) => (col in values ? values[col] : ""));

    // Пишем как текст, чтобы «+996…» не превратился в число без плюса.
    const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
    target.setNumberFormat("@");
    target.setValues([row]);
    return reply({ ok: true, id: id });
  } finally {
    lock.releaseLock();
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
