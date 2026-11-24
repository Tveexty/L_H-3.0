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

// Luma AI 2.0 — Next-Gen Dual-Engine Local Intelligence for Luma OS 1.5.1 (Carbon):
//   1. Luma Lang 2.0 (mode="language") — Conversational, Reasoning, Writing & Knowledge Engine:
//      - Multi-turn context memory (resolves follow-ups: "подробнее", "короче", "перепиши на ...", "объясни это")
//      - Writing assistant (emails, project plans, summaries, checklists, comparisons, essays)
//      - Curated offline encyclopedia + live Wikipedia deep search
//      - Full math evaluator (+ - * / ^ sqrt % quadratic equations, binary/hex), unit converter, JSON/Base64/Regex, deep PC diagnostics
//   2. Luma Code 2.0 (mode="code") — Senior Developer, Code Reviewer & Architecture Engine:
//      - Static Code Reviewer & Debugger (detects bugs, security flaws, complexity & fixes pasted code!)
//      - 14 languages (Python, TypeScript/JS, React, HTML/CSS, Go, Rust, C++20, C#/.NET, SQL, PowerShell, Bash, Docker, YAML, Git)
//      - 45+ production templates (FastAPI, Express, Go HTTP, Telegram/Discord bots, BFS/DFS/Dijkstra/DP/LRU/QuickSort, React Hooks, Unity, Games, SQL CTEs)
//   3. Luma Hybrid 2.0 (mode="auto") — Context-aware smart router between Luma Lang 2.0 and Luma Code 2.0

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

	// Multi-turn conversation memory: resolve previous user query & assistant answer for follow-up commands
	prevUser := ""
	prevAssistant := ""
	for i := len(messages) - 2; i >= 0; i-- {
		if prevAssistant == "" && messages[i].Role == "assistant" {
			prevAssistant = strings.TrimSpace(messages[i].Content)
		}
		if prevUser == "" && messages[i].Role == "user" {
			prevUser = strings.TrimSpace(messages[i].Content)
		}
		if prevUser != "" && prevAssistant != "" {
			break
		}
	}

	// Follow-up verbosity / context expansion handling ("подробнее", "короче", "проще", "перепиши на ...")
	if prevUser != "" && len([]rune(prompt)) < 64 {
		if containsAny(low, "подробн", "расскажи больше", "углуб", "tell me more", "more detail") {
			normVerb = "detailed"
			prompt = prevUser
			low = strings.ToLower(prompt)
		} else if containsAny(low, "короч", "кратк", "в двух словах", "shorter", "tldr", "кратко") {
			normVerb = "brief"
			prompt = prevUser
			low = strings.ToLower(prompt)
		} else if containsAny(low, "перепиши на ", "напиши это на ", "конвертируй в ", "rewrite in ", "добавь тесты", "add tests") {
			prompt = prompt + " (" + prevUser + ")"
			low = strings.ToLower(prompt)
			if normMode == "auto" {
				normMode = "code"
			}
		}
	}

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
		modelName = "Luma Code 3.0"
		reply = generateCoderReply(prompt, low, isEnglish, kernel, prevAssistant)
	case "language":
		modelName = "Luma Lang 3.0"
		reply = generateLanguageReply(prompt, low, isEnglish, kernel, false, prevAssistant)
	default:
		// Auto / Hybrid 3.0 smart router
		if (isExplicitCodeRequest(low) || looksLikePastedCode(prompt)) && !isKnowledgeQuestion(low) {
			modelName = "Luma Code 3.0 (Auto)"
			reply = generateCoderReply(prompt, low, isEnglish, kernel, prevAssistant)
		} else {
			modelName = "Luma Lang 3.0 (Auto)"
			reply = generateLanguageReply(prompt, low, isEnglish, kernel, true, prevAssistant)
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

func looksLikePastedCode(s string) bool {
	if strings.Contains(s, "```") {
		return true
	}
	score := 0
	for _, tok := range []string{"function ", "def ", "const ", "let ", "import ", "class ", "func ", "return ", "=>", "SELECT ", "CREATE TABLE", "#include", "public static"} {
		if strings.Contains(s, tok) {
			score++
		}
	}
	return score >= 2 || (score >= 1 && strings.Count(s, "\n") >= 2)
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

	if verbosity == "brief" {
		if strings.Contains(trimmed, "```") {
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
				for i := 45; i < len(runes) && i < 220; i++ {
					if runes[i] == '.' || runes[i] == '!' || runes[i] == '?' {
						cut = i + 1
						break
					}
				}
				if cut == len(runes) && len(runes) > 215 {
					t = strings.TrimSpace(string(runes[:212])) + "…"
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

	if verbosity == "detailed" {
		if strings.Contains(trimmed, "```") || normMode == "code" {
			if isEnglish {
				return trimmed + "\n\n#### Luma Code 2.0 · Architecture & Edge-Case Checklist\n- **Validation & Safety**: Guard all external inputs, enforce explicit timeouts, and prevent injection/race conditions.\n- **Performance**: Prefer O(n log n) / O(n) passes, reuse allocations, and avoid blocking UI/event loops.\n- **Next step**: Ask *\"add unit tests\"*, *\"rewrite in Go/Rust/Python\"*, or paste your own code for an instant static review."
			}
			return trimmed + "\n\n#### Luma Code 2.0 · Инженерный разбор и чеклист\n- **Надёжность и безопасность**: валидируйте входные данные, выставляйте таймауты на сеть/диск и избегайте утечек ресурсов.\n- **Сложность и производительность**: кэшируйте частые операции, используйте потоковую обработку и не блокируйте главный поток.\n- **Что дальше**: напишите *«добавь тесты»*, *«перепиши на Go / Python / TypeScript»* или вставьте свой код для мгновенного ревью."
		}
		extra := ""
		if !strings.Contains(trimmed, "Wikipedia") && len([]rune(prompt)) >= 3 {
			if deepWiki := lookupWikipediaDeep(prompt, isEnglish); deepWiki != "" {
				extra = "\n\n#### Глубокая справка (Wikipedia)\n" + deepWiki
			}
		}
		if extra != "" {
			return trimmed + extra
		}
		if isEnglish {
			return trimmed + "\n\n#### Luma Lang 2.0 · Deep Context & Actionable Insights\n- **Key mechanism**: Connects first principles with practical application.\n- **Go deeper**: Ask *\"make a checklist\"*, *\"compare pros and cons\"*, or *\"write a plan\"* to continue."
		}
		return trimmed + "\n\n#### Luma Lang 2.0 · Глубокий контекст и выводы\n- **Практическая суть**: выделены ключевые причины, структура и влияние темы.\n- **Продолжить разбор**: напишите *«составь план»*, *«сделай чеклист»* или *«сравни плюсы и минусы»*."
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
	apiURL := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&exchars=1100&explaintext=true&redirects=1&format=json&titles=%s", lang, url.QueryEscape(clean))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "LumaOS-AI/2.0")
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
		"напиши сервер", "напиши класс", "напиши игру", "сделай скрипт", "сделай код", "код на ", "скрипт на ", "пример кода",
		"исправь код", "оптимизируй код", "проверь код", "ревью кода", "дебаг", "добавь тесты", "перепиши на ",
		"write code", "write a script", "write a function", "code in ", "review code", "debug ", "refactor ",
		"powershell", "bash ", "python", "javascript", "typescript", "golang", "rust", "c++", "c#", "csharp",
		"react", "html", "css", "sql", "regex", "регулярк", "telegram bot", "телеграм бот", "discord bot", "дискорд бот",
		"quicksort", "сортировк", "dockerfile", "docker-compose", "git ", "fastapi", "express", "dijkstra", "дейкстр", "lru", "bfs", "dfs", "змейк", "snake", "unity",
	) {
		return true
	}
	return false
}

// ==================== ENGINE 1: LUMA LANG 2.0 (LANGUAGE, REASONING, WRITING & KNOWLEDGE MODEL) ====================

func generateLanguageReply(prompt, low string, isEn bool, kernel *LumaKernel, allowAutoCodeFallback bool, prevAssistant string) string {
	// 1. Live Deep System Diagnostics / PC Specs / Battery / Security Health
	if containsAny(low, "нагрузк", "процессор", "cpu", "память", "ram", "озу", "диск", "мой пк", "мою систему", "диагност", "оптимиз", "батаре", "аккумулятор", "battery", "system specs", "hardware", "тормозит", "антивирус", "безопасн") && !containsAny(low, "что такое cpu", "что такое процессор", "что такое ram", "что такое озу") {
		return buildSystemDiagnosticsReply(kernel)
	}

	// 2. Password / UUID / SHA-256 / Base64 / Hex-Bin Utilities
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

	// 4. Luma AI 3.0 Enhanced Intelligence (Live Translation, Text Summarizer/Fixer, Loan Calc, Practical Guides, Side-by-Side Comparisons)
	if ai30Reply, ok := tryLumaAI30Enhanced(prompt, low, isEn, prevAssistant); ok {
		return ai30Reply
	}

	// 4b. Writing Studio: Emails, Project Plans, Checklists, Summaries, Pros & Cons, Comparisons
	if wr, ok := tryGenerateStructuredWriting(prompt, low, isEn); ok {
		return wr
	}

	// 5. Quadratic equation solver (ax^2 + bx + c = 0) & Smart Math Evaluator
	if quad, ok := trySolveQuadratic(low); ok {
		return quad
	}
	if expr, val, ok := tryEvalSmartMath(prompt); ok {
		if isEn {
			return fmt.Sprintf("### Luma Lang 3.0 · Calculation\n\n`%s` = **%s**", expr, formatFloatClean(val))
		}
		return fmt.Sprintf("### Luma Lang 3.0 · Результат вычисления\n\n`%s` = **%s**", expr, formatFloatClean(val))
	}

	// 6. Unit Converter (km/mi, C/F, kg/lb, GB/MB, m/s <-> km/h)
	if conv, ok := tryConvertUnits(low); ok {
		return conv
	}

	// 7. JSON Validator / Formatter
	if idx := strings.IndexAny(prompt, "{["); idx >= 0 && (strings.Contains(prompt, "}") || strings.Contains(prompt, "]")) {
		cand := strings.TrimSpace(prompt[idx:])
		var v interface{}
		if json.Unmarshal([]byte(cand), &v) == nil {
			pretty, _ := json.MarshalIndent(v, "", "  ")
			return fmt.Sprintf("JSON валиден! Отформатированный результат:\n```json\n%s\n```", string(pretty))
		}
	}

	// 8. Curated Offline Encyclopedia Knowledge Base
	if kbReply, ok := lookupOfflineKnowledge(low); ok {
		return kbReply
	}

	// 9. Luma OS 1.5.2 Capabilities & Help
	if containsAny(low, "luma", "лума", "горяч", "клавиш", "hotkey", "помощ", "help", "что ты умеешь", "что ты можешь", "what can you do", "возможност") {
		return "### Luma AI 3.0 — Интеллектуальный движок уровня AI Overview (без API)\n\n" +
			"В **Luma OS 1.5.2 (Carbon · Ядро 1.4.5)** работают три объединённых модуля с памятью диалога:\n\n" +
			"1. **Luma Lang 3.0 + Live Knowledge Synthesis** — синтезирует структурированные ответы по любым темам из энциклопедии, Wikipedia и веб-знаний, переводит тексты (`переведи на английский: ...`), сокращает/проверяет вставленные тексты, считает кредиты/математику/уравнения и помогает с настройкой ПК.\n" +
			"2. **Luma Code 3.0 (`Кодер`)** — статический поиск багов и ревью кода, 45+ шаблонов на `Python`, `TypeScript`, `React`, `Go`, `Rust`, `C++`, `C#`, `SQL`, `HTML/CSS`, `Docker`, `PowerShell`, `Bash`.\n" +
			"3. **Диагностика и облако** — живой анализ вашего ПК (CPU/RAM/GPU/батарея) + опциональное подключение **Gemini / OpenAI / Claude / DeepSeek / Ollama**."
	}

	// 10. Greetings & Small Talk
	if containsAny(low, "привет", "здравств", "хай", "hello", "hi ", "hey", "салют", "добрый", "доброе утро", "добрый вечер") || low == "hi" {
		if isEn {
			return "Hello! I'm **Luma AI 3.0** inside Luma OS `1.5.2 (Carbon · Kernel 1.4.5)`.\n\nAsk me anything — factual questions, translations, text summaries, comparisons (`A vs B`), math/finance, PC troubleshooting, or paste code for review!"
		}
		return "Привет! Я **Luma AI 3.0** в Luma OS `1.5.2 (Carbon · Ядро 1.4.5)`.\n\nСпрашивайте что угодно:\n- Любые вопросы по науке, истории, технологиям, играм и жизни *(живой синтез ответа как AI Overview)*\n- *«Переведи на английский: ...»*, *«Сократи текст: ...»*, *«Сравни RTX 4060 и 4070»*\n- *«Кредит 500000 на 24 мес под 16%»* или *«Реши 2x^2 - 5x + 2 = 0»*\n- *«Как поднять FPS»*, *«Проанализируй мой ПК»* или вставьте любой код для поиска ошибок!"
	}

	if containsAny(low, "спасибо", "благодар", "thanks", "thank you", "круто", "отлично", "молодец") {
		if isEn {
			return "You're welcome! Ask a follow-up anytime — I remember our conversation context."
		}
		return "Пожалуйста! Если нужно углубить ответ, сравнить варианты или разобрать код — просто напишите."
	}

	if containsAny(low, "как дела", "как ты", "how are you") {
		if isEn {
			return "Running at peak speed on **LumaCore 1.4.5** with **Luma AI 3.0** active! What shall we explore or build?"
		}
		return "Отлично! Работаю на ядре **LumaCore 1.4.5** с движком **Luma AI 3.0**. Чем займёмся — разберём любую тему, переведём текст, проверим ПК или напишем код?"
	}

	// 11. Auto-mode fallback to Code 3.0
	if allowAutoCodeFallback && (isExplicitCodeRequest(low) || looksLikePastedCode(prompt)) {
		return generateCoderReply(prompt, low, isEn, kernel, prevAssistant)
	}

	// 12. Live Dual-Source Web Overview Synthesis (Wikipedia Full Search + DuckDuckGo Instant Answer!)
	if webOverview, ok := answerWithLiveWebOverview(prompt, low, isEn); ok {
		return webOverview
	}

	// 13. Classic Wikipedia summary fallback
	if topic := extractKnowledgeTopic(prompt, low); topic != "" {
		if wikiReply, ok := fetchWikipediaSummary(topic, isEn); ok {
			return wikiReply
		}
	}

	// 14. Clean fallback
	if isEn {
		return fmt.Sprintf("### Luma AI 3.0\n\nI couldn't retrieve a live match for *\"%s\"* right now (offline or very specific query).\n\n- Try rephrasing with key terms, **\"Compare A and B\"**, **\"Translate to ...\"**, **\"Make a plan for ...\"**, or paste code for review\n- You can also connect **Gemini / OpenAI / Claude / Ollama** in AI Settings.", prompt)
	}
	return fmt.Sprintf("### Luma AI 3.0\n\nПо запросу *«%s»* не удалось получить точную справку (возможно, нет сети или слишком редкая формулировка).\n\n- Попробуйте уточнить тему ключевыми словами: *«Что такое ...»*, *«Сравни A и B»*, *«Переведи на английский: ...»*, *«Составь план ...»*, *«Как поднять FPS»*\n- Для программирования и поиска ошибок вставьте код — сработает **Luma Code 3.0**\n- Также можно подключить облачную модель (**Gemini / OpenAI / Claude / DeepSeek / Ollama**) в Настройках ИИ.", prompt)
}

func tryGenerateStructuredWriting(prompt, low string, isEn bool) (string, bool) {
	if containsAny(low, "напиши письмо", "деловое письмо", "составь письмо", "write an email", "email template") {
		topic := strings.TrimSpace(regexp.MustCompile(`(?i)(напиши|составь|сделай)?\s*(деловое\s+)?письмо\s*(о|про|на тему|для)?`).ReplaceAllString(prompt, ""))
		if topic == "" {
			topic = "сотрудничество и обсуждение проекта"
		}
		return fmt.Sprintf("### Черновик делового письма (`Luma Lang 2.0`)\n\n**Тема:** %s\n\nЗдравствуйте!\n\nПишу вам по вопросу: **%s**.\n\nКратко по ключевым пунктам:\n1. **Цель:** согласовать детали и план действий.\n2. **Текущий статус:** подготовлены базовые материалы и предложения.\n3. **Следующий шаг:** буду рад(а) обсудить подробности в удобное для вас время (например, завтра в 11:00 или 15:00).\n\nБуду благодарен(на) за обратную связь.\n\nС уважением,\n*[Ваше имя / Контакты]*", strings.Title(topic), topic), true
	}
	if containsAny(low, "составь план", "план действий", "дорожную карту", "roadmap", "чек-лист", "чеклист", "checklist", "make a plan") {
		topic := strings.TrimSpace(regexp.MustCompile(`(?i)(составь|сделай|напиши)?\s*(подробный\s+)?(план(\s+действий)?|дорожную карту|roadmap|чек-?лист|checklist)\s*(по|для|на тему|изучения)?`).ReplaceAllString(prompt, ""))
		if topic == "" {
			topic = "достижение вашей цели"
		}
		return fmt.Sprintf("### Пошаговый план: %s (`Luma Lang 2.0`)\n\n1. **Этап 1 · Фундамент и подготовка (Дни 1–3)**\n   - [ ] Зафиксируйте конкретный измеримый результат и дедлайн\n   - [ ] Соберите ключевые инструменты, ресурсы и референсы\n   - [ ] Разбейте задачу на 3–5 независимых модулей\n2. **Этап 2 · Быстрый прототип / MVP (Дни 4–10)**\n   - [ ] Реализуйте минимально рабочую версию (правило 80/20)\n   - [ ] Ежедневно уделяйте 45–90 минут сфокусированной работы (таймер Pomodoro)\n   - [ ] Проведите первую проверку на реальном сценарии\n3. **Этап 3 · Улучшение и полировка (Дни 11–18)**\n   - [ ] Устраните узкие места, баги и пробелы\n   - [ ] Добавьте автоматизацию, оформление и документацию\n4. **Этап 4 · Финальный запуск и ретроспектива**\n   - [ ] Финальное тестирование по чеклисту\n   - [ ] Подведение итогов и фиксация следующих улучшений\n\n*Совет: откройте **Luma Office Studio → Docs** или **Календарь Luma**, чтобы перенести этапы в расписание!*", topic), true
	}
	if containsAny(low, "плюсы и минусы", "сравни ", "сравнение ", "pros and cons", "compare ") && !isExplicitCodeRequest(low) {
		return fmt.Sprintf("### Структурное сравнение (`Luma Lang 2.0`)\n\nПо запросу: **%s**\n\n| Критерий | Сильные стороны (+) | Риски и ограничения (−) |\n|---|---|---|\n| **Скорость старта** | Быстрое внедрение и понятный порог входа | Может потребоваться адаптация под специфические задачи |\n| **Гибкость и масштаб** | Хорошо масштабируется при росте нагрузки | Сложность поддержки возрастает без стандартов |\n| **Стоимость / Ресурсы** | Предсказуемые затраты времени и ресурсов | Требуется периодическое обновление и аудит |\n\n**Рекомендация:** выбирайте вариант, который закрывает 80%% ваших текущих задач с минимальной сложностью сопровождения.", prompt), true
	}
	return "", false
}

var quadEqRe = regexp.MustCompile(`(?i)(-?\d*(?:[.,]\d+)?)\s*x\^2\s*([+-]\s*\d*(?:[.,]\d+)?)\s*x\s*([+-]\s*\d+(?:[.,]\d+)?)\s*=\s*0`)

func trySolveQuadratic(low string) (string, bool) {
	m := quadEqRe.FindStringSubmatch(strings.ReplaceAll(low, " ", ""))
	if len(m) != 4 {
		return "", false
	}
	parseCoef := func(s string) float64 {
		s = strings.ReplaceAll(s, ",", ".")
		if s == "" || s == "+" {
			return 1
		}
		if s == "-" {
			return -1
		}
		v, _ := strconv.ParseFloat(s, 64)
		return v
	}
	a := parseCoef(m[1])
	b := parseCoef(m[2])
	c := parseCoef(m[3])
	if a == 0 {
		return "", false
	}
	d := b*b - 4*a*c
	var res strings.Builder
	res.WriteString(fmt.Sprintf("### Решение квадратного уравнения (`Luma Lang 2.0`)\n\nКоэффициенты: `a = %s`, `b = %s`, `c = %s`\n\nДискриминант: `D = b² - 4ac = %s`\n\n", formatFloatClean(a), formatFloatClean(b), formatFloatClean(c), formatFloatClean(d)))
	if d > 0 {
		x1 := (-b + math.Sqrt(d)) / (2 * a)
		x2 := (-b - math.Sqrt(d)) / (2 * a)
		res.WriteString(fmt.Sprintf("**Два действительных корня:**\n- `x₁ = %s`\n- `x₂ = %s`", formatFloatClean(x1), formatFloatClean(x2)))
	} else if math.Abs(d) < 1e-9 {
		x := -b / (2 * a)
		res.WriteString(fmt.Sprintf("**Один корень:** `x = %s`", formatFloatClean(x)))
	} else {
		realPart := -b / (2 * a)
		imagPart := math.Sqrt(-d) / (2 * a)
		res.WriteString(fmt.Sprintf("**Комплексные корни:** `x₁,₂ = %s ± %si`", formatFloatClean(realPart), formatFloatClean(imagPart)))
	}
	return res.String(), true
}

// ==================== ENGINE 2: LUMA CODE 2.0 (SENIOR CODER, REVIEWER & ARCHITECTURE ENGINE) ====================

func reviewPastedCode(prompt string) string {
	lines := strings.Split(prompt, "\n")
	var findings []string
	low := strings.ToLower(prompt)
	if strings.Contains(low, "eval(") || strings.Contains(low, "exec(") {
		findings = append(findings, "**[Безопасность · Высокий риск]** Обнаружен вызов `eval/exec` — замените на безопасный парсер (`JSON.parse`, `ast.literal_eval` или словарь функций).")
	}
	if strings.Contains(low, "innerhtml") {
		findings = append(findings, "**[Безопасность · XSS]** Использование `innerHTML` с пользовательскими данными открывает XSS-вектор — используйте `textContent` или санитайзер.")
	}
	if strings.Contains(low, "select ") && (strings.Contains(low, "+ ") || strings.Contains(low, "f\"") || strings.Contains(low, "${")) {
		findings = append(findings, "**[Безопасность · SQL Injection]** Возможна конкатенация в SQL-запросе — используйте параметризованные запросы (`?` / `$1`).")
	}
	if strings.Contains(low, "except:") || strings.Contains(low, "catch {}") || strings.Contains(low, "catch(e) {}") {
		findings = append(findings, "**[Надёжность]** Пустой блок `except/catch` скрывает ошибки — добавьте логирование или явную обработку.")
	}
	if strings.Contains(low, "var ") && (strings.Contains(low, "function") || strings.Contains(low, "=>")) {
		findings = append(findings, "**[Стиль JS/TS]** Замените устаревший `var` на `const` / `let` для предсказуемой блочной области видимости.")
	}
	if strings.Contains(low, "==") && !strings.Contains(low, "===") && (strings.Contains(low, "const ") || strings.Contains(low, "let ") || strings.Contains(low, "function ")) {
		findings = append(findings, "**[JS/TS]** Используйте строгое сравнение `===` вместо `==`, чтобы избежать неявного приведения типов.")
	}
	if strings.Contains(low, "password") || strings.Contains(low, "api_key") || strings.Contains(low, "token = \"") {
		findings = append(findings, "**[Секреты]** Не храните токены и пароли в открытом коде — вынесите их в переменные окружения (`os.Getenv` / `process.env`).")
	}
	if len(findings) == 0 {
		findings = append(findings, "Критических уязвимостей и антипаттернов по статическому анализу не обнаружено — структура выглядит чистой.")
	}
	return fmt.Sprintf("### Luma Code 2.0 · Статический анализ и ревью кода\n\nПроанализировано строк: **%d**\n\n#### Результаты проверки:\n- %s\n\n#### Рекомендации по улучшению:\n- Добавьте граничные проверки входных аргументов и явные типы возвращаемых значений.\n- Покройте основную логику 2–3 unit-тестами (нормальный случай, пустой вход, ошибка).\n- Можете попросить *«перепиши на Go / Python / TypeScript»* или *«добавь тесты»*.", len(lines), strings.Join(findings, "\n- "))
}

func generateCoderReply(prompt, low string, isEn bool, kernel *LumaKernel, prevAssistant string) string {
	// 0. Static Code Reviewer & Debugger when user pastes code!
	if looksLikePastedCode(prompt) && (containsAny(low, "проверь", "ревью", "исправ", "ошибк", "баг", "оптимиз", "объясни", "review", "debug", "fix") || strings.Count(prompt, "\n") >= 4) {
		return reviewPastedCode(prompt)
	}

	if containsAny(low, "проанализ", "диагност", "нагрузк") && containsAny(low, "пк", "cpu", "ram", "систему") {
		return buildSystemDiagnosticsReply(kernel)
	}
	if expr, val, ok := tryEvalSmartMath(prompt); ok && !containsAny(low, "код", "python", "js", "script", "функц") {
		return fmt.Sprintf("### Вычисление (`Luma Code 2.0`)\n\n`%s` = **%s**", expr, formatFloatClean(val))
	}

	// 1. Unit Tests Generator
	if containsAny(low, "добавь тест", "напиши тест", "unit test", "pytest", "jest") {
		return "### Python (`pytest`) · Шаблон модульных тестов с фикстурами и параметризацией\n\n```python\nimport pytest\n\ndef calc_discount(price: float, percent: float) -> float:\n    if price < 0 or not (0 <= percent <= 100):\n        raise ValueError(\"Некорректные аргументы\")\n    return round(price * (1 - percent / 100), 2)\n\n@pytest.mark.parametrize(\"price,pct,expected\", [\n    (1000, 10, 900.0),\n    (250, 0, 250.0),\n    (99.99, 50, 50.0),\n])\ndef test_calc_discount_valid(price, pct, expected):\n    assert calc_discount(price, pct) == expected\n\ndef test_calc_discount_invalid():\n    with pytest.raises(ValueError):\n        calc_discount(-10, 15)\n```"
	}

	// 2. Discord Bot
	if containsAny(low, "discord", "дискорд") && containsAny(low, "бот", "bot") {
		return "### Python · Discord-бот со слеш-командами (`discord.py 2.x`)\n\n```python\nimport os\nimport discord\nfrom discord import app_commands\n\nclass LumaBot(discord.Client):\n    def __init__(self):\n        super().__init__(intents=discord.Intents.default())\n        self.tree = app_commands.CommandTree(self)\n\n    async def setup_hook(self):\n        await self.tree.sync()\n\nbot = LumaBot()\n\n@bot.tree.command(name=\"ping\", description=\"Проверка задержки бота\")\nasync def ping(interaction: discord.Interaction):\n    await interaction.response.send_message(f\"Pong! `{round(bot.latency * 1000)} мс`\")\n\nbot.run(os.environ[\"DISCORD_TOKEN\"])\n```"
	}

	// 3. FastAPI / Modern Async Python Backend
	if containsAny(low, "fastapi", "uvicorn", "pydantic") {
		return "### Python · Продакшн-API на FastAPI с валидацией Pydantic\n\n```python\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel, Field\n\napp = FastAPI(title=\"Luma API 2.0\")\nitems: dict[int, dict] = {}\n\nclass TaskIn(BaseModel):\n    title: str = Field(min_length=2, max_length=120)\n    done: bool = False\n\n@app.post(\"/tasks\", status_code=201)\nasync def create_task(task: TaskIn):\n    tid = len(items) + 1\n    items[tid] = {\"id\": tid, **task.model_dump()}\n    return items[tid]\n\n@app.get(\"/tasks/{tid}\")\nasync def get_task(tid: int):\n    if tid not in items:\n        raise HTTPException(status_code=404, detail=\"Task not found\")\n    return items[tid]\n```"
	}

	// 4. Graph Algorithms (Dijkstra / BFS / DFS / LRU Cache)
	if containsAny(low, "дейкстр", "dijkstra", "граф", "bfs", "dfs", "кратчайш") {
		return "### Python · Алгоритм Дейкстры `O((V + E) log V)`\n\n```python\nimport heapq\n\ndef dijkstra(graph: dict[str, list[tuple[str, int]]], start: str) -> dict[str, float]:\n    dist = {node: float(\"inf\") for node in graph}\n    dist[start] = 0\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]:\n            continue\n        for v, w in graph[u]:\n            nd = d + w\n            if nd < dist[v]:\n                dist[v] = nd\n                heapq.heappush(pq, (nd, v))\n    return dist\n\ng = {\"A\": [(\"B\", 4), (\"C\", 1)], \"B\": [(\"D\", 1)], \"C\": [(\"B\", 2), (\"D\", 5)], \"D\": []}\nprint(dijkstra(g, \"A\"))  # {'A': 0, 'B': 3, 'C': 1, 'D': 4}\n```"
	}

	if containsAny(low, "lru", "кэш", "cache") {
		return "### TypeScript · O(1) LRU Cache (на базе `Map`)\n\n```typescript\nexport class LRUCache<K, V> {\n  private map = new Map<K, V>();\n  constructor(private readonly capacity: number) {}\n\n  get(key: K): V | undefined {\n    if (!this.map.has(key)) return undefined;\n    const val = this.map.get(key)!;\n    this.map.delete(key);\n    this.map.set(key, val);\n    return val;\n  }\n\n  set(key: K, val: V): void {\n    if (this.map.has(key)) this.map.delete(key);\n    else if (this.map.size >= this.capacity) {\n      const oldest = this.map.keys().next().value;\n      if (oldest !== undefined) this.map.delete(oldest);\n    }\n    this.map.set(key, val);\n  }\n}\n```"
	}

	// 5. Mini-Game (HTML5 Canvas Snake)
	if containsAny(low, "змейк", "snake", "игр", "game") {
		return "### HTML5 + JS · Мини-игра «Змейка» (готова к запуску в Luma Code Studio → Preview!)\n\n```html\n<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><style>body{margin:0;height:100vh;display:grid;place-items:center;background:#09090b;color:#fff;font-family:system-ui}canvas{border:2px solid #38bdf8;border-radius:12px;background:#0f172a}</style></head><body><div><div id=\"sc\" style=\"text-align:center;margin-bottom:8px;font-weight:700\">Счёт: 0</div><canvas id=\"c\" width=\"320\" height=\"320\"></canvas></div><script>const ctx=c.getContext('2d'),G=16;let s=[{x:8,y:8}],d={x:1,y:0},f={x:12,y:8},score=0;addEventListener('keydown',e=>{const m={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}}[e.key];if(m&&(m.x!==-d.x||m.y!==-d.y))d=m;});setInterval(()=>{const h={x:(s[0].x+d.x+20)%20,y:(s[0].y+d.y+20)%20};if(s.some(p=>p.x===h.x&&p.y===h.y)){s=[{x:8,y:8}];score=0;}else{s.unshift(h);if(h.x===f.x&&h.y===f.y){score++;f={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};}else s.pop();}sc.textContent='Счёт: '+score;ctx.clearRect(0,0,320,320);ctx.fillStyle='#f43f5e';ctx.fillRect(f.x*G,f.y*G,G-2,G-2);ctx.fillStyle='#38bdf8';s.forEach(p=>ctx.fillRect(p.x*G,p.y*G,G-2,G-2));},110);</script></body></html>\n```"
	}

	// 6. PowerShell / Windows Automation
	if containsAny(low, "powershell", "ps1", "очистк", "временн", "temp", "бэкап", "backup", "реестр") {
		if containsAny(low, "бэкап", "backup", "копир") {
			return "### PowerShell · Резервное копирование папки с датой\n\n```powershell\n$src = \"$env:USERPROFILE\\Documents\\Projects\"\n$dst = \"$env:USERPROFILE\\Desktop\\Backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm')\"\nCopy-Item -Path $src -Destination $dst -Recurse -Force\nWrite-Host \"Бэкап создан: $dst\" -ForegroundColor Green\n```"
		}
		if containsAny(low, "процесс", "process", "топ", "ram", "cpu") {
			return "### PowerShell · Топ-10 процессов по памяти\n\n```powershell\nGet-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, Id, @{\n  Name = 'RAM_MB'; Expression = { [math]::Round($_.WorkingSet64 / 1MB, 1) }\n} | Format-Table -AutoSize\n```"
		}
		return "### PowerShell · Безопасная очистка кэша Temp\n\n```powershell\n$before = (Get-ChildItem $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum\nGet-ChildItem $env:TEMP -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue\nWrite-Host (\"Освобождено ~{0:N1} МБ\" -f ($before / 1MB)) -ForegroundColor Cyan\n```"
	}

	// 7. Docker / Compose / Git / Bash
	if containsAny(low, "docker-compose", "compose") {
		return "### Docker Compose · Backend + PostgreSQL + Redis\n\n```yaml\nservices:\n  api:\n    build: .\n    ports: [\"8080:8080\"]\n    environment:\n      DATABASE_URL: postgres://app:secret@db:5432/luma\n    depends_on: [db, redis]\n  db:\n    image: postgres:16-alpine\n    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: secret, POSTGRES_DB: luma }\n    volumes: [pgdata:/var/lib/postgresql/data]\n  redis:\n    image: redis:7-alpine\nvolumes:\n  pgdata:\n```"
	}
	if containsAny(low, "dockerfile", "docker") {
		return "### Multi-stage Dockerfile (Go / Node)\n\n```dockerfile\nFROM golang:1.23-alpine AS builder\nWORKDIR /app\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 go build -ldflags=\"-s -w\" -o server .\n\nFROM alpine:3.20\nWORKDIR /app\nCOPY --from=builder /app/server .\nEXPOSE 8080\nENTRYPOINT [\"./server\"]\n```"
	}
	if containsAny(low, "git ", "гит", "коммит", "ветк") {
		return "### Git · Профессиональный рабочий процесс\n\n```bash\ngit status -sb                  # Краткий статус\ngit switch -c feat/carbon-ui    # Новая ветка\ngit add -A && git commit -m \"feat: обновление интерфейса\"\ngit fetch origin && git rebase origin/main\ngit push -u origin feat/carbon-ui\n```"
	}
	if containsAny(low, "bash", "linux", "shell", "sh ") {
		return "### Bash · Мониторинг сервера и ротация бэкапов\n\n```bash\n#!/usr/bin/env bash\nset -euo pipefail\necho \"Host: $(hostname) | Uptime: $(uptime -p)\"\ndf -h / | tail -n 1\ntar -czf \"backup_$(date +%Y%m%d_%H%M).tar.gz\" ./projects 2>/dev/null || true\nfind . -name \"backup_*.tar.gz\" -mtime +7 -delete\necho \"Готово!\"\n```"
	}

	// 8. Rust / C++ / C# / Go / SQL
	if containsAny(low, "rust", "раст", "cargo") {
		return "### Rust · Безопасный параллельный обработчик потоков\n\n```rust\nuse std::thread;\n\nfn main() {\n    let nums = vec![10, 20, 30, 40, 50];\n    let handle = thread::spawn(move || nums.iter().sum::<i32>());\n    println!(\"Сумма элементов: {}\", handle.join().unwrap());\n}\n```"
	}
	if containsAny(low, "c++", "cpp", "плюс") {
		return "### C++20 · Быстрая сортировка с Ranges и лямбдой\n\n```cpp\n#include <algorithm>\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> data = {42, 7, 19, 3, 25, 11};\n    std::ranges::sort(data);\n    for (int x : data) std::cout << x << ' ';\n    std::cout << '\\n';\n}\n```"
	}
	if containsAny(low, "c#", "csharp", ".net", "dotnet", "unity") {
		if containsAny(low, "unity") {
			return "### C# (Unity) · Плавный контроллер движения персонажа\n\n```csharp\nusing UnityEngine;\n\npublic class PlayerMover : MonoBehaviour {\n    [SerializeField] private float speed = 6f;\n    private Rigidbody rb;\n    void Awake() => rb = GetComponent<Rigidbody>();\n    void FixedUpdate() {\n        var dir = new Vector3(Input.GetAxisRaw(\"Horizontal\"), 0f, Input.GetAxisRaw(\"Vertical\")).normalized;\n        rb.MovePosition(rb.position + dir * (speed * Time.fixedDeltaTime));\n    }\n}\n```"
		}
		return "### C# (.NET 8) · Асинхронный HTTP JSON клиент\n\n```csharp\nusing System.Net.Http.Json;\n\nusing var http = new HttpClient();\nhttp.DefaultRequestHeaders.UserAgent.ParseAdd(\"LumaOS-Client/1.5.1\");\nvar repo = await http.GetFromJsonAsync<RepoInfo>(\"https://api.github.com/repos/Tveexty/L_H-3.0\");\nConsole.WriteLine($\"{repo?.full_name}: ★ {repo?.stargazers_count}\");\n\nrecord RepoInfo(string full_name, int stargazers_count);\n```"
	}
	if containsAny(low, "golang", "на go", " go ", "go сервер", "go http", "голанг") {
		return "### Go · Высокопроизводительный JSON API с graceful shutdown\n\n```go\npackage main\n\nimport (\n\t\"encoding/json\"\n\t\"log\"\n\t\"net/http\"\n\t\"time\"\n)\n\nfunc main() {\n\tmux := http.NewServeMux()\n\tmux.HandleFunc(\"/api/health\", func(w http.ResponseWriter, r *http.Request) {\n\t\tw.Header().Set(\"Content-Type\", \"application/json\")\n\t\t_ = json.NewEncoder(w).Encode(map[string]any{\"ok\": true, \"ts\": time.Now().Unix()})\n\t})\n\tsrv := &http.Server{Addr: \"127.0.0.1:8080\", Handler: mux, ReadHeaderTimeout: 5 * time.Second}\n\tlog.Println(\"Listening on http://127.0.0.1:8080\")\n\tlog.Fatal(srv.ListenAndServe())\n}\n```"
	}
	if containsAny(low, "sql", "таблиц", "запрос бд", "select ", "postgres", "sqlite", "mysql") {
		return "### SQL · Аналитический запрос с оконными функциями (CTE + RANK)\n\n```sql\nWITH sales_by_user AS (\n  SELECT user_id, SUM(amount) AS total_spent, COUNT(*) AS orders_cnt\n  FROM orders\n  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'\n  GROUP BY user_id\n)\nSELECT user_id, total_spent, orders_cnt,\n       DENSE_RANK() OVER (ORDER BY total_spent DESC) AS vip_rank\nFROM sales_by_user\nORDER BY vip_rank\nLIMIT 20;\n```"
	}

	// 9. HTML / CSS / React / TS / JS
	if containsAny(low, "html", "css", "кнопк", "карточк", "страниц", "сайт", "верстк", "landing", "форма", "меню") {
		return "### HTML + CSS · Адаптивная карточка Luma Carbon (Glassmorphism)\n\n```html\n<!doctype html>\n<html lang=\"ru\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<style>\n  body { margin:0; min-height:100vh; display:grid; place-items:center; background:radial-gradient(circle at top,#0c4a6e,#09090b 65%); color:#f4f4f5; font-family:system-ui,sans-serif; }\n  .card { width:min(380px,90vw); padding:28px; border-radius:24px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); backdrop-filter:blur(18px); box-shadow:0 24px 60px rgba(0,0,0,.5); }\n  button { margin-top:18px; width:100%; padding:11px 16px; border:0; border-radius:14px; background:#38bdf8; color:#082f49; font-weight:700; cursor:pointer; transition:.15s; }\n  button:hover { filter:brightness(1.1); transform:translateY(-1px); }\n</style></head>\n<body><div class=\"card\"><h2>Luma Carbon 1.5.1</h2><p>Чистая адаптивная вёрстка без сторонних библиотек.</p><button onclick=\"this.textContent='Готово ✓'\">Активировать</button></div></body></html>\n```"
	}
	if containsAny(low, "react", "tsx", "компонент", "хук", "hook") {
		return "### React + TypeScript · Универсальный хук `useDebounce` + Поиск\n\n```tsx\nimport { useEffect, useState } from 'react';\n\nexport function useDebounce<T>(value: T, delayMs = 250): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delayMs);\n    return () => clearTimeout(id);\n  }, [value, delayMs]);\n  return debounced;\n}\n```"
	}
	if containsAny(low, "express", "node") && containsAny(low, "сервер", "server", "api") {
		return "### Node.js + Express · Лёгкий REST API сервер\n\n```javascript\nimport express from 'express';\nconst app = express();\napp.use(express.json());\n\napp.get('/api/status', (_req, res) => res.json({ ok: true, engine: 'Luma Code 2.0' }));\napp.listen(3000, () => console.log('API listening on :3000'));\n```"
	}
	if containsAny(low, "javascript", "typescript", " js", " ts", "fetch", "таймер", "timer", "promise", "async") {
		if containsAny(low, "таймер", "timer", "секундомер") {
			return "### JavaScript · Точный таймер обратного отсчёта\n\n```javascript\nfunction startCountdown(seconds) {\n  let remaining = seconds;\n  const timer = setInterval(() => {\n    const m = String(Math.floor(remaining / 60)).padStart(2, '0');\n    const s = String(remaining % 60).padStart(2, '0');\n    console.log(`${m}:${s}`);\n    if (--remaining < 0) { clearInterval(timer); console.log('Готово!'); }\n  }, 1000);\n}\nstartCountdown(15);\n```"
		}
		return "### TypeScript · Fetch JSON с таймаутом и авто-повтором (Retry)\n\n```typescript\nasync function fetchJsonWithRetry<T>(url: string, retries = 2, timeoutMs = 5000): Promise<T> {\n  for (let attempt = 0; attempt <= retries; attempt++) {\n    const ctrl = new AbortController();\n    const t = setTimeout(() => ctrl.abort(), timeoutMs);\n    try {\n      const res = await fetch(url, { signal: ctrl.signal });\n      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n      return (await res.json()) as T;\n    } catch (err) {\n      if (attempt === retries) throw err;\n      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));\n    } finally { clearTimeout(t); }\n  }\n  throw new Error('Unreachable');\n}\n```"
	}

	// 10. Python Cookbook
	if containsAny(low, "бот", "telegram", "телеграм", "aiogram") {
		return "### Python · Асинхронный Telegram-бот (`aiogram 3` + Inline-кнопки)\n\n```python\nimport asyncio, os\nfrom aiogram import Bot, Dispatcher, types\nfrom aiogram.filters import CommandStart\nfrom aiogram.utils.keyboard import InlineKeyboardBuilder\n\ndp = Dispatcher()\n\n@dp.message(CommandStart())\nasync def cmd_start(msg: types.Message):\n    kb = InlineKeyboardBuilder()\n    kb.button(text=\"Статус ПК\", callback_data=\"status\")\n    await msg.answer(f\"Привет, {msg.from_user.first_name}!\", reply_markup=kb.as_markup())\n\n@dp.callback_query(lambda c: c.data == \"status\")\nasync def on_status(cb: types.CallbackQuery):\n    await cb.message.answer(\"Система работает стабильно (Luma OS 1.5.1)!\")\n    await cb.answer()\n\nasync def main():\n    await dp.start_polling(Bot(token=os.environ[\"BOT_TOKEN\"]))\n\nif __name__ == \"__main__\":\n    asyncio.run(main())\n```"
	}
	if containsAny(low, "сервер", "server", "http", "flask", "api") {
		return "### Python · Локальный REST API сервер (0 зависимостей)\n\n```python\nimport json\nfrom http.server import BaseHTTPRequestHandler, HTTPServer\n\nclass Handler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        payload = json.dumps({\"ok\": True, \"path\": self.path}).encode(\"utf-8\")\n        self.send_response(200)\n        self.send_header(\"Content-Type\", \"application/json; charset=utf-8\")\n        self.end_headers()\n        self.wfile.write(payload)\n\nif __name__ == \"__main__\":\n    HTTPServer((\"127.0.0.1\", 8000), Handler).serve_forever()\n```"
	}
	if containsAny(low, "сортиров", "sort", "quicksort", "алгоритм", "бинарн", "binary") {
		if containsAny(low, "бинарн", "binary") {
			return "### Python · Бинарный поиск `O(log n)`\n\n```python\ndef binary_search(arr: list[int], target: int) -> int:\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        if arr[mid] < target: lo = mid + 1\n        else: hi = mid - 1\n    return -1\n```"
		}
		return "### Python · Быстрая сортировка QuickSort `O(n log n)`\n\n```python\ndef quicksort(arr: list[int]) -> list[int]:\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    return quicksort([x for x in arr if x < pivot]) + [x for x in arr if x == pivot] + quicksort([x for x in arr if x > pivot])\n```"
	}
	if containsAny(low, "парсер", "parser", "скрап", "scrape", "regex", "регуляр", "email") {
		return "### Python · Валидатор Email / URL и парсинг текста (Regex)\n\n```python\nimport re\nEMAIL_RE = re.compile(r\"^[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$\")\nURL_RE = re.compile(r\"https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+\")\nprint(URL_RE.findall(\"Сайт: https://github.com/Tveexty/L_H-3.0\"))\n```"
	}
	if containsAny(low, "файл", "file", "json", "csv", "чита", "запис") {
		return "### Python · Безопасное чтение и запись JSON (UTF-8)\n\n```python\nimport json\nfrom pathlib import Path\np = Path(\"config.json\")\np.write_text(json.dumps({\"os\": \"Luma 1.5.1\"}, ensure_ascii=False, indent=2), encoding=\"utf-8\")\nprint(json.loads(p.read_text(encoding=\"utf-8\")))\n```"
	}
	if containsAny(low, "калькулятор", "calc") {
		return "### Python · Безопасный калькулятор на AST\n\n```python\nimport ast, operator as op\nOPS = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul, ast.Div: op.truediv, ast.Pow: op.pow}\ndef safe_eval(n):\n    if isinstance(n, ast.Constant): return n.value\n    if isinstance(n, ast.BinOp): return OPS[type(n.op)](safe_eval(n.left), safe_eval(n.right))\n    raise ValueError(\"Недопустимая операция\")\nprint(safe_eval(ast.parse(\"2**10 + 48\", mode=\"eval\").body))\n```"
	}
	if containsAny(low, "фибонач", "fibonacci", "простые", "prime", "факториал") {
		return "### Python · Числа Фибоначчи с мемоизацией `O(n)`\n\n```python\nfrom functools import lru_cache\n@lru_cache(maxsize=None)\ndef fib(n: int) -> int:\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\nprint([fib(i) for i in range(15)])\n```"
	}
	if containsAny(low, "парол", "password", "шифр", "aes", "hash", "sha") {
		return "### Python · Генератор криптостойкого пароля и SHA-256\n\n```python\nimport hashlib, secrets, string\nalphabet = string.ascii_letters + string.digits + \"!@#$%^&*\"\npw = \"\".join(secrets.choice(alphabet) for _ in range(20))\nprint(\"Пароль:\", pw, \"\\nSHA-256:\", hashlib.sha256(pw.encode()).hexdigest())\n```"
	}

	if isEn {
		return fmt.Sprintf("### Luma Code 2.0 (Senior Coder & Reviewer · %s)\n\nPaste any code for an instant security & bug review, or specify a language (`Python`, `FastAPI`, `TS/JS`, `React`, `HTML/CSS`, `Go`, `Rust`, `C++`, `C#/Unity`, `SQL`, `Docker Compose`, `PowerShell`, `Bash`) and task (e.g. *Telegram/Discord bot, Dijkstra, LRU Cache, Snake game, Unit tests*).", runtime.GOOS)
	}
	return fmt.Sprintf("### Luma Code 2.0 (Программист и Код-ревьюер · %s)\n\nВставьте любой фрагмент кода для мгновенного поиска багов и уязвимостей, либо укажите задачу:\n- **Backend & Боты**: *«FastAPI сервер»*, *«Telegram бот aiogram»*, *«Discord бот»*, *«сервер на Go»*, *«Express API»*, *«Docker Compose»*\n- **Алгоритмы & Тесты**: *«алгоритм Дейкстры»*, *«LRU кэш»*, *«QuickSort»*, *«добавь тесты pytest»*\n- **Web / Игры / ОС**: *«игра змейка HTML»*, *«хук React useDebounce»*, *«Unity C# контроллер»*, *«SQL оконные функции»*, *«PowerShell очистка Temp»*\n\nДля общих знаний, планов и писем переключитесь на **Luma Lang 2.0**!", runtime.GOOS)
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
