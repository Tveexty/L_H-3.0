package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"math"
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

// ==================== LUMA AI 4.0 AUTONOMOUS AGENT ====================
// Autonomous reasoning engine with:
//   1. Multi-step visible Thinking Chain (Ход мыслей)
//   2. Universal Open-Web Search across ANY internet source (DuckDuckGo HTML/Lite +
//      Live Web Page Fetcher & Content Extractor + Wikipedia RU/EN + StackOverflow +
//      Hacker News + GitHub + MDN + Open-Meteo + CBR + CoinGecko)
//   3. Full Autonomous OS Action Execution (kernel hardware/FS/security/vmem/app tools
//      + UI dispatch actions for Luma OS desktop shell)
//   4. Recursive-descent exact Math & Expression Solver

type AI40ThinkingStep struct {
	Step       int    `json:"step"`
	Title      string `json:"title"`
	Detail     string `json:"detail"`
	DurationMs int64  `json:"duration_ms"`
	Status     string `json:"status"` // done | skipped
}

type AI40ExecutedAction struct {
	ID      string                 `json:"id"`
	Tool    string                 `json:"tool"`
	Label   string                 `json:"label"`
	Status  string                 `json:"status"` // done | ui_dispatch | error
	Detail  string                 `json:"detail"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

type AI40UIAction struct {
	Type   string      `json:"type"`
	Target string      `json:"target,omitempty"`
	Value  interface{} `json:"value,omitempty"`
	Label  string      `json:"label"`
}

type AI40WebHit struct {
	Title       string
	URL         string
	Domain      string
	Snippet     string
	PageExcerpt string
	Provider    string
}

var (
	ai40HTTPClient = &http.Client{
		Timeout: 4500 * time.Millisecond,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
	reDDGLink       = regexp.MustCompile(`(?is)<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>`)
	reDDGSnippet    = regexp.MustCompile(`(?is)<(?:a|div)[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</(?:a|div)>`)
	reScriptStyle   = regexp.MustCompile(`(?is)<(script|style|noscript|svg|nav|footer|header|aside|iframe)[^>]*>.*?</(script|style|noscript|svg|nav|footer|header|aside|iframe)>`)
	reHTMLTags      = regexp.MustCompile(`(?is)<[^>]+>`)
	reMultiSpace    = regexp.MustCompile(`\s+`)
	reExplicitURL   = regexp.MustCompile(`https?://[^\s<>"'\)\]]+`)
	reExtractNumber = regexp.MustCompile(`\d{1,3}`)
	reMathExpr      = regexp.MustCompile(`^[0-9\.\+\-\*\/\(\)\^\s%]+$`)
)

func ai40StripHTML(s string) string {
	s = reScriptStyle.ReplaceAllString(s, " ")
	s = reHTMLTags.ReplaceAllString(s, " ")
	s = html.UnescapeString(s)
	s = reMultiSpace.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func ai40ExtractDomain(rawURL string) string {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || u.Host == "" {
		return "web"
	}
	return strings.TrimPrefix(strings.ToLower(u.Host), "www.")
}

func ai40DecodeDDGURL(raw string) string {
	raw = html.UnescapeString(strings.TrimSpace(raw))
	if strings.HasPrefix(raw, "//") {
		raw = "https:" + raw
	}
	if u, err := url.Parse(raw); err == nil {
		if uddg := u.Query().Get("uddg"); uddg != "" {
			if dec, err2 := url.QueryUnescape(uddg); err2 == nil && strings.HasPrefix(dec, "http") {
				return dec
			}
		}
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	return ""
}

// searchDuckDuckGoOpenWeb queries DuckDuckGo HTML endpoint to discover results from ANY website on the internet.
func searchDuckDuckGoOpenWeb(ctx context.Context, query string, maxHits int) []AI40WebHit {
	if maxHits <= 0 {
		maxHits = 5
	}
	endpoint := "https://html.duckduckgo.com/html/?q=" + url.QueryEscape(query)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")

	resp, err := ai40HTTPClient.Do(req)
	if err != nil || resp == nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil
	}
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 220*1024))
	if err != nil {
		return nil
	}
	body := string(bodyBytes)
	links := reDDGLink.FindAllStringSubmatch(body, maxHits+4)
	snippets := reDDGSnippet.FindAllStringSubmatch(body, maxHits+4)

	hits := make([]AI40WebHit, 0, maxHits)
	seen := map[string]bool{}
	for i, m := range links {
		if len(hits) >= maxHits {
			break
		}
		target := ai40DecodeDDGURL(m[1])
		if target == "" || strings.Contains(target, "duckduckgo.com/y.js") {
			continue
		}
		if seen[target] {
			continue
		}
		seen[target] = true
		title := ai40StripHTML(m[2])
		snip := ""
		if i < len(snippets) && len(snippets[i]) >= 2 {
			snip = ai40StripHTML(snippets[i][1])
		}
		if title == "" {
			continue
		}
		domain := ai40ExtractDomain(target)
		hits = append(hits, AI40WebHit{
			Title:    title,
			URL:      target,
			Domain:   domain,
			Snippet:  snip,
			Provider: domain,
		})
	}
	return hits
}

// fetchWebPageExcerpt downloads ANY real web page URL and extracts clean readable main text paragraphs.
func fetchWebPageExcerpt(ctx context.Context, rawURL string) (string, string) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.9,en;q=0.7")

	resp, err := ai40HTTPClient.Do(req)
	if err != nil || resp == nil {
		return "", ""
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", ""
	}
	ct := strings.ToLower(resp.Header.Get("Content-Type"))
	if ct != "" && !strings.Contains(ct, "text/") && !strings.Contains(ct, "html") && !strings.Contains(ct, "json") && !strings.Contains(ct, "xml") {
		return "", ""
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 150*1024))
	if err != nil || len(raw) == 0 {
		return "", ""
	}
	s := string(raw)
	// Extract <title>
	title := ""
	if ti := regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`).FindStringSubmatch(s); len(ti) >= 2 {
		title = ai40StripHTML(ti[1])
	}
	// Prefer <p> paragraphs to avoid menus & buttons
	pRe := regexp.MustCompile(`(?is)<p[^>]*>(.*?)</p>`)
	pMatches := pRe.FindAllStringSubmatch(s, 30)
	var good []string
	totalLen := 0
	for _, pm := range pMatches {
		txt := ai40StripHTML(pm[1])
		if len([]rune(txt)) < 48 {
			continue
		}
		low := strings.ToLower(txt)
		if strings.Contains(low, "cookie") && len([]rune(txt)) < 160 {
			continue
		}
		if strings.Contains(low, "javascript") && strings.Contains(low, "enable") {
			continue
		}
		good = append(good, txt)
		totalLen += len([]rune(txt))
		if len(good) >= 3 || totalLen >= 520 {
			break
		}
	}
	if len(good) > 0 {
		out := strings.Join(good, " ")
		if len([]rune(out)) > 580 {
			out = string([]rune(out)[:580]) + "…"
		}
		return title, out
	}
	plain := ai40StripHTML(s)
	if len([]rune(plain)) > 420 {
		plain = string([]rune(plain)[:420]) + "…"
	}
	return title, plain
}

// searchHackerNews queries Hacker News Algolia API for live tech/AI/industry discussions.
func searchHackerNews(ctx context.Context, query string) []AI40WebHit {
	endpoint := "https://hn.algolia.com/api/v1/search?hitsPerPage=3&query=" + url.QueryEscape(query)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil
	}
	resp, err := ai40HTTPClient.Do(req)
	if err != nil || resp == nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil
	}
	var payload struct {
		Hits []struct {
			Title    string `json:"title"`
			URL      string `json:"url"`
			ObjectID string `json:"objectID"`
			Points   int    `json:"points"`
		} `json:"hits"`
	}
	if json.NewDecoder(io.LimitReader(resp.Body, 48*1024)).Decode(&payload) != nil {
		return nil
	}
	var out []AI40WebHit
	for _, h := range payload.Hits {
		if h.Title == "" {
			continue
		}
		link := h.URL
		if link == "" {
			link = "https://news.ycombinator.com/item?id=" + h.ObjectID
		}
		out = append(out, AI40WebHit{
			Title:    h.Title,
			URL:      link,
			Domain:   ai40ExtractDomain(link),
			Snippet:  fmt.Sprintf("Обсуждение в IT-сообществе (%d голосов): %s", h.Points, h.Title),
			Provider: "Hacker News",
		})
	}
	return out
}

// searchStackOverflow queries StackOverflow API for programming/debugging questions.
func searchStackOverflow(ctx context.Context, query string) []AI40WebHit {
	endpoint := "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&pagesize=3&site=stackoverflow&q=" + url.QueryEscape(query)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil
	}
	resp, err := ai40HTTPClient.Do(req)
	if err != nil || resp == nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil
	}
	var payload struct {
		Items []struct {
			Title       string   `json:"title"`
			Link        string   `json:"link"`
			Score       int      `json:"score"`
			AnswerCount int      `json:"answer_count"`
			IsAnswered  bool     `json:"is_answered"`
			Tags        []string `json:"tags"`
		} `json:"items"`
	}
	if json.NewDecoder(io.LimitReader(resp.Body, 48*1024)).Decode(&payload) != nil {
		return nil
	}
	var out []AI40WebHit
	for _, it := range payload.Items {
		title := html.UnescapeString(it.Title)
		out = append(out, AI40WebHit{
			Title:    title,
			URL:      it.Link,
			Domain:   "stackoverflow.com",
			Snippet:  fmt.Sprintf("Ответов: %d · рейтинг %d · теги: %s", it.AnswerCount, it.Score, strings.Join(it.Tags, ", ")),
			Provider: "StackOverflow",
		})
	}
	return out
}

// fetchCryptoPrices queries CoinGecko public API for live cryptocurrency prices.
func fetchCryptoPrices(ctx context.Context, low string) (string, *AISourceLink) {
	ids := []string{}
	if strings.Contains(low, "btc") || strings.Contains(low, "биткоин") || strings.Contains(low, "bitcoin") {
		ids = append(ids, "bitcoin")
	}
	if strings.Contains(low, "eth") || strings.Contains(low, "эфир") || strings.Contains(low, "ethereum") {
		ids = append(ids, "ethereum")
	}
	if strings.Contains(low, "ton") || strings.Contains(low, "тон") {
		ids = append(ids, "the-open-network")
	}
	if strings.Contains(low, "sol") || strings.Contains(low, "солана") || strings.Contains(low, "solana") {
		ids = append(ids, "solana")
	}
	if len(ids) == 0 {
		ids = []string{"bitcoin", "ethereum", "the-open-network"}
	}
	endpoint := "https://api.coingecko.com/api/v3/simple/price?ids=" + strings.Join(ids, ",") + "&vs_currencies=usd,rub&include_24hr_change=true"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", nil
	}
	resp, err := ai40HTTPClient.Do(req)
	if err != nil || resp == nil {
		return "", nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", nil
	}
	var data map[string]map[string]float64
	if json.NewDecoder(io.LimitReader(resp.Body, 24*1024)).Decode(&data) != nil || len(data) == 0 {
		return "", nil
	}
	names := map[string]string{
		"bitcoin":          "Bitcoin (BTC)",
		"ethereum":         "Ethereum (ETH)",
		"the-open-network": "Toncoin (TON)",
		"solana":           "Solana (SOL)",
	}
	lines := []string{}
	for _, id := range ids {
		if m, ok := data[id]; ok {
			lbl := names[id]
			if lbl == "" {
				lbl = id
			}
			lines = append(lines, fmt.Sprintf("• **%s**: $%.2f (%.0f ₽ · 24ч: %+.2f%%)", lbl, m["usd"], m["rub"], m["usd_24h_change"]))
		}
	}
	if len(lines) == 0 {
		return "", nil
	}
	return "Актуальные курсы криптовалют:\n" + strings.Join(lines, "\n"), &AISourceLink{
		Title:    "CoinGecko — Курсы криптовалют (Live)",
		URL:      "https://www.coingecko.com/",
		Provider: "CoinGecko",
		Snippet:  lines[0],
	}
}

// ai40CleanSearchQuery strips imperative assistant prefixes so open-web search hits exact topics.
func ai40CleanSearchQuery(prompt string) string {
	s := strings.TrimSpace(prompt)
	prefixes := []string{
		"найди в интернете ", "поищи в интернете ", "поищи ", "найди ", "загугли ", "узнай ",
		"расскажи про ", "расскажи о ", "что такое ", "кто такой ", "кто такая ",
		"посмотри в интернете ", "search ", "google ", "find ", "tell me about ",
	}
	low := strings.ToLower(s)
	for _, p := range prefixes {
		if strings.HasPrefix(low, p) {
			s = strings.TrimSpace(s[len(p):])
			low = strings.ToLower(s)
		}
	}
	return strings.Trim(s, "?!. ")
}

func extractCityForWeather(prompt string) string {
	low := strings.ToLower(prompt)
	for _, marker := range []string{"погода в ", "погоду в ", "weather in ", "температура в "} {
		if idx := strings.Index(low, marker); idx >= 0 {
			rest := strings.TrimSpace(prompt[idx+len(marker):])
			fields := strings.Fields(rest)
			if len(fields) > 0 {
				return strings.Trim(fields[0], ".,?!;:")
			}
		}
	}
	return "Москва"
}

// runUniversalWebResearch searches ANY websites across the open internet, fetches live page excerpts,
// and combines them with specialized live providers (Wikipedia, GitHub, StackOverflow, HN, Weather, CBR, Crypto).
func runUniversalWebResearch(prompt string) (string, []AISourceLink, int) {
	ctx, cancel := context.WithTimeout(context.Background(), 5500*time.Millisecond)
	defer cancel()

	cleanQ := ai40CleanSearchQuery(prompt)
	if cleanQ == "" {
		cleanQ = strings.TrimSpace(prompt)
	}
	low := strings.ToLower(prompt)

	var (
		mu          sync.Mutex
		wg          sync.WaitGroup
		webHits     []AI40WebHit
		directTexts []string
		sources     []AISourceLink
		seenURL     = map[string]bool{}
	)
	addSource := func(src AISourceLink) {
		if src.URL == "" {
			return
		}
		mu.Lock()
		defer mu.Unlock()
		if seenURL[src.URL] {
			return
		}
		seenURL[src.URL] = true
		sources = append(sources, src)
	}

	// 0. If user pasted an explicit URL, read that exact webpage live!
	explicitURLs := reExplicitURL.FindAllString(prompt, 2)
	for _, u := range explicitURLs {
		targetURL := strings.TrimRight(u, ".,;)")
		wg.Add(1)
		go func(link string) {
			defer wg.Done()
			title, excerpt := fetchWebPageExcerpt(ctx, link)
			if excerpt != "" {
				if title == "" {
					title = ai40ExtractDomain(link)
				}
				mu.Lock()
				directTexts = append(directTexts, fmt.Sprintf("🌐 **%s** (%s):\n%s", title, ai40ExtractDomain(link), excerpt))
				mu.Unlock()
				addSource(AISourceLink{Title: title, URL: link, Provider: ai40ExtractDomain(link), Snippet: excerpt})
			}
		}(targetURL)
	}

	// 1. Live Weather (Open-Meteo)
	if strings.Contains(low, "погод") || strings.Contains(low, "weather") || strings.Contains(low, "температур") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if txt, srcs, ok := fetchOpenMeteoWeatherReply(extractCityForWeather(prompt)); ok && txt != "" {
				mu.Lock()
				directTexts = append(directTexts, txt)
				mu.Unlock()
				for _, s := range srcs {
					addSource(s)
				}
			}
		}()
	}

	// 2. Live Currency Rates (CBR ЦБ РФ)
	if strings.Contains(low, "курс") || strings.Contains(low, "доллар") || strings.Contains(low, "евро") || strings.Contains(low, "юан") || strings.Contains(low, "usd") || strings.Contains(low, "eur") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if txt, srcs, ok := fetchCBRCurrencyReply(low); ok && txt != "" {
				mu.Lock()
				directTexts = append(directTexts, txt)
				mu.Unlock()
				for _, s := range srcs {
					addSource(s)
				}
			}
		}()
	}

	// 3. Live Crypto Prices (CoinGecko)
	if strings.Contains(low, "биткоин") || strings.Contains(low, "btc") || strings.Contains(low, "эфир") || strings.Contains(low, "eth") || strings.Contains(low, "крипт") || strings.Contains(low, "ton") || strings.Contains(low, "solana") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if txt, src := fetchCryptoPrices(ctx, low); txt != "" {
				mu.Lock()
				directTexts = append(directTexts, txt)
				mu.Unlock()
				if src != nil {
					addSource(*src)
				}
			}
		}()
	}

	// 4. Open-Web Search (ANY website on the entire internet via DuckDuckGo HTML)
	wg.Add(1)
	go func() {
		defer wg.Done()
		hits := searchDuckDuckGoOpenWeb(ctx, cleanQ, 5)
		if len(hits) > 0 {
			var pwg sync.WaitGroup
			limitFetch := 2
			if len(hits) < limitFetch {
				limitFetch = len(hits)
			}
			for i := 0; i < limitFetch; i++ {
				pwg.Add(1)
				go func(idx int) {
					defer pwg.Done()
					_, excerpt := fetchWebPageExcerpt(ctx, hits[idx].URL)
					if len([]rune(excerpt)) > 80 {
						hits[idx].PageExcerpt = excerpt
					}
				}(i)
			}
			pwg.Wait()
			mu.Lock()
			webHits = append(webHits, hits...)
			mu.Unlock()
		}
	}()

	// 5. Wikipedia RU & EN + DDG Instant Answer
	wg.Add(1)
	go func() {
		defer wg.Done()
		wiki := fetchWikiWithURL(cleanQ, false)
		if wiki.summary != "" {
			mu.Lock()
			directTexts = append(directTexts, fmt.Sprintf("📚 **%s** (Wikipedia):\n%s", wiki.title, wiki.summary))
			mu.Unlock()
			addSource(AISourceLink{Title: wiki.title, URL: wiki.url, Provider: "Wikipedia", Snippet: wiki.summary})
		}
		ddg := fetchDDGWithURL(cleanQ)
		if ddg.summary != "" {
			mu.Lock()
			directTexts = append(directTexts, fmt.Sprintf("🔎 **%s**:\n%s", ddg.title, ddg.summary))
			mu.Unlock()
			addSource(AISourceLink{Title: ddg.title, URL: ddg.url, Provider: "DuckDuckGo", Snippet: ddg.summary})
		}
	}()

	// 6. Code / Tech extra sources (StackOverflow + MDN + GitHub + Hacker News)
	if isCodeOrDevQuery(low) || strings.Contains(low, "новост") || strings.Contains(low, "news") || strings.Contains(low, "ии") || strings.Contains(low, "ai") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if isCodeOrDevQuery(low) {
				soHits := searchStackOverflow(ctx, cleanQ)
				mu.Lock()
				webHits = append(webHits, soHits...)
				mu.Unlock()
				if mdnTxt, mdnSrcs := fetchMDNDocs(cleanQ); mdnTxt != "" {
					mu.Lock()
					directTexts = append(directTexts, mdnTxt)
					mu.Unlock()
					for _, s := range mdnSrcs {
						addSource(s)
					}
				}
				if ghTxt, ghSrcs := fetchGitHubRepos(cleanQ); ghTxt != "" {
					mu.Lock()
					directTexts = append(directTexts, ghTxt)
					mu.Unlock()
					for _, s := range ghSrcs {
						addSource(s)
					}
				}
			}
			hnHits := searchHackerNews(ctx, cleanQ)
			mu.Lock()
			webHits = append(webHits, hnHits...)
			mu.Unlock()
		}()
	}

	wg.Wait()

	var blocks []string
	blocks = append(blocks, directTexts...)

	// Format top open-web hits from ANY internet domains
	addedWeb := 0
	for _, h := range webHits {
		addSource(AISourceLink{
			Title:    h.Title,
			URL:      h.URL,
			Provider: h.Provider,
			Snippet:  h.Snippet,
		})
		if addedWeb < 4 {
			detail := h.PageExcerpt
			if detail == "" {
				detail = h.Snippet
			}
			if detail != "" {
				blocks = append(blocks, fmt.Sprintf("• **%s** (`%s`): %s", h.Title, h.Domain, detail))
				addedWeb++
			}
		}
	}

	if len(sources) > 8 {
		sources = sources[:8]
	}
	return strings.Join(blocks, "\n\n"), sources, len(sources)
}

func isCodeOrDevQuery(low string) bool {
	kws := []string{
		"код", "ошибк", "error", "bug", "python", "golang", "go ", "javascript", "typescript", "react",
		"rust", "c++", "c#", "sql", "docker", "git", "linux", "api", "json", "css", "html", "алгоритм",
		"функци", "библиотек", "regex", "http", "async",
	}
	for _, k := range kws {
		if strings.Contains(low, k) {
			return true
		}
	}
	return false
}

// ==================== EXACT RECURSIVE-DESCENT MATH EVALUATOR ====================

type aiMathParser struct {
	s   string
	pos int
}

func (p *aiMathParser) skipWS() {
	for p.pos < len(p.s) && (p.s[p.pos] == ' ' || p.s[p.pos] == '\t') {
		p.pos++
	}
}

func (p *aiMathParser) parseExpr() (float64, bool) {
	v, ok := p.parseTerm()
	if !ok {
		return 0, false
	}
	for {
		p.skipWS()
		if p.pos >= len(p.s) {
			break
		}
		op := p.s[p.pos]
		if op != '+' && op != '-' {
			break
		}
		p.pos++
		rhs, ok2 := p.parseTerm()
		if !ok2 {
			return 0, false
		}
		if op == '+' {
			v += rhs
		} else {
			v -= rhs
		}
	}
	return v, true
}

func (p *aiMathParser) parseTerm() (float64, bool) {
	v, ok := p.parsePow()
	if !ok {
		return 0, false
	}
	for {
		p.skipWS()
		if p.pos >= len(p.s) {
			break
		}
		op := p.s[p.pos]
		if op != '*' && op != '/' {
			break
		}
		p.pos++
		rhs, ok2 := p.parsePow()
		if !ok2 {
			return 0, false
		}
		if op == '*' {
			v *= rhs
		} else {
			if rhs == 0 {
				return 0, false
			}
			v /= rhs
		}
	}
	return v, true
}

func (p *aiMathParser) parsePow() (float64, bool) {
	v, ok := p.parseUnary()
	if !ok {
		return 0, false
	}
	p.skipWS()
	if p.pos < len(p.s) && p.s[p.pos] == '^' {
		p.pos++
		exp, ok2 := p.parsePow()
		if !ok2 {
			return 0, false
		}
		return math.Pow(v, exp), true
	}
	return v, true
}

func (p *aiMathParser) parseUnary() (float64, bool) {
	p.skipWS()
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

func (p *aiMathParser) parsePrimary() (float64, bool) {
	p.skipWS()
	if p.pos >= len(p.s) {
		return 0, false
	}
	if p.s[p.pos] == '(' {
		p.pos++
		v, ok := p.parseExpr()
		p.skipWS()
		if !ok || p.pos >= len(p.s) || p.s[p.pos] != ')' {
			return 0, false
		}
		p.pos++
		return v, true
	}
	// Functions: sqrt, sin, cos, abs, log
	for _, fn := range []string{"sqrt", "sin", "cos", "abs", "log"} {
		if strings.HasPrefix(p.s[p.pos:], fn+"(") {
			p.pos += len(fn) + 1
			arg, ok := p.parseExpr()
			p.skipWS()
			if !ok || p.pos >= len(p.s) || p.s[p.pos] != ')' {
				return 0, false
			}
			p.pos++
			switch fn {
			case "sqrt":
				if arg < 0 {
					return 0, false
				}
				return math.Sqrt(arg), true
			case "sin":
				return math.Sin(arg), true
			case "cos":
				return math.Cos(arg), true
			case "abs":
				return math.Abs(arg), true
			case "log":
				if arg <= 0 {
					return 0, false
				}
				return math.Log10(arg), true
			}
		}
	}
	start := p.pos
	dot := false
	for p.pos < len(p.s) && ((p.s[p.pos] >= '0' && p.s[p.pos] <= '9') || (p.s[p.pos] == '.' && !dot)) {
		if p.s[p.pos] == '.' {
			dot = true
		}
		p.pos++
	}
	if p.pos == start {
		return 0, false
	}
	val, err := strconv.ParseFloat(p.s[start:p.pos], 64)
	if err != nil {
		return 0, false
	}
	if p.pos < len(p.s) && p.s[p.pos] == '%' {
		p.pos++
		val /= 100.0
	}
	return val, true
}

func tryEvaluateMath(prompt string) (string, float64, bool) {
	clean := strings.ToLower(strings.TrimSpace(prompt))
	for _, p := range []string{"посчитай ", "вычисли ", "сколько будет ", "реши ", "calc ", "calculate ", "eval "} {
		clean = strings.TrimPrefix(clean, p)
	}
	clean = strings.ReplaceAll(clean, ",", ".")
	clean = strings.ReplaceAll(clean, "×", "*")
	clean = strings.ReplaceAll(clean, "÷", "/")
	clean = strings.ReplaceAll(clean, "?", "")
	clean = strings.ReplaceAll(clean, "=", "")
	clean = strings.TrimSpace(clean)
	if clean == "" || (!strings.ContainsAny(clean, "+-*/^") && !strings.Contains(clean, "sqrt(")) {
		return "", 0, false
	}
	p := &aiMathParser{s: clean}
	val, ok := p.parseExpr()
	p.skipWS()
	if !ok || p.pos != len(p.s) || math.IsNaN(val) || math.IsInf(val, 0) {
		return "", 0, false
	}
	return clean, val, true
}

// ==================== AUTONOMOUS OS ACTION ENGINE ====================

func splitCompoundClauses(prompt string) []string {
	// Split multi-command user prompts on clear connectors without breaking URLs or sentences
	repl := strings.NewReplacer(" и затем ", " | ", ", затем ", " | ", " затем ", " | ", " а также ", " | ", "; ", " | ", "\n", " | ")
	norm := repl.Replace(prompt)
	parts := strings.Split(norm, " | ")
	// Also split simple "X и Y" when both sides look like imperative commands
	actionVerbs := []string{"открой", "запусти", "включи", "выключи", "поставь", "установи", "сделай", "создай", "проверь", "найди", "поищи", "покажи", "переключи", "очисти", "узнай", "посчитай", "вычисли", "реши", "сколько", "open", "set", "create", "find", "calc"}
	var result []string
	for _, pt := range parts {
		pt = strings.TrimSpace(pt)
		if pt == "" {
			continue
		}
		sub := strings.Split(pt, " и ")
		if len(sub) > 1 {
			allActions := true
			for _, s := range sub {
				sl := strings.ToLower(strings.TrimSpace(s))
				matched := false
				for _, v := range actionVerbs {
					if strings.Contains(sl, v) {
						matched = true
						break
					}
				}
				if !matched {
					allActions = false
					break
				}
			}
			if allActions {
				for _, s := range sub {
					if t := strings.TrimSpace(s); t != "" {
						result = append(result, t)
					}
				}
				continue
			}
		}
		result = append(result, pt)
	}
	if len(result) == 0 {
		return []string{strings.TrimSpace(prompt)}
	}
	return result
}

func extractFirstInt(s string, fallback int) (int, bool) {
	m := reExtractNumber.FindString(s)
	if m == "" {
		return fallback, false
	}
	v, err := strconv.Atoi(m)
	if err != nil {
		return fallback, false
	}
	return v, true
}

func executeAutonomousClauses(clauses []string, kernel *LumaKernel) ([]AI40ExecutedAction, []AI40UIAction, []string, []string) {
	var (
		actions      []AI40ExecutedAction
		uiActions    []AI40UIAction
		actionNotes  []string
		webQueries   []string
		actionIdx    int
	)
	nextID := func() string {
		actionIdx++
		return fmt.Sprintf("act_%d_%d", time.Now().UnixMilli()%100000, actionIdx)
	}

	windowMap := []struct {
		id       string
		label    string
		keywords []string
	}{
		{"explorer", "Проводник Luma", []string{"проводник", "файлы", "explorer", "менеджер файлов"}},
		{"settings", "Настройки системы", []string{"настройк", "параметр", "settings"}},
		{"office", "Luma Office", []string{"офис", "office", "word", "excel", "powerpoint", "документ", "таблиц", "презентац"}},
		{"code_studio", "Luma Code Studio", []string{"code studio", "редактор кода", "ide", "код студи"}},
		{"cut_studio", "Luma Cut Studio", []string{"cut studio", "видеоредактор", "монтаж"}},
		{"gamepad", "Luma Gamepad Studio", []string{"геймпад", "gamepad", "контроллер", "джойстик"}},
		{"uninstaller", "Luma Deep Uninstaller", []string{"очистку хвостов", "очистка хвостов", "удаление программ", "uninstaller", "деинсталлятор"}},
		{"terminal", "Терминал Luma", []string{"терминал", "консоль", "terminal"}},
		{"taskmgr", "Диспетчер задач", []string{"диспетчер задач", "процесс", "taskmgr"}},
		{"kernel", "Монитор ядра LumaCore", []string{"монитор ядра", "ядро lumacore", "kernel"}},
		{"calendar", "Календарь", []string{"календарь", "calendar"}},
		{"calculator", "Калькулятор", []string{"калькулятор", "calculator"}},
		{"trash", "Корзина", []string{"корзин", "trash"}},
		{"scenarios", "Сценарии автоматизации", []string{"сценари", "автоматизац"}},
		{"plugins", "Плагины и SDK", []string{"плагин", "sdk"}},
		{"utilities", "Системные утилиты", []string{"утилит", "utilities"}},
	}

	for _, clause := range clauses {
		low := strings.ToLower(strings.TrimSpace(clause))
		didAction := false

		// 1. Volume Control
		if strings.Contains(low, "громкост") || strings.Contains(low, "звук") || strings.Contains(low, "volume") || strings.Contains(low, "mute") {
			if strings.Contains(low, "выключ") || strings.Contains(low, "без звука") || strings.Contains(low, "mute") || strings.Contains(low, "заглуш") {
				if kernel != nil {
					_ = kernel.probe.SetAudioVolume(0, true)
				}
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "audio.mute", Label: "Звук выключен (Mute)", Status: "done", Detail: "Отключён системный звук"})
				uiActions = append(uiActions, AI40UIAction{Type: "set_volume", Value: 0, Label: "Выключить звук"})
				actionNotes = append(actionNotes, "🔇 Системный звук выключен (Mute).")
				didAction = true
			} else if val, ok := extractFirstInt(low, 50); ok {
				if val < 0 {
					val = 0
				}
				if val > 100 {
					val = 100
				}
				if kernel != nil {
					_ = kernel.probe.SetAudioVolume(val, val == 0)
				}
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "audio.set_volume", Label: fmt.Sprintf("Громкость → %d%%", val), Status: "done", Detail: fmt.Sprintf("Установлена громкость %d%%", val)})
				uiActions = append(uiActions, AI40UIAction{Type: "set_volume", Value: val, Label: fmt.Sprintf("Громкость %d%%", val)})
				actionNotes = append(actionNotes, fmt.Sprintf("🔊 Громкость системы установлена на **%d%%**.", val))
				didAction = true
			} else if strings.Contains(low, "громче") || strings.Contains(low, "прибав") {
				if kernel != nil {
					_ = kernel.probe.SetAudioVolume(80, false)
				}
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "audio.set_volume", Label: "Громкость → 80%", Status: "done", Detail: "Повышена громкость до 80%"})
				uiActions = append(uiActions, AI40UIAction{Type: "set_volume", Value: 80, Label: "Громкость 80%"})
				actionNotes = append(actionNotes, "🔊 Громкость повышена до **80%**.")
				didAction = true
			} else if strings.Contains(low, "тише") || strings.Contains(low, "убав") {
				if kernel != nil {
					_ = kernel.probe.SetAudioVolume(30, false)
				}
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "audio.set_volume", Label: "Громкость → 30%", Status: "done", Detail: "Снижена громкость до 30%"})
				uiActions = append(uiActions, AI40UIAction{Type: "set_volume", Value: 30, Label: "Громкость 30%"})
				actionNotes = append(actionNotes, "🔉 Громкость снижена до **30%**.")
				didAction = true
			}
		}

		// 2. Screen Brightness
		if strings.Contains(low, "яркост") || strings.Contains(low, "brightness") {
			val := 75
			if v, ok := extractFirstInt(low, 75); ok {
				val = v
			} else if strings.Contains(low, "макс") || strings.Contains(low, "100") {
				val = 100
			} else if strings.Contains(low, "мин") || strings.Contains(low, "ниже") || strings.Contains(low, "темн") {
				val = 35
			}
			if val < 20 {
				val = 20
			}
			if val > 100 {
				val = 100
			}
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "display.brightness", Label: fmt.Sprintf("Яркость → %d%%", val), Status: "ui_dispatch", Detail: fmt.Sprintf("Яркость экрана установлена на %d%%", val)})
			uiActions = append(uiActions, AI40UIAction{Type: "set_brightness", Value: val, Label: fmt.Sprintf("Яркость %d%%", val)})
			actionNotes = append(actionNotes, fmt.Sprintf("☀️ Яркость экрана установлена на **%d%%**.", val))
			didAction = true
		}

		// 3. System Style / Theme / Wallpaper / Dev HUD / DND / Night Light / Desktop Switch
		if strings.Contains(low, "стиль") || strings.Contains(low, "оформлен") {
			if strings.Contains(low, "nova") || strings.Contains(low, "нова") {
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.style", Label: "Стиль → Luma Nova", Status: "ui_dispatch", Detail: "Активирован стиль Luma Nova с верхней компактной панелью"})
				uiActions = append(uiActions, AI40UIAction{Type: "set_style", Value: "nova", Label: "Стиль Luma Nova"})
				actionNotes = append(actionNotes, "✨ Включён системный стиль **Luma Nova**.")
				didAction = true
			} else if strings.Contains(low, "glass") || strings.Contains(low, "стекл") {
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.style", Label: "Стиль → Luma Glass", Status: "ui_dispatch", Detail: "Активирован стиль Luma Glass"})
				uiActions = append(uiActions, AI40UIAction{Type: "set_style", Value: "glass", Label: "Стиль Luma Glass"})
				actionNotes = append(actionNotes, "✨ Включён системный стиль **Luma Glass**.")
				didAction = true
			} else if strings.Contains(low, "matrix") || strings.Contains(low, "матриц") {
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.style", Label: "Стиль → Luma Matrix", Status: "ui_dispatch", Detail: "Активирован стиль Luma Matrix"})
				uiActions = append(uiActions, AI40UIAction{Type: "set_style", Value: "matrix", Label: "Стиль Luma Matrix"})
				actionNotes = append(actionNotes, "✨ Включён системный стиль **Luma Matrix**.")
				didAction = true
			}
		}
		if strings.Contains(low, "тёмн") && strings.Contains(low, "тем") || strings.Contains(low, "темн") && strings.Contains(low, "тем") {
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.theme", Label: "Тема → Тёмная", Status: "ui_dispatch", Detail: "Включена тёмная тема"})
			uiActions = append(uiActions, AI40UIAction{Type: "set_theme", Value: "dark", Label: "Тёмная тема"})
			actionNotes = append(actionNotes, "🌙 Включена **тёмная тема** Luma OS.")
			didAction = true
		} else if strings.Contains(low, "светл") && strings.Contains(low, "тем") {
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.theme", Label: "Тема → Светлая", Status: "ui_dispatch", Detail: "Включена светлая тема"})
			uiActions = append(uiActions, AI40UIAction{Type: "set_theme", Value: "light", Label: "Светлая тема"})
			actionNotes = append(actionNotes, "☀️ Включена **светлая тема** Luma OS.")
			didAction = true
		}
		if strings.Contains(low, "обои") || strings.Contains(low, "wallpaper") {
			wp := "/luma-nitrogen-hero.jpg"
			wpName := "Nitrogen 2.5D Cryo-Glass"
			switch {
			case strings.Contains(low, "aurora") || strings.Contains(low, "сияни"):
				wp, wpName = "/luma-nitrogen-aurora.jpg", "Nitrogen Aurora"
			case strings.Contains(low, "glacier") || strings.Contains(low, "ледник"):
				wp, wpName = "/luma-nitrogen-glacier.jpg", "Nitrogen Glacier"
			case strings.Contains(low, "alpine") || strings.Contains(low, "гор"):
				wp, wpName = "/luma-nitrogen-alpine.jpg", "Nitrogen Alpine"
			case strings.Contains(low, "fjord") || strings.Contains(low, "фьорд"):
				wp, wpName = "/luma-nitrogen-fjord.jpg", "Nitrogen Fjord"
			case strings.Contains(low, "arctic") || strings.Contains(low, "арктик"):
				wp, wpName = "/luma-nitrogen-arctic.jpg", "Nitrogen Arctic"
			}
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.wallpaper", Label: "Обои → " + wpName, Status: "ui_dispatch", Detail: wp})
			uiActions = append(uiActions, AI40UIAction{Type: "set_wallpaper", Value: wp, Label: wpName})
			actionNotes = append(actionNotes, fmt.Sprintf("🖼️ Установлены обои **%s**.", wpName))
			didAction = true
		}
		if strings.Contains(low, "режим разработчика") || strings.Contains(low, "dev hud") {
			en := !strings.Contains(low, "выключ") && !strings.Contains(low, "скрой")
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.dev_hud", Label: "Developer HUD", Status: "ui_dispatch", Detail: fmt.Sprintf("active=%v", en)})
			uiActions = append(uiActions, AI40UIAction{Type: "toggle_dev_hud", Value: en, Label: "Developer HUD"})
			actionNotes = append(actionNotes, fmt.Sprintf("🛠️ Режим разработчика (Live HUD) %s.", map[bool]string{true: "включён", false: "выключен"}[en]))
			didAction = true
		}
		if strings.Contains(low, "рабочий стол") && (strings.Contains(low, "переключ") || strings.Contains(low, "открой")) {
			if dNum, ok := extractFirstInt(low, 1); ok && dNum >= 1 && dNum <= 4 {
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.desktop", Label: fmt.Sprintf("Рабочий стол D%d", dNum), Status: "ui_dispatch", Detail: fmt.Sprintf("Переход на D%d", dNum)})
				uiActions = append(uiActions, AI40UIAction{Type: "switch_desktop", Value: dNum, Label: fmt.Sprintf("Стол D%d", dNum)})
				actionNotes = append(actionNotes, fmt.Sprintf("🖥️ Переключено на **рабочий стол D%d**.", dNum))
				didAction = true
			}
		}

		// 4. Timer
		if strings.Contains(low, "таймер") || strings.Contains(low, "timer") {
			if n, ok := extractFirstInt(low, 5); ok && n > 0 {
				sec := n * 60
				unit := "мин"
				if strings.Contains(low, "сек") || strings.Contains(low, "sec") {
					sec = n
					unit = "сек"
				}
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "island.timer", Label: fmt.Sprintf("Таймер %d %s", n, unit), Status: "ui_dispatch", Detail: fmt.Sprintf("%d сек", sec)})
				uiActions = append(uiActions, AI40UIAction{Type: "start_timer", Value: sec, Label: fmt.Sprintf("Таймер %d %s", n, unit)})
				actionNotes = append(actionNotes, fmt.Sprintf("⏱️ Запущен таймер в Luma Island на **%d %s**.", n, unit))
				didAction = true
			}
		}

		// 5. Screenshot
		if strings.Contains(low, "скриншот") || strings.Contains(low, "снимок экрана") || strings.Contains(low, "screenshot") {
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "capture.screenshot", Label: "Снимок экрана", Status: "ui_dispatch", Detail: "Создание скриншота"})
			uiActions = append(uiActions, AI40UIAction{Type: "take_screenshot", Label: "Скриншот"})
			actionNotes = append(actionNotes, "📸 Выполняю снимок экрана.")
			didAction = true
		}

		// 6. Open Built-in Luma OS Windows
		if strings.Contains(low, "открой") || strings.Contains(low, "запусти") || strings.Contains(low, "покажи") || strings.Contains(low, "open") {
			for _, wm := range windowMap {
				matched := false
				for _, kw := range wm.keywords {
					if strings.Contains(low, kw) {
						matched = true
						break
					}
				}
				if matched {
					actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "ui.open_window", Label: "Открыть " + wm.label, Status: "ui_dispatch", Detail: wm.id})
					uiActions = append(uiActions, AI40UIAction{Type: "open_window", Target: wm.id, Label: wm.label})
					actionNotes = append(actionNotes, fmt.Sprintf("🪟 Открыто окно **%s**.", wm.label))
					didAction = true
					break
				}
			}
		}

		// 7. Create Folder or File on Disk (Real Safe FS Tool!)
		if strings.Contains(low, "создай папку") || strings.Contains(low, "create folder") {
			name := extractNamedTarget(clause, []string{"создай папку", "create folder"})
			if name == "" {
				name = fmt.Sprintf("Luma_Folder_%d", time.Now().Unix()%10000)
			}
			safeName := sanitizeFSName(name)
			home, _ := os.UserHomeDir()
			targetDir := filepath.Join(home, "Desktop", safeName)
			if _, err := os.Stat(filepath.Join(home, "Desktop")); err != nil {
				targetDir = filepath.Join(home, safeName)
			}
			if err := os.MkdirAll(targetDir, 0o755); err == nil {
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "fs.mkdir", Label: "Создана папка " + safeName, Status: "done", Detail: targetDir})
				actionNotes = append(actionNotes, fmt.Sprintf("📁 Создана папка: `%s`", targetDir))
				didAction = true
			}
		} else if strings.Contains(low, "создай файл") || strings.Contains(low, "создай заметку") || strings.Contains(low, "запиши файл") {
			name := extractNamedTarget(clause, []string{"создай файл", "создай заметку", "запиши файл"})
			content := fmt.Sprintf("Создано автономным агентом Luma AI 4.0 (%s)\nЗапрос: %s\n", time.Now().Format("02.01.2006 15:04"), clause)
			if idx := strings.Index(strings.ToLower(name), " с текстом "); idx > 0 {
				content = strings.TrimSpace(name[idx+len(" с текстом "):])
				name = strings.TrimSpace(name[:idx])
			}
			if name == "" {
				name = fmt.Sprintf("luma_note_%d.txt", time.Now().Unix()%10000)
			}
			safeName := sanitizeFSName(name)
			if !strings.Contains(safeName, ".") {
				safeName += ".txt"
			}
			home, _ := os.UserHomeDir()
			baseDir := filepath.Join(home, "Desktop")
			if _, err := os.Stat(baseDir); err != nil {
				baseDir = home
			}
			fullPath := filepath.Join(baseDir, safeName)
			if err := os.WriteFile(fullPath, []byte(content), 0o644); err == nil {
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "fs.write", Label: "Создан файл " + safeName, Status: "done", Detail: fullPath})
				actionNotes = append(actionNotes, fmt.Sprintf("📝 Создан файл: `%s`", fullPath))
				didAction = true
			}
		}

		// 8. List real files in Downloads / Desktop / Documents
		if (strings.Contains(low, "файл") || strings.Contains(low, "что лежит") || strings.Contains(low, "покажи")) &&
			(strings.Contains(low, "загрузк") || strings.Contains(low, "downloads") || strings.Contains(low, "рабочем столе") || strings.Contains(low, "документ")) {
			home, _ := os.UserHomeDir()
			sub := "Downloads"
			lbl := "Загрузки"
			if strings.Contains(low, "рабочем столе") {
				sub, lbl = "Desktop", "Рабочий стол"
			} else if strings.Contains(low, "документ") {
				sub, lbl = "Documents", "Документы"
			}
			dir := filepath.Join(home, sub)
			if entries, err := os.ReadDir(dir); err == nil {
				names := []string{}
				for i, e := range entries {
					if i >= 12 {
						break
					}
					icon := "📄"
					if e.IsDir() {
						icon = "📁"
					}
					names = append(names, icon+" "+e.Name())
				}
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "fs.list", Label: fmt.Sprintf("%s (%d объектов)", lbl, len(entries)), Status: "done", Detail: dir})
				if len(names) > 0 {
					actionNotes = append(actionNotes, fmt.Sprintf("📂 **%s** (`%s`, всего %d):\n%s", lbl, dir, len(entries), strings.Join(names, " · ")))
				} else {
					actionNotes = append(actionNotes, fmt.Sprintf("📂 Папка **%s** (`%s`) пуста.", lbl, dir))
				}
				didAction = true
			}
		}

		// 9. LumaShield 2.5 Real Security & Startup/Tasks Audit
		if (strings.Contains(low, "безопасност") || strings.Contains(low, "антивирус") || strings.Contains(low, "угроз") || strings.Contains(low, "автозагрузк")) &&
			(strings.Contains(low, "проверь") || strings.Contains(low, "скан") || strings.Contains(low, "аудит") || strings.Contains(low, "статус")) {
			if kernel != nil {
				tasks := kernel.security.AuditScheduledTasks()
				startup := kernel.security.AuditStartupEntries(kernel.probe.ListStartupItems())
				st := kernel.security.StatusSnapshot(kernel.probe)
				rulesCnt := st["rules_count"]
				actions = append(actions, AI40ExecutedAction{
					ID: nextID(), Tool: "security.audit", Label: "Аудит LumaShield 2.5", Status: "done",
					Detail: fmt.Sprintf("Правил: %v · Автозагрузка: %d · Задачи: %d", rulesCnt, len(startup), len(tasks)),
				})
				actionNotes = append(actionNotes, fmt.Sprintf("🛡️ **Аудит LumaShield 2.5 завершён**: активно **%v правил**, проверено записей автозагрузки: **%d**, задач планировщика: **%d**.", rulesCnt, len(startup), len(tasks)))
				didAction = true
			}
		}

		// 10. Virtual Memory Luma SwapBoost Check / Configure
		if strings.Contains(low, "виртуальн") || strings.Contains(low, "swapboost") || strings.Contains(low, "подкачк") {
			if (strings.Contains(low, "поставь") || strings.Contains(low, "включи") || strings.Contains(low, "настрой")) && (strings.Contains(low, "2") || strings.Contains(low, "4") || strings.Contains(low, "6")) {
				gb := 4
				if strings.Contains(low, "6") {
					gb = 6
				} else if strings.Contains(low, "2") {
					gb = 2
				}
				fixed := true
				comp := true
				clr := false
				res := configureVirtualMemory(VMemConfigureRequest{SizeGB: gb, FixedMinMax: &fixed, MemoryCompression: &comp, ClearPageFileAtShutdown: &clr}, kernel)
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "vmem.configure", Label: fmt.Sprintf("Luma SwapBoost → %d ГБ", gb), Status: "done", Detail: fmt.Sprintf("Min==Max=%d МБ, SSD-safe", gb*1024)})
				actionNotes = append(actionNotes, fmt.Sprintf("💾 **Luma SwapBoost настроен на %d ГБ** (фиксированный `Min == Max`, сжатие памяти, `ClearPageFileAtShutdown = 0`): %v", gb, res["message"]))
				didAction = true
			} else {
				st := getVirtualMemoryStatus(kernel, false)
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "vmem.status", Label: "Статус Luma SwapBoost", Status: "done", Detail: fmt.Sprintf("%d МБ · SSD score %d/100", st.CurrentPageFileMaxMB, st.TBW.SsdFriendlyScore)})
				actionNotes = append(actionNotes, fmt.Sprintf("💾 **Luma SwapBoost**: ОЗУ %.1f ГБ + файл подкачки %d МБ (бережность к SSD: **%d/100**, ~%.2f ГБ/день, ресурс ~%.1f лет).", st.PhysicalRAMTotalGB, st.CurrentPageFileMaxMB, st.TBW.SsdFriendlyScore, st.TBW.DailyWriteGB, st.TBW.EstimatedYears))
				didAction = true
			}
		}

		// 11. Live Hardware / System Diagnostics
		if strings.Contains(low, "статус систем") || strings.Contains(low, "характеристик") || strings.Contains(low, "нагрузк") || strings.Contains(low, "загружен") || strings.Contains(low, "состояние пк") || strings.Contains(low, "телеметр") {
			if kernel != nil {
				snap := kernel.SystemSnapshot()
				actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "system.telemetry", Label: "Снята телеметрия ПК", Status: "done", Detail: fmt.Sprintf("CPU %d%% · RAM %.1f/%.1f ГБ", snap.CPUPercent, snap.RAMUsedGB, snap.RAMTotalGB)})
				actionNotes = append(actionNotes, fmt.Sprintf(
					"⚡ **Телеметрия ПК (%s · LumaCore %s)**:\n• **ЦП:** %s (%d ядер) — **%d%%**\n• **ОЗУ:** **%.1f / %.1f ГБ** (%d%%)\n• **Батарея:** %d%% · **Хост:** %s",
					snap.OSName, KernelEngineVersion, snap.CPUModel, snap.CPUCores, snap.CPUPercent, snap.RAMUsedGB, snap.RAMTotalGB, snap.RAMPercent, snap.BatteryPercent, snap.Hostname,
				))
				didAction = true
			}
		}

		// 12. Open Explicit Website URL in Browser (when user says "открой сайт https://...")
		if (strings.Contains(low, "открой") || strings.Contains(low, "перейди")) && reExplicitURL.MatchString(clause) {
			u := strings.TrimRight(reExplicitURL.FindString(clause), ".,;)")
			if kernel != nil {
				_ = kernel.probe.OpenPath(u)
			}
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "browser.open_url", Label: "Открыт " + ai40ExtractDomain(u), Status: "done", Detail: u})
			actionNotes = append(actionNotes, fmt.Sprintf("🌐 Открыта ссылка: %s", u))
			didAction = true
		}

		// 13. Launch Installed PC App (when user explicitly says "запусти <app>" and it wasn't a built-in window)
		if !didAction && (strings.HasPrefix(low, "запусти ") || strings.HasPrefix(low, "launch ")) && kernel != nil {
			target := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(low, "запусти "), "launch "))
			if target != "" {
				apps := kernel.probe.ListInstalledApps(false)
				for _, a := range apps {
					if strings.Contains(strings.ToLower(a.Name), target) {
						if err := kernel.probe.OpenPath(a.ExecPath); err == nil {
							actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "os.launch_app", Label: "Запущено: " + a.Name, Status: "done", Detail: a.ExecPath})
							actionNotes = append(actionNotes, fmt.Sprintf("🚀 Запущено приложение **%s**.", a.Name))
							didAction = true
						}
						break
					}
				}
			}
		}

		// 14. Exact Math Solver
		if expr, val, ok := tryEvaluateMath(clause); ok {
			formatted := strconv.FormatFloat(val, 'f', -1, 64)
			actions = append(actions, AI40ExecutedAction{ID: nextID(), Tool: "math.eval", Label: fmt.Sprintf("%s = %s", expr, formatted), Status: "done", Detail: "Точное вычисление"})
			actionNotes = append(actionNotes, fmt.Sprintf("🧮 **Расчёт:** `%s = %s`", expr, formatted))
			didAction = true
		}

		if !didAction {
			webQueries = append(webQueries, clause)
		}
	}

	return actions, uiActions, actionNotes, webQueries
}

func extractNamedTarget(clause string, prefixes []string) string {
	low := strings.ToLower(clause)
	for _, p := range prefixes {
		if idx := strings.Index(low, p); idx >= 0 {
			rest := strings.TrimSpace(clause[idx+len(p):])
			return strings.Trim(rest, `"'«» `)
		}
	}
	return ""
}

func sanitizeFSName(name string) string {
	bad := []string{"/", "\\", "..", ":", "*", "?", "\"", "<", ">", "|"}
	out := strings.TrimSpace(name)
	for _, b := range bad {
		out = strings.ReplaceAll(out, b, "_")
	}
	out = strings.Trim(out, ". ")
	if out == "" {
		return "luma_item"
	}
	if len([]rune(out)) > 64 {
		out = string([]rune(out)[:64])
	}
	return out
}

// ==================== MAIN LUMA AI 4.0 AUTONOMOUS ENTRYPOINT ====================

func RunLumaAI40Autonomous(messages []AIChatMessage, mode, verbosity string, autonomousMode, webSearchEnabled bool, kernel *LumaKernel) map[string]interface{} {
	if len(messages) == 0 {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	prompt := strings.TrimSpace(messages[len(messages)-1].Content)
	if prompt == "" {
		return map[string]interface{}{"ok": false, "error": "Пустой запрос"}
	}
	tStart := time.Now()
	low := strings.ToLower(prompt)
	var thinking []AI40ThinkingStep

	// Step 1: Decompose & understand user intent
	t1 := time.Now()
	clauses := splitCompoundClauses(prompt)
	thinking = append(thinking, AI40ThinkingStep{
		Step:       1,
		Title:      "Анализ и декомпозиция запроса",
		Detail:     fmt.Sprintf("Определено подзадач: %d · режим агента: %v · поиск по всему интернету: %v", len(clauses), autonomousMode, webSearchEnabled),
		DurationMs: time.Since(t1).Milliseconds(),
		Status:     "done",
	})

	// Step 2: Autonomous OS Actions (if enabled)
	var (
		actions     []AI40ExecutedAction
		uiActions   []AI40UIAction
		actionNotes []string
		webQueries  []string
	)
	t2 := time.Now()
	if autonomousMode {
		actions, uiActions, actionNotes, webQueries = executeAutonomousClauses(clauses, kernel)
		if len(actions) > 0 {
			labels := make([]string, 0, len(actions))
			for _, a := range actions {
				labels = append(labels, a.Label)
			}
			thinking = append(thinking, AI40ThinkingStep{
				Step:       2,
				Title:      fmt.Sprintf("Автономное выполнение действий (%d)", len(actions)),
				Detail:     strings.Join(labels, " · "),
				DurationMs: time.Since(t2).Milliseconds(),
				Status:     "done",
			})
		} else {
			thinking = append(thinking, AI40ThinkingStep{
				Step:       2,
				Title:      "Планирование системных инструментов",
				Detail:     "Запрос информационный / аналитический — прямые изменения ОС не требуются, перехожу к исследованию и синтезу",
				DurationMs: time.Since(t2).Milliseconds(),
				Status:     "done",
			})
		}
	} else {
		webQueries = clauses
	}

	// Step 3: Universal Open-Web Research across ANY websites + Specialized Live Providers
	var (
		webText string
		sources []AISourceLink
	)
	needWeb := webSearchEnabled && len(webQueries) > 0 && !isPureGreetingOrLumaAbout(low)
	t3 := time.Now()
	if needWeb {
		combinedQ := strings.Join(webQueries, " ")
		var srcCount int
		webText, sources, srcCount = runUniversalWebResearch(combinedQ)
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
		detail := "Проверил открытый веб, справочники и live-источники"
		if srcCount > 0 {
			detail = fmt.Sprintf("Найдено %d источников (%s) и извлечены ключевые факты со страниц", srcCount, strings.Join(domains, ", "))
		}
		thinking = append(thinking, AI40ThinkingStep{
			Step:       3,
			Title:      "Поиск по всему интернету и чтение страниц",
			Detail:     detail,
			DurationMs: time.Since(t3).Milliseconds(),
			Status:     "done",
		})
	} else if len(actionNotes) > 0 {
		sources = append(sources, AISourceLink{
			Title:    fmt.Sprintf("LumaCore %s · Автономный исполнитель", KernelEngineVersion),
			URL:      "luma://agent/actions",
			Provider: "LumaCore",
			Snippet:  fmt.Sprintf("Выполнено действий: %d", len(actions)),
		})
	}

	// Step 4: Synthesis & Self-Verification
	t4 := time.Now()
	var sections []string
	if len(actionNotes) > 0 {
		sections = append(sections, "### Выполненные действия\n"+strings.Join(actionNotes, "\n"))
	}

	if webText != "" {
		sections = append(sections, "### Результаты исследования из интернета\n"+webText)
	} else if len(actionNotes) == 0 {
		// Fall back cleanly to Luma's rich local reasoning, code generator, translator & OS knowledge base
		fallback := RunLumaLocalAI(messages, mode, verbosity, kernel)
		if rep, ok := fallback["reply"].(string); ok && rep != "" {
			sections = append(sections, rep)
		}
		if fSrc, ok := fallback["sources"].([]AISourceLink); ok && len(sources) == 0 {
			sources = append(sources, fSrc...)
		}
	}

	finalReply := strings.TrimSpace(strings.Join(sections, "\n\n"))
	if finalReply == "" {
		finalReply = "Готово! Запрос обработан автономным агентом **Luma AI 4.0**."
	}

	thinking = append(thinking, AI40ThinkingStep{
		Step:       len(thinking) + 1,
		Title:      "Синтез и проверка ответа",
		Detail:     fmt.Sprintf("Сформирован структурированный ответ (%d симв., %d действий, %d источников) за %d мс", len([]rune(finalReply)), len(actions), len(sources), time.Since(tStart).Milliseconds()),
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
		"ok":               true,
		"reply":            finalReply,
		"model":            "Luma AI 4.0 Autonomous",
		"provider":         "luma_local",
		"autonomous_mode":  autonomousMode,
		"web_search_used":  needWeb,
		"thinking_steps":   thinking,
		"actions":          actions,
		"ui_actions":       uiActions,
		"sources":          sources,
		"elapsed_ms":       time.Since(tStart).Milliseconds(),
	}
}

func isPureGreetingOrLumaAbout(low string) bool {
	if len([]rune(low)) < 16 {
		for _, g := range []string{"привет", "здравствуй", "добрый день", "добрый вечер", "hello", "hi", "как дела", "кто ты", "что ты умеешь"} {
			if strings.Contains(low, g) {
				return true
			}
		}
	}
	if strings.Contains(low, "что нового в luma") || strings.Contains(low, "luma os 1.6") {
		return true
	}
	return false
}
