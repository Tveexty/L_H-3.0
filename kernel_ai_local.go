package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// LumaNano 1.2 — Built-in Autonomous Offline Local AI Engine for Luma OS 1.2.0 (Lithium).
// Runs 100% locally inside Go without external API keys or internet access:
// - Live PC diagnostics & optimization from LumaCore 1.2 telemetry
// - Lightweight code snippets (Python, JS/TS, HTML/CSS, Go, PowerShell, Bash, SQL, C#)
// - Math evaluation, password/UUID/SHA-256 generators, JSON validation, unit conversion
// - Luma OS system help & runnable commands

func RunLumaLocalAI(messages []AIChatMessage, kernel *LumaKernel) map[string]interface{} {
	if len(messages) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	prompt := strings.TrimSpace(messages[len(messages)-1].Content)
	low := strings.ToLower(prompt)

	// Detect basic language preference (English vs Russian)
	isEnglish := false
	asciiLetters, cyrLetters := 0, 0
	for _, r := range prompt {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			asciiLetters++
		} else if (r >= 'а' && r <= 'я') || (r >= 'А' && r <= 'Я') || r == 'ё' || r == 'Ё' {
			cyrLetters++
		}
	}
	if asciiLetters > cyrLetters*2 && cyrLetters == 0 {
		isEnglish = true
	}

	reply := generateOfflineAIReply(prompt, low, isEnglish, kernel)
	return map[string]interface{}{
		"ok":       true,
		"reply":    reply,
		"provider": "luma_local",
		"model":    "LumaNano-1.2-Offline",
	}
}

func generateOfflineAIReply(prompt, low string, isEn bool, kernel *LumaKernel) string {
	// 1. Live System Diagnostics / PC Specs / Battery / Optimization
	if containsAny(low, "нагрузк", "процессор", "cpu", "память", "ram", "озу", "диск", "систему", "пк", "комп", "диагност", "оптимиз", "батаре", "battery", "system", "specs", "hardware", "health", "тормоз") {
		if kernel != nil {
			s := kernel.SystemSnapshot()
			bat := kernel.probe.GetBatteryDetails()
			var tips []string
			if s.RAMPercent >= 80 {
				tips = append(tips, "• ОЗУ загружено выше 80% — откройте **Диспетчер задач** и закройте тяжёлые вкладки браузера/фоновые процессы.")
			} else {
				tips = append(tips, "• Загрузка ОЗУ в норме — достаточно запаса для многозадачности.")
			}
			if s.CPUPercent >= 75 {
				tips = append(tips, "• Высокая загрузка ЦП — проверьте топ процессов командой `top` в Терминале.")
			}
			if bat.Present {
				tips = append(tips, fmt.Sprintf("• Батарея: **%d%%** (здоровье **%d%%**, циклов: **%d**, %s).", bat.Percent, bat.HealthPercent, bat.CycleCount, bat.StatusText))
			}
			tips = append(tips, "• Для быстрой очистки кэша можно выполнить проверку в **Службы -> Очистка** или команду PowerShell ниже.")

			return fmt.Sprintf(
				"### Живая диагностика ПК (LumaCore 1.2 · Автономно)\n\n"+
					"- **Устройство:** `%s` (`%s`)\n"+
					"- **ОС:** %s (`%s`)\n"+
					"- **ЦП (CPU):** %s — **%d%%** (%d потоков)\n"+
					"- **ОЗУ (RAM):** **%.1f / %.1f ГБ (%d%%)**\n"+
					"- **GPU:** %s (~%d%%, %d°C)\n"+
					"- **Сеть:** ↓ %.1f / ↑ %.1f Мбит/с · Регион: %s\n\n"+
					"**Рекомендации:**\n%s\n\n"+
					"Быстрая команда проверки топ-процессов:\n```powershell\nGet-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 Name, Id, @{N='MB';E={[math]::Round($_.WorkingSet64/1MB,1)}}\n```",
				s.Hostname, s.DeviceModel, s.OSName, s.Arch,
				s.CPUModel, s.CPUPercent, s.CPUCores,
				s.RAMUsedGB, s.RAMTotalGB, s.RAMPercent,
				s.GPUName, s.GPUPercent, s.GPUTempC,
				s.NetDownMbps, s.NetUpMbps, s.Location.City,
				strings.Join(tips, "\n"),
			)
		}
	}

	// 2. Password / UUID / Hash Generators
	if containsAny(low, "парол", "password", "uuid", "guid", "токен", "token", "хеш", "sha256", "sha-256") {
		if containsAny(low, "uuid", "guid") {
			b := make([]byte, 16)
			_, _ = rand.Read(b)
			b[6] = (b[6] & 0x0f) | 0x40
			b[8] = (b[8] & 0x3f) | 0x80
			uuid := fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
			return fmt.Sprintf("Сгенерированный UUID v4:\n```text\n%s\n```", uuid)
		}
		if containsAny(low, "sha256", "sha-256", "хеш", "hash") {
			sum := sha256.Sum256([]byte(prompt))
			return fmt.Sprintf("SHA-256 от вашего текста:\n```text\n%s\n```", hex.EncodeToString(sum[:]))
		}
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*"
		b := make([]byte, 18)
		_, _ = rand.Read(b)
		var pw strings.Builder
		for _, v := range b {
			pw.WriteByte(alphabet[int(v)%len(alphabet)])
		}
		return fmt.Sprintf("Надёжный локальный пароль (18 символов, криптостойкий RNG):\n```text\n%s\n```", pw.String())
	}

	// 3. Date / Time
	if containsAny(low, "время", "который час", "дата", "сегодня", "what time", "today date", "какой день") && !containsAny(low, "код", "code", "python", "js", "script") {
		now := time.Now()
		return fmt.Sprintf("Текущее системное время: **%s** · Дата: **%s** (%s).", now.Format("15:04:05"), now.Format("02.01.2006"), now.Weekday().String())
	}

	// 4. Quick Math Evaluation (e.g. "сколько будет 245 * 18", "calc (12+8)/4", "2^10")
	if expr, val, ok := tryEvalSimpleMath(prompt); ok {
		return fmt.Sprintf("Результат вычисления:\n`%s` = **%s**", expr, formatFloatClean(val))
	}

	// 5. JSON Validator / Pretty Printer
	if idx := strings.IndexAny(prompt, "{["); idx >= 0 && (strings.Contains(prompt, "}") || strings.Contains(prompt, "]")) {
		cand := strings.TrimSpace(prompt[idx:])
		var v interface{}
		if json.Unmarshal([]byte(cand), &v) == nil {
			pretty, _ := json.MarshalIndent(v, "", "  ")
			return fmt.Sprintf("JSON корректен! Отформатированный вид:\n```json\n%s\n```", string(pretty))
		}
	}

	// 6. Lightweight Code Generation (Python / JS / TS / HTML / CSS / PowerShell / Bash / Go / SQL / C#)
	if codeReply, matched := generateLightweightCode(prompt, low); matched {
		return codeReply
	}

	// 7. Luma OS Tips & Shortcuts
	if containsAny(low, "luma", "горяч", "клавиш", "hotkey", "помощ", "help", "умеешь", "что ты можешь", "what can you do") {
		return "### Автономный Luma AI (`LumaNano 1.2`)\n\n" +
			"Я работаю **локально без API-ключей и без интернета**, прямо внутри ядра `LumaCore 1.2`:\n\n" +
			"1. **Анализ и оптимизация ПК** — напишите *«Проанализируй мой ПК»* или *«Состояние батареи»*\n" +
			"2. **Лёгкий код и скрипты** — Python, JavaScript/TypeScript, HTML/CSS, Go, PowerShell, Bash, SQL, C# (*«напиши парсер / сервер / сортировку / таймер / очистку temp / кнопку на html»*)\n" +
			"3. **Математика и утилиты** — вычисления (`(125*8)+45`), генератор паролей, `UUID`, `SHA-256`, проверка и форматирование `JSON`\n" +
			"4. **Голосовой ввод** — нажмите на иконку микрофона внизу, чтобы диктовать запросы голосом!\n\n" +
			"А если понадобятся тяжёлые облачные модели, переключите провайдер сверху на **Google Gemini**, **OpenAI**, **Claude**, **DeepSeek** или локальную **Ollama**."
	}

	// 8. Conversational Greetings / Fallback
	if containsAny(low, "привет", "здравств", "хай", "hello", "hi", "hey", "салют", "добрый") {
		if isEn {
			return "Hello! I'm **Luma AI (Offline Mode)** running inside Luma OS 1.2.0 (Lithium). Ask me to inspect your PC telemetry, write lightweight code (Python/JS/HTML/PowerShell/Go/SQL), calculate math, generate passwords/UUIDs, or switch to Gemini/OpenAI anytime in settings!"
		}
		return "Привет! Я автономный **Luma AI (`LumaNano 1.2`)** — работаю локально прямо в Luma OS 1.2.0 (Lithium) без сторонних API.\n\nПопробуйте спросить:\n- *«Проанализируй нагрузку моего ПК»*\n- *«Напиши простой HTTP сервер на Python»*\n- *«Напиши PowerShell скрипт очистки временных файлов»*\n- *«Сгенерируй надёжный пароль»* или *«Посчитай 1440 * 900»*"
	}

	// Helpful smart summary for general prompt
	words := len(strings.Fields(prompt))
	if isEn {
		return fmt.Sprintf("I received your request (%d words) in **Offline LumaNano 1.2** mode.\n\nFor best offline results, ask for:\n- **Code** (mention Python, JS, HTML, CSS, PowerShell, Bash, Go, SQL, or C# + task like server, sort, timer, fetch, cleanup, button)\n- **System diagnostics** (CPU, RAM, battery, optimization)\n- **Math, JSON formatting, passwords, or UUIDs**\n\nFor deep open-ended conversations, switch provider to **Google Gemini**, **OpenAI**, **Claude**, or local **Ollama** in Model Settings.", words)
	}
	return fmt.Sprintf("Запрос принят (%d слов) в автономном режиме **LumaNano 1.2** (без внешних API).\n\nВ локальном режиме я лучше всего решаю:\n- **Лёгкий код** — укажите язык (`Python`, `JS`, `HTML`, `CSS`, `Go`, `PowerShell`, `Bash`, `SQL`, `C#`) и задачу (*сервер, таймер, сортировка, запрос API, работа с файлами, очистка temp, форма, калькулятор*)\n- **Диагностику ПК и батареи** — *«проверь мой ПК»*, *«оптимизация»*\n- **Вычисления и утилиты** — формулы, пароли, UUID, SHA-256, форматирование JSON\n\nДля сложных диалогов в 1 клик можно подключить **Gemini**, **OpenAI**, **Claude** или локальную **Ollama** в «Настройки модели».", words)
}

func generateLightweightCode(prompt, low string) (string, bool) {
	wantsCode := containsAny(low, "код", "напиши", "скрипт", "функц", "пример", "code", "script", "function", "python", "javascript", "typescript", "html", "css", "powershell", "bash", "sql", "golang", "c#", "react", "сервер", "парсер", "таймер", "сортиров", "калькулятор", "очистк", "бэкап", "backup")
	if !wantsCode {
		return "", false
	}

	// PowerShell / Temp cleanup / Backup
	if containsAny(low, "очист", "temp", "временн", "cleanup", "powershell", "ps1") {
		if containsAny(low, "бэкап", "backup", "копир") {
			return "Скрипт быстрого бэкапа папки с датой (PowerShell):\n```powershell\n$src = \"$env:USERPROFILE\\Documents\\Projects\"\n$dst = \"$env:USERPROFILE\\Desktop\\Backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm')\"\nCopy-Item -Path $src -Destination $dst -Recurse -Force\nWrite-Host \"Бэкап готов: $dst\" -ForegroundColor Green\n```", true
		}
		return "Безопасная очистка временных файлов Windows (PowerShell):\n```powershell\n$before = (Get-ChildItem $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum\nGet-ChildItem $env:TEMP -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue\nWrite-Host (\"Очищено примерно {0:N1} МБ\" -f ($before / 1MB)) -ForegroundColor Cyan\n```", true
	}

	// Bash / Linux
	if containsAny(low, "bash", "linux", "shell", "sh ") {
		return "Аккуратный Bash-скрипт мониторинга и архивации:\n```bash\n#!/usr/bin/env bash\nset -euo pipefail\necho \"Host: $(hostname) | Uptime: $(uptime -p)\"\ndf -h / | tail -n 1\ntar -czf \"backup_$(date +%Y%m%d).tar.gz\" ./projects 2>/dev/null || true\n```", true
	}

	// HTML / CSS UI Card / Button / Page
	if containsAny(low, "html", "css", "кнопк", "карточк", "страниц", "сайт", "верстк", "landing") {
		return "Минималистичная стеклянная карточка в стиле Luma OS (HTML + CSS):\n```html\n<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\" />\n<style>\n  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#09090d; color:#f4f4f5; font-family:system-ui,sans-serif; }\n  .card { padding:28px; width:320px; border-radius:22px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); backdrop-filter:blur(16px); }\n  button { margin-top:16px; width:100%; padding:10px 16px; border:0; border-radius:12px; background:#14b8a6; color:#042f2e; font-weight:700; cursor:pointer; }\n</style>\n</head>\n<body>\n  <div class=\"card\">\n    <h2>Luma Lithium Card</h2>\n    <p>Чистый компонент без лишних зависимостей.</p>\n    <button onclick=\"alert('Готово!')\">Запустить</button>\n  </div>\n</body>\n</html>\n```", true
	}

	// SQL
	if containsAny(low, "sql", "таблиц", "запрос бд", "select ", "postgres", "sqlite") {
		return "Пример чистого SQL-запроса (создание таблицы и аналитика):\n```sql\nCREATE TABLE IF NOT EXISTS tasks (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT NOT NULL,\n  done INTEGER DEFAULT 0,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n\nSELECT done, COUNT(*) AS total\nFROM tasks\nGROUP BY done;\n```", true
	}

	// Go
	if containsAny(low, "golang", "на go", " go ", "go сервер", "go http") {
		return "Минимальный HTTP-сервер на Go (стандартная библиотека):\n```go\npackage main\n\nimport (\n\t\"encoding/json\"\n\t\"log\"\n\t\"net/http\"\n)\n\nfunc main() {\n\thttp.HandleFunc(\"/api/ping\", func(w http.ResponseWriter, r *http.Request) {\n\t\tw.Header().Set(\"Content-Type\", \"application/json\")\n\t\t_ = json.NewEncoder(w).Encode(map[string]any{\"ok\": true, \"os\": \"Luma Lithium\"})\n\t})\n\tlog.Println(\"Listening on http://127.0.0.1:8080\")\n\tlog.Fatal(http.ListenAndServe(\"127.0.0.1:8080\", nil))\n}\n```", true
	}

	// C#
	if containsAny(low, "c#", "csharp", ".net") {
		return "Лёгкий пример на C# (.NET 8):\n```csharp\nusing System;\nusing System.Linq;\n\nvar numbers = new[] { 12, 5, 29, 3, 18 };\nvar sorted = numbers.OrderBy(n => n).ToArray();\nConsole.WriteLine(\"Отсортировано: \" + string.Join(\", \", sorted));\n```", true
	}

	// JavaScript / TypeScript / React
	if containsAny(low, "javascript", "typescript", " js", " ts", "react", "fetch", "таймер", "timer") {
		if containsAny(low, "таймер", "timer", "секундомер") {
			return "Простой таймер обратного отсчёта на JavaScript:\n```javascript\nfunction startTimer(seconds) {\n  let left = seconds;\n  const id = setInterval(() => {\n    console.log(`Осталось: ${left} сек.`);\n    if (--left < 0) {\n      clearInterval(id);\n      console.log('Время вышло!');\n    }\n  }, 1000);\n}\nstartTimer(10);\n```", true
		}
		if containsAny(low, "react", "компонент") {
			return "Лёгкий React-компонент счётчика (TypeScript):\n```tsx\nimport { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount((c) => c + 1)}>\n      Кликов: {count}\n    </button>\n  );\n}\n```", true
		}
		return "Асинхронный запрос JSON API на JavaScript (ES2024):\n```javascript\nasync function fetchJson(url) {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error(`HTTP ${res.status}`);\n  return await res.json();\n}\n\nfetchJson('https://api.github.com/repos/Tveexty/L_H-3.0')\n  .then((repo) => console.log(repo.full_name, '★', repo.stargazers_count))\n  .catch(console.error);\n```", true
	}

	// Python (default for general lightweight code requests!)
	if containsAny(low, "сервер", "server", "http", "api") {
		return "Быстрый локальный HTTP-сервер на Python (без сторонних библиотек):\n```python\nfrom http.server import HTTPServer, SimpleHTTPRequestHandler\n\nPORT = 8000\nprint(f'Сервер запущен: http://127.0.0.1:{PORT}')\nHTTPServer(('127.0.0.1', PORT), SimpleHTTPRequestHandler).serve_forever()\n```", true
	}
	if containsAny(low, "сортиров", "sort", "быстр", "quicksort") {
		return "Чистая быстрая сортировка (QuickSort) на Python:\n```python\ndef quicksort(arr: list[int]) -> list[int]:\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + mid + quicksort(right)\n\nprint(quicksort([42, 7, 19, 3, 25, 11]))\n```", true
	}
	if containsAny(low, "файл", "file", "чита", "запис", "json") {
		return "Чтение и сохранение JSON-файла на Python:\n```python\nimport json\nfrom pathlib import Path\n\ndata = {'os': 'Luma OS 1.2.0', 'codename': 'Lithium', 'items': [1, 2, 3]}\npath = Path('luma_data.json')\npath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')\nloaded = json.loads(path.read_text(encoding='utf-8'))\nprint('Прочитано:', loaded)\n```", true
	}
	if containsAny(low, "калькулятор", "calc") {
		return "Компактный консольный калькулятор на Python:\n```python\nwhile True:\n    expr = input('Введите выражение (или exit): ').strip()\n    if expr.lower() in ('exit', 'q'):\n        break\n    try:\n        allowed = set('0123456789+-*/(). %')\n        if not set(expr).issubset(allowed):\n            raise ValueError('Недопустимые символы')\n        print('=', eval(expr, {'__builtins__': {}}))\n    except Exception as e:\n        print('Ошибка:', e)\n```", true
	}

	return fmt.Sprintf("Базовый рабочий шаблон на Python (ОС: %s):\n```python\nfrom datetime import datetime\n\ndef main() -> None:\n    now = datetime.now().strftime('%%H:%%M:%%S')\n    print(f'[{now}] Задача выполнена успешно!')\n\nif __name__ == '__main__':\n    main()\n```\nУточните язык (`Python`, `JS`, `HTML`, `Go`, `PowerShell`, `SQL`) и задачу — я сгенерирую более точный код локально.", runtime.GOOS), true
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

var mathExprRe = regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?(?:\s*[\+\-\*\/\^×÷]\s*[0-9]+(?:\.[0-9]+)?)+)`)

func tryEvalSimpleMath(prompt string) (string, float64, bool) {
	m := mathExprRe.FindString(prompt)
	if m == "" {
		return "", 0, false
	}
	clean := strings.ReplaceAll(strings.ReplaceAll(m, "×", "*"), "÷", "/")
	tokens := regexp.MustCompile(`[0-9]+(?:\.[0-9]+)?|[\+\-\*\/\^]`).FindAllString(clean, -1)
	if len(tokens) < 3 || len(tokens)%2 == 0 {
		return "", 0, false
	}
	nums := make([]float64, 0, len(tokens)/2+1)
	ops := make([]string, 0, len(tokens)/2)
	for i, tok := range tokens {
		if i%2 == 0 {
			v, err := strconv.ParseFloat(tok, 64)
			if err != nil {
				return "", 0, false
			}
			nums = append(nums, v)
		} else {
			ops = append(ops, tok)
		}
	}
	// Pass 1: ^
	for i := 0; i < len(ops); {
		if ops[i] == "^" {
			nums[i] = math.Pow(nums[i], nums[i+1])
			nums = append(nums[:i+1], nums[i+2:]...)
			ops = append(ops[:i], ops[i+1:]...)
		} else {
			i++
		}
	}
	// Pass 2: * /
	for i := 0; i < len(ops); {
		if ops[i] == "*" || ops[i] == "/" {
			if ops[i] == "*" {
				nums[i] = nums[i] * nums[i+1]
			} else {
				if nums[i+1] == 0 {
					return "", 0, false
				}
				nums[i] = nums[i] / nums[i+1]
			}
			nums = append(nums[:i+1], nums[i+2:]...)
			ops = append(ops[:i], ops[i+1:]...)
		} else {
			i++
		}
	}
	// Pass 3: + -
	res := nums[0]
	for i, op := range ops {
		if op == "+" {
			res += nums[i+1]
		} else if op == "-" {
			res -= nums[i+1]
		}
	}
	if math.IsNaN(res) || math.IsInf(res, 0) {
		return "", 0, false
	}
	return strings.TrimSpace(m), res, true
}

func formatFloatClean(v float64) string {
	if math.Abs(v-math.Round(v)) < 1e-9 {
		return strconv.FormatInt(int64(math.Round(v)), 10)
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.6f", v), "0"), ".")
}
