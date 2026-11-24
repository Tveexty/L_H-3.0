package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ==================== LUMA OS 1.5.2 (CARBON) ZERO-FREEZE NATIVE BACKGROUND SCREEN RECORDER ====================
// Completely eliminates WebView2 getDisplayMedia / HWND_TOPMOST freeze bugs on Windows!
// Captures downscaled JPEG frames in a safe background goroutine and writes a standards-compliant
// playable RIFF AVI (MJPG) video file to ~/Videos/LumaRecordings/ with zero external dependencies.

type NativeScreenRecorder struct {
	mu          sync.Mutex
	probe       *platformProbe
	running     bool
	stopCh      chan struct{}
	doneCh      chan struct{}
	startedAt   time.Time
	fps         int
	quality     int
	maxWidth    int
	frameCount  int
	lastFile    *CaptureMediaFile
	lastError   string
}

func NewNativeScreenRecorder(probe *platformProbe) *NativeScreenRecorder {
	return &NativeScreenRecorder{
		probe:    probe,
		fps:      12,
		quality:  74,
		maxWidth: 1280,
	}
}

func (r *NativeScreenRecorder) Status() map[string]interface{} {
	r.mu.Lock()
	defer r.mu.Unlock()
	elapsed := 0
	if r.running {
		elapsed = int(time.Since(r.startedAt).Seconds())
	}
	return map[string]interface{}{
		"ok":          true,
		"running":     r.running,
		"recording":   r.running,
		"elapsed_sec": elapsed,
		"frames":      r.frameCount,
		"fps":         r.fps,
		"last_file":   r.lastFile,
		"last_error":  r.lastError,
		"native":      r.probe != nil && r.probe.SupportsNativeScreenFrame(),
	}
}

func (r *NativeScreenRecorder) Start(fps, quality, maxWidth int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.running {
		return nil
	}
	if r.probe == nil || !r.probe.SupportsNativeScreenFrame() {
		return errors.New("native_frame_capture_unavailable")
	}
	if fps < 5 || fps > 24 {
		fps = 12
	}
	if quality < 45 || quality > 92 {
		quality = 74
	}
	if maxWidth < 640 || maxWidth > 1920 {
		maxWidth = 1280
	}

	r.running = true
	r.fps = fps
	r.quality = quality
	r.maxWidth = maxWidth
	r.frameCount = 0
	r.lastError = ""
	r.startedAt = time.Now()
	r.stopCh = make(chan struct{})
	r.doneCh = make(chan struct{})

	go r.recordLoop(r.stopCh, r.doneCh, fps, quality, maxWidth)
	return nil
}

func (r *NativeScreenRecorder) Stop() (CaptureMediaFile, error) {
	r.mu.Lock()
	if !r.running {
		var f CaptureMediaFile
		if r.lastFile != nil {
			f = *r.lastFile
		}
		errStr := r.lastError
		r.mu.Unlock()
		if errStr != "" {
			return f, errors.New(errStr)
		}
		return f, nil
	}
	stopCh := r.stopCh
	doneCh := r.doneCh
	r.running = false
	close(stopCh)
	r.mu.Unlock()

	// Wait safely up to 6s for AVI flush (never hangs UI!)
	select {
	case <-doneCh:
	case <-time.After(6 * time.Second):
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.lastFile != nil {
		return *r.lastFile, nil
	}
	if r.lastError != "" {
		return CaptureMediaFile{}, errors.New(r.lastError)
	}
	return CaptureMediaFile{}, errors.New("не удалось записать ни одного кадра")
}

func (r *NativeScreenRecorder) recordLoop(stopCh <-chan struct{}, doneCh chan struct{}, fps, quality, maxWidth int) {
	defer close(doneCh)

	interval := time.Duration(1000/fps) * time.Millisecond
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Hard 10-minute safety cap so memory/disk can never run away
	maxFrames := fps * 60 * 10
	type frameBlob struct {
		jpeg []byte
	}
	frames := make([]frameBlob, 0, 128)
	vidW, vidH := 1280, 720
	consecutiveErr := 0

	captureOne := func() {
		jb, w, h, err := r.probe.CaptureScreenJPEGFrame(maxWidth, quality)
		if err != nil || len(jb) == 0 {
			consecutiveErr++
			return
		}
		consecutiveErr = 0
		if len(frames) == 0 {
			vidW, vidH = w, h
		}
		frames = append(frames, frameBlob{jpeg: jb})
		r.mu.Lock()
		r.frameCount = len(frames)
		r.mu.Unlock()
	}

	// Grab first frame immediately
	captureOne()

loop:
	for {
		select {
		case <-stopCh:
			break loop
		case <-ticker.C:
			if len(frames) >= maxFrames || consecutiveErr >= 15 {
				break loop
			}
			captureOne()
		}
	}

	if len(frames) == 0 {
		r.mu.Lock()
		r.running = false
		r.lastError = "не удалось захватить экран (0 кадров)"
		r.mu.Unlock()
		return
	}

	// Calculate real achieved FPS so playback speed matches real wall-clock duration 1:1
	elapsedSec := time.Since(r.startedAt).Seconds()
	actualFPS := fps
	if elapsedSec > 0.5 {
		calc := int(float64(len(frames))/elapsedSec + 0.5)
		if calc >= 2 && calc <= 30 {
			actualFPS = calc
		}
	}

	rawFrames := make([][]byte, len(frames))
	for i := range frames {
		rawFrames[i] = frames[i].jpeg
	}
	aviData := encodeMJPEGAVI(rawFrames, vidW, vidH, actualFPS)

	dir := getLumaCapturesDir("recording")
	name := fmt.Sprintf("luma_rec_%s.avi", time.Now().Format("20060102_150405"))
	full := filepath.Join(dir, name)
	if err := os.WriteFile(full, aviData, 0644); err != nil {
		r.mu.Lock()
		r.running = false
		r.lastError = err.Error()
		r.mu.Unlock()
		return
	}

	f := CaptureMediaFile{
		Name:      name,
		Path:      full,
		Kind:      "recording",
		SizeBytes: int64(len(aviData)),
		CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}
	r.mu.Lock()
	r.running = false
	r.lastFile = &f
	r.mu.Unlock()
}

// encodeMJPEGAVI writes a clean, standards-compliant RIFF AVI (MJPG) container readable by
// Windows Media Player, VLC, FFmpeg, and Luma Cut Studio.
func encodeMJPEGAVI(frames [][]byte, width, height, fps int) []byte {
	if fps <= 0 {
		fps = 12
	}
	numFrames := uint32(len(frames))
	usecPerFrame := uint32(1000000 / fps)

	var movi bytes.Buffer
	movi.WriteString("movi")

	type idxEntry struct {
		offset uint32
		size   uint32
	}
	index := make([]idxEntry, 0, len(frames))
	maxChunk := uint32(0)

	for _, fr := range frames {
		off := uint32(movi.Len())
		sz := uint32(len(fr))
		if sz > maxChunk {
			maxChunk = sz
		}
		movi.WriteString("00dc")
		_ = binary.Write(&movi, binary.LittleEndian, sz)
		movi.Write(fr)
		if sz%2 == 1 {
			movi.WriteByte(0)
		}
		index = append(index, idxEntry{offset: off - 4, size: sz})
	}

	// Build avih (56 bytes)
	var avih bytes.Buffer
	_ = binary.Write(&avih, binary.LittleEndian, usecPerFrame)
	_ = binary.Write(&avih, binary.LittleEndian, maxChunk*uint32(fps)) // maxBytesPerSec
	_ = binary.Write(&avih, binary.LittleEndian, uint32(0))            // paddingGranularity
	_ = binary.Write(&avih, binary.LittleEndian, uint32(0x10))         // AVIF_HASINDEX
	_ = binary.Write(&avih, binary.LittleEndian, numFrames)
	_ = binary.Write(&avih, binary.LittleEndian, uint32(0)) // initialFrames
	_ = binary.Write(&avih, binary.LittleEndian, uint32(1)) // streams
	_ = binary.Write(&avih, binary.LittleEndian, maxChunk)  // suggestedBufferSize
	_ = binary.Write(&avih, binary.LittleEndian, uint32(width))
	_ = binary.Write(&avih, binary.LittleEndian, uint32(height))
	_ = binary.Write(&avih, binary.LittleEndian, [4]uint32{})

	// Build strh (56 bytes)
	var strh bytes.Buffer
	strh.WriteString("vids")
	strh.WriteString("MJPG")
	_ = binary.Write(&strh, binary.LittleEndian, uint32(0)) // flags
	_ = binary.Write(&strh, binary.LittleEndian, uint16(0)) // priority
	_ = binary.Write(&strh, binary.LittleEndian, uint16(0)) // language
	_ = binary.Write(&strh, binary.LittleEndian, uint32(0)) // initialFrames
	_ = binary.Write(&strh, binary.LittleEndian, uint32(1)) // scale
	_ = binary.Write(&strh, binary.LittleEndian, uint32(fps))
	_ = binary.Write(&strh, binary.LittleEndian, uint32(0)) // start
	_ = binary.Write(&strh, binary.LittleEndian, numFrames)
	_ = binary.Write(&strh, binary.LittleEndian, maxChunk)
	_ = binary.Write(&strh, binary.LittleEndian, uint32(0xFFFFFFFF)) // quality default
	_ = binary.Write(&strh, binary.LittleEndian, uint32(0))          // sampleSize
	_ = binary.Write(&strh, binary.LittleEndian, [4]int16{0, 0, int16(width), int16(height)})

	// Build strf (BITMAPINFOHEADER, 40 bytes)
	var strf bytes.Buffer
	_ = binary.Write(&strf, binary.LittleEndian, uint32(40))
	_ = binary.Write(&strf, binary.LittleEndian, int32(width))
	_ = binary.Write(&strf, binary.LittleEndian, int32(height))
	_ = binary.Write(&strf, binary.LittleEndian, uint16(1))  // planes
	_ = binary.Write(&strf, binary.LittleEndian, uint16(24)) // bitCount
	strf.WriteString("MJPG")
	_ = binary.Write(&strf, binary.LittleEndian, uint32(width*height*3))
	_ = binary.Write(&strf, binary.LittleEndian, [4]uint32{})

	// LIST strl
	var strl bytes.Buffer
	strl.WriteString("strl")
	writeRIFFChunk(&strl, "strh", strh.Bytes())
	writeRIFFChunk(&strl, "strf", strf.Bytes())

	// LIST hdrl
	var hdrl bytes.Buffer
	hdrl.WriteString("hdrl")
	writeRIFFChunk(&hdrl, "avih", avih.Bytes())
	writeRIFFChunk(&hdrl, "LIST", strl.Bytes())

	// idx1
	var idx1 bytes.Buffer
	for _, e := range index {
		idx1.WriteString("00dc")
		_ = binary.Write(&idx1, binary.LittleEndian, uint32(0x10)) // AVIIF_KEYFRAME
		_ = binary.Write(&idx1, binary.LittleEndian, e.offset)
		_ = binary.Write(&idx1, binary.LittleEndian, e.size)
	}

	// Final RIFF AVI
	var body bytes.Buffer
	body.WriteString("AVI ")
	writeRIFFChunk(&body, "LIST", hdrl.Bytes())
	writeRIFFChunk(&body, "LIST", movi.Bytes())
	writeRIFFChunk(&body, "idx1", idx1.Bytes())

	var out bytes.Buffer
	out.WriteString("RIFF")
	_ = binary.Write(&out, binary.LittleEndian, uint32(body.Len()))
	out.Write(body.Bytes())
	return out.Bytes()
}

func writeRIFFChunk(dst *bytes.Buffer, fourCC string, payload []byte) {
	dst.WriteString(fourCC)
	_ = binary.Write(dst, binary.LittleEndian, uint32(len(payload)))
	dst.Write(payload)
	if len(payload)%2 == 1 {
		dst.WriteByte(0)
	}
}
