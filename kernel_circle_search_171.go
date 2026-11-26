package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ==================== LUMA OS 1.7.1 (OXYGEN) — FULL MULTIMODAL CIRCLE TO SEARCH ENGINE ====================
// Supports BOTH Desktop (LumaLensSearchOverlay) AND Android (Oxygen Connect LAN :49218)!
// Features:
//   - Exact system visual-analysis prompt (Product, Text+Translation+Term, Error/Code, Place, Math, Honest fallback)
//   - Real Multimodal Vision streaming for Google Gemini (inline_data) & OpenAI-compatible Vision APIs (image_url)
//   - Smart built-in offline/web fallback analyzer (Math solver, Error/Code fixer, Auto-Translate RU, Wiki/Web entity lookup)

const circleToSearchSystemPrompt = `Ты — встроенный системный модуль визуального анализа экрана (аналог Circle to Search). Пользователь выделил пальцем фрагмент экрана своего смартфона, и твоя задача — мгновенно определить объект, текст или контекст на изображении и дать максимально точный, краткий и полезный ответ.

Правила анализа и ответа:
1. Определи главную сущность в центре выделенной области (товар, текст, место, растение, код ошибки, интерфейс, человек, логотип и т.д.). Игнорируй случайные обрезки элементов интерфейса по краям кадра.
2. Адаптируй формат ответа под тип контента:
   - Если это ТОВАР или ПРЕДМЕТ: назови точный бренд, модель и тип устройства/вещи. Укажи ключевые характеристики.
   - Если это ТЕКСТ или ДОКУМЕНТ: извлеки текст без ошибок. Если он на иностранном языке — сразу дай точный перевод на русский язык. Если это термин или аббревиатура — кратко объясни суть.
   - Если это ОШИБКА или КОД: объясни причину сбоя и дай конкретный шаг для исправления.
   - Если это МЕСТО или ДОСТОПРИМЕЧАТЕЛЬНОСТЬ: укажи название, город и страну.
   - Если это МАТЕМАТИКА или ЗАДАЧА: дай краткое пошаговое решение и точный ответ.
3. Стиль изложения: отвечай сразу по делу, без приветствий («На этом изображении я вижу...», «Привет!»). Используй списки и жирный шрифт для акцентов, чтобы текст легко читался на маленьком экране телефона.
4. Если изображение слишком размыто или обрезано так, что однозначно определить объект невозможно, честно назови 2–3 наиболее вероятных варианта.`

type CircleSearchRequest struct {
	ImageBase64  string `json:"image_base64"`
	Query        string `json:"query"`
	OCRText      string `json:"ocr_text"`
	SourceDevice string `json:"source_device"` // "pc" | "phone"
	Stream       *bool  `json:"stream"`        // default true (SSE)
	SaveClip     bool   `json:"save_clip"`
	// Optional provider override from UI AI config
	Provider  string `json:"provider"`
	BaseURL   string `json:"base_url"`
	APIKey    string `json:"api_key"`
	ModelName string `json:"model_name"`
}

// Downscale + encode any uploaded/cropped image into compact JPEG (max 1024px) for ultra-fast Vision API upload.
func prepareVisionJPEG(b64In string) (jpegB64 string, rawPNG []byte, width, height int, colors []string, ok bool) {
	clean := strings.TrimSpace(b64In)
	if idx := strings.Index(clean, ","); idx >= 0 {
		clean = clean[idx+1:]
	}
	if clean == "" {
		return "", nil, 0, 0, nil, false
	}
	decoded, err := base64.StdEncoding.DecodeString(clean)
	if err != nil || len(decoded) == 0 {
		return "", nil, 0, 0, nil, false
	}
	img, _, err := image.Decode(bytes.NewReader(decoded))
	if err != nil {
		// Still forward original base64 if valid bytes
		return clean, decoded, 0, 0, nil, true
	}
	b := img.Bounds()
	width, height = b.Dx(), b.Dy()
	colors = extractDominantColors(img, 5)

	// Fast nearest/box downscale if > 1024px so Gemini/OpenAI Vision responds in < 1.2s
	const maxDim = 1024
	targetImg := img
	if width > maxDim || height > maxDim {
		scale := float64(maxDim) / float64(width)
		if float64(maxDim)/float64(height) < scale {
			scale = float64(maxDim) / float64(height)
		}
		nw := int(math.Max(1, math.Round(float64(width)*scale)))
		nh := int(math.Max(1, math.Round(float64(height)*scale)))
		dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
		for y := 0; y < nh; y++ {
			sy := b.Min.Y + (y * height / nh)
			for x := 0; x < nw; x++ {
				sx := b.Min.X + (x * width / nw)
				dst.Set(x, y, img.At(sx, sy))
			}
		}
		targetImg = dst
	} else {
		// Flatten alpha onto dark slate if PNG has transparency
		dst := image.NewRGBA(image.Rect(0, 0, width, height))
		draw.Draw(dst, dst.Bounds(), img, b.Min, draw.Src)
		targetImg = dst
	}

	var jbuf bytes.Buffer
	if jpeg.Encode(&jbuf, targetImg, &jpeg.Options{Quality: 85}) == nil {
		jpegB64 = base64.StdEncoding.EncodeToString(jbuf.Bytes())
	} else {
		jpegB64 = clean
	}
	return jpegB64, decoded, width, height, colors, true
}

// True Multimodal Google Gemini Vision SSE Streaming (sends inline_data JPEG + verbatim Circle to Search system prompt!)
func streamGeminiCircleVision(
	w http.ResponseWriter,
	flusher http.Flusher,
	baseURL, apiKey, model, userText, jpegB64 string,
) (string, string, bool) {
	cleanModel := sanitizeGeminiModelID(model)
	if cleanModel == "" {
		cleanModel = "gemini-2.5-flash"
	}
	if strings.TrimSpace(apiKey) == "" || strings.EqualFold(strings.TrimSpace(apiKey), "ollama") {
		return "", "", false
	}

	endpoint, sanitizedURL, isOpenAI := buildGeminiEndpoint(baseURL, cleanModel, apiKey, true)
	if isOpenAI {
		return streamOpenAIVisionCircle(w, flusher, baseURL, apiKey, cleanModel, userText, jpegB64)
	}
	log.Printf("[LumaCore Circle2Search][Gemini Vision SSE] POST %s (model=%s, img=%dKB)", sanitizedURL, cleanModel, len(jpegB64)*3/4/1024)

	parts := []map[string]interface{}{}
	if jpegB64 != "" {
		parts = append(parts, map[string]interface{}{
			"inline_data": map[string]string{
				"mime_type": "image/jpeg",
				"data":      jpegB64,
			},
		})
	}
	parts = append(parts, map[string]interface{}{
		"text": userText,
	})

	bodyObj := map[string]interface{}{
		"system_instruction": map[string]interface{}{
			"parts": []map[string]string{{"text": circleToSearchSystemPrompt}},
		},
		"contents": []map[string]interface{}{
			{
				"role":  "user",
				"parts": parts,
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.25,
		},
	}
	rawBody, _ := json.Marshal(bodyObj)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(rawBody))
	if err != nil {
		return "", err.Error(), false
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return "", err.Error(), false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
		return "", formatGeminiHTTPError(resp.StatusCode, resp.Status, errBytes, cleanModel, sanitizedURL), false
	}

	var full strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		dataStr := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if dataStr == "" || dataStr == "[DONE]" {
			continue
		}
		var chunk struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}
		if json.Unmarshal([]byte(dataStr), &chunk) == nil {
			for _, cand := range chunk.Candidates {
				for _, part := range cand.Content.Parts {
					if part.Text != "" {
						full.WriteString(part.Text)
						if w != nil && flusher != nil {
							writeSSEEvent(w, flusher, map[string]interface{}{
								"type":    "token",
								"content": part.Text,
								"text":    part.Text,
							})
						}
					}
				}
			}
		}
	}
	if full.Len() == 0 {
		return "", "Пустой ответ от Gemini Vision", false
	}
	return full.String(), "", true
}

// True Multimodal OpenAI-Compatible Vision SSE Streaming (OpenAI GPT-4o, OpenRouter, Groq Vision, Ollama LLaVA/Qwen2.5-VL)
func streamOpenAIVisionCircle(
	w http.ResponseWriter,
	flusher http.Flusher,
	baseURL, apiKey, modelName, userText, jpegB64 string,
) (string, string, bool) {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		return "", "", false
	}
	endpoint := base
	if !strings.HasSuffix(strings.ToLower(endpoint), "/chat/completions") {
		endpoint += "/chat/completions"
	}
	if strings.Contains(strings.ToLower(endpoint), "generativelanguage.googleapis.com") {
		modelName = sanitizeGeminiModelID(modelName)
	}
	// If local Ollama isn't using a vision-capable model, skip multimodal image payload so text-only local models don't 400
	isLocal := strings.Contains(endpoint, "127.0.0.1") || strings.Contains(endpoint, "localhost")
	lowModel := strings.ToLower(modelName)
	isVisionModel := strings.Contains(lowModel, "vision") || strings.Contains(lowModel, "vl") ||
		strings.Contains(lowModel, "llava") || strings.Contains(lowModel, "bakllava") ||
		strings.Contains(lowModel, "minicpm") || strings.Contains(lowModel, "gemma3") ||
		strings.Contains(lowModel, "gemini") || strings.Contains(lowModel, "gpt-4") ||
		strings.Contains(lowModel, "claude-3") || strings.Contains(lowModel, "claude-4") ||
		strings.Contains(lowModel, "pixtral") || strings.Contains(lowModel, "qwen2.5-vl")

	var userContent interface{} = userText
	if jpegB64 != "" && (!isLocal || isVisionModel) {
		userContent = []map[string]interface{}{
			{"type": "text", "text": userText},
			{"type": "image_url", "image_url": map[string]string{"url": "data:image/jpeg;base64," + jpegB64}},
		}
	}

	reqBody, _ := json.Marshal(map[string]interface{}{
		"model": modelName,
		"messages": []map[string]interface{}{
			{"role": "system", "content": circleToSearchSystemPrompt},
			{"role": "user", "content": userContent},
		},
		"temperature": 0.25,
		"stream":      true,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 55*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return "", err.Error(), false
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return "", err.Error(), false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		errBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
		return "", formatGeminiHTTPError(resp.StatusCode, resp.Status, errBytes, modelName, maskURLSecret(endpoint)), false
	}

	var full strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		dataStr := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if dataStr == "[DONE]" {
			break
		}
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if json.Unmarshal([]byte(dataStr), &chunk) == nil {
			for _, ch := range chunk.Choices {
				if ch.Delta.Content != "" {
					full.WriteString(ch.Delta.Content)
					if w != nil && flusher != nil {
						writeSSEEvent(w, flusher, map[string]interface{}{
							"type":    "token",
							"content": ch.Delta.Content,
							"text":    ch.Delta.Content,
						})
					}
				}
			}
		}
	}
	if full.Len() == 0 {
		return "", "Пустой ответ Vision LLM", false
	}
	return full.String(), "", true
}

// ==================== BUILT-IN SMART CIRCLE TO SEARCH CLASSIFIER & SOLVER (OFFLINE + LIVE WEB) ====================
// Strictly follows all 4 Circle to Search rules: zero greetings, bold + bullets, structured by content type!

var (
	reCircleMathExpr  = regexp.MustCompile(`^[\d\s\+\-\*\/×÷\^\(\)\.,=%xXхХ]+$`)
	reCircleLinearEq  = regexp.MustCompile(`(?i)^\s*([+\-]?\d*(?:\.\d+)?)?\s*[xх]\s*([+\-]\s*\d+(?:\.\d+)?)?\s*=\s*([+\-]?\d+(?:\.\d+)?)\s*$`)
	reCirclePercentOf = regexp.MustCompile(`(?i)(\d+(?:[.,]\d+)?)\s*%\s*(?:от|of)\s*(\d+(?:[.,]\d+)?)`)
	reCircleErrorCode = regexp.MustCompile(`(?i)(error|exception|traceback|errno|panic:|failed|syntaxerror|typeerror|referenceerror|nullreference|segfault|bsod|0x[0-9a-f]{4,}|http\s*[45]\d\d|econnrefused|enoent|cors|404\s+not\s+found|500\s+internal|403\s+forbidden|401\s+unauthorized)`)
	reCircleCodeLike  = regexp.MustCompile(`(?i)(\bfunction\b|\bconst\b|\bimport\b|\bdef\s+\w+|\bclass\s+\w+|\bfunc\s+\w+|SELECT\s+.+\s+FROM|console\.log|fmt\.Print|=>|\{\s*\n)`)
	reCircleLatinText = regexp.MustCompile(`[A-Za-z]{3,}`)
)

func evalSimpleArithmetic(expr string) (float64, bool) {
	s := strings.ReplaceAll(expr, "×", "*")
	s = strings.ReplaceAll(s, "÷", "/")
	s = strings.ReplaceAll(s, ",", ".")
	s = strings.ReplaceAll(s, " ", "")
	s = strings.TrimSuffix(s, "=")
	if s == "" {
		return 0, false
	}
	pos := 0
	var parseExpr func() (float64, bool)
	var parseTerm func() (float64, bool)
	var parseFactor func() (float64, bool)

	parseFactor = func() (float64, bool) {
		if pos >= len(s) {
			return 0, false
		}
		if s[pos] == '+' {
			pos++
			return parseFactor()
		}
		if s[pos] == '-' {
			pos++
			v, ok := parseFactor()
			return -v, ok
		}
		if s[pos] == '(' {
			pos++
			v, ok := parseExpr()
			if !ok || pos >= len(s) || s[pos] != ')' {
				return 0, false
			}
			pos++
			return v, true
		}
		start := pos
		dot := false
		for pos < len(s) && ((s[pos] >= '0' && s[pos] <= '9') || (s[pos] == '.' && !dot)) {
			if s[pos] == '.' {
				dot = true
			}
			pos++
		}
		if start == pos {
			return 0, false
		}
		v, err := strconv.ParseFloat(s[start:pos], 64)
		if err != nil {
			return 0, false
		}
		if pos < len(s) && s[pos] == '^' {
			pos++
			exp, ok := parseFactor()
			if !ok {
				return 0, false
			}
			return math.Pow(v, exp), true
		}
		return v, true
	}

	parseTerm = func() (float64, bool) {
		left, ok := parseFactor()
		if !ok {
			return 0, false
		}
		for pos < len(s) && (s[pos] == '*' || s[pos] == '/') {
			op := s[pos]
			pos++
			right, ok2 := parseFactor()
			if !ok2 {
				return 0, false
			}
			if op == '*' {
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

	parseExpr = func() (float64, bool) {
		left, ok := parseTerm()
		if !ok {
			return 0, false
		}
		for pos < len(s) && (s[pos] == '+' || s[pos] == '-') {
			op := s[pos]
			pos++
			right, ok2 := parseTerm()
			if !ok2 {
				return 0, false
			}
			if op == '+' {
				left += right
			} else {
				left -= right
			}
		}
		return left, true
	}

	val, ok := parseExpr()
	if !ok || pos != len(s) || math.IsNaN(val) || math.IsInf(val, 0) {
		return 0, false
	}
	return val, true
}

func formatMathNum(v float64) string {
	if math.Abs(v-math.Round(v)) < 1e-9 {
		return strconv.FormatInt(int64(math.Round(v)), 10)
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.6f", v), "0"), ".")
}

func buildBuiltInCircleToSearchReply(
	ocrText, userQuery string,
	colors []string,
	width, height int,
	kernel *LumaKernel,
	trashStore *LumaTrashStore,
) (category string, reply string, sources []AISourceLink) {
	text := strings.TrimSpace(userQuery)
	if text == "" {
		text = strings.TrimSpace(ocrText)
	} else if ocrText != "" && !strings.Contains(strings.ToLower(text), strings.ToLower(truncateUTF8(ocrText, 24))) {
		text = text + "\n" + ocrText
	}
	low := strings.ToLower(text)

	// 1. МАТЕМАТИКА / ЗАДАЧА
	if m := reCirclePercentOf.FindStringSubmatch(text); len(m) == 3 {
		p, _ := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
		base, _ := strconv.ParseFloat(strings.ReplaceAll(m[2], ",", "."), 64)
		ans := base * p / 100.0
		return "math", fmt.Sprintf("**Математика · Процент от числа**\n- **Условие:** `%s%%` от `%s`\n- **Шаг 1:** Переводим проценты в долю: `%s / 100 = %s`\n- **Шаг 2:** Умножаем: `%s × %s = %s`\n- **Ответ:** **%s**",
			m[1], m[2], m[1], formatMathNum(p/100.0), m[2], formatMathNum(p/100.0), formatMathNum(ans), formatMathNum(ans)), nil
	}
	if m := reCircleLinearEq.FindStringSubmatch(strings.ReplaceAll(text, ",", ".")); len(m) == 4 {
		aStr := strings.ReplaceAll(m[1], " ", "")
		a := 1.0
		if aStr == "-" {
			a = -1.0
		} else if aStr != "" && aStr != "+" {
			a, _ = strconv.ParseFloat(aStr, 64)
		}
		bStr := strings.ReplaceAll(m[2], " ", "")
		b := 0.0
		if bStr != "" {
			b, _ = strconv.ParseFloat(bStr, 64)
		}
		c, _ := strconv.ParseFloat(strings.ReplaceAll(m[3], " ", ""), 64)
		if a != 0 {
			xVal := (c - b) / a
			return "math", fmt.Sprintf("**Решение уравнения:** `%s`\n- **Шаг 1:** Переносим свободный член вправо: `%sx = %s`\n- **Шаг 2:** Делим обе части на `%s`: `x = %s / %s`\n- **Ответ:** **x = %s**",
				strings.TrimSpace(text), formatMathNum(a), formatMathNum(c-b), formatMathNum(a), formatMathNum(c-b), formatMathNum(a), formatMathNum(xVal)), nil
		}
	}
	if text != "" && len(text) <= 80 && reCircleMathExpr.MatchString(text) && strings.ContainsAny(text, "+-*/×÷^") {
		if val, ok := evalSimpleArithmetic(text); ok {
			return "math", fmt.Sprintf("**Вычисление выражения:** `%s`\n- **Порядок действий:** скобки → степени → умножение/деление → сложение/вычитание\n- **Точный ответ:** **%s**",
				strings.TrimSpace(text), formatMathNum(val)), nil
		}
	}

	// 2. ОШИБКА ИЛИ КОД
	if text != "" && (reCircleErrorCode.MatchString(text) || reCircleCodeLike.MatchString(text)) {
		cause := "Обнаружен фрагмент программного кода или диагностического сообщения об ошибке."
		fix := "Проверьте строку, указанную в тексте ошибки, типы входных данных и наличие всех зависимостей/импортов."
		switch {
		case strings.Contains(low, "404"):
			cause = "**HTTP 404 Not Found** — запрошенный URL, эндпоинт API или файл не существует (часто из-за лишнего префикса пути или опечатки)."
			fix = "Проверьте точный путь запроса, регистр символов и версию API (например, `v1beta/models/...` без двойного `models/`)."
		case strings.Contains(low, "401") || strings.Contains(low, "unauthorized"):
			cause = "**HTTP 401 Unauthorized** — отсутствует, истёк или неверен API-ключ / токен авторизации."
			fix = "Перевыпустите токен/API-ключ и проверьте заголовок `Authorization: Bearer ...` (или параметр `?key=`)."
		case strings.Contains(low, "403") || strings.Contains(low, "forbidden"):
			cause = "**HTTP 403 Forbidden** — доступ запрещён правами аккаунта, региональной блокировкой или CORS/firewall."
			fix = "Проверьте права доступа (RBAC/биллинг/квоты) или выполните запрос из разрешённой сети."
		case strings.Contains(low, "500") || strings.Contains(low, "502") || strings.Contains(low, "503"):
			cause = "**Ошибка сервера (5xx)** — внутренний сбой на стороне удалённого сервиса или перегрузка."
			fix = "Повторите запрос через 10–30 сек и проверьте логи бэкенда на необработанное исключение."
		case strings.Contains(low, "econnrefused"):
			cause = "**ECONNREFUSED** — целевой локальный/удалённый порт закрыт или сервер не запущен."
			fix = "Убедитесь, что нужная служба запущена и слушает именно указанный хост/порт (проверьте брандмауэр)."
		case strings.Contains(low, "nullreference") || strings.Contains(low, "cannot read properties of undefined") || strings.Contains(low, "cannot read property"):
			cause = "Обращение к свойству объекта, который равен `null` / `undefined`."
			fix = "Добавьте проверку на существование (`obj?.field`) и инициализируйте состояние значением по умолчанию до рендера."
		case strings.Contains(low, "cors"):
			cause = "Браузер заблокировал кросс-доменный запрос политикой **CORS**."
			fix = "Добавьте заголовок `Access-Control-Allow-Origin` на сервере или проксируйте запрос через локальный Go-бэкенд."
		case strings.Contains(low, "syntaxerror"):
			cause = "**SyntaxError** — синтаксическая ошибка (незакрытая скобка/кавычка, лишняя запятая или невалидный JSON)."
			fix = "Проверьте парность скобок `{ } ( ) [ ]` на указанной строке и прогоните файл через линтер/JSON-валидатор."
		}
		return "code", fmt.Sprintf("**Анализ ошибки / кода**\n- **Фрагмент:** `%s`\n- **Причина:** %s\n- **Шаг исправления:** %s",
			truncateUTF8(strings.ReplaceAll(text, "\n", " "), 160), cause, fix), nil
	}

	// 3. ТЕКСТ / ПЕРЕВОД / ТЕРМИН / МЕСТО / ТОВАР (через живой перевод + Nexus веб-поиск)
	if text != "" {
		var b strings.Builder
		cat := "text"
		hasLatin := reCircleLatinText.MatchString(text)
		hasCyr := detectHasCyrillic(text)

		// If primarily foreign text, immediately translate to Russian (Rule #2!)
		if hasLatin && !hasCyr {
			ctx, cancel := context.WithTimeout(context.Background(), 4000*time.Millisecond)
			tr, trSrc := fetchMyMemoryTranslate(ctx, truncateUTF8(text, 450), "en", "ru")
			cancel()
			if trSrc != nil {
				sources = append(sources, *trSrc)
			}
			b.WriteString("**Извлечённый текст:**\n")
			b.WriteString("- `" + truncateUTF8(text, 320) + "`\n\n")
			if strings.TrimSpace(tr) != "" && !strings.EqualFold(strings.TrimSpace(tr), strings.TrimSpace(text)) {
				b.WriteString("**Перевод на русский:**\n")
				b.WriteString("- " + strings.TrimSpace(tr) + "\n")
			}
		} else {
			b.WriteString("**Распознанный текст:**\n")
			b.WriteString("- " + truncateUTF8(text, 320) + "\n")
		}

		// Live Wikipedia / Web lookup for entities, products, places, terms & abbreviations
		if len([]rune(text)) <= 180 {
			res := RunLumaAI50Nexus([]AIChatMessage{{Role: "user", Content: text}}, "auto", "concise", false, true, kernel, trashStore)
			if r, ok := res["reply"].(string); ok && strings.TrimSpace(r) != "" {
				b.WriteString("\n**Справка и контекст:**\n")
				b.WriteString(strings.TrimSpace(r))
			}
			if s, ok := res["sources"].([]AISourceLink); ok {
				sources = append(sources, s...)
			}
			// Detect entity hint for badge
			if strings.Contains(low, "iphone") || strings.Contains(low, "samsung") || strings.Contains(low, "sony") ||
				strings.Contains(low, "nvidia") || strings.Contains(low, "xiaomi") || strings.Contains(low, "huawei") ||
				strings.Contains(low, "rtx") || strings.Contains(low, "nike") || strings.Contains(low, "adidas") {
				cat = "product"
			}
		}
		return cat, strings.TrimSpace(b.String()), sources
	}

	// 4. ВИЗУАЛЬНЫЙ ОБЪЕКТ БЕЗ ТЕКСТА (Правило №4 — честно называем вероятные варианты + подсказка для Vision LLM)
	colorLine := "нейтральная палитра"
	if len(colors) > 0 {
		colorLine = strings.Join(colors, ", ")
	}
	return "visual", fmt.Sprintf(`**Визуальный фрагмент (%d×%d px)**
- **Доминирующие цвета:** %s
- **Вероятные категории объекта:**
  - **1.** Иллюстрация, иконка, логотип или элемент интерфейса без печатного текста
  - **2.** Фотография товара, устройства, растения или места (требуется нейросетевой Vision-анализ)
  - **3.** Графический объект / кадр из видео с низким контрастом текста
- **Для точного распознавания фото (бренд, модель, растение, место):** подключите бесплатный ключ **Google Gemini (`+"`gemini-2.5-flash`"+`)** в *Luma Ai Nitrogen → Настройки* — модуль Circle to Search сразу начнёт анализировать само изображение напрямую.`,
		width, height, colorLine), nil
}

func handleCircleSearchHTTP(w http.ResponseWriter, r *http.Request, kernel *LumaKernel) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req CircleSearchRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 16<<20)).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}

	wantStream := true
	if req.Stream != nil {
		wantStream = *req.Stream
	}

	t0 := time.Now()
	jpegB64, rawImg, width, height, colors, hasImg := prepareVisionJPEG(req.ImageBase64)
	if colors == nil {
		colors = []string{}
	}

	ocrText := strings.TrimSpace(req.OCRText)
	var savedPath string
	if len(rawImg) > 0 {
		if ocrText == "" {
			tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("luma_c2s_%d.png", time.Now().UnixNano()))
			if os.WriteFile(tmpFile, rawImg, 0o600) == nil {
				defer os.Remove(tmpFile)
				ocrText = strings.TrimSpace(runNativeImageOCR(tmpFile))
			}
		}
		if req.SaveClip {
			home, _ := os.UserHomeDir()
			dir := filepath.Join(home, "Pictures", "LumaCaptures")
			_ = os.MkdirAll(dir, 0o755)
			outPath := filepath.Join(dir, fmt.Sprintf("circle_search_%s.jpg", time.Now().Format("20060102_150405")))
			if jBytes, err := base64.StdEncoding.DecodeString(jpegB64); err == nil {
				if os.WriteFile(outPath, jBytes, 0o644) == nil {
					savedPath = outPath
				}
			}
		}
	}

	qForLinks := strings.TrimSpace(req.Query)
	if qForLinks == "" {
		qForLinks = ocrText
	}
	qEsc := url.QueryEscape(qForLinks)
	visualURLs := []map[string]string{
		{"name": "Google Lens", "url": "https://lens.google.com/"},
		{"name": "Яндекс Картинки", "url": "https://yandex.ru/images/"},
		{"name": "Google Поиск", "url": "https://www.google.com/search?q=" + qEsc},
		{"name": "Яндекс Поиск", "url": "https://yandex.ru/search/?text=" + qEsc},
	}

	// Resolve active LLM provider config
	cfg := loadNitrogenBrainConfig()
	if strings.TrimSpace(req.BaseURL) != "" {
		cfg.BaseURL = strings.TrimSpace(req.BaseURL)
	}
	if strings.TrimSpace(req.APIKey) != "" {
		cfg.APIKey = strings.TrimSpace(req.APIKey)
	}
	if strings.TrimSpace(req.ModelName) != "" {
		cfg.ModelName = strings.TrimSpace(req.ModelName)
	}

	var flusher http.Flusher
	if wantStream {
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		flusher, _ = w.(http.Flusher)
		writeSSEEvent(w, flusher, map[string]interface{}{
			"type":               "meta",
			"ocr_text":           ocrText,
			"dominant_colors":    colors,
			"width":              width,
			"height":             height,
			"saved_path":         savedPath,
			"visual_search_urls": visualURLs,
			"engine":             "circle_to_search_171",
		})
	} else {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
	}

	// Build concise multimodal user prompt
	var userPrompt strings.Builder
	if strings.TrimSpace(req.Query) != "" {
		userPrompt.WriteString("Уточнение пользователя: " + strings.TrimSpace(req.Query) + "\n")
	} else {
		userPrompt.WriteString("Проанализируй выделенную пользователем область экрана строго по системным правилам.\n")
	}
	if ocrText != "" {
		userPrompt.WriteString("Предварительно распознанный ОС текст (OCR): " + truncateUTF8(ocrText, 700) + "\n")
	}

	// Try true Multimodal Vision LLM first if API key is configured!
	hasCloudKey := strings.TrimSpace(cfg.APIKey) != "" && !strings.EqualFold(strings.TrimSpace(cfg.APIKey), "ollama")
	lowBase := strings.ToLower(cfg.BaseURL)
	lowModel := strings.ToLower(cfg.ModelName)
	isGemini := strings.Contains(lowBase, "generativelanguage.googleapis.com") ||
		strings.HasPrefix(lowModel, "gemini") || strings.EqualFold(req.Provider, "gemini")

	var (
		reply     string
		engineTag = "builtin_circle_search"
		modelTag  = "Luma Circle to Search (Встроенный)"
		category  = "visual"
		sources   []AISourceLink
		visionOK  bool
	)

	if hasImg && hasCloudKey {
		var sseW http.ResponseWriter
		var sseF http.Flusher
		if wantStream {
			sseW, sseF = w, flusher
		}
		if isGemini {
			if cfg.BaseURL == "" || strings.Contains(cfg.BaseURL, "11434") {
				cfg.BaseURL = "https://generativelanguage.googleapis.com/v1beta"
			}
			rTxt, _, ok := streamGeminiCircleVision(sseW, sseF, cfg.BaseURL, cfg.APIKey, cfg.ModelName, userPrompt.String(), jpegB64)
			if ok && strings.TrimSpace(rTxt) != "" {
				reply = rTxt
				visionOK = true
				engineTag = "gemini_vision"
				modelTag = "Circle to Search · " + sanitizeGeminiModelID(cfg.ModelName)
				category = "vision"
			}
		} else if strings.TrimSpace(cfg.BaseURL) != "" {
			rTxt, _, ok := streamOpenAIVisionCircle(sseW, sseF, cfg.BaseURL, cfg.APIKey, cfg.ModelName, userPrompt.String(), jpegB64)
			if ok && strings.TrimSpace(rTxt) != "" {
				reply = rTxt
				visionOK = true
				engineTag = "openai_vision"
				modelTag = "Circle to Search · " + cfg.ModelName
				category = "vision"
			}
		}
	}

	if !visionOK {
		var trashRef *LumaTrashStore
		if kernel != nil {
			trashRef = kernel.trash
		}
		category, reply, sources = buildBuiltInCircleToSearchReply(ocrText, req.Query, colors, width, height, kernel, trashRef)
		if wantStream && flusher != nil {
			runes := []rune(reply)
			for i := 0; i < len(runes); i += 10 {
				end := i + 10
				if end > len(runes) {
					end = len(runes)
				}
				chunk := string(runes[i:end])
				writeSSEEvent(w, flusher, map[string]interface{}{
					"type":    "token",
					"content": chunk,
					"text":    chunk,
				})
				time.Sleep(10 * time.Millisecond)
			}
		}
	}

	if sources == nil {
		sources = []AISourceLink{}
	}
	payload := map[string]interface{}{
		"ok":                 true,
		"type":               "done",
		"reply":              reply,
		"category":           category,
		"engine":             engineTag,
		"model":              modelTag,
		"ocr_text":           ocrText,
		"dominant_colors":    colors,
		"width":              width,
		"height":             height,
		"saved_path":         savedPath,
		"sources":            sources,
		"visual_search_urls": visualURLs,
		"elapsed_ms":         time.Since(t0).Milliseconds(),
	}
	if wantStream {
		writeSSEEvent(w, flusher, payload)
	} else {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func registerCircleSearch171Routes(mux *http.ServeMux, kernel *LumaKernel) {
	mux.HandleFunc("/api/kernel/lens/circle-search", func(w http.ResponseWriter, r *http.Request) {
		handleCircleSearchHTTP(w, r, kernel)
	})
}
