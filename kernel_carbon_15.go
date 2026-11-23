package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// ==================== 1. LUMA OS 1.5 CARBON: NATIVE SYSTEM TRASH (RECYCLE BIN) ====================

type TrashItemMeta struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	OriginalPath string `json:"original_path"`
	StoredName   string `json:"stored_name"`
	IsDir        bool   `json:"is_dir"`
	SizeBytes    int64  `json:"size_bytes"`
	DeletedAt    string `json:"deleted_at"`
	Source       string `json:"source"` // luma | os
}

type LumaTrashStore struct {
	mu            sync.Mutex
	baseDir       string
	filesDir      string
	metaPath      string
	cfgPath       string
	autoCleanDays int
	items         []TrashItemMeta
}

func newLumaTrashStore() *LumaTrashStore {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir, _ = os.UserHomeDir()
	}
	base := filepath.Join(cfgDir, "LumaOS", "trash")
	filesDir := filepath.Join(base, "files")
	_ = os.MkdirAll(filesDir, 0755)
	st := &LumaTrashStore{
		baseDir:  base,
		filesDir: filesDir,
		metaPath: filepath.Join(base, "index.json"),
		cfgPath:  filepath.Join(base, "config.json"),
		items:    []TrashItemMeta{},
	}
	st.loadConfigLocked()
	st.loadLocked()
	return st
}

func (t *LumaTrashStore) loadConfigLocked() {
	raw, err := os.ReadFile(t.cfgPath)
	if err != nil {
		return
	}
	var cfg struct {
		AutoCleanDays int `json:"auto_clean_days"`
	}
	if json.Unmarshal(raw, &cfg) == nil {
		t.autoCleanDays = cfg.AutoCleanDays
	}
}

func (t *LumaTrashStore) saveConfigLocked() {
	raw, err := json.MarshalIndent(map[string]int{"auto_clean_days": t.autoCleanDays}, "", "  ")
	if err == nil {
		_ = os.WriteFile(t.cfgPath, raw, 0644)
	}
}

func (t *LumaTrashStore) loadLocked() {
	raw, err := os.ReadFile(t.metaPath)
	if err != nil {
		return
	}
	var list []TrashItemMeta
	if json.Unmarshal(raw, &list) == nil {
		// Filter out items whose backing file no longer exists
		kept := make([]TrashItemMeta, 0, len(list))
		for _, it := range list {
			if _, err := os.Stat(filepath.Join(t.filesDir, it.StoredName)); err == nil {
				kept = append(kept, it)
			}
		}
		t.items = kept
	}
}

func (t *LumaTrashStore) saveLocked() {
	raw, err := json.MarshalIndent(t.items, "", "  ")
	if err == nil {
		_ = os.WriteFile(t.metaPath, raw, 0644)
	}
}

func expandUserPath(raw string) string {
	p := strings.TrimSpace(raw)
	if p == "" {
		return ""
	}
	if p == "~" || strings.HasPrefix(p, "~/") || strings.HasPrefix(p, "~\\") {
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			if p == "~" {
				return home
			}
			return filepath.Join(home, p[2:])
		}
	}
	return filepath.Clean(p)
}

func calcDirOrFileSize(p string) int64 {
	st, err := os.Stat(p)
	if err != nil {
		return 0
	}
	if !st.IsDir() {
		return st.Size()
	}
	var total int64
	_ = filepath.Walk(p, func(_ string, info os.FileInfo, err error) error {
		if err == nil && info != nil && !info.IsDir() {
			total += info.Size()
		}
		return nil
	})
	return total
}

func copyFileOrDir(src, dst string) error {
	st, err := os.Stat(src)
	if err != nil {
		return err
	}
	if !st.IsDir() {
		if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
			return err
		}
		in, err := os.Open(src)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create(dst)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	}
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		return copyFileOrDir(path, target)
	})
}

func movePathSafe(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	if err := os.Rename(src, dst); err == nil {
		return nil
	}
	if err := copyFileOrDir(src, dst); err != nil {
		return err
	}
	return os.RemoveAll(src)
}

func (t *LumaTrashStore) List() ([]TrashItemMeta, int64) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked()
	out := make([]TrashItemMeta, len(t.items))
	copy(out, t.items)
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].DeletedAt > out[j].DeletedAt
	})
	var total int64
	for _, it := range out {
		total += it.SizeBytes
	}
	return out, total
}

func (t *LumaTrashStore) MoveToTrash(rawPath string) (TrashItemMeta, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	p := expandUserPath(strings.TrimSpace(rawPath))
	if p == "" {
		return TrashItemMeta{}, errors.New("не указан путь к файлу")
	}
	st, err := os.Stat(p)
	if err != nil {
		return TrashItemMeta{}, fmt.Errorf("объект не найден: %w", err)
	}
	id := fmt.Sprintf("tr_%d", time.Now().UnixNano())
	baseName := filepath.Base(p)
	storedName := id + "_" + baseName
	dst := filepath.Join(t.filesDir, storedName)
	sz := calcDirOrFileSize(p)
	if err := movePathSafe(p, dst); err != nil {
		return TrashItemMeta{}, fmt.Errorf("не удалось переместить в корзину: %w", err)
	}
	item := TrashItemMeta{
		ID:           id,
		Name:         baseName,
		OriginalPath: p,
		StoredName:   storedName,
		IsDir:        st.IsDir(),
		SizeBytes:    sz,
		DeletedAt:    time.Now().Format("2006-01-02 15:04:05"),
		Source:       "luma",
	}
	t.items = append([]TrashItemMeta{item}, t.items...)
	t.saveLocked()
	return item, nil
}

func (t *LumaTrashStore) CreateDemoItem(name, content string) (TrashItemMeta, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if strings.TrimSpace(name) == "" {
		name = "note_deleted.txt"
	}
	home, _ := os.UserHomeDir()
	id := fmt.Sprintf("tr_%d", time.Now().UnixNano())
	storedName := id + "_" + filepath.Base(name)
	dst := filepath.Join(t.filesDir, storedName)
	data := []byte(content)
	if err := os.WriteFile(dst, data, 0644); err != nil {
		return TrashItemMeta{}, err
	}
	item := TrashItemMeta{
		ID:           id,
		Name:         filepath.Base(name),
		OriginalPath: filepath.Join(home, "Desktop", filepath.Base(name)),
		StoredName:   storedName,
		IsDir:        false,
		SizeBytes:    int64(len(data)),
		DeletedAt:    time.Now().Format("2006-01-02 15:04:05"),
		Source:       "luma",
	}
	t.items = append([]TrashItemMeta{item}, t.items...)
	t.saveLocked()
	return item, nil
}

func (t *LumaTrashStore) Restore(id string) (string, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	idx := -1
	for i, it := range t.items {
		if it.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return "", errors.New("объект не найден в корзине")
	}
	it := t.items[idx]
	src := filepath.Join(t.filesDir, it.StoredName)
	target := it.OriginalPath
	if target == "" {
		home, _ := os.UserHomeDir()
		target = filepath.Join(home, "Desktop", it.Name)
	}
	// Avoid overwriting existing file on restore
	if _, err := os.Stat(target); err == nil {
		ext := filepath.Ext(target)
		stem := strings.TrimSuffix(target, ext)
		target = fmt.Sprintf("%s_restored_%d%s", stem, time.Now().Unix()%10000, ext)
	}
	if err := movePathSafe(src, target); err != nil {
		return "", fmt.Errorf("ошибка восстановления: %w", err)
	}
	t.items = append(t.items[:idx], t.items[idx+1:]...)
	t.saveLocked()
	return target, nil
}

func (t *LumaTrashStore) DeletePermanent(id string) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	idx := -1
	for i, it := range t.items {
		if it.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return errors.New("объект не найден")
	}
	_ = os.RemoveAll(filepath.Join(t.filesDir, t.items[idx].StoredName))
	t.items = append(t.items[:idx], t.items[idx+1:]...)
	t.saveLocked()
	return nil
}

func (t *LumaTrashStore) Empty() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	n := len(t.items)
	for _, it := range t.items {
		_ = os.RemoveAll(filepath.Join(t.filesDir, it.StoredName))
	}
	t.items = []TrashItemMeta{}
	t.saveLocked()
	return n
}

func (t *LumaTrashStore) GetAutoCleanDays() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.autoCleanDays
}

func (t *LumaTrashStore) SetAutoCleanDays(days int) int {
	t.mu.Lock()
	defer t.mu.Unlock()
	if days < 0 {
		days = 0
	}
	if days > 365 {
		days = 365
	}
	t.autoCleanDays = days
	t.saveConfigLocked()
	if days > 0 {
		cutoff := time.Now().AddDate(0, 0, -days)
		kept := make([]TrashItemMeta, 0, len(t.items))
		for _, it := range t.items {
			if ts, err := time.ParseInLocation("2006-01-02 15:04:05", it.DeletedAt, time.Local); err == nil && ts.Before(cutoff) {
				_ = os.RemoveAll(filepath.Join(t.filesDir, it.StoredName))
				continue
			}
			kept = append(kept, it)
		}
		t.items = kept
		t.saveLocked()
	}
	return t.autoCleanDays
}

func (t *LumaTrashStore) PreviewItem(id string) (map[string]interface{}, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, it := range t.items {
		if it.ID == id {
			p := filepath.Join(t.filesDir, it.StoredName)
			if it.IsDir {
				entries, _ := os.ReadDir(p)
				names := make([]string, 0, len(entries))
				for i, e := range entries {
					if i >= 40 {
						break
					}
					names = append(names, e.Name())
				}
				return map[string]interface{}{
					"ok":      true,
					"item":    it,
					"is_dir":  true,
					"entries": names,
					"preview": fmt.Sprintf("Папка (%d объектов):\n%s", len(entries), strings.Join(names, "\n")),
				}, nil
			}
			f, err := os.Open(p)
			if err != nil {
				return nil, err
			}
			defer f.Close()
			buf := make([]byte, 16*1024)
			n, _ := f.Read(buf)
			chunk := buf[:n]
			ext := strings.ToLower(filepath.Ext(it.Name))
			if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".webp" || ext == ".gif" {
				if it.SizeBytes <= 4*1024*1024 {
					if all, err2 := os.ReadFile(p); err2 == nil {
						return map[string]interface{}{
							"ok":        true,
							"item":      it,
							"is_image":  true,
							"image_src": "data:" + guessImageMime(it.Name) + ";base64," + base64.StdEncoding.EncodeToString(all),
						}, nil
					}
				}
			}
			// Check binary null bytes
			isBinary := false
			for _, b := range chunk {
				if b == 0 {
					isBinary = true
					break
				}
			}
			if isBinary {
				return map[string]interface{}{
					"ok":        true,
					"item":      it,
					"is_binary": true,
					"preview":   fmt.Sprintf("Бинарный файл (%s · %d байт). Можно безопасно восстановить в %s.", strings.ToUpper(strings.TrimPrefix(ext, ".")), it.SizeBytes, it.OriginalPath),
				}, nil
			}
			return map[string]interface{}{
				"ok":        true,
				"item":      it,
				"truncated": int64(n) < it.SizeBytes,
				"preview":   string(chunk),
			}, nil
		}
	}
	return nil, errors.New("объект не найден в корзине")
}

func (t *LumaTrashStore) BulkRestore(ids []string) (int, []string) {
	restored := 0
	var paths []string
	for _, id := range ids {
		if p, err := t.Restore(id); err == nil {
			restored++
			paths = append(paths, p)
		}
	}
	return restored, paths
}

func (t *LumaTrashStore) BulkDelete(ids []string) int {
	deleted := 0
	for _, id := range ids {
		if err := t.DeletePermanent(id); err == nil {
			deleted++
		}
	}
	return deleted
}

func (t *LumaTrashStore) UploadToTrash(name, base64Data string) (TrashItemMeta, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if idx := strings.Index(base64Data, ","); idx > 0 {
		base64Data = base64Data[idx+1:]
	}
	raw, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return TrashItemMeta{}, errors.New("некорректные данные файла")
	}
	baseName := filepath.Base(strings.TrimSpace(name))
	if baseName == "" || baseName == "." {
		baseName = "dropped_file.bin"
	}
	home, _ := os.UserHomeDir()
	id := fmt.Sprintf("tr_%d", time.Now().UnixNano())
	storedName := id + "_" + baseName
	dst := filepath.Join(t.filesDir, storedName)
	if err := os.WriteFile(dst, raw, 0644); err != nil {
		return TrashItemMeta{}, err
	}
	item := TrashItemMeta{
		ID:           id,
		Name:         baseName,
		OriginalPath: filepath.Join(home, "Desktop", baseName),
		StoredName:   storedName,
		IsDir:        false,
		SizeBytes:    int64(len(raw)),
		DeletedAt:    time.Now().Format("2006-01-02 15:04:05"),
		Source:       "luma",
	}
	t.items = append([]TrashItemMeta{item}, t.items...)
	t.saveLocked()
	return item, nil
}

// ==================== 2. LUMA OS 1.5 CARBON: SUPER-CONFIDENTIALITY AES-256-GCM PRIVATE VAULT ====================

type VaultItem struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"` // file | note | app | link
	Name      string `json:"name"`
	Target    string `json:"target,omitempty"`
	MimeType  string `json:"mime_type,omitempty"`
	SizeBytes int64  `json:"size_bytes"`
	CreatedAt string `json:"created_at"`
	BlobFile  string `json:"blob_file,omitempty"` // Encrypted *.lumavault file on disk (unreadable externally!)
}

type VaultConfigDisk struct {
	Configured      bool        `json:"configured"`
	RequirePassword bool        `json:"require_password"`
	SaltHex         string      `json:"salt_hex"`
	PassHashHex     string      `json:"pass_hash_hex"`
	AutoLockMinutes int         `json:"auto_lock_minutes"`
	Items           []VaultItem `json:"items"`
}

type LumaPrivateVault struct {
	mu       sync.Mutex
	baseDir  string
	blobsDir string
	cfgPath  string
	cfg      VaultConfigDisk
	unlocked bool
	key      []byte
}

func deriveVaultKey(secret, saltHex string) []byte {
	salt, _ := hex.DecodeString(saltHex)
	h := sha256.Sum256(append([]byte("LUMA_CARBON_VAULT_V1:"+secret), salt...))
	// 12000 rounds of key stretching (fast ~3ms, strong offline resistance)
	buf := h[:]
	for i := 0; i < 12000; i++ {
		next := sha256.Sum256(append(buf, salt...))
		buf = next[:]
	}
	out := make([]byte, 32)
	copy(out, buf)
	return out
}

func newLumaPrivateVault() *LumaPrivateVault {
	cfgDir, err := os.UserConfigDir()
	if err != nil || cfgDir == "" {
		cfgDir, _ = os.UserHomeDir()
	}
	base := filepath.Join(cfgDir, "LumaOS", "private_vault")
	blobs := filepath.Join(base, "encrypted_blobs")
	_ = os.MkdirAll(blobs, 0700)

	v := &LumaPrivateVault{
		baseDir:  base,
		blobsDir: blobs,
		cfgPath:  filepath.Join(base, "vault.meta.json"),
		cfg: VaultConfigDisk{
			Configured:      false,
			RequirePassword: false,
			AutoLockMinutes: 10,
			Items:           []VaultItem{},
		},
	}
	v.loadLocked()
	if v.cfg.SaltHex == "" {
		salt := make([]byte, 16)
		_, _ = rand.Read(salt)
		v.cfg.SaltHex = hex.EncodeToString(salt)
		v.saveLocked()
	}
	return v
}

func (v *LumaPrivateVault) loadLocked() {
	raw, err := os.ReadFile(v.cfgPath)
	if err == nil {
		_ = json.Unmarshal(raw, &v.cfg)
	}
	if v.cfg.Items == nil {
		v.cfg.Items = []VaultItem{}
	}
}

func (v *LumaPrivateVault) saveLocked() {
	raw, err := json.MarshalIndent(v.cfg, "", "  ")
	if err == nil {
		_ = os.WriteFile(v.cfgPath, raw, 0600)
	}
}

func (v *LumaPrivateVault) encryptBytes(plain []byte) ([]byte, error) {
	if len(v.key) != 32 {
		return nil, errors.New("сейф заблокирован")
	}
	block, err := aes.NewCipher(v.key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return append([]byte("LUMAV1"), gcm.Seal(nonce, nonce, plain, nil)...), nil
}

func (v *LumaPrivateVault) decryptBytes(ciphertext []byte) ([]byte, error) {
	if len(v.key) != 32 {
		return nil, errors.New("сейф заблокирован")
	}
	if len(ciphertext) < 6 || string(ciphertext[:6]) != "LUMAV1" {
		return nil, errors.New("повреждённый зашифрованный контейнер")
	}
	payload := ciphertext[6:]
	block, err := aes.NewCipher(v.key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(payload) < gcm.NonceSize() {
		return nil, errors.New("неверный размер блока")
	}
	nonce := payload[:gcm.NonceSize()]
	enc := payload[gcm.NonceSize():]
	return gcm.Open(nil, nonce, enc, nil)
}

func (v *LumaPrivateVault) Status() map[string]interface{} {
	v.mu.Lock()
	defer v.mu.Unlock()
	res := map[string]interface{}{
		"ok":               true,
		"configured":       v.cfg.Configured,
		"require_password": v.cfg.RequirePassword,
		"unlocked":         v.unlocked,
		"item_count":       len(v.cfg.Items),
		"auto_lock_min":    v.cfg.AutoLockMinutes,
		"vault_dir":        v.baseDir,
		"encryption":       "AES-256-GCM (External-Access Blocked)",
	}
	if v.unlocked {
		res["items"] = v.cfg.Items
	} else {
		res["items"] = []VaultItem{}
	}
	return res
}

func (v *LumaPrivateVault) Configure(requirePassword bool, password string, autoLockMin int) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if requirePassword && len(strings.TrimSpace(password)) < 3 {
		return errors.New("пароль должен содержать минимум 3 символа")
	}
	if autoLockMin < 1 || autoLockMin > 120 {
		autoLockMin = 10
	}
	newKey := deriveVaultKey(password, v.cfg.SaltHex)
	if !requirePassword {
		newKey = deriveVaultKey("__LUMA_STEALTH_NO_PASS__", v.cfg.SaltHex)
	}
	// If already unlocked and re-keying existing encrypted blobs, re-encrypt them seamlessly
	if v.unlocked && len(v.key) == 32 && len(v.cfg.Items) > 0 {
		oldKey := v.key
		for _, it := range v.cfg.Items {
			if it.BlobFile == "" {
				continue
			}
			bp := filepath.Join(v.blobsDir, it.BlobFile)
			raw, err := os.ReadFile(bp)
			if err != nil {
				continue
			}
			v.key = oldKey
			plain, err := v.decryptBytes(raw)
			if err != nil {
				continue
			}
			v.key = newKey
			reEnc, err := v.encryptBytes(plain)
			if err == nil {
				_ = os.WriteFile(bp, reEnc, 0600)
			}
		}
	}
	v.cfg.Configured = true
	v.cfg.RequirePassword = requirePassword
	v.cfg.AutoLockMinutes = autoLockMin
	if requirePassword {
		hash := sha256.Sum256(newKey)
		v.cfg.PassHashHex = hex.EncodeToString(hash[:])
	} else {
		v.cfg.PassHashHex = ""
	}
	v.key = newKey
	v.unlocked = true
	v.saveLocked()
	return nil
}

func (v *LumaPrivateVault) Unlock(password string) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if !v.cfg.Configured {
		v.cfg.Configured = true
		v.cfg.RequirePassword = false
		v.key = deriveVaultKey("__LUMA_STEALTH_NO_PASS__", v.cfg.SaltHex)
		v.unlocked = true
		v.saveLocked()
		return nil
	}
	if !v.cfg.RequirePassword {
		v.key = deriveVaultKey("__LUMA_STEALTH_NO_PASS__", v.cfg.SaltHex)
		v.unlocked = true
		return nil
	}
	cand := deriveVaultKey(password, v.cfg.SaltHex)
	hash := sha256.Sum256(cand)
	if hex.EncodeToString(hash[:]) != v.cfg.PassHashHex {
		return errors.New("неверный пароль Суперконфиденциальности")
	}
	v.key = cand
	v.unlocked = true
	return nil
}

func (v *LumaPrivateVault) Lock() {
	v.mu.Lock()
	defer v.mu.Unlock()
	for i := range v.key {
		v.key[i] = 0
	}
	v.key = nil
	v.unlocked = false
}

func (v *LumaPrivateVault) AddItem(kind, name, target, content, base64Data, diskPath string, removeOriginal bool) (VaultItem, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if !v.unlocked || len(v.key) != 32 {
		return VaultItem{}, errors.New("разблокируйте Суперконфиденциальность для добавления")
	}
	id := fmt.Sprintf("pv_%d", time.Now().UnixNano())
	var plain []byte
	var err error
	if strings.TrimSpace(diskPath) != "" {
		realPath := expandUserPath(diskPath)
		plain, err = os.ReadFile(realPath)
		if err != nil {
			return VaultItem{}, fmt.Errorf("не удалось прочитать файл: %w", err)
		}
		if strings.TrimSpace(name) == "" {
			name = filepath.Base(realPath)
		}
		kind = "file"
		if removeOriginal {
			_ = os.Remove(realPath)
		}
	} else if base64Data != "" {
		// Strip optional data URL prefix
		if idx := strings.Index(base64Data, ","); idx > 0 {
			base64Data = base64Data[idx+1:]
		}
		plain, err = base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			return VaultItem{}, errors.New("некорректные данные файла")
		}
	} else if content != "" {
		plain = []byte(content)
	}

	blobName := ""
	if len(plain) > 0 || kind == "note" {
		enc, err := v.encryptBytes(plain)
		if err != nil {
			return VaultItem{}, err
		}
		blobName = id + ".lumavault"
		if err := os.WriteFile(filepath.Join(v.blobsDir, blobName), enc, 0600); err != nil {
			return VaultItem{}, err
		}
	}
	if strings.TrimSpace(name) == "" {
		name = "Секретный элемент"
	}
	if kind == "" {
		kind = "note"
	}
	it := VaultItem{
		ID:        id,
		Kind:      kind,
		Name:      strings.TrimSpace(name),
		Target:    strings.TrimSpace(target),
		SizeBytes: int64(len(plain)),
		CreatedAt: time.Now().Format("2006-01-02 15:04"),
		BlobFile:  blobName,
	}
	v.cfg.Items = append([]VaultItem{it}, v.cfg.Items...)
	v.saveLocked()
	return it, nil
}

func (v *LumaPrivateVault) ReadItem(id string) (VaultItem, []byte, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if !v.unlocked || len(v.key) != 32 {
		return VaultItem{}, nil, errors.New("доступ запрещён: сейф заблокирован")
	}
	for _, it := range v.cfg.Items {
		if it.ID == id {
			if it.BlobFile == "" {
				return it, nil, nil
			}
			raw, err := os.ReadFile(filepath.Join(v.blobsDir, it.BlobFile))
			if err != nil {
				return it, nil, err
			}
			plain, err := v.decryptBytes(raw)
			return it, plain, err
		}
	}
	return VaultItem{}, nil, errors.New("элемент не найден")
}

func (v *LumaPrivateVault) DeleteItem(id string) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if !v.unlocked {
		return errors.New("сейф заблокирован")
	}
	for i, it := range v.cfg.Items {
		if it.ID == id {
			if it.BlobFile != "" {
				// Overwrite with zeros before unlink for clean secure wipe
				bp := filepath.Join(v.blobsDir, it.BlobFile)
				if st, err := os.Stat(bp); err == nil && st.Size() > 0 && st.Size() < 64*1024*1024 {
					_ = os.WriteFile(bp, make([]byte, st.Size()), 0600)
				}
				_ = os.Remove(bp)
			}
			v.cfg.Items = append(v.cfg.Items[:i], v.cfg.Items[i+1:]...)
			v.saveLocked()
			return nil
		}
	}
	return errors.New("элемент не найден")
}

// ==================== 3. LUMA OS 1.5 CARBON: COMPACT SCREENSHOT & SCREEN RECORDING STORAGE ====================

type CaptureMediaFile struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	Kind      string `json:"kind"` // screenshot | recording
	SizeBytes int64  `json:"size_bytes"`
	CreatedAt string `json:"created_at"`
}

func getLumaCapturesDir(kind string) string {
	home, _ := os.UserHomeDir()
	if kind == "recording" {
		dir := filepath.Join(home, "Videos", "LumaRecordings")
		_ = os.MkdirAll(dir, 0755)
		return dir
	}
	dir := filepath.Join(home, "Pictures", "LumaCaptures")
	_ = os.MkdirAll(dir, 0755)
	return dir
}

func saveBase64Capture(kind, ext, b64 string) (CaptureMediaFile, error) {
	if idx := strings.Index(b64, ","); idx > 0 {
		b64 = b64[idx+1:]
	}
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return CaptureMediaFile{}, errors.New("некорректные бинарные данные захвата")
	}
	if ext == "" {
		if kind == "recording" {
			ext = "webm"
		} else {
			ext = "jpg"
		}
	}
	dir := getLumaCapturesDir(kind)
	prefix := "luma_shot_"
	if kind == "recording" {
		prefix = "luma_rec_"
	}
	name := fmt.Sprintf("%s%s.%s", prefix, time.Now().Format("20060102_150405"), strings.TrimPrefix(ext, "."))
	full := filepath.Join(dir, name)
	if err := os.WriteFile(full, raw, 0644); err != nil {
		return CaptureMediaFile{}, err
	}
	return CaptureMediaFile{
		Name:      name,
		Path:      full,
		Kind:      kind,
		SizeBytes: int64(len(raw)),
		CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

func listLumaCaptures() []CaptureMediaFile {
	out := make([]CaptureMediaFile, 0, 24)
	for _, kind := range []string{"screenshot", "recording"} {
		dir := getLumaCapturesDir(kind)
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			info, err := e.Info()
			if err != nil {
				continue
			}
			out = append(out, CaptureMediaFile{
				Name:      e.Name(),
				Path:      filepath.Join(dir, e.Name()),
				Kind:      kind,
				SizeBytes: info.Size(),
				CreatedAt: info.ModTime().Format("2006-01-02 15:04:05"),
			})
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].CreatedAt > out[j].CreatedAt
	})
	if len(out) > 30 {
		out = out[:30]
	}
	return out
}
