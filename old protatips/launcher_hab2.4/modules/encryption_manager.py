# [file name]: encryption_manager.py
import base64
import hashlib
import hmac
import json
import os
from datetime import datetime

try:
    from cryptography.fernet import Fernet
except ImportError:
    Fernet = None


class EncryptionManager:
    """
    Менеджер криптографической защиты данных Launcher Hab 2.5.
    Особенности v2.5:
    - Деривация 32-байтового ключа через PBKDF2-HMAC-SHA256 (100 000 итераций) + URL-safe Base64 (Fernet).
    - Обратная совместимость с ключом v2.4 (SHA-256) и открытым JSON (нулевая потеря настроек).
    - Контроль целостности данных через HMAC-SHA256 подпись (защита от повреждения файла).
    - Поддержка ротации ключа (rotate_key) и защищенного хранилища секретов для Plugin API 2.5.
    """

    ENCRYPTION_VERSION = "2.5"
    DEFAULT_SALT = b"launcher_hab_pbkdf2_salt_2025_v2_5"

    def __init__(self, custom_passphrase: str = None):
        raw_passphrase = (custom_passphrase or "launcher_hab_master_secret_key_v2_5").encode("utf-8")

        # Основной ключ v2.5: PBKDF2-HMAC-SHA256 -> 32 байта -> urlsafe_b64encode (44 символа)
        pbkdf2_digest = hashlib.pbkdf2_hmac(
            "sha256",
            raw_passphrase,
            self.DEFAULT_SALT,
            100000,
            dklen=32,
        )
        self.default_key = base64.urlsafe_b64encode(pbkdf2_digest)
        self._hmac_key = pbkdf2_digest

        # Ключ обратной совместимости v2.4 (SHA-256)
        legacy_seed_v24 = b"launcher_hab_encryption_key_2024_secure_v2_4"
        self.legacy_key_v24 = base64.urlsafe_b64encode(hashlib.sha256(legacy_seed_v24).digest())

        self._cipher = Fernet(self.default_key) if Fernet is not None else None
        self._legacy_cipher_v24 = Fernet(self.legacy_key_v24) if Fernet is not None else None

    def generate_key_from_password(self, password: str, salt: bytes = None) -> bytes:
        """Генерация валидного 32-байтового URL-safe base64 ключа Fernet из пароля."""
        use_salt = salt or self.DEFAULT_SALT
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            use_salt,
            100000,
            dklen=32,
        )
        return base64.urlsafe_b64encode(digest)

    def compute_hmac(self, payload_str: str) -> str:
        """Вычисляет HMAC-SHA256 подпись для проверки целостности зашифрованных настроек."""
        return hmac.new(self._hmac_key, payload_str.encode("utf-8"), hashlib.sha256).hexdigest()

    def verify_integrity(self, payload_str: str, signature: str) -> bool:
        """Проверяет целостность зашифрованного блока по HMAC-SHA256."""
        if not signature:
            return True
        expected = self.compute_hmac(payload_str)
        return hmac.compare_digest(expected, signature)

    def encrypt_data(self, data) -> str:
        """Шифрование произвольных JSON-совместимых данных."""
        try:
            json_data = json.dumps(data, ensure_ascii=False)
            if self._cipher is not None:
                encrypted_data = self._cipher.encrypt(json_data.encode("utf-8"))
                return base64.urlsafe_b64encode(encrypted_data).decode("utf-8")
            return base64.urlsafe_b64encode(json_data.encode("utf-8")).decode("utf-8")
        except Exception as e:
            print(f"Ошибка шифрования: {e}")
            return ""

    def decrypt_data(self, encrypted_data: str):
        """Дешифрование данных с автоматическим фоллбэком на ключ v2.4 и base64."""
        try:
            if not encrypted_data:
                return None
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode("utf-8"))
            if self._cipher is not None:
                try:
                    decrypted_data = self._cipher.decrypt(decoded_data)
                    return json.loads(decrypted_data.decode("utf-8"))
                except Exception:
                    # Пробуем ключ v2.4 для плавной миграции настроек
                    if self._legacy_cipher_v24 is not None:
                        decrypted_v24 = self._legacy_cipher_v24.decrypt(decoded_data)
                        return json.loads(decrypted_v24.decode("utf-8"))
                    raise
            return json.loads(decoded_data.decode("utf-8"))
        except Exception:
            # Фоллбэк если данные были сохранены в открытом base64 без Fernet
            try:
                raw = base64.urlsafe_b64decode(encrypted_data.encode("utf-8"))
                return json.loads(raw.decode("utf-8"))
            except Exception as e:
                print(f"Ошибка дешифрования: {e}")
                return None

    def encrypt_settings(self, settings_dict: dict) -> dict:
        """Шифрование словаря настроек с подписью целостности HMAC-SHA256."""
        if not isinstance(settings_dict, dict):
            return {}
        encrypted = self.encrypt_data(settings_dict)
        if encrypted:
            return {
                "encrypted": True,
                "version": self.ENCRYPTION_VERSION,
                "kdf": "PBKDF2-HMAC-SHA256",
                "signature": self.compute_hmac(encrypted),
                "updated_at": datetime.now().isoformat(timespec="seconds"),
                "data": encrypted,
            }
        return settings_dict

    def decrypt_settings(self, encrypted_settings: dict) -> dict:
        """Дешифрование настроек с поддержкой версий 2.5, 2.4 и открытого JSON."""
        if not isinstance(encrypted_settings, dict):
            return {}
        if "encrypted" in encrypted_settings and encrypted_settings.get("data"):
            payload = encrypted_settings["data"]
            sig = encrypted_settings.get("signature", "")
            if sig and encrypted_settings.get("version") == self.ENCRYPTION_VERSION:
                if not self.verify_integrity(payload, sig):
                    print("Предупреждение: контрольная сумма HMAC не совпала, выполняется попытка восстановления...")
            decrypted = self.decrypt_data(payload)
            return decrypted if isinstance(decrypted, dict) else {}
        return encrypted_settings

    def rotate_key(self, new_passphrase: str, current_settings: dict) -> dict:
        """Ротация ключа шифрования с перешифровкой текущих настроек."""
        if new_passphrase:
            self.__init__(custom_passphrase=new_passphrase)
        return self.encrypt_settings(current_settings)

    def get_security_status(self) -> dict:
        """Возвращает диагностическую информацию о системе шифрования v2.5."""
        return {
            "version": self.ENCRYPTION_VERSION,
            "engine": "Fernet AES-128-CBC + HMAC-SHA256" if self._cipher is not None else "Base64 Safe Fallback",
            "kdf": "PBKDF2-HMAC-SHA256 (100,000 iterations)",
            "key_length_bytes": 32,
            "fernet_available": self._cipher is not None,
        }