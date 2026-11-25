package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/jpeg"
	"image/png"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ==================== LUMA OS 1.6.2: LUMA ОБВЕСТИ ДЛЯ ПОИСКА (LENS ENGINE) ====================
// Full working analog of Circle to Search:
//   - Instant live full-screen capture (/api/kernel/capture/screen-now)
//   - Cropped image decode + dominant color palette analysis
//   - Real OS-native OCR (Windows 10/11 WinRT OcrEngine offline RU+EN / Linux tesseract)
//   - Automatic live multi-source internet search + translation + clip save!

type LumaLensSearchRequest struct {
	ImageBase64 string `json:"image_base64"`
	Query       string `json:"query"`
	TranslateTo string `json:"translate_to"` // "" | "ru" | "en"
	SaveClip    bool   `json:"save_clip"`
}

func extractDominantColors(img image.Image, limit int) []string {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return nil
	}
	stepX := w / 36
	if stepX < 1 {
		stepX = 1
	}
	stepY := h / 36
	if stepY < 1 {
		stepY = 1
	}
	type bucket struct {
		r, g, b int64
		count   int64
	}
	bins := map[uint32]*bucket{}
	for y := b.Min.Y; y < b.Max.Y; y += stepY {
		for x := b.Min.X; x < b.Max.X; x += stepX {
			r, g, bl, a := img.At(x, y).RGBA()
			if a < 0x4000 {
				continue
			}
			r8, g8, b8 := uint8(r>>8), uint8(g>>8), uint8(bl>>8)
			key := (uint32(r8>>4) << 8) | (uint32(g8>>4) << 4) | uint32(b8>>4)
			bk, ok := bins[key]
			if !ok {
				bk = &bucket{}
				bins[key] = bk
			}
			bk.r += int64(r8)
			bk.g += int64(g8)
			bk.b += int64(b8)
			bk.count++
		}
	}
	type kv struct {
		hex   string
		count int64
	}
	list := make([]kv, 0, len(bins))
	for _, bk := range bins {
		if bk.count <= 0 {
			continue
		}
		list = append(list, kv{
			hex:   fmt.Sprintf("#%02x%02x%02x", bk.r/bk.count, bk.g/bk.count, bk.b/bk.count),
			count: bk.count,
		})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].count > list[j].count })
	if len(list) > limit {
		list = list[:limit]
	}
	out := make([]string, 0, len(list))
	for _, it := range list {
		out = append(out, it.hex)
	}
	return out
}

func handleLumaLensSearch(req LumaLensSearchRequest, kernel *LumaKernel, trashStore *LumaTrashStore) map[string]interface{} {
	t0 := time.Now()
	var (
		rawPNG   []byte
		width    int
		height   int
		colors   []string
		ocrText  string
		saved    string
		imgFound bool
	)

	b64 := strings.TrimSpace(req.ImageBase64)
	if idx := strings.Index(b64, ","); idx >= 0 {
		b64 = b64[idx+1:]
	}
	if b64 != "" {
		if decoded, err := base64.StdEncoding.DecodeString(b64); err == nil && len(decoded) > 0 {
			rawPNG = decoded
			if img, _, err2 := image.Decode(bytes.NewReader(decoded)); err2 == nil {
				imgFound = true
				width = img.Bounds().Dx()
				height = img.Bounds().Dy()
				colors = extractDominantColors(img, 5)
				// Re-encode clean PNG for OS OCR + optional save
				var buf bytes.Buffer
				if png.Encode(&buf, img) == nil {
					rawPNG = buf.Bytes()
				}
			}
		}
	}

	if len(rawPNG) > 0 {
		tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("luma_lens_%d.png", time.Now().UnixNano()))
		if os.WriteFile(tmpFile, rawPNG, 0o600) == nil {
			defer os.Remove(tmpFile)
			ocrText = strings.TrimSpace(runNativeImageOCR(tmpFile))
		}
		if req.SaveClip {
			home, _ := os.UserHomeDir()
			dir := filepath.Join(home, "Pictures", "LumaCaptures")
			_ = os.MkdirAll(dir, 0o755)
			outPath := filepath.Join(dir, fmt.Sprintf("luma_lens_%s.png", time.Now().Format("20060102_150405")))
			if os.WriteFile(outPath, rawPNG, 0o644) == nil {
				saved = outPath
			}
		}
	}

	searchQuery := strings.TrimSpace(req.Query)
	if searchQuery == "" {
		searchQuery = ocrText
	} else if ocrText != "" && !strings.Contains(strings.ToLower(searchQuery), strings.ToLower(truncateUTF8(ocrText, 24))) {
		searchQuery = searchQuery + " " + truncateUTF8(ocrText, 180)
	}

	var (
		reply       string
		sources     []AISourceLink
		translation string
	)

	// Optional instant translation of recognized OCR text
	if req.TranslateTo != "" && ocrText != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 4000*time.Millisecond)
		src := "en"
		if detectHasCyrillic(ocrText) {
			src = "ru"
		}
		dst := strings.ToLower(strings.TrimSpace(req.TranslateTo))
		if src == dst {
			if dst == "ru" {
				src = "en"
			} else {
				src = "ru"
			}
		}
		tr, trSrc := fetchMyMemoryTranslate(ctx, ocrText, src, dst)
		cancel()
		translation = tr
		if trSrc != nil {
			sources = append(sources, *trSrc)
		}
	}

	if searchQuery != "" {
		res := RunLumaAI50Nexus([]AIChatMessage{{Role: "user", Content: searchQuery}}, "auto", "balanced", false, true, kernel, trashStore)
		if r, ok := res["reply"].(string); ok {
			reply = r
		}
		if s, ok := res["sources"].([]AISourceLink); ok {
			sources = append(sources, s...)
		}
	} else if imgFound {
		reply = fmt.Sprintf("Область захвачена (`%d×%d px`). Текст внутри выделения не обнаружен — введите уточняющий запрос ниже или откройте визуальный поиск по изображению.", width, height)
	} else {
		reply = "Выделите область на экране или введите запрос для поиска."
	}

	if sources == nil {
		sources = []AISourceLink{}
	}
	if colors == nil {
		colors = []string{}
	}
	qEsc := url.QueryEscape(searchQuery)
	visualURLs := map[string]string{
		"web_ddg":    "https://duckduckgo.com/?q=" + qEsc,
		"web_yandex": "https://yandex.ru/search/?text=" + qEsc,
		"web_google": "https://www.google.com/search?q=" + qEsc,
		"img_yandex": "https://yandex.ru/images/",
		"img_lens":   "https://lens.google.com/",
	}

	return map[string]interface{}{
		"ok":                 true,
		"ocr_text":           ocrText,
		"query_used":         searchQuery,
		"translation":        translation,
		"reply":              reply,
		"sources":            sources,
		"dominant_colors":    colors,
		"width":              width,
		"height":             height,
		"saved_path":         saved,
		"visual_search_urls": visualURLs,
		"elapsed_ms":         time.Since(t0).Milliseconds(),
	}
}
