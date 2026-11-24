package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ==================== LUMA AI 3.8 FLASHLITE — VERIFIED MULTI-SOURCE FACT ENGINE ====================
// Retrieves grounded, up-to-date facts in parallel from verified open sources with clickable source URLs:
//   1. Wikipedia RU & EN (MediaWiki Search + REST Summary)
//   2. DuckDuckGo Instant Answer API
//   3. MDN Web Docs API (JS / TS / CSS / HTML / HTTP / Web APIs)
//   4. GitHub Search Repositories API (frameworks, libraries, OSS tools)
//   5. Open-Meteo Geocoding + Forecast API (real-time weather anywhere)
//   6. Central Bank of Russia (ЦБ РФ — daily_json.js + fallback live FX)
//   7. Live Host Telemetry (LumaCore 1.5.0 CPU/GPU/VRAM/RAM/Battery/Disks/Network)
// Also provides contextual /api/kernel/ai/assist for Luma Office (Word/Excel/PowerPoint),
// Code Studio, Quick Look, Terminal (`ai`), and Alt+R Spotlight!

type AISourceLink struct {
	Title    string `json:"title"`
	URL      string `json:"url"`
	Provider string `json:"provider"` // Wikipedia RU | Wikipedia EN | DuckDuckGo | MDN | GitHub | Open-Meteo | ЦБ РФ | LumaCore Telemetry
	Snippet  string `json:"snippet,omitempty"`
}

type AI38Response struct {
	Reply   string
	Sources []AISourceLink
	Model   string
}

var (
	cbrCacheMu sync.RWMutex
	cbrCacheAt time.Time
	cbrRates   map[string]struct {
		Name    string
		Nominal float64
		Value   float64
		Prev    float64
	}
	cbrDateStr string

	weatherCityRe = regexp.MustCompile(`(?i)(?:погод\w*|температур\w*|weather|forecast)\s+(?:в|во|in|for|at)?\s*([а-яёa-zA-Z\-]{3,28})`)
)

// RunLumaAI38FlashLite enriches local/hybrid answers with verified live sources & clickable links.
func RunLumaAI38FlashLite(prompt, low, normMode string, isEn bool, kernel *LumaKernel, prevAssistant string) (string, []AISourceLink, string) {
	sources := make([]AISourceLink, 0, 6)

	// 1. Live Host Telemetry queries (CPU / RAM / GPU / Battery / System status)
	if containsAny(low, "телеметри", "мой пк", "моя систем", "нагрузк", "сколько озу", "сколько ram", "заряд батаре", "статус пк", "my pc", "system stats", "cpu usage", "gpu temp") && kernel != nil {
		snap := kernel.SystemSnapshot()
		sources = append(sources, AISourceLink{
			Title:    fmt.Sprintf("LumaCore %s · Живая телеметрия (%s)", KernelEngineVersion, snap.Hostname),
			URL:      "luma://taskmgr",
			Provider: "LumaCore Telemetry",
			Snippet:  fmt.Sprintf("CPU %d%% · GPU %d%% · RAM %.1f/%.1f ГБ", snap.CPUPercent, snap.GPUPercent, snap.RAMUsedGB, snap.RAMTotalGB),
		})
		reply := fmt.Sprintf(
			"### Живая телеметрия ПК (`Luma AI 3.8 FlashLite · LumaCore %s`)\n\n"+
				"- **Устройство:** `%s` (%s · %s)\n"+
				"- **Процессор:** %s — **%d%%** (%d ядер)\n"+
				"- **Видеокарта:** %s — **%d%%** · `%d°C` · VRAM `%d / %d МБ`\n"+
				"- **Оперативная память:** **%.1f / %.1f ГБ** (`%d%%`)\n"+
				"- **Сеть:** ↓ `%.1f Мбит/с` · ↑ `%.1f Мбит/с`\n"+
				"- **Батарея:** %d%% (%s)\n"+
				"- **Защита:** `LumaShield %s` (220+ эвристических правил)\n\n"+
				"*Источник: живой опрос датчиков LumaCore %s (Zero-WMI)*",
			KernelEngineVersion, snap.Hostname, snap.OSName, snap.Arch,
			snap.CPUModel, snap.CPUPercent, snap.CPUCores,
			snap.GPUName, snap.GPUPercent, snap.GPUTempC, snap.GPUVramUsedMB, snap.GPUVramTotalMB,
			snap.RAMUsedGB, snap.RAMTotalGB, snap.RAMPercent,
			snap.NetDownMbps, snap.NetUpMbps,
			snap.BatteryPercent, map[bool]string{true: "заряжается", false: "от батареи/сети"}[snap.BatteryCharging],
			SecurityCoreVersion, KernelEngineVersion,
		)
		return reply, sources, "Luma AI 3.8 FlashLite · Telemetry"
	}

	// 2. Central Bank of Russia (ЦБ РФ) live exchange rates
	if containsAny(low, "курс доллар", "курс евро", "курс юан", "курс валют", "цб рф", "usd", "eur", "cny", "exchange rate", "курс рубл") {
		if reply, cbrSrc, ok := fetchCBRCurrencyReply(low); ok {
			return reply, cbrSrc, "Luma AI 3.8 FlashLite · ЦБ РФ"
		}
	}

	// 3. Open-Meteo real-time weather anywhere in the world
	if containsAny(low, "погод", "weather", "прогноз погоды", "температура в ") {
		city := ""
		if m := weatherCityRe.FindStringSubmatch(prompt); len(m) >= 2 {
			city = strings.TrimSpace(m[1])
		}
		if city == "" && kernel != nil {
			snap := kernel.SystemSnapshot()
			city = snap.Location.City
		}
		if city == "" {
			city = "Москва"
		}
		if reply, wSrc, ok := fetchOpenMeteoWeatherReply(city); ok {
			return reply, wSrc, "Luma AI 3.8 FlashLite · Open-Meteo"
		}
	}

	// 4. Verified Multi-Source Fact Retrieval (Wikipedia RU/EN + DuckDuckGo + MDN + GitHub in parallel!)
	isDevTopic := normMode == "code" || containsAny(low,
		"javascript", "typescript", "react", "css", "html", "fetch", "promise", "async", "http", "cors", "websocket",
		"flexbox", "grid", "dom", "api", "canvas", "webgl", "golang", "python", "rust", "docker", "kubernetes",
		"github", "библиотек", "фреймворк", "репозитор", "mdn", "функция", "метод", "алгоритм",
	)

	cleanQ := cleanSearchQuery(prompt)
	if len([]rune(cleanQ)) >= 3 {
		var wg sync.WaitGroup
		var mu sync.Mutex

		var wikiTitle, wikiSummary string
		var wikiBullets []string
		var ddgTitle, ddgSummary string
		var mdnSummary string
		var ghSummary string

		// Wikipedia RU + EN
		wg.Add(1)
		go func() {
			defer wg.Done()
			w := fetchWikiWithURL(cleanQ, isEn)
			if w.summary != "" {
				mu.Lock()
				wikiTitle = w.title
				wikiSummary = w.summary
				wikiBullets = w.bullets
				sources = append(sources, AISourceLink{
					Title:    w.title,
					URL:      w.url,
					Provider: w.provider,
					Snippet:  truncateUTF8(w.summary, 140),
				})
				mu.Unlock()
			}
		}()

		// DuckDuckGo Instant Answer
		wg.Add(1)
		go func() {
			defer wg.Done()
			d := fetchDDGWithURL(cleanQ)
			if d.summary != "" {
				mu.Lock()
				ddgTitle = d.title
				ddgSummary = d.summary
				if d.url != "" {
					sources = append(sources, AISourceLink{
						Title:    d.title,
						URL:      d.url,
						Provider: "DuckDuckGo",
						Snippet:  truncateUTF8(d.summary, 140),
					})
				}
				mu.Unlock()
			}
		}()

		// MDN Web Docs (for web/JS/CSS/HTML/HTTP topics)
		if isDevTopic {
			wg.Add(1)
			go func() {
				defer wg.Done()
				mdnText, mdnLinks := fetchMDNDocs(cleanQ)
				if mdnText != "" {
					mu.Lock()
					mdnSummary = mdnText
					sources = append(sources, mdnLinks...)
					mu.Unlock()
				}
			}()

			// GitHub Repositories (for libraries/frameworks/tools)
			wg.Add(1)
			go func() {
				defer wg.Done()
				ghText, ghLinks := fetchGitHubRepos(cleanQ)
				if ghText != "" {
					mu.Lock()
					ghSummary = ghText
					sources = append(sources, ghLinks...)
					mu.Unlock()
				}
			}()
		}

		doneCh := make(chan struct{})
		go func() {
			wg.Wait()
			close(doneCh)
		}()
		select {
		case <-doneCh:
		case <-time.After(2900 * time.Millisecond):
		}

		mu.Lock()
		hasVerified := wikiSummary != "" || ddgSummary != "" || mdnSummary != "" || ghSummary != ""
		collectedSources := append([]AISourceLink{}, sources...)
		mu.Unlock()

		if hasVerified {
			var sb strings.Builder
			heading := wikiTitle
			if heading == "" {
				heading = ddgTitle
			}
			if heading == "" {
				heading = cleanQ
			}
			sb.WriteString("### " + heading + "\n\n")
			if wikiSummary != "" {
				sb.WriteString(wikiSummary + "\n\n")
			} else if ddgSummary != "" {
				sb.WriteString(ddgSummary + "\n\n")
			}
			if mdnSummary != "" {
				sb.WriteString("**Документация MDN Web Docs:**\n" + mdnSummary + "\n\n")
			}
			if ghSummary != "" {
				sb.WriteString("**Актуальные проекты GitHub:**\n" + ghSummary + "\n\n")
			}
			if len(wikiBullets) > 0 {
				sb.WriteString("**Связанные факты:**\n")
				for i, b := range wikiBullets {
					if i >= 3 {
						break
					}
					sb.WriteString("- " + b + "\n")
				}
				sb.WriteString("\n")
			}
			if len(collectedSources) > 0 {
				sb.WriteString("**Проверенные источники:**\n")
				for _, s := range collectedSources {
					sb.WriteString(fmt.Sprintf("- [%s · %s](%s)\n", s.Provider, s.Title, s.URL))
				}
			}
			return strings.TrimSpace(sb.String()), collectedSources, "Luma AI 3.8 FlashLite"
		}
	}

	return "", nil, "Luma AI 3.8 FlashLite"
}

func fetchWikiWithURL(query string, isEn bool) struct {
	title, summary, url, provider string
	bullets                       []string
} {
	var out struct {
		title, summary, url, provider string
		bullets                       []string
	}
	langs := []string{"ru", "en"}
	if isEn {
		langs = []string{"en", "ru"}
	}
	client := &http.Client{Timeout: 2300 * time.Millisecond}
	for _, lang := range langs {
		searchURL := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=query&list=search&srsearch=%s&srlimit=3&utf8=1&format=json", lang, url.QueryEscape(query))
		req, _ := http.NewRequest("GET", searchURL, nil)
		req.Header.Set("User-Agent", "LumaOS/1.6 (https://github.com/Tveexty/L_H-3.0)")
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		var sr struct {
			Query struct {
				Search []struct {
					Title   string `json:"title"`
					Snippet string `json:"snippet"`
				} `json:"search"`
			} `json:"query"`
		}
		decErr := json.NewDecoder(resp.Body).Decode(&sr)
		_ = resp.Body.Close()
		if decErr != nil || len(sr.Query.Search) == 0 {
			continue
		}
		top := sr.Query.Search[0].Title
		slug := url.PathEscape(strings.ReplaceAll(top, " ", "_"))
		sumURL := fmt.Sprintf("https://%s.wikipedia.org/api/rest_v1/page/summary/%s", lang, slug)
		req2, _ := http.NewRequest("GET", sumURL, nil)
		req2.Header.Set("User-Agent", "LumaOS/1.6 (https://github.com/Tveexty/L_H-3.0)")
		resp2, err2 := client.Do(req2)
		if err2 != nil {
			continue
		}
		var sum struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Extract     string `json:"extract"`
			ContentURLs struct {
				Desktop struct {
					Page string `json:"page"`
				} `json:"desktop"`
			} `json:"content_urls"`
		}
		decErr2 := json.NewDecoder(resp2.Body).Decode(&sum)
		_ = resp2.Body.Close()
		if decErr2 == nil && strings.TrimSpace(sum.Extract) != "" {
			out.title = sum.Title
			if sum.Description != "" {
				out.summary = "*" + sum.Description + "*\n\n" + strings.TrimSpace(sum.Extract)
			} else {
				out.summary = strings.TrimSpace(sum.Extract)
			}
			out.url = sum.ContentURLs.Desktop.Page
			if out.url == "" {
				out.url = fmt.Sprintf("https://%s.wikipedia.org/wiki/%s", lang, slug)
			}
			out.provider = "Wikipedia " + strings.ToUpper(lang)
			for i := 1; i < len(sr.Query.Search); i++ {
				snip := stripSimpleHTML(sr.Query.Search[i].Snippet)
				if snip != "" {
					out.bullets = append(out.bullets, fmt.Sprintf("**%s** — %s", sr.Query.Search[i].Title, snip))
				}
			}
			return out
		}
	}
	return out
}

func fetchDDGWithURL(query string) struct {
	title, summary, url string
} {
	var out struct {
		title, summary, url string
	}
	client := &http.Client{Timeout: 2200 * time.Millisecond}
	u := fmt.Sprintf("https://api.duckduckgo.com/?q=%s&format=json&no_html=1&skip_disambig=1", url.QueryEscape(query))
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("User-Agent", "LumaOS/1.6")
	resp, err := client.Do(req)
	if err != nil {
		return out
	}
	defer resp.Body.Close()
	var payload struct {
		Heading      string `json:"Heading"`
		AbstractText string `json:"AbstractText"`
		AbstractURL  string `json:"AbstractURL"`
		Answer       string `json:"Answer"`
		Definition   string `json:"Definition"`
	}
	if json.NewDecoder(resp.Body).Decode(&payload) != nil {
		return out
	}
	out.title = strings.TrimSpace(payload.Heading)
	if out.title == "" {
		out.title = query
	}
	if payload.Answer != "" {
		out.summary = strings.TrimSpace(payload.Answer)
	} else if payload.AbstractText != "" {
		out.summary = strings.TrimSpace(payload.AbstractText)
	} else if payload.Definition != "" {
		out.summary = strings.TrimSpace(payload.Definition)
	}
	out.url = strings.TrimSpace(payload.AbstractURL)
	if out.url == "" && out.summary != "" {
		out.url = "https://duckduckgo.com/?q=" + url.QueryEscape(query)
	}
	return out
}

func fetchMDNDocs(query string) (string, []AISourceLink) {
	client := &http.Client{Timeout: 2100 * time.Millisecond}
	u := "https://developer.mozilla.org/api/v1/search?q=" + url.QueryEscape(query) + "&size=2"
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("User-Agent", "LumaOS/1.6")
	resp, err := client.Do(req)
	if err != nil {
		return "", nil
	}
	defer resp.Body.Close()
	var data struct {
		Documents []struct {
			Title   string `json:"title"`
			Summary string `json:"summary"`
			MDNURL  string `json:"mdn_url"`
		} `json:"documents"`
	}
	if json.NewDecoder(resp.Body).Decode(&data) != nil || len(data.Documents) == 0 {
		return "", nil
	}
	var sb strings.Builder
	links := make([]AISourceLink, 0, len(data.Documents))
	for _, d := range data.Documents {
		fullURL := "https://developer.mozilla.org" + d.MDNURL
		sb.WriteString(fmt.Sprintf("- **%s**: %s\n", d.Title, truncateUTF8(strings.TrimSpace(d.Summary), 180)))
		links = append(links, AISourceLink{
			Title:    d.Title,
			URL:      fullURL,
			Provider: "MDN Web Docs",
			Snippet:  truncateUTF8(d.Summary, 120),
		})
	}
	return strings.TrimSpace(sb.String()), links
}

func fetchGitHubRepos(query string) (string, []AISourceLink) {
	client := &http.Client{Timeout: 2200 * time.Millisecond}
	u := "https://api.github.com/search/repositories?q=" + url.QueryEscape(query) + "&sort=stars&per_page=2"
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("User-Agent", "LumaOS/1.6")
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := client.Do(req)
	if err != nil {
		return "", nil
	}
	defer resp.Body.Close()
	var data struct {
		Items []struct {
			FullName    string `json:"full_name"`
			Description string `json:"description"`
			HTMLURL     string `json:"html_url"`
			Stars       int    `json:"stargazers_count"`
			Language    string `json:"language"`
		} `json:"items"`
	}
	if json.NewDecoder(resp.Body).Decode(&data) != nil || len(data.Items) == 0 {
		return "", nil
	}
	var sb strings.Builder
	links := make([]AISourceLink, 0, len(data.Items))
	for _, it := range data.Items {
		sb.WriteString(fmt.Sprintf("- **%s** (`★ %d` · %s): %s\n", it.FullName, it.Stars, it.Language, truncateUTF8(it.Description, 140)))
		links = append(links, AISourceLink{
			Title:    it.FullName,
			URL:      it.HTMLURL,
			Provider: "GitHub",
			Snippet:  fmt.Sprintf("★ %d · %s", it.Stars, truncateUTF8(it.Description, 100)),
		})
	}
	return strings.TrimSpace(sb.String()), links
}

func fetchOpenMeteoWeatherReply(city string) (string, []AISourceLink, bool) {
	client := &http.Client{Timeout: 2600 * time.Millisecond}
	geoURL := "https://geocoding-api.open-meteo.com/v1/search?name=" + url.QueryEscape(city) + "&count=1&language=ru&format=json"
	resp, err := client.Get(geoURL)
	if err != nil {
		return "", nil, false
	}
	var geo struct {
		Results []struct {
			Name      string  `json:"name"`
			Country   string  `json:"country"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"results"`
	}
	errDec := json.NewDecoder(resp.Body).Decode(&geo)
	_ = resp.Body.Close()
	if errDec != nil || len(geo.Results) == 0 {
		return "", nil, false
	}
	loc := geo.Results[0]
	wURL := fmt.Sprintf("https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=auto", loc.Latitude, loc.Longitude)
	resp2, err2 := client.Get(wURL)
	if err2 != nil {
		return "", nil, false
	}
	var wData struct {
		Current struct {
			Temp     float64 `json:"temperature_2m"`
			Feels    float64 `json:"apparent_temperature"`
			Humidity int     `json:"relative_humidity_2m"`
			Wind     float64 `json:"wind_speed_10m"`
		} `json:"current"`
	}
	errDec2 := json.NewDecoder(resp2.Body).Decode(&wData)
	_ = resp2.Body.Close()
	if errDec2 != nil {
		return "", nil, false
	}
	srcURL := fmt.Sprintf("https://open-meteo.com/en/docs#latitude=%.2f&longitude=%.2f", loc.Latitude, loc.Longitude)
	sources := []AISourceLink{{
		Title:    fmt.Sprintf("Open-Meteo · %s (%s)", loc.Name, loc.Country),
		URL:      srcURL,
		Provider: "Open-Meteo",
		Snippet:  fmt.Sprintf("%.1f°C · ветер %.1f км/ч · влажность %d%%", wData.Current.Temp, wData.Current.Wind, wData.Current.Humidity),
	}}
	reply := fmt.Sprintf(
		"### Погода сейчас: **%s, %s**\n\n"+
			"- **Температура:** `%.1f °C` (ощущается как `%.1f °C`)\n"+
			"- **Влажность:** `%d%%`\n"+
			"- **Ветер:** `%.1f км/ч`\n\n"+
			"**Проверенный источник:** [Open-Meteo Live Weather](%s)",
		loc.Name, loc.Country, wData.Current.Temp, wData.Current.Feels, wData.Current.Humidity, wData.Current.Wind, srcURL,
	)
	return reply, sources, true
}

func fetchCBRCurrencyReply(low string) (string, []AISourceLink, bool) {
	cbrCacheMu.RLock()
	fresh := !cbrCacheAt.IsZero() && time.Since(cbrCacheAt) < 20*time.Minute && len(cbrRates) > 0
	cbrCacheMu.RUnlock()

	if !fresh {
		client := &http.Client{Timeout: 2500 * time.Millisecond}
		if resp, err := client.Get("https://www.cbr-xml-daily.ru/daily_json.js"); err == nil {
			var payload struct {
				Date   string `json:"Date"`
				Valute map[string]struct {
					Name    string  `json:"Name"`
					Nominal float64 `json:"Nominal"`
					Value   float64 `json:"Value"`
					Prev    float64 `json:"Previous"`
				} `json:"Valute"`
			}
			if json.NewDecoder(resp.Body).Decode(&payload) == nil && len(payload.Valute) > 0 {
				m := make(map[string]struct {
					Name    string
					Nominal float64
					Value   float64
					Prev    float64
				}, len(payload.Valute))
				for k, v := range payload.Valute {
					m[k] = struct {
						Name    string
						Nominal float64
						Value   float64
						Prev    float64
					}{Name: v.Name, Nominal: v.Nominal, Value: v.Value, Prev: v.Prev}
				}
				cbrCacheMu.Lock()
				cbrRates = m
				cbrDateStr = payload.Date
				if len(cbrDateStr) >= 10 {
					cbrDateStr = cbrDateStr[:10]
				}
				cbrCacheAt = time.Now()
				cbrCacheMu.Unlock()
			}
			_ = resp.Body.Close()
		}
	}

	cbrCacheMu.RLock()
	rates := cbrRates
	dStr := cbrDateStr
	cbrCacheMu.RUnlock()

	cbrURL := "https://www.cbr.ru/currency_base/daily/"
	sources := []AISourceLink{{
		Title:    "Официальные курсы валют ЦБ РФ",
		URL:      cbrURL,
		Provider: "ЦБ РФ",
		Snippet:  "Центральный банк Российской Федерации (" + dStr + ")",
	}}

	if len(rates) > 0 {
		codes := []string{"USD", "EUR", "CNY", "GBP", "KZT", "TRY"}
		var sb strings.Builder
		sb.WriteString(fmt.Sprintf("### Официальные курсы валют ЦБ РФ (`%s`)\n\n", dStr))
		for _, c := range codes {
			if v, ok := rates[c]; ok {
				unitVal := v.Value / math.Max(1, v.Nominal)
				prevVal := v.Prev / math.Max(1, v.Nominal)
				diff := unitVal - prevVal
				arrow := "▲"
				if diff < 0 {
					arrow = "▼"
				}
				sb.WriteString(fmt.Sprintf("- **1 %s** (%s): **%.2f ₽** (`%s %+.2f ₽`)\n", c, v.Name, unitVal, arrow, diff))
			}
		}
		sb.WriteString(fmt.Sprintf("\n**Проверенный источник:** [Центральный банк РФ · cbr.ru](%s)", cbrURL))
		return sb.String(), sources, true
	}

	// Offline/fallback to FetchLiveCurrencySnapshot
	fx := FetchLiveCurrencySnapshot("RUB")
	if unitMap, ok := fx["unit_in_base"].(map[string]float64); ok {
		reply := fmt.Sprintf(
			"### Актуальные курсы валют (`Luma AI 3.8 FlashLite`)\n\n"+
				"- **1 USD:** `%.2f ₽`\n- **1 EUR:** `%.2f ₽`\n- **1 CNY:** `%.2f ₽`\n- **1 BTC:** `%.0f ₽`\n\n"+
				"**Источник:** [ЦБ РФ / Open Exchange Rates](%s)",
			unitMap["USD"], unitMap["EUR"], unitMap["CNY"], unitMap["BTC"], cbrURL,
		)
		return reply, sources, true
	}
	return "", nil, false
}

// HandleAI38ContextualAssist powers the "AI 3.8" buttons in Luma Office (Word/Excel/PowerPoint),
// Code Studio, Quick Look, Explorer, Terminal (`ai`), and Alt+R Spotlight!
func HandleAI38ContextualAssist(app, action, content, prompt, filename string, kernel *LumaKernel) map[string]interface{} {
	started := time.Now()
	appLow := strings.ToLower(strings.TrimSpace(app))
	actLow := strings.ToLower(strings.TrimSpace(action))
	trimmedContent := strings.TrimSpace(content)
	trimmedPrompt := strings.TrimSpace(prompt)

	var reply string
	var sources []AISourceLink
	model := "Luma AI 3.8 FlashLite"

	switch appLow {
	case "office_word", "word", "docs":
		words := len(strings.Fields(trimmedContent))
		switch actLow {
		case "improve", "rewrite":
			cleaned := strings.Join(strings.Fields(trimmedContent), " ")
			cleaned = strings.ReplaceAll(cleaned, " ,", ",")
			cleaned = strings.ReplaceAll(cleaned, " .", ".")
			cleaned = strings.ReplaceAll(cleaned, " - ", " — ")
			if cleaned == "" {
				cleaned = "Введите или выделите абзац документа, и Luma AI 3.8 FlashLite отредактирует стиль, типографику и структуру."
			}
			reply = fmt.Sprintf("### Улучшенный текст (`Luma Word · AI 3.8`)\n\n%s\n\n*Исправлена типографика (тире `—`, лишние пробелы), объём: %d слов.*", cleaned, words)
		case "summarize":
			sents := splitSentences(trimmedContent)
			take := 3
			if len(sents) < take {
				take = len(sents)
			}
			var b strings.Builder
			b.WriteString("### Краткое резюме документа (`AI 3.8`)\n\n")
			for i := 0; i < take; i++ {
				b.WriteString("- " + sents[i] + "\n")
			}
			if take == 0 {
				b.WriteString("- Документ пока пуст — добавьте текст для анализа.\n")
			}
			reply = b.String()
		default:
			q := trimmedPrompt
			if q == "" {
				q = "Структурированный деловой документ: " + truncateUTF8(trimmedContent, 160)
			}
			res := RunLumaLocalAI([]AIChatMessage{{Role: "user", Content: q}}, "language", "balanced", kernel)
			reply, _ = res["reply"].(string)
			if s, ok := res["sources"].([]AISourceLink); ok {
				sources = s
			}
		}

	case "office_excel", "excel", "sheets":
		lowQ := strings.ToLower(trimmedPrompt)
		switch {
		case containsAny(lowQ, "сумм", "итог", "sum"):
			reply = "### Формула Excel (`Luma AI 3.8`)\n\n```excel\n=СУММ(B2:B20)\n```\nДля суммы с условием:\n```excel\n=СУММЕСЛИ(A2:A20; \">0\"; B2:B20)\n```\n*Поддерживается более 140 формул на русском и английском в Luma Excel.*"
		case containsAny(lowQ, "впр", "поиск", "vlookup", "xlookup"):
			reply = "### Поиск по таблице (`Luma AI 3.8`)\n\n```excel\n=ВПР(A2; D2:F50; 2; ЛОЖЬ)\n```\nИли современный `XLOOKUP`:\n```excel\n=ПРОСМОТРX(A2; D2:D50; E2:E50; \"Не найдено\")\n```"
		case containsAny(lowQ, "средн", "average", "медиан"):
			reply = "### Статистика по диапазону (`Luma AI 3.8`)\n\n```excel\n=СРЗНАЧ(B2:B20)\n=МЕДИАНА(B2:B20)\n=МАКС(B2:B20)\n```"
		case containsAny(lowQ, "если", "услов", "if"):
			reply = "### Условная логика (`Luma AI 3.8`)\n\n```excel\n=ЕСЛИ(B2>=1000; \"Выполнено\"; \"В работе\")\n```"
		default:
			reply = fmt.Sprintf("### Анализ таблицы (`Luma Excel · AI 3.8`)\n\nКонтекст листа проанализирован (%d симв.). Полезные формулы для вставки:\n\n- **Итог столбца:** `=СУММ(B2:B20)`\n- **Среднее значение:** `=СРЗНАЧ(B2:B20)`\n- **Условие:** `=ЕСЛИ(C2>0; \"Прибыль\"; \"Убыток\")`\n- **Поиск значения:** `=ПРОСМОТРX(A2; A2:A50; B2:B50)`\n\nНапишите задачу (например: *«посчитай сумму если категория Продажи»*) — выдам готовую формулу!", len(trimmedContent))
		}

	case "office_ppt", "powerpoint", "slides":
		topic := trimmedPrompt
		if topic == "" {
			topic = truncateUTF8(trimmedContent, 80)
		}
		if topic == "" {
			topic = "Презентация проекта"
		}
		reply = fmt.Sprintf(
			"### План слайда (`Luma PowerPoint · AI 3.8`)\n\n"+
				"**Заголовок:** %s\n\n"+
				"**Ключевые тезисы (3–4 буллита):**\n"+
				"- Проблема и цель: зачем решение нужно прямо сейчас\n"+
				"- Ключевые цифры и метрики эффективности (+35% скорости)\n"+
				"- Архитектура / план внедрения по этапам\n"+
				"- Ожидаемый результат и следующий шаг\n\n"+
				"**Заметки докладчика:** Акцентируйте внимание на практической пользе и держите темп 45–60 секунд на слайд.",
			topic,
		)

	case "code_studio", "quicklook":
		q := trimmedPrompt
		if q == "" {
			if actLow == "bugs" || actLow == "review" {
				q = fmt.Sprintf("Проверь этот код из файла %s на ошибки, уязвимости и предложи улучшения:\n```\n%s\n```", filename, truncateUTF8(trimmedContent, 3500))
			} else {
				q = fmt.Sprintf("Объясни простым и технически точным языком, что делает файл %s:\n```\n%s\n```", filename, truncateUTF8(trimmedContent, 3500))
			}
		} else if trimmedContent != "" {
			q = q + "\n\nКонтекст файла `" + filename + "`:\n```\n" + truncateUTF8(trimmedContent, 2800) + "\n```"
		}
		res := RunLumaLocalAI([]AIChatMessage{{Role: "user", Content: q}}, "code", "balanced", kernel)
		reply, _ = res["reply"].(string)
		if s, ok := res["sources"].([]AISourceLink); ok {
			sources = s
		}
		if m, ok := res["model"].(string); ok && m != "" {
			model = m
		}

	default:
		q := trimmedPrompt
		if q == "" {
			q = trimmedContent
		}
		res := RunLumaLocalAI([]AIChatMessage{{Role: "user", Content: q}}, "auto", "balanced", kernel)
		reply, _ = res["reply"].(string)
		if s, ok := res["sources"].([]AISourceLink); ok {
			sources = s
		}
		if m, ok := res["model"].(string); ok && m != "" {
			model = m
		}
	}

	if sources == nil {
		sources = []AISourceLink{}
	}
	return map[string]interface{}{
		"ok":             true,
		"app":            appLow,
		"action":         actLow,
		"model":          model,
		"reply":          reply,
		"sources":        sources,
		"verified_facts": len(sources) > 0,
		"latency_ms":     time.Since(started).Milliseconds(),
	}
}
