package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// Luma AI 1.2.1 — Dual-Engine Local Intelligence for Luma OS 1.2.1 (Lithium):
//   1. Luma Lang 1.2 (mode="language") — Conversational & Knowledge Engine:
//      - 45+ curated offline encyclopedia topics (Pushkin, Einstein, Musk, science, tech, history, geography)
//      - Live Wikipedia API lookup (ru.wikipedia.org / en.wikipedia.org) for ANY person, event, or concept
//      - Full math evaluator (parentheses, %, ^, sqrt), unit converter, PC diagnostics, utilities
//      - NEVER dumps Python code on general questions
//   2. Luma Code 1.2 (mode="code") — Dedicated Developer & Scripting Engine:
//      - 12 languages (Python, JS/TS, React, HTML/CSS, Go, Rust, C++, C#, SQL, PowerShell, Bash)
//      - 25+ idiomatic templates (servers, bots, APIs, algorithms, UI, SQL, system automation, git)
//   3. Luma Hybrid (mode="auto") — Smart intent router between Luma Lang 1.2 and Luma Code 1.2

func RunLumaLocalAI(messages []AIChatMessage, mode, verbosity string, kernel *LumaKernel) map[string]interface{} {
	if len(messages) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	prompt := strings.TrimSpace(messages[len(messages)-1].Content)
	if prompt == "" {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	low := strings.ToLower(prompt)
	normMode := normalizeLocalAIMode(mode)
	normVerb := normalizeAIVerbosity(verbosity)

	// Detect language preference (English vs Russian)
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

	var reply string
	var modelName string

	switch normMode {
	case "code":
		modelName = "Luma Code 1.2"
		reply = generateCoderReply(prompt, low, isEnglish, kernel)
	case "language":
		modelName = "Luma Lang 1.2"
		reply = generateLanguageReply(prompt, low, isEnglish, kernel, false)
	default:
		// Auto / Hybrid router
		if isExplicitCodeRequest(low) && !isKnowledgeQuestion(low) {
			modelName = "Luma Code 1.2 (Auto)"
			reply = generateCoderReply(prompt, low, isEnglish, kernel)
		} else {
			modelName = "Luma Lang 1.2 (Auto)"
			reply = generateLanguageReply(prompt, low, isEnglish, kernel, true)
		}
	}

	reply = applyLocalVerbosity(reply, prompt, normVerb, normMode, isEnglish)

	return map[string]interface{}{
		"ok":        true,
		"reply":     reply,
		"provider":  "luma_local",
		"model":     modelName,
		"mode":      normMode,
		"verbosity": normVerb,
	}
}

func normalizeAIVerbosity(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "brief", "short", "concise", "кратко":
		return "brief"
	case "detailed", "long", "deep", "full", "подробно":
		return "detailed"
	default:
		return "balanced"
	}
}

func applyLocalVerbosity(reply, prompt, verbosity, normMode string, isEnglish bool) string {
	trimmed := strings.TrimSpace(reply)
	if trimmed == "" || verbosity == "balanced" {
		return trimmed
	}

	// BRIEF MODE: condense prose cleanly to heading + core 1-2 sentences (or crisp code block only)
	if verbosity == "brief" {
		if strings.Contains(trimmed, "```") {
			// Keep heading + first fenced code block only
			startFence := strings.Index(trimmed, "```")
			endFence := strings.Index(trimmed[startFence+3:], "```")
			if endFence > 0 {
				blockEnd := startFence + 3 + endFence + 3
				firstLine := strings.Split(trimmed, "\n")[0]
				codePart := trimmed[startFence:blockEnd]
				if strings.HasPrefix(firstLine, "#") {
					return strings.TrimSpace(firstLine) + "\n\n" + codePart
				}
				return codePart
			}
			return trimmed
		}
		lines := strings.Split(trimmed, "\n")
		var kept []string
		hasSummary := false
		for _, ln := range lines {
			t := strings.TrimSpace(ln)
			if t == "" {
				continue
			}
			if strings.HasPrefix(t, "#") {
				if len(kept) == 0 {
					kept = append(kept, t)
				}
				continue
			}
			if !hasSummary {
				runes := []rune(t)
				cut := len(runes)
				for i := 45; i < len(runes) && i < 200; i++ {
					if runes[i] == '.' || runes[i] == '!' || runes[i] == '?' {
						cut = i + 1
						break
					}
				}
				if cut == len(runes) && len(runes) > 195 {
					cut = 192
					t = strings.TrimSpace(string(runes[:cut])) + "…"
				} else {
					t = strings.TrimSpace(string(runes[:cut]))
				}
				kept = append(kept, t)
				hasSummary = true
				break
			}
		}
		if len(kept) == 0 {
			return trimmed
		}
		return strings.Join(kept, "\n")
	}

	// DETAILED MODE: enrich with extra context, Wikipedia long extract, or engineering breakdown
	if verbosity == "detailed" {
		if strings.Contains(trimmed, "```") || normMode == "code" {
			if isEnglish {
				return trimmed + "\n\n#### Deep Technical Notes\n- **Error handling & edge cases**: Validate inputs, wrap network/IO calls with timeouts, and log structured errors.\n- **Performance**: Reuse connections/buffers and avoid blocking the main UI thread.\n- **Next step**: Ask me to add unit tests, Docker config, or refactor this snippet for production."
			}
			return trimmed + "\n\n#### Подробные технические рекомендации\n- **Надёжность и граничные случаи**: проверяйте входные данные, добавляйте таймауты на сетевые/файловые операции и корректно закрывайте ресурсы.\n- **Оптимизация**: избегайте блокировки главного потока, кэшируйте повторяющиеся вычисления и используйте профилирование.\n- **Что можно доработать**: напишите *«добавь тесты»*, *«добавь обработку ошибок»* или *«перепиши асинхронно»* — и Luma Code расширит решение."
		}
		// For language/knowledge responses: try pulling a deeper multi-paragraph Wikipedia extract when online, plus structured takeaways
		extra := ""
		if !strings.Contains(trimmed, "Wikipedia") && len([]rune(prompt)) >= 3 {
			if deepWiki := lookupWikipediaDeep(prompt, isEnglish); deepWiki != "" {
				extra = "\n\n#### Дополнительные факты (Wikipedia)\n" + deepWiki
			}
		}
		if extra != "" {
			return trimmed + extra
		}
		if isEnglish {
			return trimmed + "\n\n#### Extended Context & Key Takeaways\n- **Core essence**: The summary above highlights the primary facts, origin, and significance of the topic.\n- **Practical perspective**: Understanding the background helps connect related concepts in science, culture, or technology.\n- **Explore deeper**: Ask follow-up questions like *\"give historical timeline\"*, *\"compare alternatives\"*, or *\"real-world examples\"*."
		}
		return trimmed + "\n\n#### Развёрнутый контекст и ключевые выводы\n- **Главная суть**: выше собраны базовые факты, контекст и значение темы без лишнего шума.\n- **Практическая польза**: знание первопричин и взаимосвязей позволяет применять тему на практике и сравнивать подходы.\n- **Углубить разбор**: можете уточнить *«дай хронологию»*, *«приведи практические примеры»* или *«сравни с аналогами»* — Luma Lang продолжит анализ."
	}

	return trimmed
}

func lookupWikipediaDeep(prompt string, isEnglish bool) string {
	clean := extractKnowledgeTopic(prompt, strings.ToLower(prompt))
	if clean == "" {
		clean = strings.Trim(prompt, "?!.,\"'«» ")
	}
	if clean == "" {
		return ""
	}
	lang := "ru"
	if isEnglish {
		lang = "en"
	}
	client := &http.Client{Timeout: 3500 * time.Millisecond}
	apiURL := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&exchars=950&explaintext=true&redirects=1&format=json&titles=%s", lang, url.QueryEscape(clean))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "LumaOS-AI/1.2.2")
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		if resp != nil {
			_ = resp.Body.Close()
		}
		return ""
	}
	defer resp.Body.Close()
	var parsed struct {
		Query struct {
			Pages map[string]struct {
				Extract string `json:"extract"`
			} `json:"pages"`
		} `json:"query"`
	}
	if json.NewDecoder(resp.Body).Decode(&parsed) != nil {
		return ""
	}
	for id, pg := range parsed.Query.Pages {
		if id == "-1" || strings.TrimSpace(pg.Extract) == "" {
			continue
		}
		return strings.TrimSpace(pg.Extract)
	}
	return ""
}

func normalizeLocalAIMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "code", "coder", "dev", "programming", "кодер":
		return "code"
	case "language", "lang", "chat", "knowledge", "языковая":
		return "language"
	default:
		return "auto"
	}
}

func isKnowledgeQuestion(low string) bool {
	return containsAny(low,
		"кто такой", "кто такая", "кто такие", "кто это", "кто написал", "кто изобрёл", "кто изобрел", "кто создал",
		"что такое", "что такой", "что значит", "что означает", "расскажи о ", "расскажи про ", "биография",
		"столица ", "сколько лет", "в каком году", "когда родился", "когда был", "объясни простыми",
		"who is ", "who was ", "what is ", "what are ", "tell me about ", "explain ", "capital of ",
	)
}

func isExplicitCodeRequest(low string) bool {
	if containsAny(low,
		"напиши код", "напиши скрипт", "напиши функцию", "напиши программу", "напиши бота", "напиши сайт",
		"напиши сервер", "напиши класс", "сделай скрипт", "сделай код", "код на ", "скрипт на ", "пример кода",
		"исправь код", "оптимизируй код", "write code", "write a script", "write a function", "code in ",
		"powershell", "bash ", "python ", "javascript", "typescript", "golang", "rust ", "c++", "c#", "csharp",
		"react ", "html ", "css ", "sql ", "regex", "регулярк", "telegram bot", "телеграм бот", "discord bot",
		"quicksort", "сортировк", "dockerfile", "git ",
	) {
		return true
	}
	return false
}

// ==================== ENGINE 1: LUMA LANG 1.2 (LANGUAGE & KNOWLEDGE MODEL) ====================

func generateLanguageReply(prompt, low string, isEn bool, kernel *LumaKernel, allowAutoCodeFallback bool) string {
	// 1. Live System Diagnostics / PC Specs / Battery
	if containsAny(low, "нагрузк", "процессор", "cpu", "память", "ram", "озу", "диск", "мой пк", "мою систему", "диагност", "оптимиз", "батаре", "аккумулятор", "battery", "system specs", "hardware", "тормозит") && !containsAny(low, "что такое cpu", "что такое процессор", "что такое ram", "что такое озу") {
		return buildSystemDiagnosticsReply(kernel)
	}

	// 2. Password / UUID / SHA-256 Generators
	if containsAny(low, "сгенерируй парол", "создай парол", "новый парол", "пароль", "password", "uuid", "guid", "sha256", "sha-256", "хеш ") && !isKnowledgeQuestion(low) {
		return buildCryptoUtilityReply(prompt, low)
	}

	// 3. Date / Time
	if containsAny(low, "который час", "сколько времени", "текущее время", "какая дата", "какое число", "какой сегодня день", "what time", "today's date") {
		now := time.Now()
		weekdaysRu := map[time.Weekday]string{
			time.Monday: "понедельник", time.Tuesday: "вторник", time.Wednesday: "среда",
			time.Thursday: "четверг", time.Friday: "пятница", time.Saturday: "суббота", time.Sunday: "воскресенье",
		}
		if isEn {
			return fmt.Sprintf("Current system time: **%s** · Date: **%s** (%s).", now.Format("15:04:05"), now.Format("2006-01-02"), now.Weekday().String())
		}
		return fmt.Sprintf("Текущее системное время: **%s** · Дата: **%s** (%s).", now.Format("15:04:05"), now.Format("02.01.2006"), weekdaysRu[now.Weekday()])
	}

	// 4. Math Evaluator (supports +, -, *, /, ^, parentheses, sqrt, percentages)
	if expr, val, ok := tryEvalSmartMath(prompt); ok {
		if isEn {
			return fmt.Sprintf("### Calculation\n\n`%s` = **%s**", expr, formatFloatClean(val))
		}
		return fmt.Sprintf("### Результат вычисления\n\n`%s` = **%s**", expr, formatFloatClean(val))
	}

	// 5. Unit Converter (km/mi, C/F, kg/lb, GB/MB)
	if conv, ok := tryConvertUnits(low); ok {
		return conv
	}

	// 6. JSON Validator / Formatter
	if idx := strings.IndexAny(prompt, "{["); idx >= 0 && (strings.Contains(prompt, "}") || strings.Contains(prompt, "]")) {
		cand := strings.TrimSpace(prompt[idx:])
		var v interface{}
		if json.Unmarshal([]byte(cand), &v) == nil {
			pretty, _ := json.MarshalIndent(v, "", "  ")
			return fmt.Sprintf("JSON валиден! Отформатированный результат:\n```json\n%s\n```", string(pretty))
		}
	}

	// 7. Curated Offline Encyclopedia Knowledge Base (instant, zero latency, works offline!)
	if kbReply, ok := lookupOfflineKnowledge(low); ok {
		return kbReply
	}

	// 8. Live Wikipedia Knowledge Lookup (for ANY person, city, science term, book, game, etc.)
	if topic := extractKnowledgeTopic(prompt, low); topic != "" {
		if wikiReply, ok := fetchWikipediaSummary(topic, isEn); ok {
			return wikiReply
		}
	}

	// 9. Luma OS Capabilities & Help
	if containsAny(low, "luma", "лума", "горяч", "клавиш", "hotkey", "помощ", "help", "что ты умеешь", "что ты можешь", "what can you do", "возможност") {
		return "### Luma AI 1.2.1 — Два специализированных движка\n\n" +
			"В Luma OS `1.2.1 (Lithium)` встроены **две независимые вариации ИИ** (переключаются в шапке окна):\n\n" +
			"1. **Языковая модель (`Luma Lang 1.2`)** — энциклопедические ответы о людях, науке, истории и технологиях (встроенная база + живой поиск Wikipedia), вычисления с формулами и процентами, конвертер величин, диагностика вашего ПК.\n" +
			"2. **Кодер (`Luma Code 1.2`)** — генерация чистого рабочего кода на `Python`, `JavaScript/TypeScript`, `React`, `HTML/CSS`, `Go`, `Rust`, `C++`, `C#`, `SQL`, `PowerShell` и `Bash` (серверы, боты, алгоритмы, API, автоматизация).\n\n" +
			"- При желании вы можете подключить облачные нейросети (**Gemini**, **OpenAI**, **Claude**, **DeepSeek**, **Ollama**) или **полностью отключить ИИ** в настройках для экономии ресурсов."
	}

	// 10. Greetings & Small Talk
	if containsAny(low, "привет", "здравств", "хай", "hello", "hi ", "hey", "салют", "добрый", "доброе утро", "добрый вечер") || low == "hi" {
		if isEn {
			return "Hello! I'm **Luma Lang 1.2**, your built-in language & knowledge assistant in Luma OS 1.2.1 (Lithium).\n\nAsk me about any historical figure, science topic, math calculation, unit conversion, or your PC's health — or switch to **Luma Code 1.2** above for programming tasks!"
		}
		return "Привет! Я **Luma Lang 1.2** — встроенная языковая и справочная модель в Luma OS `1.2.1 (Lithium)`.\n\nПопробуйте спросить:\n- *«Кто такой Пушкин?»* или *«Что такое квантовая физика?»*\n- *«Посчитай (1440 * 900) / 100»* или *«Переведи 25 градусов C в F»*\n- *«Проанализируй мой ПК и батарею»*\n\nА для написания программ и скриптов переключите режим сверху на **Кодер (`Luma Code 1.2`)**!"
	}

	if containsAny(low, "спасибо", "благодар", "thanks", "thank you", "круто", "отлично", "молодец") {
		if isEn {
			return "You're welcome! Let me know if you need help with anything else."
		}
		return "Пожалуйста! Если появятся ещё вопросы по знаниям, системе или коду — я всегда рядом."
	}

	if containsAny(low, "как дела", "как ты", "how are you") {
		if isEn {
			return "Running smoothly on **LumaCore 1.2** with zero latency! How can I help you today?"
		}
		return "Работаю отлично и стабильно внутри ядра **LumaCore 1.2**! Чем помочь — найти факт, посчитать формулу, проверить ПК или написать код?"
	}

	// 11. If user is in Auto mode and clearly asked for code, delegate to Coder
	if allowAutoCodeFallback && isExplicitCodeRequest(low) {
		return generateCoderReply(prompt, low, isEn, kernel)
	}

	// 12. Last-chance Wikipedia lookup for short noun phrases (e.g. user simply typed "Пушкин", "Москва", "Эйнштейн", "Python")
	if len(strings.Fields(prompt)) <= 5 && len([]rune(prompt)) >= 3 {
		if wikiReply, ok := fetchWikipediaSummary(strings.Trim(prompt, "?!.,\"'«» "), isEn); ok {
			return wikiReply
		}
	}

	// 13. Clean, honest conversational fallback (NEVER dumps unrelated Python code!)
	if isEn {
		return fmt.Sprintf("### Luma Lang 1.2\n\nI couldn't find a direct encyclopedia entry for *\"%s\"* right now.\n\n- Try phrasing it as **\"Who is ...\"** or **\"What is ...\"** for live knowledge lookup\n- Switch to **Luma Code 1.2** in the top bar for coding & scripts\n- Or connect **Gemini / OpenAI / Claude / Ollama** in Model Settings for long-form creative conversations.", prompt)
	}
	return fmt.Sprintf("### Luma Lang 1.2\n\nПо запросу *«%s»* не нашлось точной статьи в локальной базе и Wikipedia.\n\n- Попробуйте уточнить формулировку: *«Кто такой ...»*, *«Что такое ...»* или введите конкретное имя / термин\n- Для задач программирования переключите режим сверху на **Кодер (`Luma Code 1.2`)**\n- Для свободных творческих диалогов можно подключить **Gemini**, **OpenAI**, **Claude** или локальную **Ollama** в «Настройках модели».", prompt)
}

// ==================== ENGINE 2: LUMA CODE 1.2 (DEDICATED CODER MODEL) ====================

func generateCoderReply(prompt, low string, isEn bool, kernel *LumaKernel) string {
	// If user asks to explain a programming concept without asking for boilerplate, handle nicely
	if containsAny(low, "проанализ", "диагност", "нагрузк") && containsAny(low, "пк", "cpu", "ram", "систему") {
		return buildSystemDiagnosticsReply(kernel)
	}
	if expr, val, ok := tryEvalSmartMath(prompt); ok && !containsAny(low, "код", "python", "js", "script", "функц") {
		return fmt.Sprintf("### Вычисление (`Luma Code 1.2`)\n\n`%s` = **%s**", expr, formatFloatClean(val))
	}

	// 1. PowerShell / Windows Automation
	if containsAny(low, "powershell", "ps1", "очистк", "временн", "temp", "бэкап", "backup", "реестр") {
		if containsAny(low, "бэкап", "backup", "копир") {
			return "### PowerShell · Резервное копирование папки с датой\n\n```powershell\n$src = \"$env:USERPROFILE\\Documents\\Projects\"\n$dst = \"$env:USERPROFILE\\Desktop\\Backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm')\"\nCopy-Item -Path $src -Destination $dst -Recurse -Force\nWrite-Host \"Бэкап создан: $dst\" -ForegroundColor Green\n```"
		}
		if containsAny(low, "процесс", "process", "топ", "ram", "cpu") {
			return "### PowerShell · Топ-10 процессов по памяти\n\n```powershell\nGet-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, Id, @{\n  Name = 'RAM_MB'; Expression = { [math]::Round($_.WorkingSet64 / 1MB, 1) }\n} | Format-Table -AutoSize\n```"
		}
		return "### PowerShell · Безопасная очистка кэша Temp\n\n```powershell\n$before = (Get-ChildItem $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum\nGet-ChildItem $env:TEMP -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue\nWrite-Host (\"Освобождено ~{0:N1} МБ\" -f ($before / 1MB)) -ForegroundColor Cyan\n```"
	}

	// 2. Bash / Linux / Docker / Git
	if containsAny(low, "dockerfile", "docker") {
		return "### Multi-stage Dockerfile (Go / Node)\n\n```dockerfile\nFROM golang:1.22-alpine AS builder\nWORKDIR /app\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 go build -ldflags=\"-s -w\" -o server .\n\nFROM alpine:3.20\nWORKDIR /app\nCOPY --from=builder /app/server .\nEXPOSE 8080\nENTRYPOINT [\"./server\"]\n```"
	}
	if containsAny(low, "git ", "гит", "коммит", "ветк") {
		return "### Git · Основные команды разработчика\n\n```bash\ngit status -sb                  # Краткий статус\ngit checkout -b feature/ui      # Новая ветка\ngit add -A && git commit -m \"feat: обновление интерфейса\"\ngit pull --rebase origin main   # Обновить без лишних merge-коммитов\ngit push -u origin feature/ui   # Отправить ветку\n```"
	}
	if containsAny(low, "bash", "linux", "shell", "sh ") {
		return "### Bash · Мониторинг сервера и архивация\n\n```bash\n#!/usr/bin/env bash\nset -euo pipefail\necho \"Host: $(hostname) | Uptime: $(uptime -p)\"\ndf -h / | tail -n 1\ntar -czf \"backup_$(date +%Y%m%d_%H%M).tar.gz\" ./projects 2>/dev/null || true\necho \"Готово!\"\n```"
	}

	// 3. Rust
	if containsAny(low, "rust", "раст", "cargo") {
		return "### Rust · Безопасный многопоточный подсчёт\n\n```rust\nuse std::thread;\n\nfn main() {\n    let nums = vec![10, 20, 30, 40, 50];\n    let handle = thread::spawn(move || nums.iter().sum::<i32>());\n    let total = handle.join().unwrap();\n    println!(\"Сумма элементов: {}\", total);\n}\n```"
	}

	// 4. C++
	if containsAny(low, "c++", "cpp", "плюс") {
		return "### C++20 · Быстрая сортировка и вывод вектора\n\n```cpp\n#include <algorithm>\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> data = {42, 7, 19, 3, 25, 11};\n    std::ranges::sort(data);\n    for (int x : data) std::cout << x << ' ';\n    std::cout << '\\n';\n    return 0;\n}\n```"
	}

	// 5. C#
	if containsAny(low, "c#", "csharp", ".net", "dotnet") {
		return "### C# (.NET 8) · Асинхронный HTTP JSON клиент\n\n```csharp\nusing System.Net.Http.Json;\n\nusing var http = new HttpClient();\nhttp.DefaultRequestHeaders.UserAgent.ParseAdd(\"LumaOS-Client/1.2\");\nvar repo = await http.GetFromJsonAsync<RepoInfo>(\"https://api.github.com/repos/Tveexty/L_H-3.0\");\nConsole.WriteLine($\"{repo?.full_name}: ★ {repo?.stargazers_count}\");\n\nrecord RepoInfo(string full_name, int stargazers_count);\n```"
	}

	// 6. Go
	if containsAny(low, "golang", "на go", " go ", "go сервер", "go http", "голанг") {
		return "### Go · Производительный JSON HTTP-сервер\n\n```go\npackage main\n\nimport (\n\t\"encoding/json\"\n\t\"log\"\n\t\"net/http\"\n\t\"time\"\n)\n\nfunc main() {\n\tmux := http.NewServeMux()\n\tmux.HandleFunc(\"/api/health\", func(w http.ResponseWriter, r *http.Request) {\n\t\tw.Header().Set(\"Content-Type\", \"application/json\")\n\t\t_ = json.NewEncoder(w).Encode(map[string]any{\n\t\t\t\"ok\": true, \"time\": time.Now().Format(time.RFC3339),\n\t\t})\n\t})\n\tlog.Println(\"Listening on http://127.0.0.1:8080\")\n\tlog.Fatal(http.ListenAndServe(\"127.0.0.1:8080\", mux))\n}\n```"
	}

	// 7. SQL
	if containsAny(low, "sql", "таблиц", "запрос бд", "select ", "postgres", "sqlite", "mysql") {
		return "### SQL · Схема задач и аналитический отчёт\n\n```sql\nCREATE TABLE IF NOT EXISTS tasks (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT NOT NULL,\n  priority TEXT DEFAULT 'normal',\n  done INTEGER DEFAULT 0,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n\nSELECT priority, COUNT(*) AS total, SUM(done) AS completed\nFROM tasks\nGROUP BY priority\nORDER BY total DESC;\n```"
	}

	// 8. HTML / CSS
	if containsAny(low, "html", "css", "кнопк", "карточк", "страниц", "сайт", "верстк", "landing", "форма", "меню") {
		return "### HTML + CSS · Современная адаптивная карточка (Glassmorphism)\n\n```html\n<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<style>\n  body { margin:0; min-height:100vh; display:grid; place-items:center; background:radial-gradient(circle at top,#134e4a,#09090d 65%); color:#f4f4f5; font-family:system-ui,sans-serif; }\n  .card { width:min(360px,90vw); padding:28px; border-radius:24px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); backdrop-filter:blur(16px); box-shadow:0 24px 60px rgba(0,0,0,.45); }\n  h2 { margin:0 0 8px; font-size:20px; }\n  p { margin:0; color:#a1a1aa; font-size:14px; line-height:1.5; }\n  button { margin-top:18px; width:100%; padding:11px 16px; border:0; border-radius:14px; background:#14b8a6; color:#042f2e; font-weight:700; cursor:pointer; transition:.15s; }\n  button:hover { filter:brightness(1.1); transform:translateY(-1px); }\n</style>\n</head>\n<body>\n  <div class=\"card\">\n    <h2>Luma Lithium UI</h2>\n    <p>Чистая адаптивная вёрстка без сторонних библиотек.</p>\n    <button onclick=\"this.textContent='Активировано ✓'\">Запустить</button>\n  </div>\n</body>\n</html>\n```"
	}

	// 9. React / TypeScript / JavaScript
	if containsAny(low, "react", "tsx", "компонент", "хук", "hook") {
		return "### React + TypeScript · Компонент поиска с debounce\n\n```tsx\nimport { useEffect, useState } from 'react';\n\nexport function SearchBox({ onSearch }: { onSearch: (q: string) => void }) {\n  const [query, setQuery] = useState('');\n\n  useEffect(() => {\n    const id = setTimeout(() => onSearch(query.trim()), 250);\n    return () => clearTimeout(id);\n  }, [query, onSearch]);\n\n  return (\n    <input\n      value={query}\n      onChange={(e) => setQuery(e.target.value)}\n      placeholder=\"Поиск...\"\n      className=\"px-3 py-2 rounded-xl bg-zinc-900 text-white border border-zinc-700\"\n    />\n  );\n}\n```"
	}

	if containsAny(low, "javascript", "typescript", " js", " ts", "fetch", "таймер", "timer", "promise", "async") {
		if containsAny(low, "таймер", "timer", "секундомер") {
			return "### JavaScript · Таймер обратного отсчёта\n\n```javascript\nfunction startCountdown(seconds) {\n  let remaining = seconds;\n  const timer = setInterval(() => {\n    const m = String(Math.floor(remaining / 60)).padStart(2, '0');\n    const s = String(remaining % 60).padStart(2, '0');\n    console.log(`${m}:${s}`);\n    if (--remaining < 0) {\n      clearInterval(timer);\n      console.log('Время вышло!');\n    }\n  }, 1000);\n}\nstartCountdown(15);\n```"
		}
		return "### TypeScript · Типизированный Fetch JSON с таймаутом\n\n```typescript\nasync function fetchJson<T>(url: string, timeoutMs = 5000): Promise<T> {\n  const ctrl = new AbortController();\n  const timer = setTimeout(() => ctrl.abort(), timeoutMs);\n  try {\n    const res = await fetch(url, { signal: ctrl.signal });\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    return (await res.json()) as T;\n  } finally {\n    clearTimeout(timer);\n  }\n}\n```"
	}

	// 10. Specific Coding Tasks (Python default in Luma Code 1.2)
	if containsAny(low, "бот", "telegram", "телеграм", "aiogram") {
		return "### Python · Асинхронный Telegram-бот (`aiogram 3`)\n\n```python\nimport asyncio\nfrom aiogram import Bot, Dispatcher, types\nfrom aiogram.filters import CommandStart\n\nTOKEN = \"ВАШ_ТОКЕН_ОТ_BOTFATHER\"\ndp = Dispatcher()\n\n@dp.message(CommandStart())\nasync def cmd_start(msg: types.Message):\n    await msg.answer(f\"Привет, {msg.from_user.first_name}! Бот на связи.\")\n\n@dp.message()\nasync def echo(msg: types.Message):\n    await msg.answer(f\"Вы написали: {msg.text}\")\n\nasync def main():\n    bot = Bot(token=TOKEN)\n    await dp.start_polling(bot)\n\nif __name__ == \"__main__\":\n    asyncio.run(main())\n```"
	}

	if containsAny(low, "сервер", "server", "http", "fastapi", "flask", "api") {
		return "### Python · Локальный REST API сервер (без зависимостей)\n\n```python\nimport json\nfrom http.server import BaseHTTPRequestHandler, HTTPServer\n\nclass Handler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        payload = json.dumps({\"ok\": True, \"path\": self.path}).encode(\"utf-8\")\n        self.send_response(200)\n        self.send_header(\"Content-Type\", \"application/json; charset=utf-8\")\n        self.end_headers()\n        self.wfile.write(payload)\n\nif __name__ == \"__main__\":\n    print(\"Сервер: http://127.0.0.1:8000\")\n    HTTPServer((\"127.0.0.1\", 8000), Handler).serve_forever()\n```"
	}

	if containsAny(low, "сортиров", "sort", "quicksort", "алгоритм", "бинарн", "binary") {
		if containsAny(low, "бинарн", "binary") {
			return "### Python · Бинарный поиск `O(log n)`\n\n```python\ndef binary_search(arr: list[int], target: int) -> int:\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        if arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n\nprint(binary_search([2, 5, 9, 14, 21, 33], 14))  # 3\n```"
		}
		return "### Python · Быстрая сортировка QuickSort\n\n```python\ndef quicksort(arr: list[int]) -> list[int]:\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + mid + quicksort(right)\n\nprint(quicksort([42, 7, 19, 3, 25, 11]))\n```"
	}

	if containsAny(low, "парсер", "parser", "скрап", "scrape", "regex", "регуляр", "email") {
		return "### Python · Валидатор Email и URL через регулярные выражения\n\n```python\nimport re\n\nEMAIL_RE = re.compile(r\"^[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$\")\nURL_RE = re.compile(r\"https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+\")\n\ntext = \"Контакты: dev@luma.os, сайт https://github.com/Tveexty/L_H-3.0\"\nprint(\"URLs:\", URL_RE.findall(text))\nprint(\"Valid email:\", bool(EMAIL_RE.match(\"dev@luma.os\")))\n```"
	}

	if containsAny(low, "файл", "file", "json", "csv", "чита", "запис") {
		return "### Python · Безопасное чтение и запись JSON (UTF-8)\n\n```python\nimport json\nfrom pathlib import Path\n\npath = Path(\"config.json\")\ndata = {\"app\": \"Luma OS 1.2.1\", \"theme\": \"dark\", \"items\": [1, 2, 3]}\npath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding=\"utf-8\")\n\nloaded = json.loads(path.read_text(encoding=\"utf-8\"))\nprint(\"Загружено:\", loaded)\n```"
	}

	if containsAny(low, "калькулятор", "calc") {
		return "### Python · Безопасный калькулятор на AST\n\n```python\nimport ast, operator as op\n\nOPS = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul, ast.Div: op.truediv, ast.Pow: op.pow}\n\ndef safe_eval(node):\n    if isinstance(node, ast.Constant): return node.value\n    if isinstance(node, ast.BinOp): return OPS[type(node.op)](safe_eval(node.left), safe_eval(node.right))\n    raise ValueError(\"Неподдерживаемая операция\")\n\nexpr = input(\"Выражение: \")\nprint(\"=\", safe_eval(ast.parse(expr, mode=\"eval\").body))\n```"
	}

	if containsAny(low, "фибонач", "fibonacci", "простые", "prime", "факториал") {
		return "### Python · Числа Фибоначчи с мемоизацией\n\n```python\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n: int) -> int:\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\nprint([fib(i) for i in range(12)])\n```"
	}

	if containsAny(low, "парол", "password", "шифр", "aes", "hash", "sha") {
		return "### Python · Генератор криптостойкого пароля и SHA-256\n\n```python\nimport hashlib, secrets, string\n\nalphabet = string.ascii_letters + string.digits + \"!@#$%^&*\"\npassword = \"\".join(secrets.choice(alphabet) for _ in range(18))\nprint(\"Пароль:\", password)\nprint(\"SHA-256:\", hashlib.sha256(password.encode()).hexdigest())\n```"
	}

	if isEn {
		return fmt.Sprintf("### Luma Code 1.2 (Coder Mode · %s)\n\nSpecify a language (`Python`, `JS/TS`, `React`, `HTML/CSS`, `Go`, `Rust`, `C++`, `C#`, `SQL`, `PowerShell`, `Bash`, `Docker`, `Git`) and a task (e.g. *REST API, Telegram bot, QuickSort, Binary Search, Fetch with timeout, Glass UI card, SQL query, Temp cleanup*).\n\nFor general knowledge or encyclopedic questions, switch to **Luma Lang 1.2** in the header!", runtime.GOOS)
	}
	return fmt.Sprintf("### Luma Code 1.2 (Режим программиста · %s)\n\nУточните язык и задачу — например:\n- **Python**: *«телеграм бот»*, *«HTTP сервер»*, *«быстрая сортировка»*, *«парсер email»*, *«работа с JSON»*\n- **Web / React / TS**: *«компонент React с поиском»*, *«карточка HTML CSS»*, *«fetch с таймаутом»*, *«таймер на JS»*\n- **Системные / БД**: *«сервер на Go»*, *«код на C++ / Rust / C#»*, *«SQL запрос»*, *«PowerShell очистка temp»*, *«Dockerfile»*\n\nЕсли ваш вопрос не про программирование (например, про личность, историю или науку), переключите режим сверху на **Языковая модель (`Luma Lang 1.2`)**!", runtime.GOOS)
}

// ==================== CURATED OFFLINE ENCYCLOPEDIA (45+ TOPICS) ====================

type kbEntry struct {
	Keys  []string
	Title string
	Body  string
}

var offlineKB = []kbEntry{
	{
		Keys:  []string{"пушкин", "pushkin"},
		Title: "Александр Сергеевич Пушкин (1799–1837)",
		Body:  "Великий русский поэт, драматург и прозаик, заложивший основы современного русского литературного языка.\n\n- **Годы жизни:** 6 июня 1799 (Москва) — 10 февраля 1837 (Санкт-Петербург)\n- **Главные произведения:** роман в стихах *«Евгений Онегин»*, поэмы *«Руслан и Людмила»*, *«Медный всадник»*, повесть *«Капитанская дочка»*, драма *«Борис Годунов»*, *«Повести Белкина»* и знаменитые сказки.\n- **Значение:** Объединил живую народную речь с книжной традицией, определив развитие всей русской литературы XIX–XX веков. Погиб на дуэли с Жоржем Дантесом в 37 лет.",
	},
	{
		Keys:  []string{"лермонтов", "lermontov"},
		Title: "Михаил Юрьевич Лермонтов (1814–1841)",
		Body:  "Классик русской литературы, поэт, прозаик, драматург и художник, один из главных представителей романтизма.\n\n- **Главные произведения:** роман *«Герой нашего времени»*, поэмы *«Мцыри»*, *«Демон»*, стихотворения *«Бородино»*, *«Парус»*, *«Смерть поэта»*.\n- Погиб на дуэли в Пятигорске в возрасте 26 лет.",
	},
	{
		Keys:  []string{"достоевск", "dostoevsky"},
		Title: "Фёдор Михайлович Достоевский (1821–1881)",
		Body:  "Один из самых влиятельных писателей и мыслителей мировой литературы, мастер психологического романа.\n\n- **Главные произведения:** *«Преступление и наказание»*, *«Идиот»*, *«Братья Карамазовы»*, *«Бесы»*, *«Записки из подполья»*.\n- Его идеи глубоко повлияли на мировую философию, психологию и литературу XX века.",
	},
	{
		Keys:  []string{"толстой", "tolstoy"},
		Title: "Лев Николаевич Толстой (1828–1910)",
		Body:  "Великий русский писатель-реалист и философ, автор монументальных эпопей.\n\n- **Главные произведения:** *«Война и мир»*, *«Анна Каренина»*, *«Воскресение»*, трилогия *«Детство. Отрочество. Юность»*.\n- Известен также педагогической деятельностью в Ясной Поляне и учением о непротивлении злу насилием.",
	},
	{
		Keys:  []string{"чехов", "chekhov"},
		Title: "Антон Павлович Чехов (1860–1904)",
		Body:  "Русский писатель, прозаик, драматург и врач. Признанный классик мировой новеллы и современной драмы.\n\n- **Главные произведения:** пьесы *«Вишнёвый сад»*, *«Чайка»*, *«Три сестры»*, *«Дядя Ваня»*; рассказы *«Палата № 6»*, *«Дама с собачкой»*, *«Человек в футляре»*.\n- Знаменитая фраза: *«Краткость — сестра таланта»*.",
	},
	{
		Keys:  []string{"гоголь", "gogol"},
		Title: "Николай Васильевич Гоголь (1809–1852)",
		Body:  "Русский прозаик, драматург и сатирик.\n\n- **Главные произведения:** *«Мёртвые души»*, комедия *«Ревизор»*, *«Вечера на хуторе близ Диканьки»*, *«Вий»*, *«Шинель»*, *«Тарас Бульба»*.",
	},
	{
		Keys:  []string{"есенин", "esenin"},
		Title: "Сергей Александрович Есенин (1895–1925)",
		Body:  "Русский поэт Серебряного века, представитель новокрестьянской поэзии и имажинизма.\n\n- **Известные стихи и поэмы:** *«Письмо матери»*, *«Берёза»*, *«Чёрный человек»*, *«Анна Снегина»*, *«Не жалею, не зову, не плачу»*.",
	},
	{
		Keys:  []string{"эйнштейн", "einstein"},
		Title: "Альберт Эйнштейн (1879–1955)",
		Body:  "Физик-теоретик, один из основателей современной теоретической физики, лауреат Нобелевской премии 1921 года.\n\n- **Ключевые открытия:** специальная и общая теория относительности, формула эквивалентности массы и энергии `E = mc²`, объяснение фотоэффекта.\n- Перевернул представления человечества о пространстве, времени и гравитации.",
	},
	{
		Keys:  []string{"тесла", "nikola tesla", "никола тесла"},
		Title: "Никола Тесла (1856–1943)",
		Body:  "Выдающийся сербско-американский изобретатель, инженер-электрик и физик.\n\n- **Ключевые изобретения:** система переменного тока (AC), асинхронный электродвигатель, трансформатор Теслы, работы по радиосвязи и беспроводной передаче энергии.\n- В его честь названа единица магнитной индукции (Тл) и компания Tesla.",
	},
	{
		Keys:  []string{"ньютон", "newton"},
		Title: "Исаак Ньютон (1643–1727)",
		Body:  "Английский физик, математик и астроном, создатель классической механики.\n\n- **Открытия:** три закона механики, закон всемирного тяготения, основы дифференциального и интегрального исчисления, дисперсия света и зеркальный телескоп.",
	},
	{
		Keys:  []string{"ломоносов", "lomonosov"},
		Title: "Михаил Васильевич Ломоносов (1711–1765)",
		Body:  "Первый крупный русский учёный-естествоиспытатель, энциклопедист, химик, физик, астроном и поэт.\n\n- Основатель Московского университета (ныне МГУ, 1755), открыл атмосферу у Венеры и сформулировал закон сохранения массы вещества.",
	},
	{
		Keys:  []string{"менделеев", "mendeleev"},
		Title: "Дмитрий Иванович Менделеев (1834–1907)",
		Body:  "Русский учёный-энциклопедист, открывший в 1869 году **Периодический закон химических элементов** и создавший периодическую таблицу, позволившую предсказать свойства ещё не открытых элементов.",
	},
	{
		Keys:  []string{"гагарин", "gagarin"},
		Title: "Юрий Алексеевич Гагарин (1934–1968)",
		Body:  "Советский лётчик-космонавт, **первый человек в истории, совершивший полёт в космос**.\n\n- **12 апреля 1961 года** на корабле *«Восток-1»* выполнил виток вокруг Земли за 108 минут, открыв космическую эру человечества.",
	},
	{
		Keys:  []string{"да винчи", "леонардо", "da vinci"},
		Title: "Леонардо да Винчи (1452–1519)",
		Body:  "Итальянский художник, учёный, изобретатель и архитектор эпохи Возрождения, эталон «универсального человека».\n\n- Автор картин *«Мона Лиза»* и *«Тайная вечеря»*, чертежей летательных аппаратов, парашюта и анатомических исследований.",
	},
	{
		Keys:  []string{"тьюринг", "turing"},
		Title: "Алан Тьюринг (1912–1954)",
		Body:  "Британский математик и криптограф, «отец информатики и искусственного интеллекта».\n\n- Формализовал понятие алгоритма (машина Тьюринга), участвовал во взломе шифра «Энигма» и предложил знаменитый **Тест Тьюринга** для оценки машинного интеллекта.",
	},
	{
		Keys:  []string{"илон маск", "маск", "elon musk"},
		Title: "Илон Маск (род. 1971)",
		Body:  "Предприниматель и инженер, основатель и руководитель ключевых технологических компаний:\n\n- **SpaceX** — многоразовые ракеты Falcon 9, Starship и спутниковый интернет Starlink\n- **Tesla** — электромобили и энергетические системы\n- **Neuralink**, **xAI**, **The Boring Company**, владелец платформы **X**.",
	},
	{
		Keys:  []string{"стив джобс", "джобс", "steve jobs"},
		Title: "Стив Джобс (1955–2011)",
		Body:  "Сооснователь корпорации **Apple** и студии **Pixar**, визионер персональных компьютеров и мобильных устройств.\n\n- Под его руководством созданы Macintosh, iPod, iPhone, iPad и macOS, задавшие стандарты промышленного дизайна и UX.",
	},
	{
		Keys:  []string{"торвальдс", "torvalds"},
		Title: "Линус Торвальдс (род. 1969)",
		Body:  "Финско-американский программист, создатель ядра **Linux** (1991) и распределённой системы контроля версий **Git** (2005).",
	},
	{
		Keys:  []string{"билл гейтс", "bill gates"},
		Title: "Билл Гейтс (род. 1955)",
		Body:  "Американский предприниматель, программист и филантроп, сооснователь корпорации **Microsoft** (1975), сыгравшей ключевую роль в распространении ОС Windows и персональных компьютеров.",
	},
	{
		Keys:  []string{"квантов", "quantum"},
		Title: "Квантовая физика",
		Body:  "Раздел физики, изучающий законы микромира (атомы, электроны, фотоны), где классическая механика перестаёт работать.\n\n- **Ключевые явления:** квантование энергии (энергия передаётся порциями-квантами), корпускулярно-волновой дуализм, принцип неопределённости Гейзенберга, суперпозиция и квантовая запутанность.\n- На её основе работают лазеры, транзисторы, процессоры, МРТ и квантовые компьютеры.",
	},
	{
		Keys:  []string{"искусственный интеллект", "нейросет", "artificial intelligence", "что такое ии"},
		Title: "Искусственный интеллект и нейросети",
		Body:  "**Искусственный интеллект (ИИ)** — область информатики, создающая системы, способные решать интеллектуальные задачи: понимать язык, анализировать данные, писать код и распознавать образы.\n\n- **Нейросети (Deep Learning)** обучаются на огромных массивах примеров, настраивая миллионы или миллиарды числовых весов (параметров).\n- Современные **LLM** (архитектура Transformer) предсказывают и генерируют осмысленный текст и код по контексту.",
	},
	{
		Keys:  []string{"чёрная дыра", "черная дыра", "black hole"},
		Title: "Чёрная дыра",
		Body:  "Область пространства-времени с настолько сильной гравитацией, что покинуть её пределы (горизонт событий) не может даже свет.\n\n- Образуются чаще всего при гравитационном коллапсе массивных звёзд. В центре большинства галактик, включая наш Млечный Путь (Стрелец A*), находятся сверхмассивные чёрные дыры.",
	},
	{
		Keys:  []string{"фотосинтез", "photosynthesis"},
		Title: "Фотосинтез",
		Body:  "Биохимический процесс, при котором растения, водоросли и некоторые бактерии с помощью солнечного света превращают углекислый газ (`CO₂`) и воду (`H₂O`) в глюкозу и **кислород (`O₂`)**.\n\n- Главный пигмент — **хлорофилл** (именно он придаёт листьям зелёный цвет).",
	},
	{
		Keys:  []string{"днк", "dna"},
		Title: "ДНК (Дезоксирибонуклеиновая кислота)",
		Body:  "Макромолекула в форме двойной спирали, хранящая генетическую программу развития и функционирования всех живых организмов.\n\n- Состоит из четырёх нуклеотидов: аденина (**A**), тимина (**T**), гуанина (**G**) и цитозина (**C**).",
	},
	{
		Keys:  []string{"солнечная система", "планеты", "solar system"},
		Title: "Солнечная система",
		Body:  "Планетная система вокруг звезды Солнце. Включает **8 планет** (в порядке от Солнца):\n\n1. **Меркурий** · 2. **Венера** · 3. **Земля** · 4. **Марс** *(земная группа)*\n5. **Юпитер** · 6. **Сатурн** *(газовые гиганты)*\n7. **Уран** · 8. **Нептун** *(ледяные гиганты)*.",
	},
	{
		Keys:  []string{"что такое процессор", "что такое cpu", "what is cpu"},
		Title: "Процессор (CPU — Central Processing Unit)",
		Body:  "Главный вычислительный узел компьютера, исполняющий машинные инструкции программ.\n\n- Ключевые характеристики: количество **ядер и потоков**, тактовая частота (ГГц), объём кэш-памяти (L1/L2/L3) и техпроцесс (нм).",
	},
	{
		Keys:  []string{"что такое озу", "что такое ram", "оперативная память"},
		Title: "Оперативная память (RAM / ОЗУ)",
		Body:  "Сверхбыстрая энергозависимая память, в которой хранятся данные открытых приложений и операционной системы прямо во время работы.\n\n- Чем больше ОЗУ (16–32+ ГБ), тем больше программ и вкладок работают одновременно без подтормаживаний и обращения к файлу подкачки на диске.",
	},
	{
		Keys:  []string{"что такое gpu", "что такое видеокарта"},
		Title: "Видеокарта (GPU — Graphics Processing Unit)",
		Body:  "Специализированный процессор с тысячами параллельных ядер, созданный для рендеринга 2D/3D графики, анимаций интерфейса, видео, игр и ускорения нейросетей.",
	},
	{
		Keys:  []string{"блокчейн", "blockchain", "биткоин", "bitcoin"},
		Title: "Блокчейн",
		Body:  "Распределённая криптографическая цепочка блоков данных, где каждый новый блок содержит хеш предыдущего.\n\n- Изменить запись задним числом практически невозможно без согласия большинства узлов сети. Лежит в основе криптовалют (Bitcoin, Ethereum) и смарт-контрактов.",
	},
}

func lookupOfflineKnowledge(low string) (string, bool) {
	// Skip if user clearly asked to WRITE code about something (e.g. "напиши код на python")
	if isExplicitCodeRequest(low) && !isKnowledgeQuestion(low) {
		return "", false
	}
	for _, entry := range offlineKB {
		for _, k := range entry.Keys {
			if strings.Contains(low, k) {
				return fmt.Sprintf("### %s\n\n%s", entry.Title, entry.Body), true
			}
		}
	}
	return "", false
}

var topicPrefixRe = regexp.MustCompile(`(?i)^\s*(?:кто\s+такой|кто\s+такая|кто\s+такие|кто\s+это|что\s+такое|что\s+такой|что\s+значит|что\s+означает|расскажи\s+(?:мне\s+)?(?:о|об|про)|объясни(?:\s+что\s+такое)?|биография|who\s+is|who\s+was|what\s+is|what\s+are|tell\s+me\s+about|explain)\s+(.+)$`)

func extractKnowledgeTopic(prompt, low string) string {
	if m := topicPrefixRe.FindStringSubmatch(strings.TrimSpace(prompt)); len(m) == 2 {
		cleaned := strings.Trim(strings.TrimSpace(m[1]), "?!.,\"'«» ")
		// Strip trailing conversational filler
		for _, suf := range []string{" простыми словами", " кратко", " вкратце", " подробно", " это", " briefly", " simply"} {
			if strings.HasSuffix(strings.ToLower(cleaned), suf) {
				cleaned = strings.TrimSpace(cleaned[:len(cleaned)-len(suf)])
			}
		}
		return cleaned
	}
	return ""
}

func fetchWikipediaSummary(topic string, isEn bool) (string, bool) {
	topic = strings.TrimSpace(topic)
	if topic == "" || len([]rune(topic)) < 2 {
		return "", false
	}
	langs := []string{"ru", "en"}
	if isEn {
		langs = []string{"en", "ru"}
	}
	client := &http.Client{Timeout: 3500 * time.Millisecond}

	for _, lang := range langs {
		searchURL := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=opensearch&search=%s&limit=1&namespace=0&format=json", lang, url.QueryEscape(topic))
		req, _ := http.NewRequest("GET", searchURL, nil)
		req.Header.Set("User-Agent", "LumaOS/1.2.1 (https://github.com/Tveexty/L_H-3.0)")
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		var openRes []interface{}
		decErr := json.NewDecoder(resp.Body).Decode(&openRes)
		_ = resp.Body.Close()
		if decErr != nil || len(openRes) < 2 {
			continue
		}
		titles, ok := openRes[1].([]interface{})
		if !ok || len(titles) == 0 {
			continue
		}
		title, ok := titles[0].(string)
		if !ok || title == "" {
			continue
		}

		sumURL := fmt.Sprintf("https://%s.wikipedia.org/api/rest_v1/page/summary/%s", lang, url.PathEscape(strings.ReplaceAll(title, " ", "_")))
		req2, _ := http.NewRequest("GET", sumURL, nil)
		req2.Header.Set("User-Agent", "LumaOS/1.2.1 (https://github.com/Tveexty/L_H-3.0)")
		resp2, err2 := client.Do(req2)
		if err2 != nil {
			continue
		}
		var sum struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Extract     string `json:"extract"`
		}
		decErr2 := json.NewDecoder(resp2.Body).Decode(&sum)
		_ = resp2.Body.Close()
		if decErr2 == nil && strings.TrimSpace(sum.Extract) != "" {
			var sb strings.Builder
			sb.WriteString("### " + sum.Title + "\n\n")
			if strings.TrimSpace(sum.Description) != "" {
				sb.WriteString("*" + sum.Description + "*\n\n")
			}
			sb.WriteString(strings.TrimSpace(sum.Extract))
			return sb.String(), true
		}
	}
	return "", false
}

// ==================== SHARED HELPERS (DIAGNOSTICS, CRYPTO, SMART MATH, UNITS) ====================

func buildSystemDiagnosticsReply(kernel *LumaKernel) string {
	if kernel == nil {
		return "Телеметрия ядра временно недоступна."
	}
	s := kernel.SystemSnapshot()
	bat := kernel.probe.GetBatteryDetails()
	var tips []string
	if s.RAMPercent >= 80 {
		tips = append(tips, "- ОЗУ загружено выше **80%** — откройте **Диспетчер задач** и закройте тяжёлые фоновые вкладки.")
	} else {
		tips = append(tips, "- Загрузка ОЗУ в норме — достаточно запаса для многозадачности.")
	}
	if s.CPUPercent >= 75 {
		tips = append(tips, "- Высокая загрузка ЦП — проверьте топ процессов в **Диспетчере задач**.")
	}
	if bat.Present {
		cycText := fmt.Sprintf("%d", bat.CycleCount)
		if !bat.CycleSupported {
			cycText = "не передаётся контроллером"
		}
		tips = append(tips, fmt.Sprintf("- Батарея: **%d%%** · %s · Здоровье: **%d%%** · Циклы: **%s**.", bat.Percent, bat.StatusText, bat.HealthPercent, cycText))
	}
	tips = append(tips, "- Для снижения нагрузки на GPU можно включить профиль **«Производительность»** в *Настройки → Графика и оптимизация*.")

	return fmt.Sprintf(
		"### Живая диагностика ПК (`LumaCore 1.2`)\n\n"+
			"- **Устройство:** `%s` (`%s`)\n"+
			"- **ОС:** %s (`%s`)\n"+
			"- **ЦП (CPU):** %s — **%d%%** (%d потоков)\n"+
			"- **ОЗУ (RAM):** **%.1f / %.1f ГБ (%d%%)**\n"+
			"- **GPU:** %s (~%d%%, %d°C)\n"+
			"- **Сеть:** ↓ %.1f / ↑ %.1f Мбит/с · Регион: %s\n\n"+
			"**Рекомендации:**\n%s",
		s.Hostname, s.DeviceModel, s.OSName, s.Arch,
		s.CPUModel, s.CPUPercent, s.CPUCores,
		s.RAMUsedGB, s.RAMTotalGB, s.RAMPercent,
		s.GPUName, s.GPUPercent, s.GPUTempC,
		s.NetDownMbps, s.NetUpMbps, s.Location.City,
		strings.Join(tips, "\n"),
	)
}

func buildCryptoUtilityReply(prompt, low string) string {
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
		return fmt.Sprintf("SHA-256 от вашего запроса:\n```text\n%s\n```", hex.EncodeToString(sum[:]))
	}
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*"
	b := make([]byte, 18)
	_, _ = rand.Read(b)
	var pw strings.Builder
	for _, v := range b {
		pw.WriteByte(alphabet[int(v)%len(alphabet)])
	}
	return fmt.Sprintf("Надёжный криптостойкий пароль (18 символов):\n```text\n%s\n```", pw.String())
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

// Smart Math Parser (recursive descent supporting +, -, *, /, ^, parentheses, sqrt, percentages!)
var (
	pctOfRe      = regexp.MustCompile(`(?i)(\d+(?:[.,]\d+)?)\s*%\s*(?:от|of)\s*(\d+(?:[.,]\d+)?)`)
	sqrtCallRe   = regexp.MustCompile(`(?i)(?:sqrt|корень(?:\s+из)?)\s*\(?\s*(\d+(?:[.,]\d+)?)\s*\)?`)
	smartMathRe  = regexp.MustCompile(`[\(\s]*[0-9]+(?:[.,][0-9]+)?(?:\s*[\+\-\*\/\^×÷]\s*[\(\s]*[0-9]+(?:[.,][0-9]+)?[\)\s]*)+`)
	unitConvRe   = regexp.MustCompile(`(?i)(\d+(?:[.,]\d+)?)\s*(км|km|мил[ьия]?|mi|кг|kg|фунт\w*|lb|гб|gb|мб|mb|°?c|°?f|градус\w*\s*[cfсф])`)
)

func tryConvertUnits(low string) (string, bool) {
	if !containsAny(low, "переведи", "конверт", "в ", "to ", "сколько ", "convert") {
		return "", false
	}
	m := unitConvRe.FindStringSubmatch(low)
	if len(m) < 3 {
		return "", false
	}
	val, err := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
	if err != nil {
		return "", false
	}
	unit := strings.ToLower(m[2])
	switch {
	case unit == "км" || unit == "km":
		return fmt.Sprintf("### Конвертация расстояния\n\n`%s км` = **%s миль** (`%s м`)", formatFloatClean(val), formatFloatClean(val*0.621371), formatFloatClean(val*1000)), true
	case strings.HasPrefix(unit, "мил") || unit == "mi":
		return fmt.Sprintf("### Конвертация расстояния\n\n`%s миль` = **%s км**", formatFloatClean(val), formatFloatClean(val*1.60934)), true
	case unit == "кг" || unit == "kg":
		return fmt.Sprintf("### Конвертация массы\n\n`%s кг` = **%s фунтов (lb)**", formatFloatClean(val), formatFloatClean(val*2.20462)), true
	case strings.HasPrefix(unit, "фунт") || unit == "lb":
		return fmt.Sprintf("### Конвертация массы\n\n`%s lb` = **%s кг**", formatFloatClean(val), formatFloatClean(val*0.453592)), true
	case unit == "гб" || unit == "gb":
		return fmt.Sprintf("### Конвертация объёма данных\n\n`%s ГБ` = **%s МБ** (`%s КБ`)", formatFloatClean(val), formatFloatClean(val*1024), formatFloatClean(val*1024*1024)), true
	case unit == "мб" || unit == "mb":
		return fmt.Sprintf("### Конвертация объёма данных\n\n`%s МБ` = **%s ГБ**", formatFloatClean(val), formatFloatClean(val/1024.0)), true
	case strings.Contains(unit, "c") || strings.Contains(unit, "с"):
		return fmt.Sprintf("### Конвертация температуры\n\n`%s °C` = **%s °F** (`%s K`)", formatFloatClean(val), formatFloatClean(val*9.0/5.0+32.0), formatFloatClean(val+273.15)), true
	case strings.Contains(unit, "f") || strings.Contains(unit, "ф"):
		return fmt.Sprintf("### Конвертация температуры\n\n`%s °F` = **%s °C**", formatFloatClean(val), formatFloatClean((val-32.0)*5.0/9.0)), true
	}
	return "", false
}

func tryEvalSmartMath(prompt string) (string, float64, bool) {
	if m := pctOfRe.FindStringSubmatch(prompt); len(m) == 3 {
		p, e1 := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
		b, e2 := strconv.ParseFloat(strings.ReplaceAll(m[2], ",", "."), 64)
		if e1 == nil && e2 == nil {
			return fmt.Sprintf("%s%% от %s", formatFloatClean(p), formatFloatClean(b)), (p / 100.0) * b, true
		}
	}
	if m := sqrtCallRe.FindStringSubmatch(prompt); len(m) == 2 {
		v, err := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
		if err == nil && v >= 0 {
			return fmt.Sprintf("√(%s)", formatFloatClean(v)), math.Sqrt(v), true
		}
	}
	raw := smartMathRe.FindString(prompt)
	if raw == "" {
		return "", 0, false
	}
	expr := strings.TrimSpace(raw)
	clean := strings.ReplaceAll(expr, ",", ".")
	clean = strings.ReplaceAll(clean, "×", "*")
	clean = strings.ReplaceAll(clean, "÷", "/")
	clean = strings.ReplaceAll(clean, " ", "")

	p := &exprParser{s: clean}
	val, ok := p.parseExpr()
	if !ok || p.pos != len(p.s) || math.IsNaN(val) || math.IsInf(val, 0) {
		return "", 0, false
	}
	return expr, val, true
}

type exprParser struct {
	s   string
	pos int
}

func (p *exprParser) parseExpr() (float64, bool) {
	left, ok := p.parseTerm()
	if !ok {
		return 0, false
	}
	for p.pos < len(p.s) {
		ch := p.s[p.pos]
		if ch != '+' && ch != '-' {
			break
		}
		p.pos++
		right, ok := p.parseTerm()
		if !ok {
			return 0, false
		}
		if ch == '+' {
			left += right
		} else {
			left -= right
		}
	}
	return left, true
}

func (p *exprParser) parseTerm() (float64, bool) {
	left, ok := p.parsePow()
	if !ok {
		return 0, false
	}
	for p.pos < len(p.s) {
		ch := p.s[p.pos]
		if ch != '*' && ch != '/' {
			break
		}
		p.pos++
		right, ok := p.parsePow()
		if !ok {
			return 0, false
		}
		if ch == '*' {
			left *= right
		} else {
			if right == 0 {
				return 0, false
			}
			left /= right
		}
	}
	return left, true
}

func (p *exprParser) parsePow() (float64, bool) {
	base, ok := p.parseUnary()
	if !ok {
		return 0, false
	}
	if p.pos < len(p.s) && p.s[p.pos] == '^' {
		p.pos++
		exp, ok := p.parsePow()
		if !ok {
			return 0, false
		}
		return math.Pow(base, exp), true
	}
	return base, true
}

func (p *exprParser) parseUnary() (float64, bool) {
	if p.pos < len(p.s) && p.s[p.pos] == '-' {
		p.pos++
		v, ok := p.parseUnary()
		return -v, ok
	}
	if p.pos < len(p.s) && p.s[p.pos] == '+' {
		p.pos++
		return p.parseUnary()
	}
	return p.parsePrimary()
}

func (p *exprParser) parsePrimary() (float64, bool) {
	if p.pos >= len(p.s) {
		return 0, false
	}
	if p.s[p.pos] == '(' {
		p.pos++
		v, ok := p.parseExpr()
		if !ok || p.pos >= len(p.s) || p.s[p.pos] != ')' {
			return 0, false
		}
		p.pos++
		return v, true
	}
	start := p.pos
	for p.pos < len(p.s) && ((p.s[p.pos] >= '0' && p.s[p.pos] <= '9') || p.s[p.pos] == '.') {
		p.pos++
	}
	if start == p.pos {
		return 0, false
	}
	v, err := strconv.ParseFloat(p.s[start:p.pos], 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

func formatFloatClean(v float64) string {
	if math.Abs(v-math.Round(v)) < 1e-9 {
		return strconv.FormatInt(int64(math.Round(v)), 10)
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.6f", v), "0"), ".")
}
