package main

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"html"
	"io"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// ==================== LUMA OS 1.5.1 (CARBON) NATIVE ZERO-DEP OFFICE ENGINE ====================
// Full bidirectional OOXML (.pptx, .docx, .xlsx) + ODF (.odp, .odt, .ods) + CSV/TSV/MD/HTML/RTF/TXT/JSON
// Built purely with Go stdlib archive/zip + encoding/xml — zero external dependencies, 100% offline!

type OfficeSlideElement struct {
	ID       string     `json:"id"`
	Type     string     `json:"type"` // text | image | shape | table
	X        float64    `json:"x"`    // percentage 0..100
	Y        float64    `json:"y"`
	W        float64    `json:"w"`
	H        float64    `json:"h"`
	Text     string     `json:"text,omitempty"`
	FontSize int        `json:"fontSize,omitempty"`
	Bold     bool       `json:"bold,omitempty"`
	Italic   bool       `json:"italic,omitempty"`
	Align    string     `json:"align,omitempty"` // left | center | right
	Color    string     `json:"color,omitempty"`
	BgColor  string     `json:"bgColor,omitempty"`
	ImageSrc string     `json:"imageSrc,omitempty"`
	Shape    string     `json:"shape,omitempty"` // rect | rounded | circle | line
	Rows     [][]string `json:"rows,omitempty"`
}

type OfficeSlide struct {
	ID         string               `json:"id"`
	Title      string               `json:"title"`
	Background string               `json:"background"`
	Transition string               `json:"transition"` // fade | slide | zoom | none
	Notes      string               `json:"notes"`
	Elements   []OfficeSlideElement `json:"elements"`
}

type OfficeSheet struct {
	Name   string              `json:"name"`
	Cells  map[string]string   `json:"cells"`            // "A1" -> raw value or "=SUM(A1:A5)"
	Styles map[string]CellMeta `json:"styles,omitempty"` // optional cell styling
	Rows   int                 `json:"rows"`
	Cols   int                 `json:"cols"`
}

type CellMeta struct {
	Bold   bool   `json:"bold,omitempty"`
	Italic bool   `json:"italic,omitempty"`
	Align  string `json:"align,omitempty"`
	Bg     string `json:"bg,omitempty"`
	Color  string `json:"color,omitempty"`
	Format string `json:"format,omitempty"` // text | number | currency | percent
}

type OfficeImportResponse struct {
	OK          bool          `json:"ok"`
	Kind        string        `json:"kind"` // docs | sheets | slides
	FileName    string        `json:"file_name"`
	Ext         string        `json:"ext"`
	Title       string        `json:"title"`
	DocHTML     string        `json:"doc_html,omitempty"`
	DocMarkdown string        `json:"doc_markdown,omitempty"`
	Sheets      []OfficeSheet `json:"sheets,omitempty"`
	Slides      []OfficeSlide `json:"slides,omitempty"`
	Warnings    []string      `json:"warnings,omitempty"`
	Error       string        `json:"error,omitempty"`
}

type OfficeExportRequest struct {
	Kind       string        `json:"kind"`   // docs | sheets | slides
	Format     string        `json:"format"` // pptx | docx | xlsx | html | md | csv | tsv | rtf | txt | json
	FileName   string        `json:"file_name"`
	Title      string        `json:"title"`
	DocHTML    string        `json:"doc_html,omitempty"`
	DocText    string        `json:"doc_text,omitempty"`
	Sheets     []OfficeSheet `json:"sheets,omitempty"`
	Slides     []OfficeSlide `json:"slides,omitempty"`
	SaveToDisk string        `json:"save_to_disk,omitempty"`
}

type OfficeExportResponse struct {
	OK         bool   `json:"ok"`
	FileName   string `json:"file_name"`
	MimeType   string `json:"mime_type"`
	Base64Data string `json:"base64_data"`
	SizeBytes  int    `json:"size_bytes"`
	SavedPath  string `json:"saved_path,omitempty"`
	Error      string `json:"error,omitempty"`
}

// ==================== ENTRYPOINT: IMPORT ANY OFFICE FILE ====================

func ImportOfficeDocument(filename string, raw []byte) OfficeImportResponse {
	if len(raw) == 0 {
		return OfficeImportResponse{OK: false, Error: "Пустой файл"}
	}
	base := filepath.Base(strings.TrimSpace(filename))
	if base == "" {
		base = "document"
	}
	ext := strings.ToLower(filepath.Ext(base))
	title := strings.TrimSuffix(base, filepath.Ext(base))

	// Auto-detect ZIP-based OOXML/ODF even if extension is missing or mislabeled
	isZip := len(raw) >= 4 && raw[0] == 'P' && raw[1] == 'K' && (raw[2] == 3 || raw[2] == 5)
	if isZip && (ext == "" || ext == ".zip") {
		if zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw))); err == nil {
			for _, f := range zr.File {
				ln := strings.ToLower(f.Name)
				if strings.HasPrefix(ln, "ppt/") {
					ext = ".pptx"
					break
				}
				if strings.HasPrefix(ln, "word/") {
					ext = ".docx"
					break
				}
				if strings.HasPrefix(ln, "xl/") {
					ext = ".xlsx"
					break
				}
			}
		}
	}

	switch ext {
	case ".pptx", ".ppsx", ".potx", ".pptm":
		slides, warns, err := parsePPTXBytes(raw)
		if err != nil {
			return OfficeImportResponse{OK: false, Error: "Не удалось разобрать PPTX: " + err.Error()}
		}
		return OfficeImportResponse{
			OK: true, Kind: "slides", FileName: base, Ext: ext, Title: title,
			Slides: slides, Warnings: warns,
		}
	case ".odp":
		slides, err := parseODPBytes(raw)
		if err != nil {
			return OfficeImportResponse{OK: false, Error: "Не удалось разобрать ODP: " + err.Error()}
		}
		return OfficeImportResponse{
			OK: true, Kind: "slides", FileName: base, Ext: ext, Title: title,
			Slides: slides,
		}
	case ".docx", ".docm", ".dotx":
		htmlOut, warns, err := parseDOCXBytes(raw)
		if err != nil {
			return OfficeImportResponse{OK: false, Error: "Не удалось разобрать DOCX: " + err.Error()}
		}
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: htmlOut, Warnings: warns,
		}
	case ".odt":
		htmlOut, err := parseODTBytes(raw)
		if err != nil {
			return OfficeImportResponse{OK: false, Error: "Не удалось разобрать ODT: " + err.Error()}
		}
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: htmlOut,
		}
	case ".xlsx", ".xlsm", ".xltx":
		sheets, warns, err := parseXLSXBytes(raw)
		if err != nil {
			return OfficeImportResponse{OK: false, Error: "Не удалось разобрать XLSX: " + err.Error()}
		}
		return OfficeImportResponse{
			OK: true, Kind: "sheets", FileName: base, Ext: ext, Title: title,
			Sheets: sheets, Warnings: warns,
		}
	case ".ods":
		sheets, err := parseODSBytes(raw)
		if err != nil {
			return OfficeImportResponse{OK: false, Error: "Не удалось разобрать ODS: " + err.Error()}
		}
		return OfficeImportResponse{
			OK: true, Kind: "sheets", FileName: base, Ext: ext, Title: title,
			Sheets: sheets,
		}
	case ".csv", ".tsv":
		delim := ','
		if ext == ".tsv" {
			delim = '\t'
		}
		sheet := parseDelimitedSheet(title, raw, delim)
		return OfficeImportResponse{
			OK: true, Kind: "sheets", FileName: base, Ext: ext, Title: title,
			Sheets: []OfficeSheet{sheet},
		}
	case ".rtf":
		txt := stripRTFToText(string(raw))
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: plainTextToHTML(txt),
		}
	case ".md", ".markdown":
		md := string(raw)
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: markdownToSimpleHTML(md), DocMarkdown: md,
		}
	case ".html", ".htm":
		body := extractHTMLBody(string(raw))
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: body,
		}
	case ".json":
		// Support Luma Office native JSON bundle (slides, sheets, or docs)
		var probe struct {
			Kind    string        `json:"kind"`
			Title   string        `json:"title"`
			DocHTML string        `json:"doc_html"`
			Slides  []OfficeSlide `json:"slides"`
			Sheets  []OfficeSheet `json:"sheets"`
		}
		if json.Unmarshal(raw, &probe) == nil {
			if len(probe.Slides) > 0 {
				return OfficeImportResponse{OK: true, Kind: "slides", FileName: base, Ext: ext, Title: nonEmpty(probe.Title, title), Slides: probe.Slides}
			}
			if len(probe.Sheets) > 0 {
				return OfficeImportResponse{OK: true, Kind: "sheets", FileName: base, Ext: ext, Title: nonEmpty(probe.Title, title), Sheets: probe.Sheets}
			}
			if probe.DocHTML != "" {
				return OfficeImportResponse{OK: true, Kind: "docs", FileName: base, Ext: ext, Title: nonEmpty(probe.Title, title), DocHTML: probe.DocHTML}
			}
		}
		// Array of objects -> Spreadsheet
		var rows []map[string]interface{}
		if json.Unmarshal(raw, &rows) == nil && len(rows) > 0 {
			sheet := jsonObjectsToSheet(title, rows)
			return OfficeImportResponse{OK: true, Kind: "sheets", FileName: base, Ext: ext, Title: title, Sheets: []OfficeSheet{sheet}}
		}
		// Fallback: formatted JSON in Docs
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: "<pre>" + html.EscapeString(string(raw)) + "</pre>",
		}
	case ".ppt", ".doc", ".xls":
		// Legacy binary OLE2 fallback: salvage readable UTF-16LE/UTF-8 text cleanly without error!
		txt := extractReadableStrings(raw)
		if ext == ".ppt" {
			slides := textToFallbackSlides(title, txt)
			return OfficeImportResponse{
				OK: true, Kind: "slides", FileName: base, Ext: ext, Title: title,
				Slides:   slides,
				Warnings: []string{"Старый бинарный формат .ppt: извлечён текст слайдов (для полного макета пересохраните в .pptx)"},
			}
		}
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML:  plainTextToHTML(txt),
			Warnings: []string{"Старый бинарный формат " + ext + ": текст восстановлен автоматически"},
		}
	default:
		// Plain text / code / logs
		return OfficeImportResponse{
			OK: true, Kind: "docs", FileName: base, Ext: ext, Title: title,
			DocHTML: plainTextToHTML(string(raw)),
		}
	}
}

// ==================== PPTX PARSER (REAL POWERPOINT OPEN WITH IMAGES, SHAPES, TABLES, NOTES) ====================

var slideNumRe = regexp.MustCompile(`slide(\d+)\.xml$`)

func readZipFileMap(raw []byte) (map[string][]byte, error) {
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		return nil, err
	}
	files := make(map[string][]byte, len(zr.File))
	for _, f := range zr.File {
		if f.FileInfo().IsDir() || f.UncompressedSize64 > 25*1024*1024 {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			continue
		}
		data, err := io.ReadAll(io.LimitReader(rc, 25*1024*1024))
		_ = rc.Close()
		if err == nil {
			norm := strings.TrimPrefix(strings.ReplaceAll(f.Name, "\\", "/"), "/")
			files[norm] = data
		}
	}
	return files, nil
}

func guessImageMime(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".bmp":
		return "image/bmp"
	default:
		return "image/png"
	}
}

func parseRelsXML(data []byte) map[string]string {
	rels := map[string]string{}
	if len(data) == 0 {
		return rels
	}
	dec := xml.NewDecoder(bytes.NewReader(data))
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		if se, ok := tok.(xml.StartElement); ok && se.Name.Local == "Relationship" {
			var id, target string
			for _, a := range se.Attr {
				switch a.Name.Local {
				case "Id":
					id = a.Value
				case "Target":
					target = a.Value
				}
			}
			if id != "" && target != "" {
				rels[id] = target
			}
		}
	}
	return rels
}

func resolveRelTarget(baseXMLPath, target string) string {
	if strings.HasPrefix(target, "/") {
		return strings.TrimPrefix(target, "/")
	}
	dir := path.Dir(baseXMLPath)
	return strings.TrimPrefix(path.Clean(path.Join(dir, target)), "/")
}

func parsePPTXBytes(raw []byte) ([]OfficeSlide, []string, error) {
	files, err := readZipFileMap(raw)
	if err != nil {
		return nil, nil, err
	}

	// Determine slide size in EMUs (default 16:9 widescreen 12192000 x 6858000, or 4:3 9144000 x 6858000)
	slideW := 12192000.0
	slideH := 6858000.0
	orderedSlides := []string{}

	if presXML, ok := files["ppt/presentation.xml"]; ok {
		presRels := parseRelsXML(files["ppt/_rels/presentation.xml.rels"])
		dec := xml.NewDecoder(bytes.NewReader(presXML))
		for {
			tok, err := dec.Token()
			if err != nil {
				break
			}
			if se, ok := tok.(xml.StartElement); ok {
				switch se.Name.Local {
				case "sldSz":
					for _, a := range se.Attr {
						if a.Name.Local == "cx" {
							if v, e := strconv.ParseFloat(a.Value, 64); e == nil && v > 0 {
								slideW = v
							}
						}
						if a.Name.Local == "cy" {
							if v, e := strconv.ParseFloat(a.Value, 64); e == nil && v > 0 {
								slideH = v
							}
						}
					}
				case "sldId":
					for _, a := range se.Attr {
						if a.Name.Local == "id" && (a.Name.Space != "" || strings.HasPrefix(a.Value, "rId")) {
							if target, ok2 := presRels[a.Value]; ok2 {
								resolved := resolveRelTarget("ppt/presentation.xml", target)
								if _, exists := files[resolved]; exists {
									orderedSlides = append(orderedSlides, resolved)
								}
							}
						}
					}
				}
			}
		}
	}

	// Fallback slide discovery by numeric index if presentation.xml lacked sldId links
	if len(orderedSlides) == 0 {
		type numbered struct {
			n int
			p string
		}
		var list []numbered
		for k := range files {
			if strings.HasPrefix(k, "ppt/slides/slide") && strings.HasSuffix(k, ".xml") {
				m := slideNumRe.FindStringSubmatch(k)
				n := 9999
				if len(m) == 2 {
					n, _ = strconv.Atoi(m[1])
				}
				list = append(list, numbered{n: n, p: k})
			}
		}
		sort.Slice(list, func(i, j int) bool { return list[i].n < list[j].n })
		for _, it := range list {
			orderedSlides = append(orderedSlides, it.p)
		}
	}

	if len(orderedSlides) == 0 {
		return nil, nil, errors.New("в презентации не найдены слайды (ppt/slides/slide*.xml)")
	}

	var slides []OfficeSlide
	var warnings []string

	for idx, spath := range orderedSlides {
		data := files[spath]
		baseName := path.Base(spath)
		relsPath := path.Join(path.Dir(spath), "_rels", baseName+".rels")
		rels := parseRelsXML(files[relsPath])

		slide := OfficeSlide{
			ID:         fmt.Sprintf("sl_%d_%d", idx+1, time.Now().UnixNano()%100000),
			Title:      fmt.Sprintf("Слайд %d", idx+1),
			Background: "#0f172a",
			Transition: "fade",
			Elements:   []OfficeSlideElement{},
		}

		// Parse slide XML elements cleanly via token stream
		elements, bgColor, foundTitle := parseSlideXML(data, spath, rels, files, slideW, slideH)
		if bgColor != "" {
			slide.Background = bgColor
		}
		if foundTitle != "" {
			slide.Title = truncateUTF8(foundTitle, 64)
		}
		slide.Elements = elements

		// Speaker notes (ppt/notesSlides/notesSlideN.xml via relationship)
		for _, target := range rels {
			if strings.Contains(strings.ToLower(target), "notesslide") {
				npath := resolveRelTarget(spath, target)
				if ndata, ok := files[npath]; ok {
					slide.Notes = extractAllDrawingText(ndata)
				}
				break
			}
		}

		slides = append(slides, slide)
	}

	return slides, warnings, nil
}

func parseSlideXML(data []byte, spath string, rels map[string]string, files map[string][]byte, slideW, slideH float64) ([]OfficeSlideElement, string, string) {
	var elements []OfficeSlideElement
	var bgColor string
	var firstTitle string

	dec := xml.NewDecoder(bytes.NewReader(data))
	var stack []string

	inBg := false
	inSp := false
	inPic := false
	inTbl := false
	inPara := false
	inText := false

	var curX, curY, curW, curH float64
	var curPhType string
	var curParagraphs []string
	var curParaBuf strings.Builder
	var curFontSize int
	var curBold, curItalic bool
	var curAlign string
	var curTextColor string
	var curFillColor string
	var curImgRid string
	var curTableRows [][]string
	var curRow []string
	var curCellBuf strings.Builder
	elemSeq := 0

	resetBox := func() {
		curX, curY, curW, curH = 8, 12, 84, 24
		curPhType = ""
		curParagraphs = nil
		curParaBuf.Reset()
		curFontSize = 0
		curBold = false
		curItalic = false
		curAlign = "left"
		curTextColor = ""
		curFillColor = ""
		curImgRid = ""
		curTableRows = nil
		curRow = nil
		curCellBuf.Reset()
	}

	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			name := t.Name.Local
			stack = append(stack, name)
			switch name {
			case "bg":
				inBg = true
			case "sp":
				if !inSp && !inPic && !inTbl {
					inSp = true
					resetBox()
				}
			case "pic":
				if !inPic {
					inPic = true
					resetBox()
				}
			case "tbl":
				if !inTbl {
					inTbl = true
					curTableRows = nil
				}
			case "tr":
				if inTbl {
					curRow = []string{}
				}
			case "tc":
				if inTbl {
					curCellBuf.Reset()
				}
			case "ph":
				if inSp {
					for _, a := range t.Attr {
						if a.Name.Local == "type" {
							curPhType = a.Value
						}
					}
				}
			case "off":
				if inSp || inPic || inTbl {
					for _, a := range t.Attr {
						if a.Name.Local == "x" {
							if v, e := strconv.ParseFloat(a.Value, 64); e == nil {
								curX = clampPct(v / slideW * 100.0)
							}
						}
						if a.Name.Local == "y" {
							if v, e := strconv.ParseFloat(a.Value, 64); e == nil {
								curY = clampPct(v / slideH * 100.0)
							}
						}
					}
				}
			case "ext":
				if (inSp || inPic || inTbl) && len(stack) >= 2 && stack[len(stack)-2] == "xfrm" {
					for _, a := range t.Attr {
						if a.Name.Local == "cx" {
							if v, e := strconv.ParseFloat(a.Value, 64); e == nil && v > 0 {
								curW = clampPct(v / slideW * 100.0)
							}
						}
						if a.Name.Local == "cy" {
							if v, e := strconv.ParseFloat(a.Value, 64); e == nil && v > 0 {
								curH = clampPct(v / slideH * 100.0)
							}
						}
					}
				}
			case "p":
				if inSp {
					inPara = true
					curParaBuf.Reset()
				}
			case "pPr":
				if inPara {
					for _, a := range t.Attr {
						if a.Name.Local == "algn" {
							switch a.Value {
							case "ctr":
								curAlign = "center"
							case "r":
								curAlign = "right"
							default:
								curAlign = "left"
							}
						}
					}
				}
			case "rPr":
				if inSp {
					for _, a := range t.Attr {
						switch a.Name.Local {
						case "sz":
							if v, e := strconv.Atoi(a.Value); e == nil && v > 0 && curFontSize == 0 {
								curFontSize = v / 100 // hundredths of a point
							}
						case "b":
							if a.Value == "1" || a.Value == "true" {
								curBold = true
							}
						case "i":
							if a.Value == "1" || a.Value == "true" {
								curItalic = true
							}
						}
					}
				}
			case "srgbClr":
				for _, a := range t.Attr {
					if a.Name.Local == "val" && len(a.Value) == 6 {
						hexCol := "#" + a.Value
						if inBg && bgColor == "" {
							bgColor = hexCol
						} else if inSp && len(stack) >= 3 && stack[len(stack)-3] == "rPr" && curTextColor == "" {
							curTextColor = hexCol
						} else if inSp && len(stack) >= 3 && stack[len(stack)-3] == "spPr" && curFillColor == "" {
							curFillColor = hexCol
						}
					}
				}
			case "blip":
				if inPic {
					for _, a := range t.Attr {
						if a.Name.Local == "embed" || a.Name.Local == "link" {
							curImgRid = a.Value
						}
					}
				}
			case "t":
				inText = true
			}
		case xml.CharData:
			if inText {
				s := string(t)
				if inTbl {
					curCellBuf.WriteString(s)
				} else if inPara {
					curParaBuf.WriteString(s)
				}
			}
		case xml.EndElement:
			name := t.Name.Local
			if len(stack) > 0 {
				stack = stack[:len(stack)-1]
			}
			switch name {
			case "t":
				inText = false
			case "bg":
				inBg = false
			case "p":
				if inSp && inPara {
					inPara = false
					line := strings.TrimSpace(curParaBuf.String())
					if line != "" {
						curParagraphs = append(curParagraphs, line)
					}
				}
			case "tc":
				if inTbl {
					curRow = append(curRow, strings.TrimSpace(curCellBuf.String()))
				}
			case "tr":
				if inTbl && len(curRow) > 0 {
					curTableRows = append(curTableRows, curRow)
				}
			case "tbl":
				if inTbl {
					inTbl = false
					if len(curTableRows) > 0 {
						elemSeq++
						elements = append(elements, OfficeSlideElement{
							ID:   fmt.Sprintf("el_tbl_%d", elemSeq),
							Type: "table",
							X:    clampRange(curX, 2, 70),
							Y:    clampRange(curY, 8, 70),
							W:    clampRange(curW, 30, 92),
							H:    clampRange(curH, 18, 75),
							Rows: curTableRows,
						})
					}
				}
			case "pic":
				if inPic {
					inPic = false
					if curImgRid != "" {
						if target, ok := rels[curImgRid]; ok {
							mediaPath := resolveRelTarget(spath, target)
							if imgBytes, ok2 := files[mediaPath]; ok2 && len(imgBytes) > 0 && len(imgBytes) <= 12*1024*1024 {
								mime := guessImageMime(mediaPath)
								dataURL := "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(imgBytes)
								elemSeq++
								elements = append(elements, OfficeSlideElement{
									ID:       fmt.Sprintf("el_img_%d", elemSeq),
									Type:     "image",
									X:        clampRange(curX, 0, 88),
									Y:        clampRange(curY, 0, 88),
									W:        clampRange(curW, 12, 100),
									H:        clampRange(curH, 12, 100),
									ImageSrc: dataURL,
								})
							}
						}
					}
				}
			case "sp":
				if inSp {
					inSp = false
					text := strings.Join(curParagraphs, "\n")
					if strings.TrimSpace(text) != "" {
						elemSeq++
						isTitle := curPhType == "title" || curPhType == "ctrTitle"
						if curFontSize == 0 {
							if isTitle {
								curFontSize = 36
								curBold = true
							} else if curPhType == "subTitle" {
								curFontSize = 22
							} else {
								curFontSize = 18
							}
						}
						if isTitle && firstTitle == "" {
							firstTitle = curParagraphs[0]
						} else if firstTitle == "" && curFontSize >= 26 {
							firstTitle = curParagraphs[0]
						}
						if curTextColor == "" {
							if isLightHex(bgColor) {
								curTextColor = "#0f172a"
							} else {
								curTextColor = "#f8fafc"
							}
						}
						if curW < 10 {
							curW = 80
						}
						if curH < 6 {
							curH = 14
						}
						elements = append(elements, OfficeSlideElement{
							ID:       fmt.Sprintf("el_txt_%d", elemSeq),
							Type:     "text",
							X:        clampRange(curX, 2, 85),
							Y:        clampRange(curY, 2, 85),
							W:        clampRange(curW, 12, 96),
							H:        clampRange(curH, 8, 90),
							Text:     text,
							FontSize: curFontSize,
							Bold:     curBold,
							Italic:   curItalic,
							Align:    curAlign,
							Color:    curTextColor,
							BgColor:  curFillColor,
						})
					}
				}
			}
		}
	}
	return elements, bgColor, firstTitle
}

func extractAllDrawingText(xmlBytes []byte) string {
	dec := xml.NewDecoder(bytes.NewReader(xmlBytes))
	var parts []string
	inT := false
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if t.Name.Local == "t" {
				inT = true
			}
		case xml.CharData:
			if inT {
				s := strings.TrimSpace(string(t))
				if s != "" {
					parts = append(parts, s)
				}
			}
		case xml.EndElement:
			if t.Name.Local == "t" {
				inT = false
			}
		}
	}
	return strings.Join(parts, " ")
}

func parseODPBytes(raw []byte) ([]OfficeSlide, error) {
	files, err := readZipFileMap(raw)
	if err != nil {
		return nil, err
	}
	content, ok := files["content.xml"]
	if !ok {
		return nil, errors.New("отсутствует content.xml в ODP")
	}
	dec := xml.NewDecoder(bytes.NewReader(content))
	var slides []OfficeSlide
	inPage := false
	inP := false
	var lines []string
	var pBuf strings.Builder
	idx := 0
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if t.Name.Local == "page" {
				inPage = true
				lines = nil
				idx++
			} else if inPage && t.Name.Local == "p" {
				inP = true
				pBuf.Reset()
			}
		case xml.CharData:
			if inP {
				pBuf.Write(t)
			}
		case xml.EndElement:
			if t.Name.Local == "p" && inP {
				inP = false
				if s := strings.TrimSpace(pBuf.String()); s != "" {
					lines = append(lines, s)
				}
			} else if t.Name.Local == "page" && inPage {
				inPage = false
				title := fmt.Sprintf("Слайд %d", idx)
				els := []OfficeSlideElement{}
				if len(lines) > 0 {
					title = truncateUTF8(lines[0], 60)
					els = append(els, OfficeSlideElement{
						ID: fmt.Sprintf("odp_t_%d", idx), Type: "text", X: 8, Y: 10, W: 84, H: 18,
						Text: lines[0], FontSize: 34, Bold: true, Color: "#f8fafc", Align: "left",
					})
				}
				if len(lines) > 1 {
					els = append(els, OfficeSlideElement{
						ID: fmt.Sprintf("odp_b_%d", idx), Type: "text", X: 8, Y: 32, W: 84, H: 58,
						Text: strings.Join(lines[1:], "\n"), FontSize: 20, Color: "#e2e8f0", Align: "left",
					})
				}
				slides = append(slides, OfficeSlide{
					ID: fmt.Sprintf("odp_%d", idx), Title: title, Background: "#0f172a", Transition: "fade", Elements: els,
				})
			}
		}
	}
	if len(slides) == 0 {
		slides = append(slides, OfficeSlide{ID: "odp_1", Title: "Слайд 1", Background: "#0f172a", Transition: "fade"})
	}
	return slides, nil
}

// ==================== DOCX PARSER (REAL WORD OPEN WITH HEADINGS, FORMATTING, TABLES & IMAGES) ====================

func parseDOCXBytes(raw []byte) (string, []string, error) {
	files, err := readZipFileMap(raw)
	if err != nil {
		return "", nil, err
	}
	docXML, ok := files["word/document.xml"]
	if !ok {
		return "", nil, errors.New("в файле отсутствует word/document.xml")
	}
	rels := parseRelsXML(files["word/_rels/document.xml.rels"])

	dec := xml.NewDecoder(bytes.NewReader(docXML))
	var out strings.Builder
	var pBuf strings.Builder

	inP := false
	inR := false
	inT := false
	inTbl := false
	inTc := false
	pStyle := ""
	isList := false
	runBold := false
	runItalic := false
	runUnderline := false
	var rBuf strings.Builder

	flushRun := func() {
		txt := rBuf.String()
		rBuf.Reset()
		if txt == "" {
			return
		}
		esc := html.EscapeString(txt)
		if runBold {
			esc = "<strong>" + esc + "</strong>"
		}
		if runItalic {
			esc = "<em>" + esc + "</em>"
		}
		if runUnderline {
			esc = "<u>" + esc + "</u>"
		}
		pBuf.WriteString(esc)
	}

	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "tbl":
				inTbl = true
				out.WriteString(`<table style="border-collapse:collapse;width:100%;margin:12px 0;">`)
			case "tr":
				if inTbl {
					out.WriteString("<tr>")
				}
			case "tc":
				if inTbl {
					inTc = true
					out.WriteString(`<td style="border:1px solid #cbd5e1;padding:6px 10px;">`)
				}
			case "p":
				inP = true
				pStyle = ""
				isList = false
				pBuf.Reset()
			case "pStyle":
				if inP {
					for _, a := range t.Attr {
						if a.Name.Local == "val" {
							pStyle = strings.ToLower(a.Value)
						}
					}
				}
			case "numPr":
				if inP {
					isList = true
				}
			case "r":
				if inP {
					inR = true
					runBold, runItalic, runUnderline = false, false, false
					rBuf.Reset()
				}
			case "b":
				if inR {
					runBold = true
				}
			case "i":
				if inR {
					runItalic = true
				}
			case "u":
				if inR {
					runUnderline = true
				}
			case "br":
				if inP {
					flushRun()
					pBuf.WriteString("<br/>")
				}
			case "t":
				if inR {
					inT = true
				}
			case "blip":
				for _, a := range t.Attr {
					if a.Name.Local == "embed" {
						if target, ok2 := rels[a.Value]; ok2 {
							mp := resolveRelTarget("word/document.xml", target)
							if imgBytes, ok3 := files[mp]; ok3 && len(imgBytes) <= 10*1024*1024 {
								mime := guessImageMime(mp)
								pBuf.WriteString(`<img src="data:` + mime + `;base64,` + base64.StdEncoding.EncodeToString(imgBytes) + `" style="max-width:100%;border-radius:6px;margin:8px 0;" />`)
							}
						}
					}
				}
			}
		case xml.CharData:
			if inT {
				rBuf.Write(t)
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "t":
				inT = false
			case "r":
				if inR {
					flushRun()
					inR = false
				}
			case "p":
				if inP {
					inP = false
					inner := pBuf.String()
					if inner == "" {
						if !inTc {
							out.WriteString("<p><br/></p>")
						}
					} else if strings.Contains(pStyle, "heading1") || pStyle == "1" || pStyle == "title" {
						out.WriteString("<h1>" + inner + "</h1>")
					} else if strings.Contains(pStyle, "heading2") || pStyle == "2" || pStyle == "subtitle" {
						out.WriteString("<h2>" + inner + "</h2>")
					} else if strings.Contains(pStyle, "heading3") || pStyle == "3" {
						out.WriteString("<h3>" + inner + "</h3>")
					} else if isList {
						out.WriteString("<p>• " + inner + "</p>")
					} else {
						out.WriteString("<p>" + inner + "</p>")
					}
				}
			case "tc":
				if inTc {
					inTc = false
					out.WriteString("</td>")
				}
			case "tr":
				if inTbl {
					out.WriteString("</tr>")
				}
			case "tbl":
				if inTbl {
					inTbl = false
					out.WriteString("</table>")
				}
			}
		}
	}
	res := out.String()
	if strings.TrimSpace(res) == "" {
		res = "<p></p>"
	}
	return res, nil, nil
}

func parseODTBytes(raw []byte) (string, error) {
	files, err := readZipFileMap(raw)
	if err != nil {
		return "", err
	}
	content, ok := files["content.xml"]
	if !ok {
		return "", errors.New("отсутствует content.xml в ODT")
	}
	dec := xml.NewDecoder(bytes.NewReader(content))
	var out strings.Builder
	var buf strings.Builder
	tag := ""
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if t.Name.Local == "p" || t.Name.Local == "h" {
				tag = t.Name.Local
				buf.Reset()
			}
		case xml.CharData:
			if tag != "" {
				buf.Write(t)
			}
		case xml.EndElement:
			if (t.Name.Local == "p" || t.Name.Local == "h") && tag == t.Name.Local {
				txt := strings.TrimSpace(buf.String())
				if txt != "" {
					if tag == "h" {
						out.WriteString("<h2>" + html.EscapeString(txt) + "</h2>")
					} else {
						out.WriteString("<p>" + html.EscapeString(txt) + "</p>")
					}
				}
				tag = ""
			}
		}
	}
	return out.String(), nil
}

// ==================== XLSX PARSER (MULTI-SHEET EXCEL WITH SHARED STRINGS & FORMULAS) ====================

func parseXLSXBytes(raw []byte) ([]OfficeSheet, []string, error) {
	files, err := readZipFileMap(raw)
	if err != nil {
		return nil, nil, err
	}

	// 1. Parse sharedStrings.xml
	var shared []string
	if ssData, ok := files["xl/sharedStrings.xml"]; ok {
		dec := xml.NewDecoder(bytes.NewReader(ssData))
		inSi := false
		inT := false
		var cur strings.Builder
		for {
			tok, err := dec.Token()
			if err != nil {
				break
			}
			switch t := tok.(type) {
			case xml.StartElement:
				if t.Name.Local == "si" {
					inSi = true
					cur.Reset()
				} else if inSi && t.Name.Local == "t" {
					inT = true
				}
			case xml.CharData:
				if inT {
					cur.Write(t)
				}
			case xml.EndElement:
				if t.Name.Local == "t" {
					inT = false
				} else if t.Name.Local == "si" && inSi {
					inSi = false
					shared = append(shared, cur.String())
				}
			}
		}
	}

	// 2. Discover sheets from workbook.xml
	type sheetRef struct {
		name string
		path string
	}
	var refs []sheetRef
	if wbData, ok := files["xl/workbook.xml"]; ok {
		wbRels := parseRelsXML(files["xl/_rels/workbook.xml.rels"])
		dec := xml.NewDecoder(bytes.NewReader(wbData))
		for {
			tok, err := dec.Token()
			if err != nil {
				break
			}
			if se, ok := tok.(xml.StartElement); ok && se.Name.Local == "sheet" {
				var name, rid string
				for _, a := range se.Attr {
					if a.Name.Local == "name" {
						name = a.Value
					}
					if a.Name.Local == "id" {
						rid = a.Value
					}
				}
				if target, ok2 := wbRels[rid]; ok2 {
					p := resolveRelTarget("xl/workbook.xml", target)
					if _, exists := files[p]; exists {
						refs = append(refs, sheetRef{name: nonEmpty(name, "Лист"), path: p})
					}
				}
			}
		}
	}
	if len(refs) == 0 {
		for k := range files {
			if strings.HasPrefix(k, "xl/worksheets/sheet") && strings.HasSuffix(k, ".xml") {
				refs = append(refs, sheetRef{name: strings.TrimSuffix(path.Base(k), ".xml"), path: k})
			}
		}
		sort.Slice(refs, func(i, j int) bool { return refs[i].path < refs[j].path })
	}
	if len(refs) == 0 {
		return nil, nil, errors.New("в книге Excel не найдены листы")
	}

	var sheets []OfficeSheet
	for _, ref := range refs {
		sdata := files[ref.path]
		cells := map[string]string{}
		maxRow := 24
		maxCol := 10
		dec := xml.NewDecoder(bytes.NewReader(sdata))

		curRef := ""
		curType := ""
		inV := false
		inF := false
		inInlineT := false
		var vBuf, fBuf, tBuf strings.Builder

		for {
			tok, err := dec.Token()
			if err != nil {
				break
			}
			switch t := tok.(type) {
			case xml.StartElement:
				switch t.Name.Local {
				case "c":
					curRef = ""
					curType = ""
					vBuf.Reset()
					fBuf.Reset()
					tBuf.Reset()
					for _, a := range t.Attr {
						if a.Name.Local == "r" {
							curRef = strings.ToUpper(a.Value)
						}
						if a.Name.Local == "t" {
							curType = a.Value
						}
					}
				case "v":
					inV = true
				case "f":
					inF = true
				case "t":
					inInlineT = true
				}
			case xml.CharData:
				if inV {
					vBuf.Write(t)
				} else if inF {
					fBuf.Write(t)
				} else if inInlineT {
					tBuf.Write(t)
				}
			case xml.EndElement:
				switch t.Name.Local {
				case "v":
					inV = false
				case "f":
					inF = false
				case "t":
					inInlineT = false
				case "c":
					if curRef != "" {
						val := ""
						if fStr := strings.TrimSpace(fBuf.String()); fStr != "" {
							val = "=" + strings.TrimPrefix(fStr, "=")
						} else if curType == "s" {
							if idx, err := strconv.Atoi(strings.TrimSpace(vBuf.String())); err == nil && idx >= 0 && idx < len(shared) {
								val = shared[idx]
							}
						} else if curType == "inlineStr" {
							val = tBuf.String()
						} else if curType == "b" {
							if strings.TrimSpace(vBuf.String()) == "1" {
								val = "TRUE"
							} else {
								val = "FALSE"
							}
						} else {
							val = strings.TrimSpace(vBuf.String())
						}
						if val != "" {
							cells[curRef] = val
							cIdx, rIdx := parseCellCoord(curRef)
							if rIdx+4 > maxRow {
								maxRow = minInt(rIdx+4, 200)
							}
							if cIdx+2 > maxCol {
								maxCol = minInt(cIdx+2, 26)
							}
						}
					}
				}
			}
		}
		sheets = append(sheets, OfficeSheet{
			Name:  ref.name,
			Cells: cells,
			Rows:  maxRow,
			Cols:  maxCol,
		})
	}
	return sheets, nil, nil
}

func parseODSBytes(raw []byte) ([]OfficeSheet, error) {
	files, err := readZipFileMap(raw)
	if err != nil {
		return nil, err
	}
	content, ok := files["content.xml"]
	if !ok {
		return nil, errors.New("отсутствует content.xml в ODS")
	}
	dec := xml.NewDecoder(bytes.NewReader(content))
	var sheets []OfficeSheet
	inTable := false
	sheetName := "Лист 1"
	cells := map[string]string{}
	rowIdx := 0
	colIdx := 0
	inP := false
	var pBuf strings.Builder
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "table":
				inTable = true
				cells = map[string]string{}
				rowIdx = 0
				sheetName = fmt.Sprintf("Лист %d", len(sheets)+1)
				for _, a := range t.Attr {
					if a.Name.Local == "name" && a.Value != "" {
						sheetName = a.Value
					}
				}
			case "table-row":
				if inTable {
					rowIdx++
					colIdx = 0
				}
			case "table-cell":
				if inTable {
					colIdx++
					pBuf.Reset()
				}
			case "p":
				if inTable {
					inP = true
				}
			}
		case xml.CharData:
			if inP {
				pBuf.Write(t)
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "p":
				inP = false
			case "table-cell":
				if inTable && colIdx <= 26 && rowIdx <= 200 {
					if s := strings.TrimSpace(pBuf.String()); s != "" {
						cells[fmt.Sprintf("%s%d", colIndexToLetters(colIdx-1), rowIdx)] = s
					}
				}
			case "table":
				if inTable {
					inTable = false
					sheets = append(sheets, OfficeSheet{
						Name: sheetName, Cells: cells, Rows: maxInt(24, rowIdx+4), Cols: 12,
					})
				}
			}
		}
	}
	if len(sheets) == 0 {
		sheets = append(sheets, OfficeSheet{Name: "Лист 1", Cells: map[string]string{}, Rows: 24, Cols: 10})
	}
	return sheets, nil
}

func parseDelimitedSheet(name string, raw []byte, delim rune) OfficeSheet {
	r := csv.NewReader(bytes.NewReader(bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF})))
	r.Comma = delim
	r.FieldsPerRecord = -1
	r.LazyQuotes = true
	records, _ := r.ReadAll()
	cells := map[string]string{}
	maxCols := 10
	for ri, row := range records {
		if ri >= 250 {
			break
		}
		if len(row) > maxCols {
			maxCols = minInt(len(row), 26)
		}
		for ci, val := range row {
			if ci >= 26 {
				break
			}
			v := strings.TrimSpace(val)
			if v != "" {
				cells[fmt.Sprintf("%s%d", colIndexToLetters(ci), ri+1)] = v
			}
		}
	}
	return OfficeSheet{
		Name:  nonEmpty(name, "Лист 1"),
		Cells: cells,
		Rows:  maxInt(24, minInt(len(records)+5, 250)),
		Cols:  maxCols,
	}
}

func jsonObjectsToSheet(name string, rows []map[string]interface{}) OfficeSheet {
	keySet := map[string]bool{}
	var keys []string
	for _, r := range rows {
		for k := range r {
			if !keySet[k] {
				keySet[k] = true
				keys = append(keys, k)
			}
		}
	}
	sort.Strings(keys)
	cells := map[string]string{}
	for ci, k := range keys {
		if ci >= 26 {
			break
		}
		cells[fmt.Sprintf("%s1", colIndexToLetters(ci))] = k
	}
	for ri, r := range rows {
		if ri >= 200 {
			break
		}
		for ci, k := range keys {
			if ci >= 26 {
				break
			}
			if v, ok := r[k]; ok && v != nil {
				cells[fmt.Sprintf("%s%d", colIndexToLetters(ci), ri+2)] = fmt.Sprintf("%v", v)
			}
		}
	}
	return OfficeSheet{Name: nonEmpty(name, "Данные"), Cells: cells, Rows: maxInt(24, len(rows)+5), Cols: maxInt(10, minInt(len(keys)+2, 26))}
}

// ==================== ENTRYPOINT: EXPORT TO ANY FORMAT (.pptx, .docx, .xlsx, .html, .md, .csv, .tsv, .rtf, .txt, .json) ====================

func ExportOfficeDocument(req OfficeExportRequest) OfficeExportResponse {
	fmtExt := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(req.Format), "."))
	if fmtExt == "" {
		switch req.Kind {
		case "slides":
			fmtExt = "pptx"
		case "sheets":
			fmtExt = "xlsx"
		default:
			fmtExt = "docx"
		}
	}
	stem := strings.TrimSpace(req.FileName)
	if stem == "" {
		stem = strings.TrimSpace(req.Title)
	}
	if stem == "" {
		stem = "Luma_Document"
	}
	stem = strings.TrimSuffix(stem, filepath.Ext(stem))
	outName := stem + "." + fmtExt

	var outBytes []byte
	var mime string
	var err error

	switch fmtExt {
	case "pptx":
		outBytes, err = buildPPTXBytes(nonEmpty(req.Title, stem), req.Slides)
		mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	case "docx":
		outBytes, err = buildDOCXBytes(nonEmpty(req.Title, stem), req.DocHTML, req.DocText)
		mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case "xlsx":
		outBytes, err = buildXLSXBytes(req.Sheets)
		mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case "csv", "tsv":
		delim := ','
		mime = "text/csv; charset=utf-8"
		if fmtExt == "tsv" {
			delim = '\t'
			mime = "text/tab-separated-values; charset=utf-8"
		}
		outBytes = buildDelimitedBytes(req.Sheets, delim)
	case "html", "htm":
		outBytes = buildStandaloneHTML(req)
		mime = "text/html; charset=utf-8"
	case "md":
		outBytes = buildMarkdownBytes(req)
		mime = "text/markdown; charset=utf-8"
	case "rtf":
		outBytes = buildRTFBytes(nonEmpty(req.Title, stem), req.DocHTML, req.DocText)
		mime = "application/rtf"
	case "txt":
		outBytes = buildPlainTextBytes(req)
		mime = "text/plain; charset=utf-8"
	case "json":
		outBytes, err = json.MarshalIndent(map[string]interface{}{
			"app":      "Luma Office Studio 1.5.1",
			"kind":     req.Kind,
			"title":    nonEmpty(req.Title, stem),
			"doc_html": req.DocHTML,
			"sheets":   req.Sheets,
			"slides":   req.Slides,
			"saved_at": time.Now().Format(time.RFC3339),
		}, "", "  ")
		mime = "application/json; charset=utf-8"
	default:
		return OfficeExportResponse{OK: false, Error: "Неподдерживаемый формат экспорта: " + fmtExt}
	}

	if err != nil {
		return OfficeExportResponse{OK: false, Error: "Ошибка экспорта: " + err.Error()}
	}

	return OfficeExportResponse{
		OK:         true,
		FileName:   outName,
		MimeType:   mime,
		Base64Data: base64.StdEncoding.EncodeToString(outBytes),
		SizeBytes:  len(outBytes),
	}
}

// ==================== BUILD REAL STANDARDS-COMPLIANT .PPTX ====================

func buildPPTXBytes(title string, slides []OfficeSlide) ([]byte, error) {
	if len(slides) == 0 {
		slides = []OfficeSlide{{
			ID: "sl_1", Title: title, Background: "#0f172a",
			Elements: []OfficeSlideElement{{
				ID: "el_1", Type: "text", X: 10, Y: 36, W: 80, H: 22,
				Text: title, FontSize: 40, Bold: true, Align: "center", Color: "#ffffff",
			}},
		}}
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	addFile := func(name string, data []byte) error {
		w, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = w.Write(data)
		return err
	}

	const slideW = 12192000 // 16:9 widescreen EMUs (13.333 in)
	const slideH = 6858000  // 7.5 in

	var ctOverrides strings.Builder
	var presSlideList strings.Builder
	var presRels strings.Builder
	mediaIdx := 0
	mediaExts := map[string]string{}

	for i, sl := range slides {
		sNum := i + 1
		ctOverrides.WriteString(fmt.Sprintf(`<Override PartName="/ppt/slides/slide%d.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`, sNum))
		presSlideList.WriteString(fmt.Sprintf(`<p:sldId id="%d" r:id="rId%d"/>`, 255+sNum, sNum+1))
		presRels.WriteString(fmt.Sprintf(`<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide%d.xml"/>`, sNum+1, sNum))

		var spTree strings.Builder
		var slRels strings.Builder
		slRels.WriteString(`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`)
		relSeq := 2
		shapeId := 2

		for _, el := range sl.Elements {
			xEmu := int64(el.X / 100.0 * slideW)
			yEmu := int64(el.Y / 100.0 * slideH)
			wEmu := int64(maxFloat(el.W, 8) / 100.0 * slideW)
			hEmu := int64(maxFloat(el.H, 6) / 100.0 * slideH)

			if el.Type == "image" && strings.HasPrefix(el.ImageSrc, "data:image/") {
				parts := strings.SplitN(el.ImageSrc, ",", 2)
				if len(parts) == 2 {
					rawImg, decErr := base64.StdEncoding.DecodeString(parts[1])
					if decErr == nil && len(rawImg) > 0 {
						imgExt := "png"
						imgMime := "image/png"
						if strings.Contains(parts[0], "jpeg") || strings.Contains(parts[0], "jpg") {
							imgExt = "jpg"
							imgMime = "image/jpeg"
						} else if strings.Contains(parts[0], "webp") {
							imgExt = "webp"
							imgMime = "image/webp"
						}
						mediaIdx++
						mediaName := fmt.Sprintf("image%d.%s", mediaIdx, imgExt)
						mediaExts[imgExt] = imgMime
						_ = addFile("ppt/media/"+mediaName, rawImg)
						rid := fmt.Sprintf("rId%d", relSeq)
						relSeq++
						slRels.WriteString(fmt.Sprintf(`<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/%s"/>`, rid, mediaName))
						shapeId++
						spTree.WriteString(fmt.Sprintf(
							`<p:pic><p:nvPicPr><p:cNvPr id="%d" name="Picture %d"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>`+
								`<p:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`+
								`<p:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`,
							shapeId, shapeId, rid, xEmu, yEmu, wEmu, hEmu,
						))
					}
				}
				continue
			}

			if el.Type == "table" && len(el.Rows) > 0 {
				shapeId++
				cols := len(el.Rows[0])
				if cols < 1 {
					cols = 1
				}
				colW := wEmu / int64(cols)
				rowH := hEmu / int64(len(el.Rows))
				var tbl strings.Builder
				tbl.WriteString(`<a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>`)
				for c := 0; c < cols; c++ {
					tbl.WriteString(fmt.Sprintf(`<a:gridCol w="%d"/>`, colW))
				}
				tbl.WriteString(`</a:tblGrid>`)
				for _, r := range el.Rows {
					tbl.WriteString(fmt.Sprintf(`<a:tr h="%d">`, rowH))
					for c := 0; c < cols; c++ {
						cellTxt := ""
						if c < len(r) {
							cellTxt = r[c]
						}
						tbl.WriteString(fmt.Sprintf(`<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="ru-RU" sz="1400"><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></a:rPr><a:t>%s</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`, xmlEsc(cellTxt)))
					}
					tbl.WriteString(`</a:tr>`)
				}
				tbl.WriteString(`</a:tbl>`)
				spTree.WriteString(fmt.Sprintf(
					`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="%d" name="Table %d"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>`+
						`<p:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></p:xfrm>`+
						`<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">%s</a:graphicData></a:graphic></p:graphicFrame>`,
					shapeId, shapeId, xEmu, yEmu, wEmu, hEmu, tbl.String(),
				))
				continue
			}

			// Text or Shape box
			shapeId++
			geom := "rect"
			if el.Shape == "rounded" {
				geom = "roundRect"
			} else if el.Shape == "circle" {
				geom = "ellipse"
			}
			fillXML := `<a:noFill/>`
			if hex6 := cleanHex6(el.BgColor); hex6 != "" {
				fillXML = fmt.Sprintf(`<a:solidFill><a:srgbClr val="%s"/></a:solidFill>`, hex6)
			}
			textHex := nonEmpty(cleanHex6(el.Color), "F8FAFC")
			fontSz := el.FontSize
			if fontSz < 10 {
				fontSz = 20
			}
			algn := "l"
			if el.Align == "center" {
				algn = "ctr"
			} else if el.Align == "right" {
				algn = "r"
			}
			bAttr := "0"
			if el.Bold {
				bAttr = "1"
			}
			iAttr := "0"
			if el.Italic {
				iAttr = "1"
			}
			var paras strings.Builder
			lines := strings.Split(el.Text, "\n")
			for _, ln := range lines {
				paras.WriteString(fmt.Sprintf(
					`<a:p><a:pPr algn="%s"/><a:r><a:rPr lang="ru-RU" sz="%d" b="%s" i="%s"><a:solidFill><a:srgbClr val="%s"/></a:solidFill></a:rPr><a:t>%s</a:t></a:r></a:p>`,
					algn, fontSz*100, bAttr, iAttr, textHex, xmlEsc(ln),
				))
			}
			spTree.WriteString(fmt.Sprintf(
				`<p:sp><p:nvSpPr><p:cNvPr id="%d" name="Box %d"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`+
					`<p:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm><a:prstGeom prst="%s"><a:avLst/></a:prstGeom>%s</p:spPr>`+
					`<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>%s</p:txBody></p:sp>`,
				shapeId, shapeId, xEmu, yEmu, wEmu, hEmu, geom, fillXML, paras.String(),
			))
		}

		bgHex := nonEmpty(cleanHex6(sl.Background), "0F172A")
		slideXML := fmt.Sprintf(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
				`<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">`+
				`<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="%s"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`+
				`<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>`+
				`<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`+
				`%s</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
			bgHex, spTree.String(),
		)
		if err := addFile(fmt.Sprintf("ppt/slides/slide%d.xml", sNum), []byte(slideXML)); err != nil {
			return nil, err
		}
		if err := addFile(fmt.Sprintf("ppt/slides/_rels/slide%d.xml.rels", sNum), []byte(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+slRels.String()+`</Relationships>`,
		)); err != nil {
			return nil, err
		}
	}

	var mediaDefaults strings.Builder
	for ext, m := range mediaExts {
		mediaDefaults.WriteString(fmt.Sprintf(`<Default Extension="%s" ContentType="%s"/>`, ext, m))
	}

	contentTypes := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
		`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
		`<Default Extension="xml" ContentType="application/xml"/>` +
		mediaDefaults.String() +
		`<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` +
		`<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>` +
		`<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>` +
		`<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
		ctOverrides.String() + `</Types>`

	rootRels := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`

	presXML := fmt.Sprintf(
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
			`<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">`+
			`<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>`+
			`<p:sldIdLst>%s</p:sldIdLst><p:sldSz cx="%d" cy="%d"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
		presSlideList.String(), slideW, slideH,
	)

	presRelsXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>` +
		presRels.String() + `</Relationships>`

	slideMasterXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
		`<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>` +
		`<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
		`<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`

	slideMasterRels := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>` +
		`<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`

	slideLayoutXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">` +
		`<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>`

	slideLayoutRels := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`

	themeXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Luma Carbon"><a:themeElements><a:clrScheme name="Carbon"><a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1E293B"/></a:dk2><a:lt2><a:srgbClr val="E2E8F0"/></a:lt2><a:accent1><a:srgbClr val="38BDF8"/></a:accent1><a:accent2><a:srgbClr val="818CF8"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="F59E0B"/></a:accent4><a:accent5><a:srgbClr val="F43F5E"/></a:accent5><a:accent6><a:srgbClr val="A855F7"/></a:accent6><a:hlink><a:srgbClr val="38BDF8"/></a:hlink><a:folHlink><a:srgbClr val="818CF8"/></a:folHlink></a:clrScheme><a:fontScheme name="Carbon"><a:majorFont><a:latin typeface="Segoe UI"/></a:majorFont><a:minorFont><a:latin typeface="Segoe UI"/></a:minorFont></a:fontScheme><a:fmtScheme name="Carbon"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`

	_ = addFile("[Content_Types].xml", []byte(contentTypes))
	_ = addFile("_rels/.rels", []byte(rootRels))
	_ = addFile("ppt/presentation.xml", []byte(presXML))
	_ = addFile("ppt/_rels/presentation.xml.rels", []byte(presRelsXML))
	_ = addFile("ppt/slideMasters/slideMaster1.xml", []byte(slideMasterXML))
	_ = addFile("ppt/slideMasters/_rels/slideMaster1.xml.rels", []byte(slideMasterRels))
	_ = addFile("ppt/slideLayouts/slideLayout1.xml", []byte(slideLayoutXML))
	_ = addFile("ppt/slideLayouts/_rels/slideLayout1.xml.rels", []byte(slideLayoutRels))
	_ = addFile("ppt/theme/theme1.xml", []byte(themeXML))

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ==================== BUILD REAL STANDARDS-COMPLIANT .DOCX ====================

var htmlBlockSplitRe = regexp.MustCompile(`(?is)<(h1|h2|h3|p|li|div|blockquote)[^>]*>(.*?)</(?:h1|h2|h3|p|li|div|blockquote)>`)
var htmlTagStripRe = regexp.MustCompile(`<[^>]+>`)

func buildDOCXBytes(title, docHTML, docText string) ([]byte, error) {
	var body strings.Builder
	matches := htmlBlockSplitRe.FindAllStringSubmatch(docHTML, -1)
	if len(matches) > 0 {
		for _, m := range matches {
			tag := strings.ToLower(m[1])
			rawInner := m[2]
			isBold := strings.Contains(strings.ToLower(rawInner), "<strong") || strings.Contains(strings.ToLower(rawInner), "<b")
			isItalic := strings.Contains(strings.ToLower(rawInner), "<em") || strings.Contains(strings.ToLower(rawInner), "<i")
			clean := html.UnescapeString(htmlTagStripRe.ReplaceAllString(strings.ReplaceAll(rawInner, "<br>", "\n"), ""))
			clean = strings.TrimSpace(clean)
			if clean == "" {
				continue
			}
			if tag == "li" {
				clean = "• " + clean
			}
			pPr := ""
			sz := "24"
			if tag == "h1" {
				pPr = `<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>`
				sz = "36"
				isBold = true
			} else if tag == "h2" {
				pPr = `<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>`
				sz = "30"
				isBold = true
			} else if tag == "h3" {
				pPr = `<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>`
				sz = "26"
				isBold = true
			}
			rPr := fmt.Sprintf(`<w:rPr><w:sz w:val="%s"/>`, sz)
			if isBold {
				rPr += `<w:b/>`
			}
			if isItalic {
				rPr += `<w:i/>`
			}
			rPr += `</w:rPr>`
			body.WriteString(fmt.Sprintf(`<w:p>%s<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p>`, pPr, rPr, xmlEsc(clean)))
		}
	} else {
		plain := strings.TrimSpace(docText)
		if plain == "" {
			plain = html.UnescapeString(htmlTagStripRe.ReplaceAllString(docHTML, "\n"))
		}
		for _, ln := range strings.Split(plain, "\n") {
			t := strings.TrimSpace(ln)
			if t == "" {
				continue
			}
			body.WriteString(fmt.Sprintf(`<w:p><w:r><w:t xml:space="preserve">%s</w:t></w:r></w:p>`, xmlEsc(t)))
		}
	}
	if body.Len() == 0 {
		body.WriteString(fmt.Sprintf(`<w:p><w:r><w:t>%s</w:t></w:r></w:p>`, xmlEsc(title)))
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	add := func(name, content string) error {
		w, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = w.Write([]byte(content))
		return err
	}

	_ = add("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
		`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`+
		`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`+
		`<Default Extension="xml" ContentType="application/xml"/>`+
		`<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`+
		`<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`)
	_ = add("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
	_ = add("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
	_ = add("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`+
		`<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>`+
		`<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>`+
		`<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`)
	_ = add("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`+body.String()+`<w:sectPr/></w:body></w:document>`)

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ==================== BUILD REAL STANDARDS-COMPLIANT MULTI-SHEET .XLSX ====================

func buildXLSXBytes(sheets []OfficeSheet) ([]byte, error) {
	if len(sheets) == 0 {
		sheets = []OfficeSheet{{Name: "Лист 1", Cells: map[string]string{"A1": "Luma Sheets 1.5.1"}, Rows: 20, Cols: 10}}
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	add := func(name, content string) error {
		w, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = w.Write([]byte(content))
		return err
	}

	var ctOverrides strings.Builder
	var wbSheets strings.Builder
	var wbRels strings.Builder

	for idx, sh := range sheets {
		sNum := idx + 1
		name := nonEmpty(sh.Name, fmt.Sprintf("Лист %d", sNum))
		ctOverrides.WriteString(fmt.Sprintf(`<Override PartName="/xl/worksheets/sheet%d.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`, sNum))
		wbSheets.WriteString(fmt.Sprintf(`<sheet name="%s" sheetId="%d" r:id="rId%d"/>`, xmlEsc(name), sNum, sNum))
		wbRels.WriteString(fmt.Sprintf(`<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>`, sNum, sNum))

		// Group cells by row number
		byRow := map[int][]struct {
			col int
			ref string
			val string
		}{}
		for ref, val := range sh.Cells {
			if strings.TrimSpace(val) == "" {
				continue
			}
			cIdx, rIdx := parseCellCoord(strings.ToUpper(ref))
			if rIdx < 1 || cIdx < 0 {
				continue
			}
			byRow[rIdx] = append(byRow[rIdx], struct {
				col int
				ref string
				val string
			}{col: cIdx, ref: strings.ToUpper(ref), val: val})
		}
		var rowNums []int
		for r := range byRow {
			rowNums = append(rowNums, r)
		}
		sort.Ints(rowNums)

		var sheetData strings.Builder
		for _, r := range rowNums {
			cells := byRow[r]
			sort.Slice(cells, func(i, j int) bool { return cells[i].col < cells[j].col })
			sheetData.WriteString(fmt.Sprintf(`<row r="%d">`, r))
			for _, c := range cells {
				if strings.HasPrefix(c.val, "=") {
					sheetData.WriteString(fmt.Sprintf(`<c r="%s"><f>%s</f></c>`, c.ref, xmlEsc(strings.TrimPrefix(c.val, "="))))
				} else if _, numErr := strconv.ParseFloat(strings.ReplaceAll(c.val, ",", "."), 64); numErr == nil && !strings.HasPrefix(c.val, "0") {
					sheetData.WriteString(fmt.Sprintf(`<c r="%s"><v>%s</v></c>`, c.ref, strings.ReplaceAll(c.val, ",", ".")))
				} else {
					sheetData.WriteString(fmt.Sprintf(`<c r="%s" t="inlineStr"><is><t>%s</t></is></c>`, c.ref, xmlEsc(c.val)))
				}
			}
			sheetData.WriteString(`</row>`)
		}
		sheetXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` + sheetData.String() + `</sheetData></worksheet>`
		_ = add(fmt.Sprintf("xl/worksheets/sheet%d.xml", sNum), sheetXML)
	}

	_ = add("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`+
		`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`+
		`<Default Extension="xml" ContentType="application/xml"/>`+
		`<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`+
		ctOverrides.String()+`</Types>`)
	_ = add("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
		`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
	_ = add("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+wbSheets.String()+`</sheets></workbook>`)
	_ = add("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+wbRels.String()+`</Relationships>`)

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ==================== SECONDARY EXPORTERS (CSV/TSV/HTML/MD/RTF/TXT) ====================

func buildDelimitedBytes(sheets []OfficeSheet, delim rune) []byte {
	var buf bytes.Buffer
	if delim == ',' {
		buf.Write([]byte{0xEF, 0xBB, 0xBF}) // UTF-8 BOM for clean Excel RU open
	}
	w := csv.NewWriter(&buf)
	w.Comma = delim
	if len(sheets) > 0 {
		sh := sheets[0]
		maxR, maxC := 0, 0
		for ref := range sh.Cells {
			c, r := parseCellCoord(strings.ToUpper(ref))
			if r > maxR {
				maxR = r
			}
			if c+1 > maxC {
				maxC = c + 1
			}
		}
		for r := 1; r <= maxR; r++ {
			row := make([]string, maxC)
			for c := 0; c < maxC; c++ {
				row[c] = sh.Cells[fmt.Sprintf("%s%d", colIndexToLetters(c), r)]
			}
			_ = w.Write(row)
		}
	}
	w.Flush()
	return buf.Bytes()
}

func buildStandaloneHTML(req OfficeExportRequest) []byte {
	title := html.EscapeString(nonEmpty(req.Title, "Luma Office Document"))
	var body strings.Builder
	switch req.Kind {
	case "slides":
		body.WriteString(`<style>body{margin:0;background:#09090b;color:#f8fafc;font-family:system-ui,sans-serif;padding:24px;display:flex;flex-direction:column;gap:24px;align-items:center}.slide{position:relative;width:960px;height:540px;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.6)}</style>`)
		for _, sl := range req.Slides {
			body.WriteString(fmt.Sprintf(`<section class="slide" style="background:%s">`, html.EscapeString(nonEmpty(sl.Background, "#0f172a"))))
			for _, el := range sl.Elements {
				if el.Type == "image" && el.ImageSrc != "" {
					body.WriteString(fmt.Sprintf(`<img src="%s" style="position:absolute;left:%.2f%%;top:%.2f%%;width:%.2f%%;height:%.2f%%;object-fit:contain"/>`, el.ImageSrc, el.X, el.Y, el.W, el.H))
				} else {
					body.WriteString(fmt.Sprintf(`<div style="position:absolute;left:%.2f%%;top:%.2f%%;width:%.2f%%;height:%.2f%%;color:%s;font-size:%dpx;font-weight:%s;text-align:%s;white-space:pre-wrap">%s</div>`,
						el.X, el.Y, el.W, el.H, nonEmpty(el.Color, "#fff"), maxInt(el.FontSize, 18), boolStr(el.Bold, "700", "400"), nonEmpty(el.Align, "left"), html.EscapeString(el.Text)))
				}
			}
			body.WriteString(`</section>`)
		}
	case "sheets":
		body.WriteString(`<style>body{font-family:system-ui,sans-serif;padding:24px;background:#fff;color:#0f172a}table{border-collapse:collapse;width:100%;margin-bottom:24px}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px}</style>`)
		for _, sh := range req.Sheets {
			body.WriteString("<h2>" + html.EscapeString(sh.Name) + "</h2><table>")
			maxR, maxC := 1, 1
			for ref := range sh.Cells {
				c, r := parseCellCoord(strings.ToUpper(ref))
				if r > maxR {
					maxR = r
				}
				if c+1 > maxC {
					maxC = c + 1
				}
			}
			for r := 1; r <= maxR; r++ {
				body.WriteString("<tr>")
				for c := 0; c < maxC; c++ {
					body.WriteString("<td>" + html.EscapeString(sh.Cells[fmt.Sprintf("%s%d", colIndexToLetters(c), r)]) + "</td>")
				}
				body.WriteString("</tr>")
			}
			body.WriteString("</table>")
		}
	default:
		body.WriteString(`<style>body{max-width:820px;margin:40px auto;padding:0 24px;font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a}</style>`)
		body.WriteString(req.DocHTML)
	}
	return []byte("<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><title>" + title + "</title></head><body>" + body.String() + "</body></html>")
}

func buildMarkdownBytes(req OfficeExportRequest) []byte {
	var out strings.Builder
	switch req.Kind {
	case "slides":
		for i, sl := range req.Slides {
			out.WriteString(fmt.Sprintf("## Слайд %d: %s\n\n", i+1, sl.Title))
			for _, el := range sl.Elements {
				if el.Text != "" {
					out.WriteString(el.Text + "\n\n")
				}
			}
			out.WriteString("---\n\n")
		}
	case "sheets":
		for _, sh := range req.Sheets {
			out.WriteString("### " + sh.Name + "\n\n")
			out.WriteString(string(buildDelimitedBytes([]OfficeSheet{sh}, ',')) + "\n")
		}
	default:
		s := req.DocHTML
		s = regexp.MustCompile(`(?is)<h1[^>]*>(.*?)</h1>`).ReplaceAllString(s, "# $1\n\n")
		s = regexp.MustCompile(`(?is)<h2[^>]*>(.*?)</h2>`).ReplaceAllString(s, "## $1\n\n")
		s = regexp.MustCompile(`(?is)<h3[^>]*>(.*?)</h3>`).ReplaceAllString(s, "### $1\n\n")
		s = regexp.MustCompile(`(?is)<(strong|b)[^>]*>(.*?)</(?:strong|b)>`).ReplaceAllString(s, "**$2**")
		s = regexp.MustCompile(`(?is)<(em|i)[^>]*>(.*?)</(?:em|i)>`).ReplaceAllString(s, "*$2*")
		s = regexp.MustCompile(`(?is)<li[^>]*>(.*?)</li>`).ReplaceAllString(s, "- $1\n")
		s = regexp.MustCompile(`(?is)</(p|div)>`).ReplaceAllString(s, "\n\n")
		s = html.UnescapeString(htmlTagStripRe.ReplaceAllString(s, ""))
		out.WriteString(strings.TrimSpace(s))
	}
	return []byte(out.String())
}

func buildRTFBytes(title, docHTML, docText string) []byte {
	plain := strings.TrimSpace(docText)
	if plain == "" {
		plain = html.UnescapeString(htmlTagStripRe.ReplaceAllString(strings.ReplaceAll(docHTML, "</p>", "\n"), ""))
	}
	var out strings.Builder
	out.WriteString(`{\rtf1\ansi\deff0{\fonttbl{\f0 Segoe UI;}}\fs24 `)
	for _, r := range plain {
		switch {
		case r == '\\' || r == '{' || r == '}':
			out.WriteString(`\` + string(r))
		case r == '\n':
			out.WriteString(`\par `)
		case r > 127:
			out.WriteString(fmt.Sprintf(`\u%d?`, r))
		default:
			out.WriteRune(r)
		}
	}
	out.WriteString("}")
	return []byte(out.String())
}

func buildPlainTextBytes(req OfficeExportRequest) []byte {
	if req.Kind == "slides" {
		return buildMarkdownBytes(req)
	}
	if req.Kind == "sheets" {
		return buildDelimitedBytes(req.Sheets, '\t')
	}
	if strings.TrimSpace(req.DocText) != "" {
		return []byte(req.DocText)
	}
	return []byte(strings.TrimSpace(html.UnescapeString(htmlTagStripRe.ReplaceAllString(strings.ReplaceAll(req.DocHTML, "</p>", "\n"), ""))))
}

// ==================== HELPERS ====================

func xmlEsc(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}

func colIndexToLetters(idx int) string {
	res := ""
	n := idx
	for {
		res = string(rune('A'+(n%26))) + res
		n = n/26 - 1
		if n < 0 {
			break
		}
	}
	return res
}

func parseCellCoord(ref string) (int, int) {
	col := 0
	row := 0
	i := 0
	for i < len(ref) && ref[i] >= 'A' && ref[i] <= 'Z' {
		col = col*26 + int(ref[i]-'A') + 1
		i++
	}
	if i < len(ref) {
		row, _ = strconv.Atoi(ref[i:])
	}
	return col - 1, row
}

func clampPct(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return float64(int(v*10)) / 10.0
}

func clampRange(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func nonEmpty(a, fallback string) string {
	if strings.TrimSpace(a) != "" {
		return a
	}
	return fallback
}

func boolStr(b bool, t, f string) string {
	if b {
		return t
	}
	return f
}

func cleanHex6(s string) string {
	c := strings.TrimPrefix(strings.TrimSpace(s), "#")
	if len(c) == 6 {
		for _, ch := range c {
			if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
				return ""
			}
		}
		return strings.ToUpper(c)
	}
	return ""
}

func isLightHex(s string) bool {
	h := cleanHex6(s)
	if h == "" {
		return false
	}
	r, _ := strconv.ParseInt(h[0:2], 16, 64)
	g, _ := strconv.ParseInt(h[2:4], 16, 64)
	b, _ := strconv.ParseInt(h[4:6], 16, 64)
	return (r*299+g*587+b*114)/1000 > 155
}

func truncateUTF8(s string, maxRunes int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= maxRunes {
		return string(r)
	}
	return string(r[:maxRunes]) + "…"
}

func plainTextToHTML(txt string) string {
	var out strings.Builder
	for _, ln := range strings.Split(strings.ReplaceAll(txt, "\r\n", "\n"), "\n") {
		if strings.TrimSpace(ln) == "" {
			out.WriteString("<p><br/></p>")
		} else {
			out.WriteString("<p>" + html.EscapeString(ln) + "</p>")
		}
	}
	return out.String()
}

func markdownToSimpleHTML(md string) string {
	var out strings.Builder
	for _, raw := range strings.Split(strings.ReplaceAll(md, "\r\n", "\n"), "\n") {
		ln := strings.TrimSpace(raw)
		switch {
		case strings.HasPrefix(ln, "### "):
			out.WriteString("<h3>" + html.EscapeString(ln[4:]) + "</h3>")
		case strings.HasPrefix(ln, "## "):
			out.WriteString("<h2>" + html.EscapeString(ln[3:]) + "</h2>")
		case strings.HasPrefix(ln, "# "):
			out.WriteString("<h1>" + html.EscapeString(ln[2:]) + "</h1>")
		case strings.HasPrefix(ln, "- ") || strings.HasPrefix(ln, "* "):
			out.WriteString("<p>• " + html.EscapeString(ln[2:]) + "</p>")
		case ln == "":
			out.WriteString("<p><br/></p>")
		default:
			out.WriteString("<p>" + html.EscapeString(ln) + "</p>")
		}
	}
	return out.String()
}

func extractHTMLBody(src string) string {
	re := regexp.MustCompile(`(?is)<body[^>]*>(.*?)</body>`)
	if m := re.FindStringSubmatch(src); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	return src
}

func stripRTFToText(src string) string {
	reGrp := regexp.MustCompile(`\{\\\*[^}]*\}`)
	s := reGrp.ReplaceAllString(src, "")
	s = strings.ReplaceAll(s, `\par`, "\n")
	reCtrl := regexp.MustCompile(`\\[a-zA-Z]+-?\d*\s?`)
	s = reCtrl.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "{", "")
	s = strings.ReplaceAll(s, "}", "")
	return strings.TrimSpace(s)
}

func extractReadableStrings(raw []byte) string {
	var out []string
	var cur strings.Builder
	for _, b := range raw {
		if b >= 32 && b < 127 {
			cur.WriteByte(b)
		} else {
			if cur.Len() >= 6 {
				out = append(out, cur.String())
			}
			cur.Reset()
		}
	}
	if len(out) > 120 {
		out = out[:120]
	}
	return strings.Join(out, "\n")
}

func textToFallbackSlides(title, txt string) []OfficeSlide {
	lines := strings.Split(txt, "\n")
	var slides []OfficeSlide
	for i := 0; i < len(lines) && len(slides) < 20; i += 8 {
		end := minInt(i+8, len(lines))
		chunk := strings.Join(lines[i:end], "\n")
		slides = append(slides, OfficeSlide{
			ID: fmt.Sprintf("ppt_%d", len(slides)+1), Title: fmt.Sprintf("%s · Слайд %d", title, len(slides)+1),
			Background: "#0f172a", Transition: "fade",
			Elements: []OfficeSlideElement{{
				ID: fmt.Sprintf("ppt_el_%d", len(slides)+1), Type: "text", X: 8, Y: 14, W: 84, H: 74,
				Text: chunk, FontSize: 18, Color: "#f8fafc",
			}},
		})
	}
	if len(slides) == 0 {
		slides = append(slides, OfficeSlide{ID: "ppt_1", Title: title, Background: "#0f172a", Transition: "fade"})
	}
	return slides
}
