import { colIndexToLetter, expandRangeKeys, makeCellKey, parseCellRef } from './officeTypes';

// ==================== COMPLETE 140+ MICROSOFT EXCEL FORMULA ENGINE (RU + EN) ====================

export interface FormulaCatalogItem {
  cat: 'Математика' | 'Статистика' | 'Логика' | 'Поиск' | 'Финансы' | 'Текст' | 'Дата и время' | 'Инженерные';
  ru: string;
  en: string;
  template: string;
  desc: string;
}

export const FULL_EXCEL_FORMULA_CATALOG: FormulaCatalogItem[] = [
  // Математика
  { cat: 'Математика', ru: 'СУММ', en: 'SUM', template: '=СУММ(B2:B7)', desc: 'Сумма всех чисел диапазона' },
  { cat: 'Математика', ru: 'СУММЕСЛИ', en: 'SUMIF', template: '=СУММЕСЛИ(B2:B7;">10000")', desc: 'Сумма ячеек по условию' },
  { cat: 'Математика', ru: 'СУММЕСЛИМН', en: 'SUMIFS', template: '=СУММЕСЛИМН(C2:C7;B2:B7;">10000")', desc: 'Сумма по нескольким условиям' },
  { cat: 'Математика', ru: 'СУММПРОИЗВ', en: 'SUMPRODUCT', template: '=СУММПРОИЗВ(B2:B5;C2:C5)', desc: 'Сумма произведений массивов' },
  { cat: 'Математика', ru: 'ПРОИЗВЕД', en: 'PRODUCT', template: '=ПРОИЗВЕД(B2:B5)', desc: 'Произведение всех чисел' },
  { cat: 'Математика', ru: 'ОКРУГЛ', en: 'ROUND', template: '=ОКРУГЛ(B2;2)', desc: 'Округление до N знаков' },
  { cat: 'Математика', ru: 'ОКРУГЛВВЕРХ', en: 'ROUNDUP', template: '=ОКРУГЛВВЕРХ(B2;0)', desc: 'Округление вверх от нуля' },
  { cat: 'Математика', ru: 'ОКРУГЛВНИЗ', en: 'ROUNDDOWN', template: '=ОКРУГЛВНИЗ(B2;0)', desc: 'Округление вниз к нулю' },
  { cat: 'Математика', ru: 'ОКРУГЛТ', en: 'MROUND', template: '=ОКРУГЛТ(B2;10)', desc: 'Округление с заданной точностью' },
  { cat: 'Математика', ru: 'ОКРВВЕРХ', en: 'CEILING', template: '=ОКРВВЕРХ(B2;5)', desc: 'Округление вверх до кратного' },
  { cat: 'Математика', ru: 'ОКРВНИЗ', en: 'FLOOR', template: '=ОКРВНИЗ(B2;5)', desc: 'Округление вниз до кратного' },
  { cat: 'Математика', ru: 'ЦЕЛОЕ', en: 'INT', template: '=ЦЕЛОЕ(B2)', desc: 'Ближайшее меньшее целое' },
  { cat: 'Математика', ru: 'ОТБР', en: 'TRUNC', template: '=ОТБР(B2;1)', desc: 'Отбрасывает дробную часть' },
  { cat: 'Математика', ru: 'ABS', en: 'ABS', template: '=ABS(D2)', desc: 'Модуль (абсолютное значение)' },
  { cat: 'Математика', ru: 'ЗНАК', en: 'SIGN', template: '=ЗНАК(D2)', desc: 'Знак числа (-1, 0, 1)' },
  { cat: 'Математика', ru: 'КОРЕНЬ', en: 'SQRT', template: '=КОРЕНЬ(B2)', desc: 'Квадратный корень' },
  { cat: 'Математика', ru: 'СТЕПЕНЬ', en: 'POWER', template: '=СТЕПЕНЬ(2;10)', desc: 'Возведение числа в степень' },
  { cat: 'Математика', ru: 'ОСТАТ', en: 'MOD', template: '=ОСТАТ(17;5)', desc: 'Остаток от деления' },
  { cat: 'Математика', ru: 'ЧАСТНОЕ', en: 'QUOTIENT', template: '=ЧАСТНОЕ(17;5)', desc: 'Целая часть от деления' },
  { cat: 'Математика', ru: 'НОД', en: 'GCD', template: '=НОД(24;36)', desc: 'Наибольший общий делитель' },
  { cat: 'Математика', ru: 'НОК', en: 'LCM', template: '=НОК(12;18)', desc: 'Наименьшее общее кратное' },
  { cat: 'Математика', ru: 'ФАКТР', en: 'FACT', template: '=ФАКТР(5)', desc: 'Факториал числа n!' },
  { cat: 'Математика', ru: 'ЧИСЛКОМБ', en: 'COMBIN', template: '=ЧИСЛКОМБ(10;3)', desc: 'Число сочетаний C(n,k)' },
  { cat: 'Математика', ru: 'ПЕРЕСТ', en: 'PERMUT', template: '=ПЕРЕСТ(10;3)', desc: 'Число размещений P(n,k)' },
  { cat: 'Математика', ru: 'ПИ', en: 'PI', template: '=ПИ()', desc: 'Число π ≈ 3.14159265' },
  { cat: 'Математика', ru: 'SIN / COS / TAN', en: 'SIN', template: '=SIN(РАДИАНЫ(30))', desc: 'Тригонометрические функции' },
  { cat: 'Математика', ru: 'РАДИАНЫ / ГРАДУСЫ', en: 'RADIANS', template: '=РАДИАНЫ(180)', desc: 'Перевод градусов и радиан' },
  { cat: 'Математика', ru: 'LN / LOG / EXP', en: 'LOG10', template: '=LOG10(1000)', desc: 'Логарифмы и экспонента' },
  { cat: 'Математика', ru: 'СЛЧИС', en: 'RAND', template: '=СЛЧИС()', desc: 'Случайное число от 0 до 1' },
  { cat: 'Математика', ru: 'СЛУЧМЕЖДУ', en: 'RANDBETWEEN', template: '=СЛУЧМЕЖДУ(1;100)', desc: 'Случайное целое в диапазоне' },
  { cat: 'Математика', ru: 'РИМСКОЕ', en: 'ROMAN', template: '=РИМСКОЕ(2026)', desc: 'Перевод числа в римские цифры' },
  // Статистика
  { cat: 'Статистика', ru: 'СРЗНАЧ', en: 'AVERAGE', template: '=СРЗНАЧ(B2:B7)', desc: 'Среднее арифметическое' },
  { cat: 'Статистика', ru: 'СРЗНАЧЕСЛИ', en: 'AVERAGEIF', template: '=СРЗНАЧЕСЛИ(B2:B7;">10000")', desc: 'Среднее по условию' },
  { cat: 'Статистика', ru: 'МИН / МАКС', en: 'MAX', template: '=МАКС(B2:B7)', desc: 'Минимум или максимум диапазона' },
  { cat: 'Статистика', ru: 'СЧЁТ', en: 'COUNT', template: '=СЧЁТ(B2:B7)', desc: 'Количество чисел' },
  { cat: 'Статистика', ru: 'СЧЁТЗ', en: 'COUNTA', template: '=СЧЁТЗ(A2:A7)', desc: 'Количество непустых ячеек' },
  { cat: 'Статистика', ru: 'СЧИТАТЬПУСТОТЫ', en: 'COUNTBLANK', template: '=СЧИТАТЬПУСТОТЫ(A1:F10)', desc: 'Количество пустых ячеек' },
  { cat: 'Статистика', ru: 'СЧЁТЕСЛИ', en: 'COUNTIF', template: '=СЧЁТЕСЛИ(F2:F7;"В норме")', desc: 'Подсчёт по условию' },
  { cat: 'Статистика', ru: 'СЧЁТЕСЛИМН', en: 'COUNTIFS', template: '=СЧЁТЕСЛИМН(B2:B7;">10000";C2:C7;">10000")', desc: 'Подсчёт по нескольким условиям' },
  { cat: 'Статистика', ru: 'МЕДИАНА', en: 'MEDIAN', template: '=МЕДИАНА(B2:B7)', desc: 'Медиана набора чисел' },
  { cat: 'Статистика', ru: 'МОДА', en: 'MODE', template: '=МОДА(B2:B7)', desc: 'Наиболее частое значение' },
  { cat: 'Статистика', ru: 'СТАНДОТКЛОН', en: 'STDEV', template: '=СТАНДОТКЛОН(B2:B7)', desc: 'Стандартное отклонение выборки' },
  { cat: 'Статистика', ru: 'ДИСП', en: 'VAR', template: '=ДИСП(B2:B7)', desc: 'Дисперсия выборки' },
  { cat: 'Статистика', ru: 'НАИБОЛЬШИЙ', en: 'LARGE', template: '=НАИБОЛЬШИЙ(B2:B7;2)', desc: 'k-е наибольшее значение' },
  { cat: 'Статистика', ru: 'НАИМЕНЬШИЙ', en: 'SMALL', template: '=НАИМЕНЬШИЙ(B2:B7;2)', desc: 'k-е наименьшее значение' },
  { cat: 'Статистика', ru: 'РАНГ', en: 'RANK', template: '=РАНГ(B2;B2:B7)', desc: 'Место числа в рейтинге' },
  { cat: 'Статистика', ru: 'ПЕРСЕНТИЛЬ', en: 'PERCENTILE', template: '=ПЕРСЕНТИЛЬ(B2:B7;0.9)', desc: 'k-й персентиль выборки' },
  { cat: 'Статистика', ru: 'КВАРТИЛЬ', en: 'QUARTILE', template: '=КВАРТИЛЬ(B2:B7;3)', desc: 'Квартиль (0..4) диапазона' },
  { cat: 'Статистика', ru: 'СРГЕОМ', en: 'GEOMEAN', template: '=СРГЕОМ(B2:B7)', desc: 'Среднее геометрическое' },
  { cat: 'Статистика', ru: 'КОРРЕЛ', en: 'CORREL', template: '=КОРРЕЛ(B2:B7;C2:C7)', desc: 'Коэффициент корреляции Пирсона' },
  { cat: 'Статистика', ru: 'ПРЕДСКАЗ', en: 'FORECAST', template: '=ПРЕДСКАЗ(8;C2:C7;B2:B7)', desc: 'Линейный прогноз значения Y' },
  // Логика
  { cat: 'Логика', ru: 'ЕСЛИ', en: 'IF', template: '=ЕСЛИ(C2<=B2;"В норме";"Перерасход")', desc: 'Условное ветвление' },
  { cat: 'Логика', ru: 'ЕСЛИМН', en: 'IFS', template: '=ЕСЛИМН(B2>40000;"Высокий";B2>15000;"Средний";ИСТИНА;"Низкий")', desc: 'Несколько условий подряд' },
  { cat: 'Логика', ru: 'ПЕРЕКЛЮЧ', en: 'SWITCH', template: '=ПЕРЕКЛЮЧ(A2;"Транспорт";"Авто";"Жильё";"Дом";"Другое")', desc: 'Сопоставление со списком значений' },
  { cat: 'Логика', ru: 'ЕСЛИОШИБКА', en: 'IFERROR', template: '=ЕСЛИОШИБКА(C2/B2;0)', desc: 'Значение при ошибке формулы' },
  { cat: 'Логика', ru: 'И / ИЛИ / НЕ / ИСКЛИЛИ', en: 'AND', template: '=И(B2>0;C2>0)', desc: 'Логические операторы' },
  { cat: 'Логика', ru: 'ЕПУСТО / ЕЧИСЛО / ЕТЕКСТ', en: 'ISNUMBER', template: '=ЕЧИСЛО(B2)', desc: 'Проверка типа ячейки' },
  // Поиск и ссылки
  { cat: 'Поиск', ru: 'ВПР', en: 'VLOOKUP', template: '=ВПР(A2;A2:D7;3;0)', desc: 'Вертикальный поиск по 1-му столбцу' },
  { cat: 'Поиск', ru: 'ГПР', en: 'HLOOKUP', template: '=ГПР("План (₽)";A1:F7;2;0)', desc: 'Горизонтальный поиск по 1-й строке' },
  { cat: 'Поиск', ru: 'ПРОСМОТРX', en: 'XLOOKUP', template: '=ПРОСМОТРX(A2;A2:A7;C2:C7;"Не найдено")', desc: 'Современный поиск Excel 365' },
  { cat: 'Поиск', ru: 'ИНДЕКС', en: 'INDEX', template: '=ИНДЕКС(A2:D7;2;3)', desc: 'Ячейка по номеру строки и столбца' },
  { cat: 'Поиск', ru: 'ПОИСКПОЗ', en: 'MATCH', template: '=ПОИСКПОЗ(A2;A2:A7;0)', desc: 'Номер позиции значения' },
  { cat: 'Поиск', ru: 'ВЫБОР', en: 'CHOOSE', template: '=ВЫБОР(2;"Низкий";"Средний";"Высокий")', desc: 'Выбор значения по индексу' },
  { cat: 'Поиск', ru: 'ЧСТРОК / ЧИСЛСТОЛБ', en: 'ROWS', template: '=ЧСТРОК(A2:D7)', desc: 'Число строк/столбцов диапазона' },
  // Финансы
  { cat: 'Финансы', ru: 'ПЛТ', en: 'PMT', template: '=-ПЛТ(0.16/12;36;1000000)', desc: 'Аннуитетный платёж по кредиту' },
  { cat: 'Финансы', ru: 'БС', en: 'FV', template: '=-БС(0.12/12;24;15000;0)', desc: 'Будущая стоимость инвестиций' },
  { cat: 'Финансы', ru: 'ПС', en: 'PV', template: '=-ПС(0.12/12;24;15000)', desc: 'Приведённая (текущая) стоимость' },
  { cat: 'Финансы', ru: 'ЧПС', en: 'NPV', template: '=ЧПС(0.1;100000;120000;150000)', desc: 'Чистая приведённая стоимость (NPV)' },
  { cat: 'Финансы', ru: 'КПЕР', en: 'NPER', template: '=КПЕР(0.12/12;-25000;500000)', desc: 'Количество периодов выплаты' },
  { cat: 'Финансы', ru: 'АПЛ', en: 'SLN', template: '=АПЛ(100000;10000;5)', desc: 'Линейная амортизация' },
  { cat: 'Финансы', ru: 'ЭФФЕКТ', en: 'EFFECT', template: '=ЭФФЕКТ(0.12;12)', desc: 'Эффективная годовая ставка' },
  // Текст
  { cat: 'Текст', ru: 'СЦЕПИТЬ', en: 'CONCAT', template: '=СЦЕПИТЬ(A2;" — ";C2;" ₽")', desc: 'Объединяет строки' },
  { cat: 'Текст', ru: 'ОБЪЕДИНИТЬ', en: 'TEXTJOIN', template: '=ОБЪЕДИНИТЬ(", ";ИСТИНА;A2:A5)', desc: 'Соединяет диапазон с разделителем' },
  { cat: 'Текст', ru: 'ЛЕВСИМВ / ПРАВСИМВ / ПСТР', en: 'LEFT', template: '=ЛЕВСИМВ(A2;5)', desc: 'Извлечение части строки' },
  { cat: 'Текст', ru: 'ДЛСТР', en: 'LEN', template: '=ДЛСТР(A2)', desc: 'Длина текста в символах' },
  { cat: 'Текст', ru: 'НАЙТИ / ПОИСК', en: 'SEARCH', template: '=ПОИСК("и";A2)', desc: 'Позиция подстроки в тексте' },
  { cat: 'Текст', ru: 'ПОДСТАВИТЬ', en: 'SUBSTITUTE', template: '=ПОДСТАВИТЬ(A2;"и";"&")', desc: 'Замена фрагмента текста' },
  { cat: 'Текст', ru: 'ПРОПИСН / СТРОЧН / ПРОПНАЧ', en: 'PROPER', template: '=ПРОПНАЧ(A2)', desc: 'Смена регистра слов' },
  { cat: 'Текст', ru: 'СЖПРОБЕЛЫ', en: 'TRIM', template: '=СЖПРОБЕЛЫ(A2)', desc: 'Удаляет лишние пробелы' },
  { cat: 'Текст', ru: 'ПОВТОР', en: 'REPT', template: '=ПОВТОР("★";5)', desc: 'Повторяет текст N раз' },
  // Дата и время
  { cat: 'Дата и время', ru: 'СЕГОДНЯ', en: 'TODAY', template: '=СЕГОДНЯ()', desc: 'Текущая дата' },
  { cat: 'Дата и время', ru: 'ТДАТА', en: 'NOW', template: '=ТДАТА()', desc: 'Текущая дата и время' },
  { cat: 'Дата и время', ru: 'ДАТА', en: 'DATE', template: '=ДАТА(2026;11;24)', desc: 'Создаёт дату из ГГГГ, ММ, ДД' },
  { cat: 'Дата и время', ru: 'ГОД / МЕСЯЦ / ДЕНЬ', en: 'YEAR', template: '=ГОД(СЕГОДНЯ())', desc: 'Извлекает год, месяц или день' },
  { cat: 'Дата и время', ru: 'ДЕНЬНЕД / НОМНЕДЕЛИ', en: 'WEEKDAY', template: '=ДЕНЬНЕД(СЕГОДНЯ())', desc: 'День недели или номер недели' },
  { cat: 'Дата и время', ru: 'ДНИ / ЧИСТРАБДНИ', en: 'DAYS', template: '=ДНИ("2026-12-31";"2026-11-24")', desc: 'Разница в днях / рабочих днях' },
  // Инженерные
  { cat: 'Инженерные', ru: 'ДЕС.В.ДВ / ДЕС.В.ШЕСТН', en: 'DEC2HEX', template: '=ДЕС.В.ШЕСТН(255)', desc: 'Перевод в двоичную / HEX / OCT' },
  { cat: 'Инженерные', ru: 'ДВ.В.ДЕС / ШЕСТН.В.ДЕС', en: 'HEX2DEC', template: '=ШЕСТН.В.ДЕС("FF")', desc: 'Перевод в десятичную систему' },
  { cat: 'Инженерные', ru: 'ПРЕОБР', en: 'CONVERT', template: '=ПРЕОБР(100;"km";"mi")', desc: 'Конвертер единиц (km/mi, C/F, kg/lb)' },
];

const RU_TO_EN_ALL: Record<string, string> = {
  'СУММ': 'SUM', 'СУММЕСЛИ': 'SUMIF', 'СУММЕСЛИМН': 'SUMIFS', 'СУММПРОИЗВ': 'SUMPRODUCT', 'ПРОИЗВЕД': 'PRODUCT',
  'ОКРУГЛ': 'ROUND', 'ОКРУГЛВВЕРХ': 'ROUNDUP', 'ОКРУГЛВНИЗ': 'ROUNDDOWN', 'ОКРУГЛТ': 'MROUND',
  'ОКРВВЕРХ': 'CEILING', 'ОКРВНИЗ': 'FLOOR', 'ЦЕЛОЕ': 'INT', 'ОТБР': 'TRUNC', 'ЗНАК': 'SIGN',
  'КОРЕНЬ': 'SQRT', 'СТЕПЕНЬ': 'POWER', 'ОСТАТ': 'MOD', 'ЧАСТНОЕ': 'QUOTIENT', 'НОД': 'GCD', 'НОК': 'LCM',
  'ФАКТР': 'FACT', 'ЧИСЛКОМБ': 'COMBIN', 'ПЕРЕСТ': 'PERMUT', 'ПИ': 'PI', 'РАДИАНЫ': 'RADIANS', 'ГРАДУСЫ': 'DEGREES',
  'СЛЧИС': 'RAND', 'СЛУЧМЕЖДУ': 'RANDBETWEEN', 'ЧЁТН': 'EVEN', 'ЧЕТН': 'EVEN', 'НЕЧЁТ': 'ODD', 'НЕЧЕТ': 'ODD', 'РИМСКОЕ': 'ROMAN',
  'СРЗНАЧ': 'AVERAGE', 'СРЕДНЕЕ': 'AVERAGE', 'СРЗНАЧА': 'AVERAGEA', 'СРЗНАЧЕСЛИ': 'AVERAGEIF', 'СРЗНАЧЕСЛИМН': 'AVERAGEIFS',
  'МИН': 'MIN', 'МАКС': 'MAX', 'МИНЕСЛИ': 'MINIFS', 'МАКСЕСЛИ': 'MAXIFS',
  'СЧЁТ': 'COUNT', 'СЧЕТ': 'COUNT', 'СЧЁТЗ': 'COUNTA', 'СЧЕТЗ': 'COUNTA', 'СЧИТАТЬПУСТОТЫ': 'COUNTBLANK',
  'СЧЁТЕСЛИ': 'COUNTIF', 'СЧЕТЕСЛИ': 'COUNTIF', 'СЧЁТЕСЛИМН': 'COUNTIFS', 'СЧЕТЕСЛИМН': 'COUNTIFS',
  'МЕДИАНА': 'MEDIAN', 'МОДА': 'MODE', 'СТАНДОТКЛОН': 'STDEV', 'СТАНДОТКЛОН.Г': 'STDEV.P', 'ДИСП': 'VAR', 'ДИСП.Г': 'VAR.P',
  'НАИБОЛЬШИЙ': 'LARGE', 'НАИМЕНЬШИЙ': 'SMALL', 'РАНГ': 'RANK', 'ПЕРСЕНТИЛЬ': 'PERCENTILE', 'КВАРТИЛЬ': 'QUARTILE',
  'СРГЕОМ': 'GEOMEAN', 'СРГАРМ': 'HARMEAN', 'КОРРЕЛ': 'CORREL', 'НАКЛОН': 'SLOPE', 'ОТРЕЗОК': 'INTERCEPT', 'ПРЕДСКАЗ': 'FORECAST',
  'ЕСЛИ': 'IF', 'ЕСЛИМН': 'IFS', 'ЕСЛИОШИБКА': 'IFERROR', 'ЕСЛИНД': 'IFNA', 'ПЕРЕКЛЮЧ': 'SWITCH',
  'И': 'AND', 'ИЛИ': 'OR', 'ИСКЛИЛИ': 'XOR', 'НЕ': 'NOT', 'ИСТИНА': 'TRUE', 'ЛОЖЬ': 'FALSE',
  'ЕПУСТО': 'ISBLANK', 'ЕЧИСЛО': 'ISNUMBER', 'ЕТЕКСТ': 'ISTEXT', 'ЕОШИБКА': 'ISERROR', 'ЕЧЁТН': 'ISEVEN', 'ЕНЕЧЁТ': 'ISODD',
  'ВПР': 'VLOOKUP', 'ГПР': 'HLOOKUP', 'ПРОСМОТРX': 'XLOOKUP', 'ПРОСМОТРХ': 'XLOOKUP', 'ПРОСМОТР': 'LOOKUP',
  'ИНДЕКС': 'INDEX', 'ПОИСКПОЗ': 'MATCH', 'ВЫБОР': 'CHOOSE', 'СТРОКА': 'ROW', 'СТОЛБЕЦ': 'COLUMN',
  'ЧСТРОК': 'ROWS', 'ЧИСЛСТОЛБ': 'COLUMNS',
  'ПЛТ': 'PMT', 'ПРПЛТ': 'IPMT', 'ОСПЛТ': 'PPMT', 'БС': 'FV', 'ПС': 'PV', 'ЧПС': 'NPV',
  'КПЕР': 'NPER', 'СТАВКА': 'RATE', 'АПЛ': 'SLN', 'ДДОБ': 'DDB', 'ЭФФЕКТ': 'EFFECT', 'НОМИНАЛ': 'NOMINAL',
  'СЦЕПИТЬ': 'CONCAT', 'ОБЪЕДИНИТЬ': 'TEXTJOIN', 'ЛЕВСИМВ': 'LEFT', 'ПРАВСИМВ': 'RIGHT', 'ПСТР': 'MID',
  'ДЛСТР': 'LEN', 'НАЙТИ': 'FIND', 'ПОИСК': 'SEARCH', 'ЗАМЕНИТЬ': 'REPLACE', 'ПОДСТАВИТЬ': 'SUBSTITUTE',
  'ПРОПИСН': 'UPPER', 'СТРОЧН': 'LOWER', 'ПРОПНАЧ': 'PROPER', 'СЖПРОБЕЛЫ': 'TRIM', 'ПЕЧСИМВ': 'CLEAN',
  'ПОВТОР': 'REPT', 'СОВПАД': 'EXACT', 'ЗНАЧЕН': 'VALUE', 'ТЕКСТ': 'TEXT', 'СИМВОЛ': 'CHAR', 'КОДСИМВ': 'CODE',
  'СЕГОДНЯ': 'TODAY', 'ТДАТА': 'NOW', 'ДАТА': 'DATE', 'ВРЕМЯ': 'TIME', 'ГОД': 'YEAR', 'МЕСЯЦ': 'MONTH', 'ДЕНЬ': 'DAY',
  'ЧАС': 'HOUR', 'МИНУТА': 'MINUTE', 'СЕКУНДА': 'SECOND', 'ДЕНЬНЕД': 'WEEKDAY', 'НОМНЕДЕЛИ': 'WEEKNUM',
  'РАЗНДАТ': 'DATEDIF', 'ДНИ': 'DAYS', 'ДАТАМЕС': 'EDATE', 'КОНМЕСЯЦА': 'EOMONTH', 'ЧИСТРАБДНИ': 'NETWORKDAYS',
  'ДЕС.В.ДВ': 'DEC2BIN', 'ДЕС.В.ШЕСТН': 'DEC2HEX', 'ДЕС.В.ВОСЬМ': 'DEC2OCT',
  'ДВ.В.ДЕС': 'BIN2DEC', 'ШЕСТН.В.ДЕС': 'HEX2DEC', 'ВОСЬМ.В.ДЕС': 'OCT2DEC', 'ДЕЛЬТА': 'DELTA', 'ПРЕОБР': 'CONVERT',
};

function splitArgsTopLevel(argStr: string): string[] {
  const args: string[] = [];
  let cur = '';
  let depth = 0;
  let inQ = false;
  for (let i = 0; i < argStr.length; i++) {
    const ch = argStr[i];
    if (ch === '"' && argStr[i - 1] !== '\\') {
      inQ = !inQ;
      cur += ch;
    } else if (!inQ && ch === '(') {
      depth++;
      cur += ch;
    } else if (!inQ && ch === ')') {
      depth = Math.max(0, depth - 1);
      cur += ch;
    } else if (!inQ && depth === 0 && (ch === ';' || ch === ',')) {
      args.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== '' || args.length > 0) args.push(cur.trim());
  return args;
}

function matchCrit(val: string, critRaw: string): boolean {
  const crit = critRaw.replace(/^"|"$/g, '').trim();
  const numVal = parseFloat(val.replace(/\s/g, '').replace(',', '.'));
  const m = /^(>=|<=|<>|!=|>|<|=)(.*)$/.exec(crit);
  if (m) {
    const op = m[1];
    const rhs = m[2].trim();
    const rn = parseFloat(rhs.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(numVal) && !Number.isNaN(rn)) {
      if (op === '>') return numVal > rn;
      if (op === '<') return numVal < rn;
      if (op === '>=') return numVal >= rn;
      if (op === '<=') return numVal <= rn;
      if (op === '=') return numVal === rn;
      return numVal !== rn;
    }
    if (op === '=') return val.trim().toLowerCase() === rhs.toLowerCase();
    if (op === '<>' || op === '!=') return val.trim().toLowerCase() !== rhs.toLowerCase();
    return false;
  }
  if (!Number.isNaN(numVal) && !Number.isNaN(parseFloat(crit.replace(',', '.')))) {
    return numVal === parseFloat(crit.replace(',', '.'));
  }
  if (crit.includes('*') || crit.includes('?')) {
    const re = new RegExp(
      '^' + crit.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return re.test(val.trim());
  }
  return val.trim().toLowerCase() === crit.toLowerCase();
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function factorial(n: number): number {
  const k = Math.floor(n);
  if (k < 0) return NaN;
  if (k > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
}

function toRoman(num: number): string {
  let n = Math.floor(num);
  if (n <= 0 || n >= 4000) return '#ЗНАЧ!';
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [v, sym] of map) {
    while (n >= v) {
      out += sym;
      n -= v;
    }
  }
  return out;
}

function parseDateAny(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const ru = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1]));
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function evaluateFullExcelFormula(rawInput: string, cells: Record<string, string>, depth = 0): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  if (!trimmed.startsWith('=')) return rawInput;
  if (depth > 18) return '#ЦИКЛ!';

  const evalCell = (ref: string): string => {
    const k = ref.replace(/\$/g, '').toUpperCase();
    const v = cells[k] ?? '';
    return v.trim().startsWith('=') ? evaluateFullExcelFormula(v, cells, depth + 1) : v;
  };

  const toNum = (v: string): number => {
    if (v === '' || v === undefined || v === null) return NaN;
    const s = String(v).trim();
    if (s.toUpperCase() === 'TRUE' || s.toUpperCase() === 'ИСТИНА') return 1;
    if (s.toUpperCase() === 'FALSE' || s.toUpperCase() === 'ЛОЖЬ') return 0;
    const pct = s.endsWith('%');
    const clean = s.replace(/\s/g, '').replace(/[₽$€%]/g, '').replace(',', '.');
    const n = Number(clean);
    return pct && !Number.isNaN(n) ? n / 100 : n;
  };

  const isRange = (s: string) => /^\$?[A-Za-z]+\$?\d+:\$?[A-Za-z]+\$?\d+$/.test(s.trim());

  const collectNums = (argList: string[]): number[] => {
    const out: number[] = [];
    for (const a of argList) {
      if (!a) continue;
      if (isRange(a)) {
        for (const k of expandRangeKeys(a)) {
          const n = toNum(evalCell(k));
          if (!Number.isNaN(n)) out.push(n);
        }
      } else {
        const n = toNum(evalExpr(a));
        if (!Number.isNaN(n)) out.push(n);
      }
    }
    return out;
  };

  const collectStrings = (argList: string[]): string[] => {
    const out: string[] = [];
    for (const a of argList) {
      if (!a) continue;
      if (isRange(a)) {
        for (const k of expandRangeKeys(a)) out.push(evalCell(k));
      } else {
        out.push(evalExpr(a));
      }
    }
    return out;
  };

  const evalBool = (expr: string): boolean => {
    // Check top-level comparison operator
    let depthP = 0;
    let inQ = false;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === '"') inQ = !inQ;
      else if (!inQ && ch === '(') depthP++;
      else if (!inQ && ch === ')') depthP--;
      else if (!inQ && depthP === 0) {
        const two = expr.slice(i, i + 2);
        if (two === '>=' || two === '<=' || two === '<>' || two === '!=') {
          const l = evalExpr(expr.slice(0, i));
          const r = evalExpr(expr.slice(i + 2));
          const ln = toNum(l), rn = toNum(r);
          if (!Number.isNaN(ln) && !Number.isNaN(rn)) {
            if (two === '>=') return ln >= rn;
            if (two === '<=') return ln <= rn;
            return ln !== rn;
          }
          return two === '<>' || two === '!=' ? l.toLowerCase() !== r.toLowerCase() : false;
        }
        if (ch === '>' || ch === '<' || ch === '=') {
          const l = evalExpr(expr.slice(0, i));
          const r = evalExpr(expr.slice(i + 1));
          const ln = toNum(l), rn = toNum(r);
          if (!Number.isNaN(ln) && !Number.isNaN(rn)) {
            if (ch === '>') return ln > rn;
            if (ch === '<') return ln < rn;
            return ln === rn;
          }
          return ch === '=' ? l.toLowerCase() === r.toLowerCase() : false;
        }
      }
    }
    const v = evalExpr(expr).trim().toLowerCase();
    if (v === 'true' || v === 'истина') return true;
    if (v === 'false' || v === 'ложь' || v === '') return false;
    const n = toNum(v);
    return !Number.isNaN(n) && n !== 0;
  };

  const callFn = (rawName: string, args: string[]): string => {
    const up = rawName.toUpperCase();
    const fn = RU_TO_EN_ALL[up] || up;

    switch (fn) {
      // --- MATH & TRIG ---
      case 'SUM': return String(collectNums(args).reduce((s, x) => s + x, 0));
      case 'PRODUCT': { const ns = collectNums(args); return ns.length ? String(ns.reduce((p, x) => p * x, 1)) : '0'; }
      case 'SUMPRODUCT': {
        const cols = args.map((a) => collectNums([a]));
        if (!cols.length) return '0';
        const len = Math.min(...cols.map((c) => c.length));
        let sum = 0;
        for (let i = 0; i < len; i++) sum += cols.reduce((p, c) => p * c[i], 1);
        return String(sum);
      }
      case 'SUMIF': {
        const ks = expandRangeKeys(args[0] || '');
        const crit = evalExpr(args[1] || '');
        const sumKs = args[2] ? expandRangeKeys(args[2]) : ks;
        let s = 0;
        for (let i = 0; i < ks.length; i++) {
          if (matchCrit(evalCell(ks[i]), crit)) {
            const n = toNum(evalCell(sumKs[i] || ks[i]));
            if (!Number.isNaN(n)) s += n;
          }
        }
        return String(s);
      }
      case 'SUMIFS': {
        const sumKs = expandRangeKeys(args[0] || '');
        const pairs: { ks: string[]; crit: string }[] = [];
        for (let p = 1; p + 1 < args.length; p += 2) {
          pairs.push({ ks: expandRangeKeys(args[p]), crit: evalExpr(args[p + 1]) });
        }
        let s = 0;
        for (let i = 0; i < sumKs.length; i++) {
          if (pairs.every((pr) => matchCrit(evalCell(pr.ks[i] || ''), pr.crit))) {
            const n = toNum(evalCell(sumKs[i]));
            if (!Number.isNaN(n)) s += n;
          }
        }
        return String(s);
      }
      case 'ROUND': { const v = toNum(evalExpr(args[0] || '0')), d = Math.round(toNum(evalExpr(args[1] || '0')) || 0); const f = 10 ** d; return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.round(v * f) / f); }
      case 'ROUNDUP': { const v = toNum(evalExpr(args[0] || '0')), d = Math.round(toNum(evalExpr(args[1] || '0')) || 0); const f = 10 ** d; return Number.isNaN(v) ? '#ЗНАЧ!' : String((v >= 0 ? Math.ceil(v * f) : Math.floor(v * f)) / f); }
      case 'ROUNDDOWN':
      case 'TRUNC': { const v = toNum(evalExpr(args[0] || '0')), d = Math.round(toNum(evalExpr(args[1] || '0')) || 0); const f = 10 ** d; return Number.isNaN(v) ? '#ЗНАЧ!' : String(Math.trunc(v * f) / f); }
      case 'MROUND': { const v = toNum(evalExpr(args[0] || '0')), m = toNum(evalExpr(args[1] || '1')); return m === 0 ? '0' : String(Math.round(v / m) * m); }
      case 'CEILING': { const v = toNum(evalExpr(args[0] || '0')), m = toNum(evalExpr(args[1] || '1')) || 1; return String(Math.ceil(v / m) * m); }
      case 'FLOOR': { const v = toNum(evalExpr(args[0] || '0')), m = toNum(evalExpr(args[1] || '1')) || 1; return String(Math.floor(v / m) * m); }
      case 'INT': return String(Math.floor(toNum(evalExpr(args[0] || '0'))));
      case 'ABS': return String(Math.abs(toNum(evalExpr(args[0] || '0'))));
      case 'SIGN': return String(Math.sign(toNum(evalExpr(args[0] || '0'))));
      case 'SQRT': { const v = toNum(evalExpr(args[0] || '0')); return v < 0 ? '#ЧИСЛО!' : String(Math.sqrt(v)); }
      case 'POWER': return String(Math.pow(toNum(evalExpr(args[0] || '0')), toNum(evalExpr(args[1] || '1'))));
      case 'MOD': { const a = toNum(evalExpr(args[0] || '0')), b = toNum(evalExpr(args[1] || '1')); return b === 0 ? '#ДЕЛ/0!' : String(((a % b) + b) % b); }
      case 'QUOTIENT': { const a = toNum(evalExpr(args[0] || '0')), b = toNum(evalExpr(args[1] || '1')); return b === 0 ? '#ДЕЛ/0!' : String(Math.trunc(a / b)); }
      case 'GCD': { const ns = collectNums(args); return ns.length ? String(ns.reduce((a, b) => gcd2(a, b))) : '0'; }
      case 'LCM': { const ns = collectNums(args); return ns.length ? String(ns.reduce((a, b) => Math.abs(Math.round(a * b)) / gcd2(a, b))) : '0'; }
      case 'FACT': return String(factorial(toNum(evalExpr(args[0] || '0'))));
      case 'COMBIN': { const n = Math.floor(toNum(evalExpr(args[0] || '0'))), k = Math.floor(toNum(evalExpr(args[1] || '0'))); return k < 0 || k > n ? '#ЧИСЛО!' : String(Math.round(factorial(n) / (factorial(k) * factorial(n - k)))); }
      case 'PERMUT': { const n = Math.floor(toNum(evalExpr(args[0] || '0'))), k = Math.floor(toNum(evalExpr(args[1] || '0'))); return k < 0 || k > n ? '#ЧИСЛО!' : String(Math.round(factorial(n) / factorial(n - k))); }
      case 'PI': return String(Math.PI);
      case 'RADIANS': return String((toNum(evalExpr(args[0] || '0')) * Math.PI) / 180);
      case 'DEGREES': return String((toNum(evalExpr(args[0] || '0')) * 180) / Math.PI);
      case 'SIN': return String(Math.sin(toNum(evalExpr(args[0] || '0'))));
      case 'COS': return String(Math.cos(toNum(evalExpr(args[0] || '0'))));
      case 'TAN': return String(Math.tan(toNum(evalExpr(args[0] || '0'))));
      case 'ASIN': return String(Math.asin(toNum(evalExpr(args[0] || '0'))));
      case 'ACOS': return String(Math.acos(toNum(evalExpr(args[0] || '0'))));
      case 'ATAN': return String(Math.atan(toNum(evalExpr(args[0] || '0'))));
      case 'ATAN2': return String(Math.atan2(toNum(evalExpr(args[1] || '0')), toNum(evalExpr(args[0] || '0'))));
      case 'SINH': return String(Math.sinh(toNum(evalExpr(args[0] || '0'))));
      case 'COSH': return String(Math.cosh(toNum(evalExpr(args[0] || '0'))));
      case 'TANH': return String(Math.tanh(toNum(evalExpr(args[0] || '0'))));
      case 'LN': return String(Math.log(toNum(evalExpr(args[0] || '1'))));
      case 'LOG10': return String(Math.log10(toNum(evalExpr(args[0] || '1'))));
      case 'LOG': { const v = toNum(evalExpr(args[0] || '1')); const b = args[1] ? toNum(evalExpr(args[1])) : 10; return String(Math.log(v) / Math.log(b)); }
      case 'EXP': return String(Math.exp(toNum(evalExpr(args[0] || '0'))));
      case 'RAND': return String(Math.round(Math.random() * 10000) / 10000);
      case 'RANDBETWEEN': { const lo = Math.ceil(toNum(evalExpr(args[0] || '0'))), hi = Math.floor(toNum(evalExpr(args[1] || '100'))); return String(Math.floor(Math.random() * (hi - lo + 1)) + lo); }
      case 'EVEN': { const v = toNum(evalExpr(args[0] || '0')); return String(v >= 0 ? Math.ceil(v / 2) * 2 : Math.floor(v / 2) * 2); }
      case 'ODD': { const v = Math.ceil(Math.abs(toNum(evalExpr(args[0] || '0')))); const r = v % 2 === 1 ? v : v + 1; return String(toNum(evalExpr(args[0] || '0')) < 0 ? -r : r); }
      case 'ROMAN': return toRoman(toNum(evalExpr(args[0] || '1')));

      // --- STATISTICS ---
      case 'AVERAGE':
      case 'AVG':
      case 'AVERAGEA': { const ns = collectNums(args); return ns.length ? String(ns.reduce((s, x) => s + x, 0) / ns.length) : '#ДЕЛ/0!'; }
      case 'AVERAGEIF': {
        const ks = expandRangeKeys(args[0] || '');
        const crit = evalExpr(args[1] || '');
        const avgKs = args[2] ? expandRangeKeys(args[2]) : ks;
        const matched: number[] = [];
        for (let i = 0; i < ks.length; i++) {
          if (matchCrit(evalCell(ks[i]), crit)) {
            const n = toNum(evalCell(avgKs[i] || ks[i]));
            if (!Number.isNaN(n)) matched.push(n);
          }
        }
        return matched.length ? String(matched.reduce((a, b) => a + b, 0) / matched.length) : '#ДЕЛ/0!';
      }
      case 'AVERAGEIFS': {
        const avgKs = expandRangeKeys(args[0] || '');
        const pairs: { ks: string[]; crit: string }[] = [];
        for (let p = 1; p + 1 < args.length; p += 2) pairs.push({ ks: expandRangeKeys(args[p]), crit: evalExpr(args[p + 1]) });
        const matched: number[] = [];
        for (let i = 0; i < avgKs.length; i++) {
          if (pairs.every((pr) => matchCrit(evalCell(pr.ks[i] || ''), pr.crit))) {
            const n = toNum(evalCell(avgKs[i]));
            if (!Number.isNaN(n)) matched.push(n);
          }
        }
        return matched.length ? String(matched.reduce((a, b) => a + b, 0) / matched.length) : '#ДЕЛ/0!';
      }
      case 'MIN': { const ns = collectNums(args); return ns.length ? String(Math.min(...ns)) : '0'; }
      case 'MAX': { const ns = collectNums(args); return ns.length ? String(Math.max(...ns)) : '0'; }
      case 'MINIFS':
      case 'MAXIFS': {
        const targetKs = expandRangeKeys(args[0] || '');
        const pairs: { ks: string[]; crit: string }[] = [];
        for (let p = 1; p + 1 < args.length; p += 2) pairs.push({ ks: expandRangeKeys(args[p]), crit: evalExpr(args[p + 1]) });
        const matched: number[] = [];
        for (let i = 0; i < targetKs.length; i++) {
          if (pairs.every((pr) => matchCrit(evalCell(pr.ks[i] || ''), pr.crit))) {
            const n = toNum(evalCell(targetKs[i]));
            if (!Number.isNaN(n)) matched.push(n);
          }
        }
        return matched.length ? String(fn === 'MINIFS' ? Math.min(...matched) : Math.max(...matched)) : '0';
      }
      case 'COUNT': return String(collectNums(args).length);
      case 'COUNTA': return String(collectStrings(args).filter((s) => s.trim() !== '').length);
      case 'COUNTBLANK': return String(collectStrings(args).filter((s) => s.trim() === '').length);
      case 'COUNTIF': { const ks = expandRangeKeys(args[0] || ''); const crit = evalExpr(args[1] || ''); return String(ks.filter((k) => matchCrit(evalCell(k), crit)).length); }
      case 'COUNTIFS': {
        const pairs: { ks: string[]; crit: string }[] = [];
        for (let p = 0; p + 1 < args.length; p += 2) pairs.push({ ks: expandRangeKeys(args[p]), crit: evalExpr(args[p + 1]) });
        if (!pairs.length) return '0';
        let c = 0;
        for (let i = 0; i < pairs[0].ks.length; i++) {
          if (pairs.every((pr) => matchCrit(evalCell(pr.ks[i] || ''), pr.crit))) c++;
        }
        return String(c);
      }
      case 'MEDIAN': { const ns = collectNums(args).sort((a, b) => a - b); if (!ns.length) return '#ЧИСЛО!'; const m = Math.floor(ns.length / 2); return String(ns.length % 2 ? ns[m] : (ns[m - 1] + ns[m]) / 2); }
      case 'MODE': { const ns = collectNums(args); if (!ns.length) return '#Н/Д'; const f = new Map<number, number>(); let best = ns[0], bc = 0; for (const n of ns) { const c = (f.get(n) || 0) + 1; f.set(n, c); if (c > bc) { bc = c; best = n; } } return String(best); }
      case 'STDEV':
      case 'STDEV.S':
      case 'STDEV.P': {
        const ns = collectNums(args);
        const denom = fn === 'STDEV.P' ? ns.length : ns.length - 1;
        if (denom <= 0) return '#ДЕЛ/0!';
        const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
        return String(Math.sqrt(ns.reduce((s, x) => s + (x - mean) ** 2, 0) / denom));
      }
      case 'VAR':
      case 'VAR.S':
      case 'VAR.P': {
        const ns = collectNums(args);
        const denom = fn === 'VAR.P' ? ns.length : ns.length - 1;
        if (denom <= 0) return '#ДЕЛ/0!';
        const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
        return String(ns.reduce((s, x) => s + (x - mean) ** 2, 0) / denom);
      }
      case 'LARGE': { const ns = collectNums([args[0]]).sort((a, b) => b - a); const k = Math.round(toNum(evalExpr(args[1] || '1'))); return k >= 1 && k <= ns.length ? String(ns[k - 1]) : '#ЧИСЛО!'; }
      case 'SMALL': { const ns = collectNums([args[0]]).sort((a, b) => a - b); const k = Math.round(toNum(evalExpr(args[1] || '1'))); return k >= 1 && k <= ns.length ? String(ns[k - 1]) : '#ЧИСЛО!'; }
      case 'RANK': { const t = toNum(evalExpr(args[0] || '0')); const ns = collectNums([args[1] || '']).sort((a, b) => b - a); const idx = ns.indexOf(t); return idx >= 0 ? String(idx + 1) : '#Н/Д'; }
      case 'PERCENTILE': {
        const ns = collectNums([args[0]]).sort((a, b) => a - b);
        const k = toNum(evalExpr(args[1] || '0.5'));
        if (!ns.length || k < 0 || k > 1) return '#ЧИСЛО!';
        const pos = k * (ns.length - 1);
        const lo = Math.floor(pos), hi = Math.ceil(pos);
        return String(ns[lo] + (ns[hi] - ns[lo]) * (pos - lo));
      }
      case 'QUARTILE': {
        const q = toNum(evalExpr(args[1] || '2'));
        if (q < 0 || q > 4) return '#ЧИСЛО!';
        return callFn('PERCENTILE', [args[0], String(q / 4)]);
      }
      case 'GEOMEAN': { const ns = collectNums(args); if (!ns.length || ns.some((x) => x <= 0)) return '#ЧИСЛО!'; return String(Math.pow(ns.reduce((p, x) => p * x, 1), 1 / ns.length)); }
      case 'HARMEAN': { const ns = collectNums(args); if (!ns.length || ns.some((x) => x <= 0)) return '#ЧИСЛО!'; return String(ns.length / ns.reduce((s, x) => s + 1 / x, 0)); }
      case 'CORREL':
      case 'SLOPE':
      case 'INTERCEPT':
      case 'FORECAST': {
        const isForecast = fn === 'FORECAST';
        const xVal = isForecast ? toNum(evalExpr(args[0] || '0')) : 0;
        const ys = collectNums([args[isForecast ? 1 : 0]]);
        const xs = collectNums([args[isForecast ? 2 : 1]]);
        const n = Math.min(xs.length, ys.length);
        if (n < 2) return '#ДЕЛ/0!';
        const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < n; i++) {
          num += (xs[i] - mx) * (ys[i] - my);
          dx2 += (xs[i] - mx) ** 2;
          dy2 += (ys[i] - my) ** 2;
        }
        if (fn === 'CORREL') return dx2 * dy2 === 0 ? '#ДЕЛ/0!' : String(num / Math.sqrt(dx2 * dy2));
        const slope = dx2 === 0 ? 0 : num / dx2;
        const intercept = my - slope * mx;
        if (fn === 'SLOPE') return String(slope);
        if (fn === 'INTERCEPT') return String(intercept);
        return String(intercept + slope * xVal);
      }

      // --- LOGIC & INFO ---
      case 'IF': return evalBool(args[0] || '') ? evalExpr(args[1] || 'TRUE') : evalExpr(args[2] || 'FALSE');
      case 'IFS': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          if (evalBool(args[i])) return evalExpr(args[i + 1]);
        }
        return '#Н/Д';
      }
      case 'SWITCH': {
        const target = evalExpr(args[0] || '').toLowerCase();
        for (let i = 1; i + 1 < args.length; i += 2) {
          if (evalExpr(args[i]).toLowerCase() === target) return evalExpr(args[i + 1]);
        }
        return args.length % 2 === 0 ? evalExpr(args[args.length - 1]) : '#Н/Д';
      }
      case 'IFERROR': { const v = evalExpr(args[0] || ''); return v.startsWith('#') ? evalExpr(args[1] || '') : v; }
      case 'IFNA': { const v = evalExpr(args[0] || ''); return v === '#Н/Д' || v === '#N/A' ? evalExpr(args[1] || '') : v; }
      case 'AND': return args.every((a) => evalBool(a)) ? 'TRUE' : 'FALSE';
      case 'OR': return args.some((a) => evalBool(a)) ? 'TRUE' : 'FALSE';
      case 'XOR': return args.filter((a) => evalBool(a)).length % 2 === 1 ? 'TRUE' : 'FALSE';
      case 'NOT': return !evalBool(args[0] || '') ? 'TRUE' : 'FALSE';
      case 'TRUE': return 'TRUE';
      case 'FALSE': return 'FALSE';
      case 'ISBLANK': return evalExpr(args[0] || '').trim() === '' ? 'TRUE' : 'FALSE';
      case 'ISNUMBER': return !Number.isNaN(toNum(evalExpr(args[0] || ''))) ? 'TRUE' : 'FALSE';
      case 'ISTEXT': { const v = evalExpr(args[0] || ''); return v !== '' && Number.isNaN(toNum(v)) ? 'TRUE' : 'FALSE'; }
      case 'ISERROR': return evalExpr(args[0] || '').startsWith('#') ? 'TRUE' : 'FALSE';
      case 'ISEVEN': return Math.trunc(toNum(evalExpr(args[0] || '0'))) % 2 === 0 ? 'TRUE' : 'FALSE';
      case 'ISODD': return Math.abs(Math.trunc(toNum(evalExpr(args[0] || '0')))) % 2 === 1 ? 'TRUE' : 'FALSE';

      // --- LOOKUP & REFERENCE ---
      case 'VLOOKUP': {
        const needle = evalExpr(args[0] || '').toLowerCase();
        const parts = (args[1] || '').split(':');
        const colIdx = Math.round(toNum(evalExpr(args[2] || '1')));
        if (parts.length !== 2 || colIdx < 1) return '#Н/Д';
        const a = parseCellRef(parts[0]), b = parseCellRef(parts[1]);
        if (!a || !b) return '#Н/Д';
        for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
          if (evalCell(makeCellKey(Math.min(a.col, b.col), r)).toLowerCase() === needle) {
            return evalCell(makeCellKey(Math.min(a.col, b.col) + colIdx - 1, r));
          }
        }
        return '#Н/Д';
      }
      case 'HLOOKUP': {
        const needle = evalExpr(args[0] || '').toLowerCase();
        const parts = (args[1] || '').split(':');
        const rowIdx = Math.round(toNum(evalExpr(args[2] || '1')));
        if (parts.length !== 2 || rowIdx < 1) return '#Н/Д';
        const a = parseCellRef(parts[0]), b = parseCellRef(parts[1]);
        if (!a || !b) return '#Н/Д';
        for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
          if (evalCell(makeCellKey(c, Math.min(a.row, b.row))).toLowerCase() === needle) {
            return evalCell(makeCellKey(c, Math.min(a.row, b.row) + rowIdx - 1));
          }
        }
        return '#Н/Д';
      }
      case 'XLOOKUP':
      case 'LOOKUP': {
        const needle = evalExpr(args[0] || '').toLowerCase();
        const lookKs = expandRangeKeys(args[1] || '');
        const retKs = args[2] ? expandRangeKeys(args[2]) : lookKs;
        const idx = lookKs.findIndex((k) => evalCell(k).toLowerCase() === needle);
        if (idx >= 0 && retKs[idx]) return evalCell(retKs[idx]);
        return args[3] ? evalExpr(args[3]) : '#Н/Д';
      }
      case 'INDEX': {
        const parts = (args[0] || '').split(':');
        const rn = Math.round(toNum(evalExpr(args[1] || '1')));
        const cn = Math.round(toNum(evalExpr(args[2] || '1')) || 1);
        const a = parseCellRef(parts[0] || '');
        if (!a) return '#ССЫЛКА!';
        return evalCell(makeCellKey(a.col + cn - 1, a.row + rn - 1));
      }
      case 'MATCH': {
        const needle = evalExpr(args[0] || '').toLowerCase();
        const ks = expandRangeKeys(args[1] || '');
        const idx = ks.findIndex((k) => evalCell(k).toLowerCase() === needle);
        return idx >= 0 ? String(idx + 1) : '#Н/Д';
      }
      case 'CHOOSE': {
        const idx = Math.round(toNum(evalExpr(args[0] || '1')));
        return idx >= 1 && idx < args.length ? evalExpr(args[idx]) : '#ЗНАЧ!';
      }
      case 'ROW': { const p = parseCellRef(args[0] || 'A1'); return p ? String(p.row + 1) : '1'; }
      case 'COLUMN': { const p = parseCellRef(args[0] || 'A1'); return p ? String(p.col + 1) : '1'; }
      case 'ROWS': { const ps = (args[0] || '').split(':'); const a = parseCellRef(ps[0] || ''), b = parseCellRef(ps[1] || ps[0] || ''); return a && b ? String(Math.abs(b.row - a.row) + 1) : '1'; }
      case 'COLUMNS': { const ps = (args[0] || '').split(':'); const a = parseCellRef(ps[0] || ''), b = parseCellRef(ps[1] || ps[0] || ''); return a && b ? String(Math.abs(b.col - a.col) + 1) : '1'; }

      // --- FINANCIAL ---
      case 'PMT': {
        const rate = toNum(evalExpr(args[0] || '0')), nper = toNum(evalExpr(args[1] || '1')), pv = toNum(evalExpr(args[2] || '0'));
        if (nper <= 0) return '#ЧИСЛО!';
        if (rate === 0) return String(-pv / nper);
        return String(Math.round(((-pv * rate * (1 + rate) ** nper) / ((1 + rate) ** nper - 1)) * 100) / 100);
      }
      case 'FV': {
        const rate = toNum(evalExpr(args[0] || '0')), nper = toNum(evalExpr(args[1] || '1')), pmt = toNum(evalExpr(args[2] || '0')), pv = toNum(evalExpr(args[3] || '0')) || 0;
        if (rate === 0) return String(-(pv + pmt * nper));
        return String(Math.round(-(pv * (1 + rate) ** nper + (pmt * ((1 + rate) ** nper - 1)) / rate) * 100) / 100);
      }
      case 'PV': {
        const rate = toNum(evalExpr(args[0] || '0')), nper = toNum(evalExpr(args[1] || '1')), pmt = toNum(evalExpr(args[2] || '0'));
        if (rate === 0) return String(-(pmt * nper));
        return String(Math.round((-(pmt * (1 - (1 + rate) ** -nper)) / rate) * 100) / 100);
      }
      case 'NPV': {
        const rate = toNum(evalExpr(args[0] || '0'));
        const flows = collectNums(args.slice(1));
        return String(Math.round(flows.reduce((s, cf, i) => s + cf / (1 + rate) ** (i + 1), 0) * 100) / 100);
      }
      case 'NPER': {
        const rate = toNum(evalExpr(args[0] || '0')), pmt = toNum(evalExpr(args[1] || '0')), pv = toNum(evalExpr(args[2] || '0'));
        if (rate === 0) return pmt === 0 ? '#ДЕЛ/0!' : String(-pv / pmt);
        return String(Math.round((Math.log(pmt / (pmt + pv * rate)) / Math.log(1 + rate)) * 100) / 100);
      }
      case 'SLN': { const cost = toNum(evalExpr(args[0] || '0')), salv = toNum(evalExpr(args[1] || '0')), life = toNum(evalExpr(args[2] || '1')); return life === 0 ? '#ДЕЛ/0!' : String((cost - salv) / life); }
      case 'EFFECT': { const nom = toNum(evalExpr(args[0] || '0')), n = toNum(evalExpr(args[1] || '12')); return String((1 + nom / n) ** n - 1); }
      case 'NOMINAL': { const eff = toNum(evalExpr(args[0] || '0')), n = toNum(evalExpr(args[1] || '12')); return String(n * ((1 + eff) ** (1 / n) - 1)); }

      // --- TEXT ---
      case 'CONCAT':
      case 'CONCATENATE': return collectStrings(args).join('');
      case 'TEXTJOIN': {
        const delim = evalExpr(args[0] || '');
        const ignoreEmpty = evalBool(args[1] || 'TRUE');
        const vals = collectStrings(args.slice(2));
        return (ignoreEmpty ? vals.filter((v) => v.trim() !== '') : vals).join(delim);
      }
      case 'LEFT': return evalExpr(args[0] || '').slice(0, Math.max(0, Math.round(toNum(evalExpr(args[1] || '1')))));
      case 'RIGHT': { const s = evalExpr(args[0] || ''); const n = Math.max(0, Math.round(toNum(evalExpr(args[1] || '1')))); return s.slice(Math.max(0, s.length - n)); }
      case 'MID': { const s = evalExpr(args[0] || ''); const st = Math.max(1, Math.round(toNum(evalExpr(args[1] || '1')))); const ln = Math.max(0, Math.round(toNum(evalExpr(args[2] || '1')))); return s.slice(st - 1, st - 1 + ln); }
      case 'LEN': return String(evalExpr(args[0] || '').length);
      case 'FIND': { const sub = evalExpr(args[0] || ''), str = evalExpr(args[1] || ''); const i = str.indexOf(sub); return i >= 0 ? String(i + 1) : '#ЗНАЧ!'; }
      case 'SEARCH': { const sub = evalExpr(args[0] || '').toLowerCase(), str = evalExpr(args[1] || '').toLowerCase(); const i = str.indexOf(sub); return i >= 0 ? String(i + 1) : '#ЗНАЧ!'; }
      case 'REPLACE': { const s = evalExpr(args[0] || ''), st = Math.max(1, Math.round(toNum(evalExpr(args[1] || '1')))), ln = Math.max(0, Math.round(toNum(evalExpr(args[2] || '0')))), nw = evalExpr(args[3] || ''); return s.slice(0, st - 1) + nw + s.slice(st - 1 + ln); }
      case 'SUBSTITUTE': { const s = evalExpr(args[0] || ''), o = evalExpr(args[1] || ''), n = evalExpr(args[2] || ''); return o ? s.split(o).join(n) : s; }
      case 'UPPER': return evalExpr(args[0] || '').toUpperCase();
      case 'LOWER': return evalExpr(args[0] || '').toLowerCase();
      case 'PROPER': return evalExpr(args[0] || '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
      case 'TRIM': return evalExpr(args[0] || '').replace(/\s+/g, ' ').trim();
      case 'CLEAN': return evalExpr(args[0] || '').replace(/[\x00-\x1F]/g, '');
      case 'REPT': return evalExpr(args[0] || '').repeat(Math.max(0, Math.min(200, Math.round(toNum(evalExpr(args[1] || '1'))))));
      case 'EXACT': return evalExpr(args[0] || '') === evalExpr(args[1] || '') ? 'TRUE' : 'FALSE';
      case 'VALUE': { const n = toNum(evalExpr(args[0] || '')); return Number.isNaN(n) ? '#ЗНАЧ!' : String(n); }
      case 'TEXT': { const n = toNum(evalExpr(args[0] || '0')); const fmt = evalExpr(args[1] || ''); if (fmt.includes('%')) return `${(n * 100).toFixed(1)}%`; return Number.isNaN(n) ? evalExpr(args[0] || '') : n.toLocaleString('ru-RU'); }
      case 'CHAR': return String.fromCharCode(Math.round(toNum(evalExpr(args[0] || '65'))));
      case 'CODE': return String((evalExpr(args[0] || ' ').charCodeAt(0)) || 0);

      // --- DATE & TIME ---
      case 'TODAY': return new Date().toLocaleDateString('ru-RU');
      case 'NOW': return new Date().toLocaleString('ru-RU');
      case 'DATE': { const d = new Date(Math.round(toNum(evalExpr(args[0] || '2026'))), Math.round(toNum(evalExpr(args[1] || '1'))) - 1, Math.round(toNum(evalExpr(args[2] || '1')))); return d.toLocaleDateString('ru-RU'); }
      case 'TIME': return `${String(Math.round(toNum(evalExpr(args[0] || '0')))).padStart(2, '0')}:${String(Math.round(toNum(evalExpr(args[1] || '0')))).padStart(2, '0')}`;
      case 'YEAR': { const d = parseDateAny(evalExpr(args[0] || '')) || new Date(); return String(d.getFullYear()); }
      case 'MONTH': { const d = parseDateAny(evalExpr(args[0] || '')) || new Date(); return String(d.getMonth() + 1); }
      case 'DAY': { const d = parseDateAny(evalExpr(args[0] || '')) || new Date(); return String(d.getDate()); }
      case 'HOUR': return String(new Date().getHours());
      case 'MINUTE': return String(new Date().getMinutes());
      case 'SECOND': return String(new Date().getSeconds());
      case 'WEEKDAY': { const d = parseDateAny(evalExpr(args[0] || '')) || new Date(); return String(d.getDay() === 0 ? 7 : d.getDay()); }
      case 'WEEKNUM': { const d = parseDateAny(evalExpr(args[0] || '')) || new Date(); const start = new Date(d.getFullYear(), 0, 1); return String(Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)); }
      case 'DAYS':
      case 'DATEDIF': {
        const d1 = parseDateAny(evalExpr(args[0] || '')), d2 = parseDateAny(evalExpr(args[1] || ''));
        if (!d1 || !d2) return '#ЗНАЧ!';
        const diff = Math.round((d1.getTime() - d2.getTime()) / 86400000);
        return String(fn === 'DATEDIF' ? Math.abs(diff) : diff);
      }
      case 'NETWORKDAYS': {
        const d1 = parseDateAny(evalExpr(args[0] || '')), d2 = parseDateAny(evalExpr(args[1] || ''));
        if (!d1 || !d2) return '#ЗНАЧ!';
        let cur = new Date(Math.min(d1.getTime(), d2.getTime()));
        const end = new Date(Math.max(d1.getTime(), d2.getTime()));
        let count = 0;
        while (cur <= end && count < 10000) {
          const day = cur.getDay();
          if (day !== 0 && day !== 6) count++;
          cur.setDate(cur.getDate() + 1);
        }
        return String(count);
      }

      // --- ENGINEERING ---
      case 'DEC2BIN': return Math.trunc(toNum(evalExpr(args[0] || '0'))).toString(2);
      case 'DEC2HEX': return Math.trunc(toNum(evalExpr(args[0] || '0'))).toString(16).toUpperCase();
      case 'DEC2OCT': return Math.trunc(toNum(evalExpr(args[0] || '0'))).toString(8);
      case 'BIN2DEC': return String(parseInt(evalExpr(args[0] || '0'), 2));
      case 'HEX2DEC': return String(parseInt(evalExpr(args[0] || '0'), 16));
      case 'OCT2DEC': return String(parseInt(evalExpr(args[0] || '0'), 8));
      case 'DELTA': return toNum(evalExpr(args[0] || '0')) === toNum(evalExpr(args[1] || '0')) ? '1' : '0';
      case 'CONVERT': {
        const v = toNum(evalExpr(args[0] || '0'));
        const from = evalExpr(args[1] || '').toLowerCase();
        const to = evalExpr(args[2] || '').toLowerCase();
        if (from === 'km' && to === 'mi') return String(v * 0.621371);
        if (from === 'mi' && to === 'km') return String(v * 1.60934);
        if (from === 'm' && to === 'ft') return String(v * 3.28084);
        if (from === 'c' && to === 'f') return String((v * 9) / 5 + 32);
        if (from === 'f' && to === 'c') return String(((v - 32) * 5) / 9);
        if (from === 'kg' && to === 'lb') return String(v * 2.20462);
        if (from === 'lb' && to === 'kg') return String(v * 0.453592);
        return String(v);
      }
      default:
        return '#ИМЯ?';
    }
  };

  const evalExpr = (raw: string): string => {
    let e = raw.trim();
    if (!e) return '';
    // Strip outer balanced parentheses
    while (e.startsWith('(') && e.endsWith(')')) {
      let d = 0, wrapsAll = true, inQ = false;
      for (let i = 0; i < e.length - 1; i++) {
        if (e[i] === '"') inQ = !inQ;
        else if (!inQ && e[i] === '(') d++;
        else if (!inQ && e[i] === ')') d--;
        if (d === 0) { wrapsAll = false; break; }
      }
      if (!wrapsAll) break;
      e = e.slice(1, -1).trim();
    }

    if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) return e.slice(1, -1);
    if (/^(TRUE|ИСТИНА)$/i.test(e)) return 'TRUE';
    if (/^(FALSE|ЛОЖЬ)$/i.test(e)) return 'FALSE';
    if (/^-?\d+([.,]\d+)?%?$/.test(e)) return String(toNum(e));
    if (/^\$?[A-Za-z]+\$?\d+$/.test(e)) return evalCell(e);

    // Top-level & string concat
    {
      let d = 0, inQ = false;
      const parts: string[] = [];
      let last = 0;
      for (let i = 0; i < e.length; i++) {
        if (e[i] === '"') inQ = !inQ;
        else if (!inQ && e[i] === '(') d++;
        else if (!inQ && e[i] === ')') d--;
        else if (!inQ && d === 0 && e[i] === '&') {
          parts.push(e.slice(last, i));
          last = i + 1;
        }
      }
      if (parts.length > 0) {
        parts.push(e.slice(last));
        return parts.map((p) => evalExpr(p)).join('');
      }
    }

    // Pure single function call NAME(args)
    const fnMatch = /^([A-Za-zА-Яа-яЁё0-9_.]+)\(([\s\S]*)\)$/.exec(e);
    if (fnMatch) {
      // Verify the opening '(' matches the very last ')'
      let d = 0, inQ = false, singleCall = true;
      const startP = e.indexOf('(');
      for (let i = startP; i < e.length - 1; i++) {
        if (e[i] === '"') inQ = !inQ;
        else if (!inQ && e[i] === '(') d++;
        else if (!inQ && e[i] === ')') d--;
        if (d === 0) { singleCall = false; break; }
      }
      if (singleCall) {
        return callFn(fnMatch[1], splitArgsTopLevel(fnMatch[2]));
      }
    }

    // Resolve nested function calls innermost-outward for compound arithmetic (e.g. =-ПЛТ(...)*12 + СУММ(B2:B5))
    let exprWork = e;
    for (let pass = 0; pass < 10; pass++) {
      const m = /([A-Za-zА-Яа-яЁё0-9_.]+)\(([^()]*)\)/.exec(exprWork);
      if (!m) break;
      const val = callFn(m[1], splitArgsTopLevel(m[2]));
      const num = toNum(val);
      const rep = Number.isNaN(num) ? (val.startsWith('#') ? val : `"${val}"`) : String(num);
      exprWork = exprWork.slice(0, m.index) + rep + exprWork.slice(m.index + m[0].length);
    }

    if (exprWork.includes('#ДЕЛ/0!') || exprWork.includes('#Н/Д') || exprWork.includes('#ЗНАЧ!')) return exprWork;

    // Replace cell references with numbers
    exprWork = exprWork.replace(/\$?[A-Za-z]+\$?\d+/g, (ref) => {
      const n = toNum(evalCell(ref));
      return Number.isNaN(n) ? '0' : String(n);
    });
    exprWork = exprWork.replace(/\^/g, '**');
    if (/^[0-9+\-*/().\sEea-f]+$/i.test(exprWork) && !/[a-df-z]/i.test(exprWork)) {
      try {
        const res = Function(`"use strict"; return (${exprWork});`)();
        if (typeof res === 'number') {
          if (!Number.isFinite(res)) return '#ДЕЛ/0!';
          return String(Math.round(res * 1e9) / 1e9);
        }
      } catch {
        return '#ЗНАЧ!';
      }
    }
    return exprWork;
  };

  try {
    return evalExpr(trimmed.slice(1));
  } catch {
    return '#ОШИБКА!';
  }
}

export { colIndexToLetter };
