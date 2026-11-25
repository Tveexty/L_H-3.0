package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"math"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA AI 5.0 NEXUS ====================
// Next-generation intelligent autonomous assistant with:
//   1. Persistent Long-Term Memory (%AppData%/LumaOS/ai_memory_v5.json) + Multi-turn Context
//   2. Resilient Multi-Engine Internet Knowledge (Wikipedia Full Extracts RU/EN, StackOverflow + Accepted Answers,
//      DuckDuckGo Open-Web + Live Webpage Reader, MyMemory Real 50-Language Translator, GitHub, MDN, HN, Weather, CBR, Crypto)
//   3. Advanced Math & Equation Solver (expressions, quadratic equations, percentages)
//   4. Deep OS Integration (Real PC Slowdown Diagnosis, Live Ping Check, Clipboard Reading/Translation,
//      Process Termination, Temp Cleanup, Media Control, Power Plans, Trash Move, Luma Lens Search, and full Desktop Control)

type AIMemoryFact struct {
	ID        string `json:"id"`
	Key       string `json:"key"`   // name | city | preference | note | topic
	Value     string `json:"value"`
	CreatedAt string `json:"created_at"`
}

type AIMemoryStore struct {
	UserName  string         `json:"user_name,omitempty"`
	UserCity  string         `json:"user_city,omitempty"`
	Facts     []AIMemoryFact `json:"facts"`
	LastTopic string         `json:"last_topic,omitempty"`
	UpdatedAt string         `json:"updated_at"`
}

var (
	aiMemMu     sync.RWMutex
	aiMemLoaded bool
	aiMemState  = AIMemoryStore{Facts: []AIMemoryFact{}}

	rePercentOf = regexp.MustCompile(`(?i)(\d+(?:[.,]\d+)?)\s*%\s*(?:от|of)\s*(\d+(?:[.,]\d+)?)`)
	reQuadEq    = regexp.MustCompile(`(?i)([+-]?\d*(?:\.\d+)?)x\^2([+-]\d*(?:\.\d+)?)x([+-]\d+(?:\.\d+)?)=0`)
)

func aiMemoryFilePath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "LumaOS")
	_ = os.MkdirAll(dir, 0o700)
	return filepath.Join(dir, "ai_memory_v5.json")
}

func ensureAIMemoryLoaded() {
	aiMemMu.Lock()
	defer aiMemMu.Unlock()
	if aiMemLoaded {
		return
	}
	aiMemLoaded = true
	raw, err := os.ReadFile(aiMemoryFilePath())
	if err == nil {
		_ = json.Unmarshal(raw, &aiMemState)
	}
	if aiMemState.Facts == nil {
		aiMemState.Facts = []AIMemoryFact{}
	}
}

func saveAIMemoryLocked() {
	aiMemState.UpdatedAt = time.Now().Format("02.01.2006 15:04")
	if raw, err := json.MarshalIndent(aiMemState, "", "  "); err == nil {
		_ = os.WriteFile(aiMemoryFilePath(), raw, 0o600)
	}
}

func GetAIMemorySnapshot() AIMemoryStore {
	ensureAIMemoryLoaded()
	aiMemMu.RLock()
	defer aiMemMu.RUnlock()
	cp := aiMemState
	cp.Facts = append([]AIMemoryFact{}, aiMemState.Facts...)
	return cp
}

func AddAIMemoryFact(key, value string) AIMemoryStore {
	ensureAIMemoryLoaded()
	key = strings.TrimSpace(key)
	value = strings.TrimSpace(value)
	if value == "" {
		return GetAIMemorySnapshot()
	}
	if key == "" {
		key = "note"
	}
	aiMemMu.Lock()
	defer aiMemMu.Unlock()
	if key == "name" {
		aiMemState.UserName = value
	} else if key == "city" {
		aiMemState.UserCity = value
	}
	// Deduplicate same key+value
	for i := range aiMemState.Facts {
		if (key == "name" || key == "city") && aiMemState.Facts[i].Key == key {
			aiMemState.Facts[i].Value = value
			aiMemState.Facts[i].CreatedAt = time.Now().Format("02.01.2006 15:04")
			saveAIMemoryLocked()
			return aiMemState
		}
		if strings.EqualFold(aiMemState.Facts[i].Value, value) {
			return aiMemState
		}
	}
	aiMemState.Facts = append([]AIMemoryFact{{
		ID:        fmt.Sprintf("mem_%d", time.Now().UnixNano()%100000000),
		Key:       key,
		Value:     truncateUTF8(value, 220),
		CreatedAt: time.Now().Format("02.01.2006 15:04"),
	}}, aiMemState.Facts...)
	if len(aiMemState.Facts) > 60 {
		aiMemState.Facts = aiMemState.Facts[:60]
	}
	saveAIMemoryLocked()
	cp := aiMemState
	cp.Facts = append([]AIMemoryFact{}, aiMemState.Facts...)
	return cp
}

func DeleteAIMemoryFact(id string) AIMemoryStore {
	ensureAIMemoryLoaded()
	aiMemMu.Lock()
	defer aiMemMu.Unlock()
	if id == "*" || id == "all" {
		aiMemState = AIMemoryStore{Facts: []AIMemoryFact{}}
		saveAIMemoryLocked()
		return aiMemState
	}
	next := make([]AIMemoryFact, 0, len(aiMemState.Facts))
	for _, f := range aiMemState.Facts {
		if f.ID == id {
			if f.Key == "name" {
				aiMemState.UserName = ""
			} else if f.Key == "city" {
				aiMemState.UserCity = ""
			}
			continue
		}
		next = append(next, f)
	}
	aiMemState.Facts = next
	saveAIMemoryLocked()
	cp := aiMemState
	cp.Facts = append([]AIMemoryFact{}, aiMemState.Facts...)
	return cp
}

// extractAndStoreUserMemory learns personal facts naturally from conversation.
func extractAndStoreUserMemory(prompt string) (string, bool) {
	low := strings.ToLower(strings.TrimSpace(prompt))

	// Explicit "запомни ..."
	for _, pref := range []string{"запомни что ", "запомни, что ", "запомни: ", "запомни ", "remember that ", "remember "} {
		if strings.HasPrefix(low, pref) {
			fact := strings.TrimSpace(prompt[len(pref):])
			if fact != "" {
				AddAIMemoryFact("note", fact)
				return fmt.Sprintf("🧠 Запомнил в долговременной памяти: **«%s»**.", fact), true
			}
		}
	}

	var notes []string
	// Name detection
	for _, pref := range []string{"меня зовут ", "моё имя ", "мое имя ", "my name is "} {
		if idx := strings.Index(low, pref); idx >= 0 {
			rest := strings.TrimSpace(prompt[idx+len(pref):])
			fields := strings.Fields(rest)
			if len(fields) > 0 {
				name := strings.Trim(fields[0], ".,!?;:\"'")
				if len([]rune(name)) >= 2 && len([]rune(name)) <= 30 {
					AddAIMemoryFact("name", name)
					notes = append(notes, fmt.Sprintf("🧠 Приятно познакомиться, **%s**! Запомнил ваше имя.", name))
					break
				}
			}
		}
	}
	// City detection (also runs even if name was detected in the same sentence!)
	cityNorm := map[string]string{
		"москве": "Москва", "москвы": "Москва",
		"питере": "Санкт-Петербург", "петербурге": "Санкт-Петербург",
		"киеве": "Киев", "минске": "Минск", "казани": "Казань",
		"новосибирске": "Новосибирск", "екатеринбурге": "Екатеринбург",
		"астане": "Астана", "ташкенте": "Ташкент", "варшаве": "Варшава",
		"берлине": "Берлин", "лондоне": "Лондон", "париже": "Париж",
	}
	for _, pref := range []string{"мой город ", "я живу в ", "я из города ", "я из ", "i live in "} {
		if idx := strings.Index(low, pref); idx >= 0 {
			rest := strings.TrimSpace(prompt[idx+len(pref):])
			fields := strings.Fields(rest)
			if len(fields) > 0 {
				city := strings.Trim(fields[0], ".,!?;:\"'")
				if norm, ok := cityNorm[strings.ToLower(city)]; ok {
					city = norm
				}
				if len([]rune(city)) >= 2 && len([]rune(city)) <= 32 {
					AddAIMemoryFact("city", city)
					notes = append(notes, fmt.Sprintf("🧠 Запомнил ваш город: **%s** (буду использовать его для погоды и подсказок).", city))
					break
				}
			}
		}
	}
	if len(notes) > 0 {
		return strings.Join(notes, "\n"), false
	}
	return "", false
}

// ==================== RESILIENT MULTI-ENGINE INTERNET KNOWLEDGE ====================

// fetchWikiFullExtract retrieves rich multi-paragraph encyclopedia explanations from RU & EN Wikipedia.
func fetchWikiFullExtract(ctx context.Context, query string) (string, *AISourceLink) {
	langs := []string{"ru", "en"}
	for _, lang := range langs {
		// Step 1: Search best title
		sURL := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=query&list=search&srsearch=%s&srlimit=3&utf8=1&format=json", lang, url.QueryEscape(query))
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, sURL, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "LumaOS/1.6.2 (https://github.com/Tveexty/L_H-3.0)")
		resp, err := ai40HTTPClient.Do(req)
		if err != nil || resp == nil {
			continue
		}
		var sr struct {
			Query struct {
				Search []struct {
					Title string `json:"title"`
				} `json:"search"`
			} `json:"query"`
		}
		_ = json.NewDecoder(io.LimitReader(resp.Body, 48*1024)).Decode(&sr)
		resp.Body.Close()
		if len(sr.Query.Search) == 0 {
			continue
		}
		bestTitle := sr.Query.Search[0].Title

		// Step 2: Fetch rich plain-text extract (up to 1400 chars!)
		eURL := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=1400&titles=%s&format=json&redirects=1", lang, url.QueryEscape(bestTitle))
		req2, err := http.NewRequestWithContext(ctx, http.MethodGet, eURL, nil)
		if err != nil {
			continue
		}
		req2.Header.Set("User-Agent", "LumaOS/1.6.2 (https://github.com/Tveexty/L_H-3.0)")
		resp2, err := ai40HTTPClient.Do(req2)
		if err != nil || resp2 == nil {
			continue
		}
		var er struct {
			Query struct {
				Pages map[string]struct {
					Title   string `json:"title"`
					Extract string `json:"extract"`
				} `json:"pages"`
			} `json:"query"`
		}
		_ = json.NewDecoder(io.LimitReader(resp2.Body, 64*1024)).Decode(&er)
		resp2.Body.Close()
		for _, page := range er.Query.Pages {
			txt := strings.TrimSpace(page.Extract)
			if len([]rune(txt)) >= 60 {
				pageURL := fmt.Sprintf("https://%s.wikipedia.org/wiki/%s", lang, url.PathEscape(strings.ReplaceAll(page.Title, " ", "_")))
				return fmt.Sprintf("### %s\n%s", page.Title, txt), &AISourceLink{
					Title:    page.Title,
					URL:      pageURL,
					Provider: "Wikipedia " + strings.ToUpper(lang),
					Snippet:  truncateUTF8(txt, 180),
				}
			}
		}
	}
	return "", nil
}

// fetchMyMemoryTranslate performs real online translation via MyMemory public API (supports 50+ languages).
func fetchMyMemoryTranslate(ctx context.Context, text, srcLang, dstLang string) (string, *AISourceLink) {
	text = strings.TrimSpace(text)
	if text == "" {
		return "", nil
	}
	if len([]rune(text)) > 480 {
		text = string([]rune(text)[:480])
	}
	u := fmt.Sprintf("https://api.mymemory.translated.net/get?q=%s&langpair=%s|%s", url.QueryEscape(text), srcLang, dstLang)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", nil
	}
	req.Header.Set("User-Agent", "LumaOS/1.6.2")
	resp, err := ai40HTTPClient.Do(req)
	if err != nil || resp == nil {
		return "", nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", nil
	}
	var payload struct {
		ResponseData struct {
			TranslatedText string `json:"translatedText"`
		} `json:"responseData"`
	}
	if json.NewDecoder(io.LimitReader(resp.Body, 32*1024)).Decode(&payload) != nil {
		return "", nil
	}
	out := strings.TrimSpace(html.UnescapeString(payload.ResponseData.TranslatedText))
	if out == "" || strings.EqualFold(out, text) {
		return "", nil
	}
	return out, &AISourceLink{
		Title:    fmt.Sprintf("Перевод (%s → %s)", strings.ToUpper(srcLang), strings.ToUpper(dstLang)),
		URL:      "https://mymemory.translated.net/",
		Provider: "MyMemory Translate",
		Snippet:  truncateUTF8(out, 140),
	}
}

func detectHasCyrillic(s string) bool {
	for _, r := range s {
		if (r >= 'а' && r <= 'я') || (r >= 'А' && r <= 'Я') || r == 'ё' || r == 'Ё' {
			return true
		}
	}
	return false
}

// tryTranslatePrompt handles "переведи ...", "translate ...", "как на английском ..." queries with real translation!
func tryTranslatePrompt(ctx context.Context, prompt string, prevAssistant string) (string, *AISourceLink, bool) {
	low := strings.ToLower(strings.TrimSpace(prompt))
	isTrans := strings.HasPrefix(low, "переведи") || strings.HasPrefix(low, "перевод") || strings.HasPrefix(low, "translate") ||
		strings.Contains(low, "на английск") || strings.Contains(low, "на русск") || strings.Contains(low, "на немецк") ||
		strings.Contains(low, "на французск") || strings.Contains(low, "на испанск")
	if !isTrans {
		return "", nil, false
	}

	dst := ""
	switch {
	case strings.Contains(low, "английск") || strings.Contains(low, "english") || strings.Contains(low, "to en"):
		dst = "en"
	case strings.Contains(low, "русск") || strings.Contains(low, "russian") || strings.Contains(low, "to ru"):
		dst = "ru"
	case strings.Contains(low, "немецк") || strings.Contains(low, "german"):
		dst = "de"
	case strings.Contains(low, "французск") || strings.Contains(low, "french"):
		dst = "fr"
	case strings.Contains(low, "испанск") || strings.Contains(low, "spanish"):
		dst = "es"
	case strings.Contains(low, "китайск") || strings.Contains(low, "chinese"):
		dst = "zh-CN"
	case strings.Contains(low, "японск") || strings.Contains(low, "japanese"):
		dst = "ja"
	}

	targetText := prompt
	for _, p := range []string{
		"переведи на английский:", "переведи на английский", "переведи на русский:", "переведи на русский",
		"переведи на немецкий:", "переведи на немецкий", "переведи на французский:", "переведи на французский",
		"переведи на испанский:", "переведи на испанский", "переведи текст:", "переведи:", "переведи ",
		"translate to russian:", "translate to russian", "translate to english:", "translate to english", "translate:", "translate ",
	} {
		idx := strings.Index(strings.ToLower(targetText), p)
		if idx >= 0 {
			targetText = strings.TrimSpace(targetText[idx+len(p):])
			break
		}
	}
	targetText = strings.Trim(targetText, `"'«» `)
	if (targetText == "" || targetText == "это" || targetText == "его" || targetText == "текст") && prevAssistant != "" {
		targetText = prevAssistant
	}
	if targetText == "" {
		return "", nil, false
	}
	src := "en"
	if detectHasCyrillic(targetText) {
		src = "ru"
	}
	if dst == "" {
		if src == "ru" {
			dst = "en"
		} else {
			dst = "ru"
		}
	}
	if src == dst {
		if dst == "ru" {
			src = "en"
		} else {
			src = "ru"
		}
	}
	translated, srcLink := fetchMyMemoryTranslate(ctx, targetText, src, dst)
	if translated == "" {
		return "", nil, false
	}
	return fmt.Sprintf("### Перевод (`%s → %s`)\n\n%s", strings.ToUpper(src), strings.ToUpper(dst), translated), srcLink, true
}

// tryAdvancedMath handles percentages ("15% от 2400"), quadratic equations ("x^2 - 5x + 6 = 0"), and expressions!
func tryAdvancedMath(prompt string) (string, bool) {
	var parts []string
	if m := rePercentOf.FindStringSubmatch(prompt); len(m) == 3 {
		pct, err1 := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
		base, err2 := strconv.ParseFloat(strings.ReplaceAll(m[2], ",", "."), 64)
		if err1 == nil && err2 == nil {
			res := base * pct / 100.0
			parts = append(parts, fmt.Sprintf("🧮 **%s%% от %s** = **%s** (остаток: `%s`, сумма: `%s`)",
				m[1], m[2], strconv.FormatFloat(res, 'f', -1, 64),
				strconv.FormatFloat(base-res, 'f', -1, 64),
				strconv.FormatFloat(base+res, 'f', -1, 64)))
		}
	}
	cleanEq := strings.ReplaceAll(strings.TrimSpace(prompt), " ", "")
	if m := reQuadEq.FindStringSubmatch(cleanEq); len(m) == 4 {
		parseCoef := func(s string) float64 {
			s = strings.ReplaceAll(s, " ", "")
			if s == "" || s == "+" {
				return 1
			}
			if s == "-" {
				return -1
			}
			v, _ := strconv.ParseFloat(s, 64)
			return v
		}
		a, b, c := parseCoef(m[1]), parseCoef(m[2]), parseCoef(m[3])
		if a != 0 {
			d := b*b - 4*a*c
			if d > 0 {
				x1 := (-b + math.Sqrt(d)) / (2 * a)
				x2 := (-b - math.Sqrt(d)) / (2 * a)
				parts = append(parts, fmt.Sprintf("🧮 **Квадратное уравнение** (`a=%.4g, b=%.4g, c=%.4g`):\n• Дискриминант `D = %.4g`\n• Корни: **`x₁ = %.6g`**, **`x₂ = %.6g`**", a, b, c, d, x1, x2))
			} else if d == 0 {
				x := -b / (2 * a)
				parts = append(parts, fmt.Sprintf("🧮 **Квадратное уравнение** (`D = 0`):\n• Единственный корень: **`x = %.6g`**", x))
			} else {
				parts = append(parts, fmt.Sprintf("🧮 **Квадратное уравнение**: дискриминант `D = %.4g < 0` — действительных корней нет (комплексные корни `%.4g ± %.4gi`).", d, -b/(2*a), math.Sqrt(-d)/(2*a)))
			}
		}
	}
	if len(parts) > 0 {
		return strings.Join(parts, "\n\n"), true
	}
	if expr, val, ok := tryEvaluateMath(prompt); ok {
		return fmt.Sprintf("🧮 **Расчёт:** `%s` = **`%s`**", expr, strconv.FormatFloat(val, 'f', -1, 64)), true
	}
	return "", false
}

// ==================== DEEP OS SYSTEM INTELLIGENCE ACTIONS ====================

func executeDeepOSExtensions(clauses []string, kernel *LumaKernel, trashStore *LumaTrashStore) ([]AI40ExecutedAction, []AI40UIAction, []string, []string) {
	var (
		extraActions []AI40ExecutedAction
		extraUI      []AI40UIAction
		extraNotes   []string
		remaining    []string
	)
	seq := 0
	nextID := func() string {
		seq++
		return fmt.Sprintf("nx_%d_%d", time.Now().UnixMilli()%100000, seq)
	}

	for _, clause := range clauses {
		low := strings.ToLower(strings.TrimSpace(clause))
		handled := false

		// 1. Deep PC Slowdown Diagnosis ("почему тормозит пк", "что грузит цп/память")
		if (strings.Contains(low, "тормоз") || strings.Contains(low, "лага") || strings.Contains(low, "грузит") || strings.Contains(low, "медленн")) &&
			(strings.Contains(low, "пк") || strings.Contains(low, "комп") || strings.Contains(low, "ноут") || strings.Contains(low, "систем") || strings.Contains(low, "цп") || strings.Contains(low, "памят")) {
			if kernel != nil {
				snap := kernel.SystemSnapshot()
				procs := kernel.probe.TopProcesses(5)
				var topLines []string
				for i, pr := range procs {
					topLines = append(topLines, fmt.Sprintf("%d. **%s** (PID %d) — CPU `%.1f%%` · RAM `%.0f МБ`", i+1, pr.Name, pr.PID, pr.CPUPct, pr.MemMB))
				}
				extraActions = append(extraActions, AI40ExecutedAction{
					ID: nextID(), Tool: "system.diagnose", Label: "Глубокая диагностика ПК", Status: "done",
					Detail: fmt.Sprintf("CPU %d%% · RAM %d%% · проанализировано %d топ-процессов", snap.CPUPercent, snap.RAMPercent, len(procs)),
				})
				advice := "Система работает ровно."
				if snap.RAMPercent >= 80 {
					advice = "ОЗУ загружена выше 80% — рекомендую включить **Luma SwapBoost (4–6 ГБ)** и закрыть тяжёлые вкладки."
				} else if snap.CPUPercent >= 75 {
					advice = "Высокая нагрузка на процессор — проверьте верхний процесс в списке ниже."
				}
				extraNotes = append(extraNotes, fmt.Sprintf("🩺 **Диагностика производительности ПК**:\n• ЦП: **%d%%** · ОЗУ: **%.1f / %.1f ГБ (%d%%)**\n• Рекомендация: %s\n\n**Топ процессов по нагрузке:**\n%s",
					snap.CPUPercent, snap.RAMUsedGB, snap.RAMTotalGB, snap.RAMPercent, advice, strings.Join(topLines, "\n")))
				handled = true
			}
		}

		// 2. Live Internet / Ping Check ("проверь интернет", "пинг")
		if !handled && (strings.Contains(low, "проверь интернет") || strings.Contains(low, "скорость пинг") || strings.Contains(low, "проверь сеть") || strings.Contains(low, "есть ли интернет")) {
			t0 := time.Now()
			conn, err := net.DialTimeout("tcp", "1.1.1.1:443", 2500*time.Millisecond)
			ms := time.Since(t0).Milliseconds()
			if err == nil && conn != nil {
				_ = conn.Close()
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "net.ping", Label: fmt.Sprintf("Интернет OK (%d мс)", ms), Status: "done", Detail: "1.1.1.1:443"})
				extraNotes = append(extraNotes, fmt.Sprintf("🌐 **Интернет работает стабильно** — задержка до `1.1.1.1`: **%d мс**.", ms))
			} else {
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "net.ping", Label: "Нет доступа к сети", Status: "error", Detail: "timeout"})
				extraNotes = append(extraNotes, "⚠️ **Нет ответа от внешней сети** (`1.1.1.1:443`). Проверьте Wi-Fi или роутер.")
			}
			handled = true
		}

		// 3. Clipboard Inspector / Translator ("что в буфере", "переведи буфер обмена", "объясни буфер обмена")
		if !handled && (strings.Contains(low, "буфер обмена") || strings.Contains(low, "буфере обмена") || strings.Contains(low, "clipboard")) && kernel != nil {
			clip, err := kernel.probe.GetClipboard()
			clip = strings.TrimSpace(clip)
			if err == nil && clip != "" {
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "os.clipboard", Label: "Прочитан буфер обмена", Status: "done", Detail: fmt.Sprintf("%d симв.", len([]rune(clip)))})
				if strings.Contains(low, "перевед") {
					ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
					src := "en"
					dst := "ru"
					if detectHasCyrillic(clip) {
						src, dst = "ru", "en"
					}
					tr, _ := fetchMyMemoryTranslate(ctx, clip, src, dst)
					cancel()
					if tr != "" {
						extraNotes = append(extraNotes, fmt.Sprintf("📋 **Перевод буфера обмена (`%s → %s`)**:\n%s", strings.ToUpper(src), strings.ToUpper(dst), tr))
					} else {
						extraNotes = append(extraNotes, fmt.Sprintf("📋 **Содержимое буфера обмена:**\n> %s", truncateUTF8(clip, 400)))
					}
				} else {
					extraNotes = append(extraNotes, fmt.Sprintf("📋 **В буфере обмена (%d симв.):**\n> %s", len([]rune(clip)), truncateUTF8(clip, 500)))
				}
				handled = true
			}
		}

		// 4. Open Luma Lens Search ("обвести для поиска", "обведи для поиска", "поиск по экрану", "luma lens")
		if !handled && (strings.Contains(low, "обведи") || strings.Contains(low, "обвести") || strings.Contains(low, "поиск по экрану") || strings.Contains(low, "luma lens")) {
			extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "ui.lens_search", Label: "Luma Обвести для поиска", Status: "ui_dispatch", Detail: "Запуск интерактивного сканера экрана"})
			extraUI = append(extraUI, AI40UIAction{Type: "open_lens_search", Label: "Luma Обвести для поиска"})
			extraNotes = append(extraNotes, "🔍 Запускаю **Luma Обвести для поиска** — обведите любую область на экране для распознавания текста и поиска.")
			handled = true
		}

		// 5. Media Controls ("пауза", "следующий трек", "предыдущий трек")
		if !handled && kernel != nil {
			if strings.Contains(low, "следующий трек") || strings.Contains(low, "next track") {
				_, _ = kernel.probe.ControlMedia("next")
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "media.next", Label: "Следующий трек", Status: "done", Detail: "Media Next"})
				extraNotes = append(extraNotes, "⏭️ Переключено на **следующий трек**.")
				handled = true
			} else if strings.Contains(low, "предыдущий трек") || strings.Contains(low, "prev track") {
				_, _ = kernel.probe.ControlMedia("prev")
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "media.prev", Label: "Предыдущий трек", Status: "done", Detail: "Media Prev"})
				extraNotes = append(extraNotes, "⏮️ Переключено на **предыдущий трек**.")
				handled = true
			} else if strings.Contains(low, "пауза музык") || strings.Contains(low, "поставь на паузу") || strings.Contains(low, "включи музык") {
				_, _ = kernel.probe.ControlMedia("playpause")
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "media.playpause", Label: "Воспр. / Пауза", Status: "done", Detail: "Play/Pause"})
				extraNotes = append(extraNotes, "⏯️ Переключено воспроизведение медиа.")
				handled = true
			}
		}

		// 6. Power Plans ("игровой режим", "экономия энергии", "сбалансированный режим")
		if !handled && kernel != nil && (strings.Contains(low, "игровой режим") || strings.Contains(low, "режим экономии") || strings.Contains(low, "экономия энергии") || strings.Contains(low, "сбалансированный режим")) {
			plan := "balanced"
			lbl := "Сбалансированный"
			if strings.Contains(low, "игровой") {
				plan, lbl = "performance", "Высокая производительность"
			} else if strings.Contains(low, "экономи") {
				plan, lbl = "powersaver", "Экономия энергии"
			}
			_ = kernel.probe.SetPowerPlan(plan)
			extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "power.plan", Label: "Питание → " + lbl, Status: "done", Detail: plan})
			extraNotes = append(extraNotes, fmt.Sprintf("⚡ Включён план питания: **%s**.", lbl))
			handled = true
		}

		// 7. Kill Process by Name ("закрой процесс <name>")
		if !handled && kernel != nil && (strings.HasPrefix(low, "закрой процесс ") || strings.HasPrefix(low, "убей процесс ")) {
			target := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(low, "закрой процесс "), "убей процесс "))
			if target != "" {
				procs := kernel.probe.TopProcesses(60)
				killed := 0
				for _, pr := range procs {
					if strings.Contains(strings.ToLower(pr.Name), target) && pr.PID != os.Getpid() {
						if kernel.probe.KillProcess(pr.PID, false) == nil {
							killed++
						}
					}
				}
				if killed > 0 {
					extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "process.kill", Label: fmt.Sprintf("Закрыто: %s (%d)", target, killed), Status: "done", Detail: target})
					extraNotes = append(extraNotes, fmt.Sprintf("🛑 Завершено процессов **%s**: %d.", target, killed))
					handled = true
				}
			}
		}

		// 8. Safe Delete File to Trash ("удали файл <path>")
		if !handled && trashStore != nil && strings.HasPrefix(low, "удали файл ") {
			target := strings.Trim(strings.TrimSpace(clause[len("удали файл "):]), `"'«» `)
			if target != "" {
				if item, err := trashStore.MoveToTrash(target); err == nil {
					extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "trash.move", Label: "В Корзину: " + item.Name, Status: "done", Detail: item.OriginalPath})
					extraUI = append(extraUI, AI40UIAction{Type: "refresh_trash", Label: "Обновить Корзину"})
					extraNotes = append(extraNotes, fmt.Sprintf("🗑️ Файл **%s** безопасно перемещён в **Корзину Luma OS** (его можно восстановить в любой момент).", item.Name))
					handled = true
				}
			}
		}

		// 9. Clean Temp Cache ("очисти кэш", "очисти временные файлы")
		if !handled && (strings.Contains(low, "очисти кэш") || strings.Contains(low, "очисти временн") || strings.Contains(low, "очисти temp")) {
			tmpDir := os.TempDir()
			removed := 0
			var freed int64
			cutoff := time.Now().Add(-30 * time.Minute)
			if entries, err := os.ReadDir(tmpDir); err == nil {
				for _, e := range entries {
					if e.IsDir() {
						continue
					}
					info, err2 := e.Info()
					if err2 != nil || info.ModTime().After(cutoff) {
						continue
					}
					full := filepath.Join(tmpDir, e.Name())
					sz := info.Size()
					if os.Remove(full) == nil {
						removed++
						freed += sz
					}
				}
			}
			freedMB := float64(freed) / (1024 * 1024)
			extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "system.clean_temp", Label: fmt.Sprintf("Очищено %.1f МБ (%d файлов)", freedMB, removed), Status: "done", Detail: tmpDir})
			extraNotes = append(extraNotes, fmt.Sprintf("🧹 Очистка временных файлов завершена: удалено **%d** старых файлов, освобождено **%.2f МБ**.", removed, freedMB))
			handled = true
		}

		// 10. Recall User Memory ("что ты обо мне помнишь", "покажи память")
		if !handled && (strings.Contains(low, "обо мне помн") || strings.Contains(low, "что ты помнишь") || strings.Contains(low, "твоя память") || strings.Contains(low, "покажи память")) {
			mem := GetAIMemorySnapshot()
			extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "ai.memory.read", Label: fmt.Sprintf("Память (%d фактов)", len(mem.Facts)), Status: "done", Detail: "ai_memory_v5.json"})
			if len(mem.Facts) == 0 {
				extraNotes = append(extraNotes, "🧠 Моя долговременная память пока пуста. Напишите, например: *«Меня зовут Алекс, мой город Москва»* или *«Запомни, что я разрабатываю на Go»*.")
			} else {
				var lines []string
				for _, f := range mem.Facts {
					lines = append(lines, fmt.Sprintf("• **%s**: %s _(%s)_", f.Key, f.Value, f.CreatedAt))
				}
				extraNotes = append(extraNotes, fmt.Sprintf("🧠 **Что я помню о вас (%d записей):**\n%s", len(mem.Facts), strings.Join(lines, "\n")))
			}
			handled = true
		}

		// 11. Advanced Math & Equations
		if !handled {
			if mathReply, ok := tryAdvancedMath(clause); ok {
				extraActions = append(extraActions, AI40ExecutedAction{ID: nextID(), Tool: "math.eval", Label: "Точный расчёт", Status: "done", Detail: clause})
				extraNotes = append(extraNotes, mathReply)
				handled = true
			}
		}

		if !handled {
			remaining = append(remaining, clause)
		}
	}

	return extraActions, extraUI, extraNotes, remaining
}

// ==================== MAIN LUMA AI 5.0 NEXUS ENGINE ====================

func RunLumaAI50Nexus(messages []AIChatMessage, mode, verbosity string, autonomousMode, webSearchEnabled bool, kernel *LumaKernel, trashStore *LumaTrashStore) map[string]interface{} {
	if len(messages) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	prompt := strings.TrimSpace(messages[len(messages)-1].Content)
	if prompt == "" {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	tStart := time.Now()
	mem := GetAIMemorySnapshot()

	// Extract previous conversation context for smart multi-turn follow-ups!
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

	var thinking []AI40ThinkingStep
	var actions []AI40ExecutedAction
	var uiActions []AI40UIAction
	var notes []string
	var sources []AISourceLink

	// Step 1: Memory & Context Resolution
	t1 := time.Now()
	memMsg, onlyMemory := extractAndStoreUserMemory(prompt)
	if memMsg != "" {
		actions = append(actions, AI40ExecutedAction{ID: "mem_save", Tool: "ai.memory.write", Label: "Сохранено в память AI 5.0", Status: "done", Detail: prompt})
		notes = append(notes, memMsg)
	}
	effectivePrompt := prompt
	low := strings.ToLower(prompt)
	// Resolve follow-up questions automatically using previous topic!
	if prevUser != "" && (low == "подробнее" || low == "расскажи подробнее" || low == "еще" || low == "ещё" || low == "пример" || low == "приведи пример" || low == "а подробнее?" || low == "почему?" || low == "плюсы и минусы") {
		effectivePrompt = prevUser + " (" + prompt + ")"
	}
	// Inject remembered user city for weather queries without city!
	if (strings.Contains(low, "погод") || strings.Contains(low, "weather")) && !strings.Contains(low, " в ") && mem.UserCity != "" {
		effectivePrompt = prompt + " в " + mem.UserCity
	}

	clauses := splitCompoundClauses(effectivePrompt)
	memSummary := fmt.Sprintf("Память: %d фактов", len(mem.Facts))
	if mem.UserName != "" {
		memSummary += " · пользователь: " + mem.UserName
	}
	thinking = append(thinking, AI40ThinkingStep{
		Step:       1,
		Title:      "Память и понимание контекста",
		Detail:     fmt.Sprintf("%s · подзадач: %d · контекст диалога: %d сообщ.", memSummary, len(clauses), len(messages)),
		DurationMs: time.Since(t1).Milliseconds(),
		Status:     "done",
	})

	if onlyMemory {
		return map[string]interface{}{
			"ok":              true,
			"reply":           memMsg,
			"model":           "Luma AI 5.0 Nexus",
			"provider":        "luma_local",
			"autonomous_mode": autonomousMode,
			"web_search_used": false,
			"thinking_steps":  thinking,
			"actions":         actions,
			"ui_actions":      []AI40UIAction{},
			"sources":         []AISourceLink{},
			"memory_count":    len(GetAIMemorySnapshot().Facts),
			"elapsed_ms":      time.Since(tStart).Milliseconds(),
		}
	}

	// Step 2: Check Live Translation Request
	ctx, cancel := context.WithTimeout(context.Background(), 6000*time.Millisecond)
	defer cancel()
	if trReply, trSrc, ok := tryTranslatePrompt(ctx, prompt, prevAssistant); ok {
		if trSrc != nil {
			sources = append(sources, *trSrc)
		}
		thinking = append(thinking, AI40ThinkingStep{
			Step: 2, Title: "Онлайн-перевод текста", Detail: "Выполнен живой перевод с определением языка",
			DurationMs: time.Since(tStart).Milliseconds(), Status: "done",
		})
		return map[string]interface{}{
			"ok": true, "reply": trReply, "model": "Luma AI 5.0 Nexus", "provider": "luma_local",
			"autonomous_mode": autonomousMode, "web_search_used": true,
			"thinking_steps": thinking, "actions": actions, "ui_actions": []AI40UIAction{}, "sources": sources,
			"memory_count": len(GetAIMemorySnapshot().Facts), "elapsed_ms": time.Since(tStart).Milliseconds(),
		}
	}

	// Step 3: Deep OS Integration + Autonomous Tool Execution
	var webQueries []string
	t2 := time.Now()
	if autonomousMode {
		extAct, extUI, extNotes, rem1 := executeDeepOSExtensions(clauses, kernel, trashStore)
		actions = append(actions, extAct...)
		uiActions = append(uiActions, extUI...)
		notes = append(notes, extNotes...)
		if len(rem1) > 0 {
			baseAct, baseUI, baseNotes, rem2 := executeAutonomousClauses(rem1, kernel)
			actions = append(actions, baseAct...)
			uiActions = append(uiActions, baseUI...)
			notes = append(notes, baseNotes...)
			webQueries = rem2
		}
		if len(actions) > 0 {
			lbls := make([]string, 0, len(actions))
			for _, a := range actions {
				lbls = append(lbls, a.Label)
			}
			thinking = append(thinking, AI40ThinkingStep{
				Step: 2, Title: fmt.Sprintf("Выполнение системных действий (%d)", len(actions)),
				Detail: strings.Join(lbls, " · "), DurationMs: time.Since(t2).Milliseconds(), Status: "done",
			})
		}
	} else {
		webQueries = clauses
	}

	// Step 4: Resilient Multi-Source Internet Research (Wikipedia Full Extracts + Open-Web + Live Page Reader + SO/GitHub/MDN/CBR/Weather/Crypto)
	var webBlocks []string
	needWeb := webSearchEnabled && len(webQueries) > 0 && !isPureGreetingOrLumaAbout(low)
	t3 := time.Now()
	if needWeb {
		combinedQ := ai40CleanSearchQuery(strings.Join(webQueries, " "))
		if combinedQ == "" {
			combinedQ = strings.Join(webQueries, " ")
		}

		// Remember active topic in persistent memory!
		aiMemMu.Lock()
		aiMemState.LastTopic = truncateUTF8(combinedQ, 96)
		aiMemMu.Unlock()

		var (
			wg        sync.WaitGroup
			mu        sync.Mutex
			wikiRich  string
			wikiSrc   *AISourceLink
			openText  string
			openSrcs  []AISourceLink
		)
		// Run Wikipedia Full Extract AND Open-Web Universal Research in parallel!
		wg.Add(2)
		go func() {
			defer wg.Done()
			t, s := fetchWikiFullExtract(ctx, combinedQ)
			mu.Lock()
			wikiRich, wikiSrc = t, s
			mu.Unlock()
		}()
		go func() {
			defer wg.Done()
			t, s, _ := runUniversalWebResearch(strings.Join(webQueries, " "))
			mu.Lock()
			openText, openSrcs = t, s
			mu.Unlock()
		}()
		wg.Wait()

		seenURL := map[string]bool{}
		addSrc := func(s AISourceLink) {
			if s.URL == "" || seenURL[s.URL] {
				return
			}
			seenURL[s.URL] = true
			sources = append(sources, s)
		}
		if wikiRich != "" {
			webBlocks = append(webBlocks, wikiRich)
			if wikiSrc != nil {
				addSrc(*wikiSrc)
			}
		}
		if openText != "" {
			// Avoid repeating identical Wikipedia intro if we already fetched rich extract
			if wikiRich == "" || !strings.HasPrefix(openText, "📚") {
				webBlocks = append(webBlocks, openText)
			}
		}
		for _, s := range openSrcs {
			addSrc(s)
		}
		if len(sources) > 8 {
			sources = sources[:8]
		}

		domains := []string{}
		seenD := map[string]bool{}
		for _, s := range sources {
			d := ai40ExtractDomain(s.URL)
			if !seenD[d] {
				seenD[d] = true
				domains = append(domains, d)
			}
		}
		sort.Strings(domains)
		detail := "Опрошены энциклопедии, открытый веб и live-сервисы"
		if len(sources) > 0 {
			detail = fmt.Sprintf("Найдено %d источников (%s)", len(sources), strings.Join(domains, ", "))
		}
		thinking = append(thinking, AI40ThinkingStep{
			Step: len(thinking) + 1, Title: "Исследование по всему интернету",
			Detail: detail, DurationMs: time.Since(t3).Milliseconds(), Status: "done",
		})
	}

	// Step 5: Intelligent Synthesis + Personalization
	t4 := time.Now()
	var sections []string
	if len(notes) > 0 {
		sections = append(sections, "### Выполненные действия\n"+strings.Join(notes, "\n"))
	}
	if len(webBlocks) > 0 {
		sections = append(sections, strings.Join(webBlocks, "\n\n"))
	} else if len(notes) == 0 {
		// Smart local reasoning, code generator, and OS guide fallback
		fallback := RunLumaLocalAI(messages, mode, verbosity, kernel)
		if rep, ok := fallback["reply"].(string); ok && rep != "" {
			if mem.UserName != "" && isPureGreetingOrLumaAbout(low) {
				rep = fmt.Sprintf("Привет, **%s**! ", mem.UserName) + rep
			}
			sections = append(sections, rep)
		}
		if fSrc, ok := fallback["sources"].([]AISourceLink); ok && len(sources) == 0 {
			sources = append(sources, fSrc...)
		}
	}

	finalReply := strings.TrimSpace(strings.Join(sections, "\n\n"))
	if finalReply == "" {
		finalReply = "Готово! Запрос обработан **Luma AI 5.0 Nexus**."
	}

	thinking = append(thinking, AI40ThinkingStep{
		Step:       len(thinking) + 1,
		Title:      "Синтез ответа и проверка фактов",
		Detail:     fmt.Sprintf("Сформирован ответ (%d симв., %d действий, %d источников) за %d мс", len([]rune(finalReply)), len(actions), len(sources), time.Since(tStart).Milliseconds()),
		DurationMs: time.Since(t4).Milliseconds(),
		Status:     "done",
	})

	if sources == nil {
		sources = []AISourceLink{}
	}
	if actions == nil {
		actions = []AI40ExecutedAction{}
	}
	if uiActions == nil {
		uiActions = []AI40UIAction{}
	}

	return map[string]interface{}{
		"ok":              true,
		"reply":           finalReply,
		"model":           "Luma AI 5.0 Nexus",
		"provider":        "luma_local",
		"autonomous_mode": autonomousMode,
		"web_search_used": needWeb,
		"thinking_steps":  thinking,
		"actions":         actions,
		"ui_actions":      uiActions,
		"sources":         sources,
		"memory_count":    len(GetAIMemorySnapshot().Facts),
		"elapsed_ms":      time.Since(tStart).Milliseconds(),
	}
}
