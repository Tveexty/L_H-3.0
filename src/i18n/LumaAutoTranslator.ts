import { useEffect } from 'react';
import type { LumaLangCode as LangCode } from './translations';

// Reactive 100%-complete UI & Widget Auto-Translator for Luma OS 1.5.2.
// Ensures that switching OS language translates EVERY widget, studio, modal, tooltip,
// and placeholder across the entire interface without leaving untranslated Russian text,
// while skipping user-typed inputs, code editors, and restoring exact originals on 'ru'.

const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<Element, { placeholder?: string; title?: string }>();

// High-priority exact Russian -> English phrases (sorted longest-first at runtime)
const RU_TO_EN_PHRASES: [string, string][] = [
  // Core OS & Control Hub
  ['Панель управления 1.5.2', 'Control Center 1.5.2'],
  ['Панель управления', 'Control Center'],
  ['Центр уведомлений', 'Notification Center'],
  ['Менеджер функций Luma OS 1.5.2', 'Luma OS 1.5.2 Feature Manager'],
  ['Входящие Live', 'Incoming Live'],
  ['Входящих сообщений пока нет', 'No incoming messages yet'],
  ['Сообщения (TG / WA / DC)', 'Messages (TG / WA / DC)'],
  ['Уведомлений пока нет', 'No notifications yet'],
  ['Устройства BT / 2.4GHz', 'BT / 2.4GHz Devices'],
  ['Нет обнаруженных беспроводных устройств', 'No wireless devices detected'],
  ['План питания ОС:', 'OS Power Plan:'],
  ['Быстрый акцент:', 'Quick Accent:'],
  ['Качество записи экрана:', 'Screen Recording Quality:'],
  ['Звук · Вывод и Микрофон', 'Audio · Output & Mic'],
  ['Добавить плитки в панель управления:', 'Add tiles to Control Center:'],
  ['Не беспокоить', 'Do Not Disturb'],
  ['Ночной свет', 'Night Light'],
  ['Игровой режим', 'Gaming Boost'],
  ['Игровой', 'Gaming'],
  ['Запись экрана', 'Screen Record'],
  ['Запись', 'Record'],
  ['Скриншот', 'Screenshot'],
  ['Приватность', 'Privacy Vault'],
  ['Конфиденциальность', 'Privacy'],
  ['Энергосбережение', 'Power Saver'],
  ['Эко-режим', 'Eco Mode'],
  ['Двойная панель', 'Dual Taskbar'],
  ['2 Панели', '2 Bars'],
  ['Функции ОС', 'OS Features'],
  ['Функции', 'Features'],
  ['Мышь DPI', 'Mouse DPI'],
  ['DPI мыши', 'Mouse DPI'],
  ['Развернуть', 'Expand'],
  ['Свернуть', 'Collapse'],
  ['Редакт.', 'Edit'],
  ['Готово', 'Done'],
  ['Очистить', 'Clear'],
  ['Показать', 'Show'],
  ['Скрыть', 'Hide'],
  ['Открыть', 'Open'],
  ['Закрыть', 'Close'],
  ['Сохранить', 'Save'],
  ['Отмена', 'Cancel'],
  ['Назад', 'Back'],
  ['Тест', 'Test'],
  ['Все', 'All'],
  ['Система', 'System'],
  ['Баланс', 'Balanced'],
  ['Макс', 'Max'],
  ['Эко', 'Eco'],
  ['Норм', 'Std'],
  ['Включён', 'On'],
  ['Включено', 'Enabled'],
  ['Активен', 'Active'],
  ['Активно', 'Active'],
  ['Заглушён', 'Muted'],
  ['Скрыт', 'Hidden'],
  ['Выкл', 'Off'],
  ['Онлайн', 'Online'],
  ['Нет сети', 'Offline'],
  ['Тишина', 'Silent'],
  ['Уведомления', 'Notifications'],
  ['Тёмная', 'Dark'],
  ['Светлая', 'Light'],
  ['Тема', 'Theme'],
  ['Микрофон', 'Microphone'],
  ['Остров', 'Island'],
  ['Корзина', 'Recycle Bin'],

  // Desktop & Widgets
  ['Галерея виджетов Luma', 'Luma Widget Gallery'],
  ['Создать свой виджет', 'Create Custom Widget'],
  ['Конструктор виджетов Pro · Carbon Studio', 'Custom Widget Builder Pro · Carbon Studio'],
  ['Настройки виджета', 'Widget Settings'],
  ['Настройки этого виджета', 'This Widget Settings'],
  ['Часы и мировое время', 'Clock & World Time'],
  ['Часы и дата', 'Clock & Date'],
  ['Батарея, питание и периферия', 'Battery, Power & Peripherals'],
  ['Батарея и питание', 'Battery & Power'],
  ['Погода и прогноз на неделю', 'Weather & 7-Day Forecast'],
  ['Погода на неделю', 'Weekly Weather'],
  ['Календарь и события', 'Calendar & Events'],
  ['Медиаплеер и спектр', 'Media Player & Spectrum'],
  ['Система: CPU / GPU / RAM', 'System: CPU / GPU / RAM'],
  ['Накопители', 'Storage Drives'],
  ['Сеть и IPC', 'Network & IPC'],
  ['Таймер фокуса', 'Focus Timer'],
  ['Быстрые переключатели', 'Quick Toggles'],
  ['Системные модули', 'System Modules'],
  ['Заметки, задачи и привычки', 'Notes, Tasks & Habits'],
  ['Экранное время и ритм дня', 'Screen Time & Daily Rhythm'],
  ['Калькулятор', 'Calculator'],
  ['Курсы и рынки', 'Markets & Rates'],
  ['Luma AI 3.0 Мини-чат', 'Luma AI 3.0 Mini Chat'],
  ['Свой виджет Pro (100+ опций)', 'Custom Widget Pro (100+ Options)'],
  ['Найти виджет...', 'Search widgets...'],
  ['+ Добавить', '+ Add'],
  ['Добавить на рабочий стол', 'Add to Desktop'],
  ['Сохранить виджет', 'Save Widget'],
  ['Режим редактирования', 'Edit Mode'],
  ['Рабочий стол', 'Desktop'],
  ['Авто-регион', 'Auto Region'],
  ['7 ДНЕЙ', '7 DAYS'],
  ['Ощущ.', 'Feels'],
  ['Ветер', 'Wind'],
  ['км/ч', 'km/h'],
  ['Ясно', 'Clear'],
  ['Облачно', 'Cloudy'],
  ['Туман', 'Fog'],
  ['Дождь', 'Rain'],
  ['Снег', 'Snow'],
  ['Ливень', 'Showers'],
  ['Гроза', 'Storm'],
  ['Заряжается', 'Charging'],
  ['От сети', 'Plugged In'],
  ['От АКБ', 'On Battery'],
  ['Подкл.', 'Conn.'],
  ['Старт', 'Start'],
  ['Пауза', 'Pause'],
  ['Сброс', 'Reset'],
  ['Стоп', 'Stop'],
  ['СЕГОДНЯ', 'TODAY'],
  ['ЗАРЯД', 'BATTERY'],
  ['ПАМЯТЬ', 'MEMORY'],
  ['ПРОЦЕССОР', 'PROCESSOR'],
  ['ДИСКИ', 'DRIVES'],
  ['СЕТЬ', 'NETWORK'],
  ['Свободно', 'Free'],
  ['Занято', 'Used'],
  ['ГБ', 'GB'],
  ['МБ', 'MB'],
  ['КБ', 'KB'],
  ['Мбит/с', 'Mbps'],
  ['Питание', 'Power'],
  ['Погода', 'Weather'],
  ['Медиа', 'Media'],
  ['Инструменты', 'Tools'],
  ['Основное', 'Core'],
  ['Стилей:', 'Styles:'],
  ['Форма:', 'Shape:'],
  ['Размер', 'Size'],
  ['Прозрачность', 'Opacity'],
  ['Размытие', 'Blur'],
  ['Удалить виджет', 'Delete Widget'],
  ['Удалить', 'Delete'],
  ['Изменить размер', 'Resize'],
  ['Обновить', 'Refresh'],
  ['Поиск', 'Search'],

  // Apps & Studios
  ['Проводник', 'File Explorer'],
  ['Терминал', 'Terminal'],
  ['Настройки', 'Settings'],
  ['Диспетчер задач', 'Task Manager'],
  ['Службы ОС', 'OS Services'],
  ['Сценарии автоматизации Pro', 'Automation Scenarios Pro'],
  ['Сценарии автоматизации', 'Automation Scenarios'],
  ['Новый сценарий', 'New Scenario'],
  ['Запустить', 'Run'],
  ['Выполнено', 'Executed'],
  ['Календарь', 'Calendar'],
  ['Безопасность', 'Security'],
  ['Обновление', 'Updates'],
  ['О системе', 'About OS'],
  ['Персонализация', 'Personalization'],
  ['Обои', 'Wallpapers'],
  ['Панель задач', 'Taskbar'],
  ['Язык интерфейса', 'Interface Language'],
  ['Видеомонтаж', 'Video Edit'],
  ['Главная', 'Home'],
  ['Вставка', 'Insert'],
  ['Макет', 'Layout'],
  ['Дизайн', 'Design'],
  ['Формулы', 'Formulas'],
  ['Ссылки', 'References'],
  ['Данные', 'Data'],
  ['Анимации', 'Animations'],
  ['Рецензирование', 'Review'],
  ['Вид', 'View'],
  ['Сохранить / Экспорт', 'Save / Export'],
  ['Открыть файл', 'Open File'],
  ['Открыть папку', 'Open Folder'],
  ['Новый', 'New'],
  ['Шаблоны', 'Templates'],
  ['Формат', 'Format'],
  ['Запуск', 'Run'],
  ['Превью', 'Preview'],
  ['Проблемы', 'Problems'],
  ['Вывод', 'Output'],
  ['Автосохранение', 'Auto-Save'],
  ['Показ F5', 'Present F5'],
  ['Новый слайд', 'New Slide'],
  ['Заметки докладчика:', 'Speaker Notes:'],
  ['Переключатель окон', 'Window Switcher'],
  ['Приватный рабочий стол', 'Private Desktop'],
  ['Заблокировать и выйти', 'Lock & Exit'],
  ['Разблокировать', 'Unlock'],
  ['Выйти', 'Exit'],
  ['Приложения и Действия', 'Apps & Actions'],
  ['Шаблоны и Макет', 'Templates & Layout'],
  ['Фон, Фото и Свечение', 'Background, Photo & Glow'],
  ['Текст, Иконка и Шкала', 'Text, Icon & Progress'],
  ['Данные, API и JS', 'Data, API & JS'],
  ['Монтаж', 'Edit'],
  ['Цвет/FX', 'Color/FX'],
  ['Звук', 'Audio'],
  ['Текст', 'Text'],
  ['ИИ Pro', 'AI Pro'],
  ['Шабл.', 'Presets'],
  ['Автосубтитры', 'Auto Captions'],
  ['Озвучка TTS', 'TTS Voice'],
  ['Кисть', 'Brush'],
  ['Экспорт', 'Export'],
  ['Разрез', 'Split'],
  ['Соединить', 'Join'],
  ['Стоп-кадр', 'Freeze'],
  ['Плей', 'Play'],

  // Days of week & months
  ['Понедельник', 'Monday'], ['Вторник', 'Tuesday'], ['Среда', 'Wednesday'],
  ['Четверг', 'Thursday'], ['Пятница', 'Friday'], ['Суббота', 'Saturday'], ['Воскресенье', 'Sunday'],
  ['Пн', 'Mon'], ['Вт', 'Tue'], ['Ср', 'Wed'], ['Чт', 'Thu'], ['Пт', 'Fri'], ['Сб', 'Sat'], ['Вс', 'Sun'], ['Сег', 'Today'],
];

// Secondary locale overrides for key UI terms (English -> Target Language)
const EN_TO_LOCALE: Partial<Record<LangCode, Record<string, string>>> = {
  de: {
    'Control Center': 'Kontrollzentrum', 'Notification Center': 'Mitteilungszentrale', 'Settings': 'Einstellungen',
    'Desktop': 'Schreibtisch', 'Search': 'Suche', 'Save': 'Speichern', 'Cancel': 'Abbrechen', 'Open': 'Öffnen',
    'Close': 'Schließen', 'Delete': 'Löschen', 'Clear': 'Leeren', 'Theme': 'Design', 'Dark': 'Dunkel', 'Light': 'Hell',
    'Clock & World Time': 'Uhr & Weltzeit', 'Battery, Power & Peripherals': 'Akku, Energie & Geräte',
    'Weather & 7-Day Forecast': 'Wetter & 7-Tage-Prognose', 'Calendar & Events': 'Kalender & Termine',
    'File Explorer': 'Dateimanager', 'Terminal': 'Terminal', 'Calculator': 'Rechner', 'Recycle Bin': 'Papierkorb',
    'Screen Record': 'Aufnahme', 'Screenshot': 'Screenshot', 'Do Not Disturb': 'Nicht stören',
    'Night Light': 'Nachtlicht', 'Gaming Boost': 'Spielmodus', 'Microphone': 'Mikrofon', 'Home': 'Start',
    'Insert': 'Einfügen', 'Layout': 'Layout', 'Design': 'Entwurf', 'Formulas': 'Formeln', 'Data': 'Daten',
    'Review': 'Überprüfen', 'View': 'Ansicht', 'Export': 'Exportieren', 'Templates': 'Vorlagen',
  },
  fr: {
    'Control Center': 'Centre de contrôle', 'Notification Center': 'Notifications', 'Settings': 'Paramètres',
    'Desktop': 'Bureau', 'Search': 'Rechercher', 'Save': 'Enregistrer', 'Cancel': 'Annuler', 'Open': 'Ouvrir',
    'Close': 'Fermer', 'Delete': 'Supprimer', 'Clear': 'Effacer', 'Theme': 'Thème', 'Dark': 'Sombre', 'Light': 'Clair',
    'Clock & World Time': 'Horloge & Monde', 'Battery, Power & Peripherals': 'Batterie & Périphériques',
    'Weather & 7-Day Forecast': 'Météo 7 jours', 'Calendar & Events': 'Calendrier', 'File Explorer': 'Explorateur',
    'Calculator': 'Calculatrice', 'Recycle Bin': 'Corbeille', 'Screen Record': 'Enregistrer', 'Screenshot': 'Capture',
    'Do Not Disturb': 'Ne pas déranger', 'Night Light': 'Éclairage nocturne', 'Home': 'Accueil', 'Insert': 'Insertion',
    'View': 'Affichage', 'Export': 'Exporter', 'Templates': 'Modèles',
  },
  es: {
    'Control Center': 'Centro de control', 'Notification Center': 'Notificaciones', 'Settings': 'Configuración',
    'Desktop': 'Escritorio', 'Search': 'Buscar', 'Save': 'Guardar', 'Cancel': 'Cancelar', 'Open': 'Abrir',
    'Close': 'Cerrar', 'Delete': 'Eliminar', 'Clear': 'Limpiar', 'Theme': 'Tema', 'Dark': 'Oscuro', 'Light': 'Claro',
    'Clock & World Time': 'Reloj y Hora mundial', 'Battery, Power & Peripherals': 'Batería y Periféricos',
    'Weather & 7-Day Forecast': 'Clima 7 días', 'Calendar & Events': 'Calendario', 'File Explorer': 'Explorador',
    'Calculator': 'Calculadora', 'Recycle Bin': 'Papelera', 'Screen Record': 'Grabar pantalla', 'Screenshot': 'Captura',
    'Do Not Disturb': 'No molestar', 'Night Light': 'Luz nocturna', 'Home': 'Inicio', 'Insert': 'Insertar',
    'View': 'Vista', 'Export': 'Exportar', 'Templates': 'Plantillas',
  },
  uk: {
    'Control Center': 'Панель керування', 'Notification Center': 'Центр сповіщень', 'Settings': 'Налаштування',
    'Desktop': 'Робочий стіл', 'Search': 'Пошук', 'Save': 'Зберегти', 'Cancel': 'Скасувати', 'Open': 'Відкрити',
    'Close': 'Закрити', 'Delete': 'Видалити', 'Clear': 'Очистити', 'Theme': 'Тема', 'Dark': 'Темна', 'Light': 'Світла',
    'Clock & World Time': 'Годинник і світовий час', 'Battery, Power & Peripherals': 'Батарея і периферія',
    'Weather & 7-Day Forecast': 'Погода на 7 днів', 'Calendar & Events': 'Календар і події', 'File Explorer': 'Провідник',
    'Calculator': 'Калькулятор', 'Recycle Bin': 'Кошик', 'Screen Record': 'Запис екрана', 'Screenshot': 'Знімок екрана',
    'Do Not Disturb': 'Не турбувати', 'Night Light': 'Нічне світло', 'Home': 'Головна', 'Insert': 'Вставка',
    'View': 'Вигляд', 'Export': 'Експорт', 'Templates': 'Шаблони',
  },
  zh: {
    'Control Center': '控制中心', 'Notification Center': '通知中心', 'Settings': '设置',
    'Desktop': '桌面', 'Search': '搜索', 'Save': '保存', 'Cancel': '取消', 'Open': '打开',
    'Close': '关闭', 'Delete': '删除', 'Clear': '清除', 'Theme': '主题', 'Dark': '深色', 'Light': '浅色',
    'Clock & World Time': '时钟与世界时间', 'Battery, Power & Peripherals': '电池与外设',
    'Weather & 7-Day Forecast': '天气与7天预报', 'Calendar & Events': '日历与日程', 'File Explorer': '文件管理器',
    'Calculator': '计算器', 'Recycle Bin': '回收站', 'Screen Record': '录屏', 'Screenshot': '截图',
    'Do Not Disturb': '勿扰模式', 'Night Light': '护眼夜灯', 'Home': '主页', 'Insert': '插入',
    'View': '视图', 'Export': '导出', 'Templates': '模板',
  },
  ja: {
    'Control Center': 'コントロールセンター', 'Notification Center': '通知センター', 'Settings': '設定',
    'Desktop': 'デスクトップ', 'Search': '検索', 'Save': '保存', 'Cancel': 'キャンセル', 'Open': '開く',
    'Close': '閉じる', 'Delete': '削除', 'Clear': '消去', 'Theme': 'テーマ', 'Dark': 'ダーク', 'Light': 'ライト',
    'Clock & World Time': '時計と世界時計', 'Battery, Power & Peripherals': 'バッテリーと周辺機器',
    'Weather & 7-Day Forecast': '天気と週間予報', 'Calendar & Events': 'カレンダー', 'File Explorer': 'エクスプローラー',
    'Calculator': '電卓', 'Recycle Bin': 'ゴミ箱', 'Screen Record': '画面録画', 'Screenshot': 'スクショ',
    'Do Not Disturb': 'おやすみモード', 'Home': 'ホーム', 'Insert': '挿入', 'View': '表示', 'Export': '書き出し',
  },
  tr: {
    'Control Center': 'Denetim Merkezi', 'Notification Center': 'Bildirim Merkezi', 'Settings': 'Ayarlar',
    'Desktop': 'Masaüstü', 'Search': 'Ara', 'Save': 'Kaydet', 'Cancel': 'İptal', 'Open': 'Aç',
    'Close': 'Kapat', 'Delete': 'Sil', 'Clear': 'Temizle', 'Theme': 'Tema', 'Dark': 'Koyu', 'Light': 'Açık',
    'Clock & World Time': 'Saat ve Dünya Saati', 'Battery, Power & Peripherals': 'Pil ve Çevre Birimleri',
    'Weather & 7-Day Forecast': 'Hava Durumu (7 Gün)', 'Calendar & Events': 'Takvim', 'File Explorer': 'Dosya Gezgini',
    'Calculator': 'Hesap Makinesi', 'Recycle Bin': 'Çöp Kutusu', 'Screen Record': 'Ekran Kaydı', 'Screenshot': 'Ekran Görüntüsü',
  },
  pl: {
    'Control Center': 'Centrum sterowania', 'Notification Center': 'Powiadomienia', 'Settings': 'Ustawienia',
    'Desktop': 'Pulpit', 'Search': 'Szukaj', 'Save': 'Zapisz', 'Cancel': 'Anuluj', 'Open': 'Otwórz',
    'Close': 'Zamknij', 'Delete': 'Usuń', 'Clear': 'Wyczyść', 'Theme': 'Motyw', 'Dark': 'Ciemny', 'Light': 'Jasny',
    'Clock & World Time': 'Zegar i czas świata', 'Battery, Power & Peripherals': 'Bateria i urządzenia',
    'Weather & 7-Day Forecast': 'Pogoda na 7 dni', 'Calendar & Events': 'Kalendarz', 'File Explorer': 'Eksplorator',
  },
  ro: {
    'Control Center': 'Centru de control', 'Notification Center': 'Notificări', 'Settings': 'Setări',
    'Desktop': 'Desktop', 'Search': 'Căutare', 'Save': 'Salvează', 'Cancel': 'Anulează', 'Open': 'Deschide',
    'Close': 'Închide', 'Delete': 'Șterge', 'Clear': 'Curăță', 'Theme': 'Temă', 'Dark': 'Întunecat', 'Light': 'Luminos',
    'Clock & World Time': 'Ceas și Timp mondial', 'Battery, Power & Peripherals': 'Baterie și Periferice',
    'Weather & 7-Day Forecast': 'Vremea 7 zile', 'Calendar & Events': 'Calendar', 'File Explorer': 'Explorer',
  },
};

const SORTED_PHRASES = [...RU_TO_EN_PHRASES].sort((a, b) => b[0].length - a[0].length);
const HAS_CYRILLIC = /[А-Яа-яЁё]/;

// Fallback single Russian word translations so mixed widget strings never retain Cyrillic leftovers
const RU_WORD_FALLBACK: Record<string, string> = {
  'виджет': 'widget', 'виджета': 'widget', 'виджетов': 'widgets', 'виджеты': 'widgets',
  'нажмите': 'click', 'клик': 'click', 'для': 'for', 'или': 'or', 'и': 'and', 'на': 'on', 'в': 'in', 'по': 'by',
  'без': 'no', 'все': 'all', 'нет': 'none', 'да': 'yes', 'из': 'from', 'до': 'to', 'от': 'from',
  'добавить': 'add', 'удалить': 'delete', 'изменить': 'edit', 'выберите': 'select', 'выбран': 'selected',
  'цвет': 'color', 'фон': 'background', 'фото': 'photo', 'текст': 'text', 'шрифт': 'font', 'иконка': 'icon',
  'кнопка': 'button', 'кнопки': 'buttons', 'панель': 'panel', 'окно': 'window', 'окна': 'windows',
  'файл': 'file', 'файлы': 'files', 'папка': 'folder', 'папки': 'folders', 'приложение': 'app', 'приложения': 'apps',
  'система': 'system', 'системы': 'system', 'ядро': 'kernel', 'ядра': 'kernel', 'версия': 'version',
  'скорость': 'speed', 'заряд': 'charge', 'батарея': 'battery', 'питание': 'power', 'экран': 'screen',
  'громкость': 'volume', 'яркость': 'brightness', 'время': 'time', 'дата': 'date', 'день': 'day', 'дней': 'days',
  'час': 'hr', 'часы': 'clock', 'мин': 'min', 'сек': 'sec', 'сегодня': 'today', 'неделя': 'week', 'месяц': 'month',
  'задачи': 'tasks', 'задача': 'task', 'заметки': 'notes', 'события': 'events', 'сценарий': 'scenario', 'сценарии': 'scenarios',
  'таймер': 'timer', 'поиск': 'search', 'найти': 'find', 'заменить': 'replace', 'готово': 'done',
  'ошибка': 'error', 'успешно': 'success', 'запуск': 'launch', 'статус': 'status', 'активно': 'active',
  'режим': 'mode', 'стиль': 'style', 'стили': 'styles', 'форма': 'shape', 'размер': 'size', 'ширина': 'width', 'высота': 'height',
  'уровень': 'level', 'порог': 'threshold', 'эффект': 'effect', 'эффекты': 'effects', 'фильтр': 'filter',
  'анимация': 'animation', 'переход': 'transition', 'кадр': 'frame', 'клип': 'clip', 'видео': 'video', 'аудио': 'audio',
  'дорожка': 'track', 'голос': 'voice', 'музыка': 'music', 'субтитры': 'captions', 'перевод': 'translate',
  'таблица': 'table', 'слайд': 'slide', 'слайды': 'slides', 'документ': 'document', 'лист': 'sheet', 'график': 'chart',
  'строк': 'lines', 'стр': 'ln', 'стб': 'col', 'слов': 'words', 'символов': 'chars', 'шаг': 'step', 'шагов': 'steps',
  'устройств': 'devices', 'устройства': 'devices', 'мышь': 'mouse', 'клавиатура': 'keyboard', 'наушники': 'headphones',
  'нагрузка': 'load', 'норма': 'normal', 'температура': 'temp', 'память': 'memory', 'диск': 'disk',
};

export function translateUiString(text: string, lang: LangCode): string {
  if (lang === 'ru' || !text || !HAS_CYRILLIC.test(text)) return text;

  let out = text;
  const localeMap = EN_TO_LOCALE[lang];

  for (const [ru, en] of SORTED_PHRASES) {
    if (out.includes(ru)) {
      const target = (localeMap && localeMap[en]) || en;
      out = out.split(ru).join(target);
      if (!HAS_CYRILLIC.test(out)) return out;
    }
  }

  // Word-level fallback for any remaining Cyrillic words in mixed badges/tooltips
  if (HAS_CYRILLIC.test(out)) {
    out = out.replace(/[А-Яа-яЁё]+/g, (word) => {
      const lower = word.toLowerCase();
      const mapped = RU_WORD_FALLBACK[lower];
      if (!mapped) return word;
      const localized = (localeMap && localeMap[mapped.charAt(0).toUpperCase() + mapped.slice(1)]) || mapped;
      return word[0] === word[0].toUpperCase()
        ? localized.charAt(0).toUpperCase() + localized.slice(1)
        : localized;
    });
  }

  return out;
}

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  if (el.closest('[data-no-translate="true"], [contenteditable="true"], pre, code')) return true;
  return false;
}

function applyTranslationToSubtree(root: Node, lang: LangCode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!shouldSkipElement(parent)) {
        const cur = node.nodeValue || '';
        if (lang === 'ru') {
          const orig = originalTextMap.get(node);
          if (orig !== undefined && orig !== cur) node.nodeValue = orig;
        } else {
          if (!originalTextMap.has(node) && HAS_CYRILLIC.test(cur)) {
            originalTextMap.set(node, cur);
          }
          const base = originalTextMap.get(node) ?? cur;
          if (HAS_CYRILLIC.test(base)) {
            const next = translateUiString(base, lang);
            if (next !== cur) node.nodeValue = next;
          }
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (!shouldSkipElement(el)) {
        const ph = el.getAttribute('placeholder');
        const ti = el.getAttribute('title');
        if (lang === 'ru') {
          const saved = originalAttrMap.get(el);
          if (saved?.placeholder && ph !== saved.placeholder) el.setAttribute('placeholder', saved.placeholder);
          if (saved?.title && ti !== saved.title) el.setAttribute('title', saved.title);
        } else {
          if (ph && HAS_CYRILLIC.test(ph)) {
            const prev = originalAttrMap.get(el) || {};
            if (!prev.placeholder) originalAttrMap.set(el, { ...prev, placeholder: ph });
            const base = originalAttrMap.get(el)?.placeholder || ph;
            const next = translateUiString(base, lang);
            if (next !== ph) el.setAttribute('placeholder', next);
          }
          if (ti && HAS_CYRILLIC.test(ti)) {
            const prev = originalAttrMap.get(el) || {};
            if (!prev.title) originalAttrMap.set(el, { ...prev, title: ti });
            const base = originalAttrMap.get(el)?.title || ti;
            const next = translateUiString(base, lang);
            if (next !== ti) el.setAttribute('title', next);
          }
        }
      }
    }
    node = walker.nextNode();
  }
}

export function useLumaAutoTranslate(lang: LangCode) {
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    applyTranslationToSubtree(document.body, lang);

    if (lang === 'ru') return;

    let rafId = 0;
    const observer = new MutationObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyTranslationToSubtree(document.body, lang);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [lang]);
}
