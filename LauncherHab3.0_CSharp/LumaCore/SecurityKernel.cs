// ============================================================================
// ПРОЕКТ: LauncherHub 3.0 & Luma System OS 1.0 (C# .NET 8 Windows)
// ФАЙЛ: LumaCore/SecurityKernel.cs
// ОПИСАНИЕ: Криптографическое ядро защиты системы Luma Security 1.0:
//           - Аутентифицированное шифрование AES-256-GCM (128-бит AuthTag)
//           - Деривация мастер-ключа PBKDF2-HMAC-SHA512 (310 000 итераций OWASP)
//           - Подпись IPC-пакетов HMAC-SHA256 с защитой от Replay-атак
//           - Безопасная очистка ключевого материала в ОЗУ (CryptographicOperations.ZeroMemory)
// ============================================================================

using System;
using System.Buffers.Binary;
using System.Security;
using System.Security.Cryptography;
using System.Text;

namespace LumaCore.Security
{
    public sealed class SecurityKernel : IDisposable
    {
        public const int KeySizeBytes = 32;   // 256 бит
        public const int NonceSizeBytes = 12; // 96 бит (стандарт NIST для AES-GCM)
        public const int TagSizeBytes = 16;   // 128 бит AuthTag
        public const int Pbkdf2Iterations = 310_000;

        private byte[] _masterKey;
        private readonly byte[] _ipcSessionKey;
        private int _keyRevision = 1;
        private bool _disposed;

        public string SecurityStandard => "Luma Security 1.0 (AES-256-GCM + PBKDF2-SHA512 + IPC HMAC-SHA256)";
        public int CurrentKeyRevision => _keyRevision;

        public sealed record EncryptedEnvelope(
            string NonceHex,
            string TagHex,
            string CipherHex,
            int KeyRevision
        );

        public SecurityKernel(string machineSecretSeed)
            : this(machineSecretSeed, Environment.MachineName + "::LUMA-OS-HWID-X64")
        {
        }

        public SecurityKernel(string masterPassphrase, string hardwareId)
        {
            byte[] salt = SHA256.HashData(Encoding.UTF8.GetBytes($"LUMA_OS_V1_SALT::{hardwareId}::{Environment.UserName}"));
            _masterKey = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(masterPassphrase),
                salt,
                Pbkdf2Iterations,
                HashAlgorithmName.SHA512,
                KeySizeBytes
            );

            _ipcSessionKey = HKDF.DeriveKey(
                HashAlgorithmName.SHA256,
                _masterKey,
                KeySizeBytes,
                salt,
                Encoding.UTF8.GetBytes("LUMA_IPC_JSONRPC_HMAC_KEY")
            );
        }

        /// <summary>
        /// Шифрует JSON-конфигурацию в типизированный конверт EncryptedEnvelope (AES-256-GCM)
        /// </summary>
        public EncryptedEnvelope EncryptConfig(string plaintextJson)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);

            byte[] plainBytes = Encoding.UTF8.GetBytes(plaintextJson);
            byte[] nonce = RandomNumberGenerator.GetBytes(NonceSizeBytes);
            byte[] cipherBytes = new byte[plainBytes.Length];
            byte[] tag = new byte[TagSizeBytes];

            using var aesGcm = new AesGcm(_masterKey, TagSizeBytes);
            aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

            return new EncryptedEnvelope(
                Convert.ToHexString(nonce),
                Convert.ToHexString(tag),
                Convert.ToHexString(cipherBytes),
                _keyRevision
            );
        }

        /// <summary>
        /// Расшифровывает и проверяет целостность EncryptedEnvelope (128-бит AuthTag)
        /// </summary>
        public string DecryptConfig(EncryptedEnvelope envelope)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            ArgumentNullException.ThrowIfNull(envelope);

            byte[] nonce = Convert.FromHexString(envelope.NonceHex);
            byte[] tag = Convert.FromHexString(envelope.TagHex);
            byte[] cipherBytes = Convert.FromHexString(envelope.CipherHex);
            byte[] plainBytes = new byte[cipherBytes.Length];

            using var aesGcm = new AesGcm(_masterKey, TagSizeBytes);
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }

        /// <summary>
        /// Бинарная упаковка AES-256-GCM: [Nonce (12B)] + [Tag (16B)] + [Ciphertext (NB)]
        /// </summary>
        public byte[] EncryptConfigPayload(string plainJson)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);

            byte[] plainBytes = Encoding.UTF8.GetBytes(plainJson);
            byte[] nonce = RandomNumberGenerator.GetBytes(NonceSizeBytes);
            byte[] tag = new byte[TagSizeBytes];
            byte[] cipher = new byte[plainBytes.Length];

            using var aes = new AesGcm(_masterKey, TagSizeBytes);
            aes.Encrypt(nonce, plainBytes, cipher, tag);

            byte[] result = new byte[NonceSizeBytes + TagSizeBytes + cipher.Length];
            Buffer.BlockCopy(nonce, 0, result, 0, NonceSizeBytes);
            Buffer.BlockCopy(tag, 0, result, NonceSizeBytes, TagSizeBytes);
            Buffer.BlockCopy(cipher, 0, result, NonceSizeBytes + TagSizeBytes, cipher.Length);
            return result;
        }

        /// <summary>
        /// Бинарная распаковка AES-256-GCM с проверкой подлинности
        /// </summary>
        public string DecryptConfigPayload(byte[] encryptedFrame)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);

            if (encryptedFrame == null || encryptedFrame.Length < NonceSizeBytes + TagSizeBytes)
                throw new CryptographicException("Поврежденный крипто-кадр Luma Security 1.0.");

            ReadOnlySpan<byte> span = encryptedFrame;
            ReadOnlySpan<byte> nonce = span.Slice(0, NonceSizeBytes);
            ReadOnlySpan<byte> tag = span.Slice(NonceSizeBytes, TagSizeBytes);
            ReadOnlySpan<byte> cipher = span.Slice(NonceSizeBytes + TagSizeBytes);

            byte[] plain = new byte[cipher.Length];
            using var aes = new AesGcm(_masterKey, TagSizeBytes);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }

        /// <summary>
        /// Вычисляет подпись HMAC-SHA256 для IPC-пакета с миллисекундной меткой времени
        /// </summary>
        public string SignIpcFrame(string jsonRpcPayload, long unixTimestampMs)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);

            byte[] payloadBytes = Encoding.UTF8.GetBytes(jsonRpcPayload);
            byte[] tsBytes = new byte[8];
            BinaryPrimitives.WriteInt64BigEndian(tsBytes, unixTimestampMs);

            using var hmac = new HMACSHA256(_ipcSessionKey);
            hmac.TransformBlock(tsBytes, 0, tsBytes.Length, null, 0);
            hmac.TransformFinalBlock(payloadBytes, 0, payloadBytes.Length);

            return Convert.ToHexString(hmac.Hash!);
        }

        /// <summary>
        /// Проверяет подпись HMAC-SHA256 и защищает от Replay-атак (окно ±30 секунд)
        /// </summary>
        public bool VerifyIpcFrame(string jsonRpcPayload, long unixTimestampMs, string providedSignatureHex)
        {
            long nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            if (Math.Abs(nowMs - unixTimestampMs) > 30_000)
                return false;

            string expectedHex = SignIpcFrame(jsonRpcPayload, unixTimestampMs);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(expectedHex),
                Encoding.ASCII.GetBytes(providedSignatureHex.ToUpperInvariant())
            );
        }

        /// <summary>
        /// Безопасная ротация мастер-ключа в памяти
        /// </summary>
        public void RotateMasterKey(string newPassphrase, string hardwareId)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);

            CryptographicOperations.ZeroMemory(_masterKey);
            byte[] salt = SHA256.HashData(Encoding.UTF8.GetBytes($"LUMA_OS_V1_SALT_ROTATED::{hardwareId}::{_keyRevision + 1}"));
            _masterKey = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(newPassphrase),
                salt,
                Pbkdf2Iterations,
                HashAlgorithmName.SHA512,
                KeySizeBytes
            );
            _keyRevision++;
        }

        public void Dispose()
        {
            if (_disposed) return;
            CryptographicOperations.ZeroMemory(_masterKey);
            CryptographicOperations.ZeroMemory(_ipcSessionKey);
            _disposed = true;
        }
    }
}
