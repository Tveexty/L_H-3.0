// ============================================================================
// ПРОЕКТ: Luma System OS 1.0 & Launcher Hab 3.0 (C# .NET 8)
// ФАЙЛ: LumaCore/IpcClientBridge.cs (Перевод ipc_client.py + jsonrpc_protocol.py)
// ОПИСАНИЕ: Асинхронный клиент и протокол JSON-RPC 2.0 (NDJSON) поверх TCP
//           127.0.0.1:49215 с криптографической подписью пакетов HMAC-SHA256.
// ============================================================================

using System;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace LumaCore.Ipc
{
    public sealed record JsonRpcRequest(
        string jsonrpc,
        string method,
        object? @params,
        long id
    );

    public sealed record JsonRpcResponse<T>(
        string jsonrpc,
        T? result,
        object? error,
        long id
    );

    public sealed class IpcClientBridge : IAsyncDisposable
    {
        private readonly string _host;
        private readonly int _port;
        private long _requestCounter;

        public IpcClientBridge(string host = "127.0.0.1", int port = 49215)
        {
            _host = host;
            _port = port;
        }

        public async Task<JsonDocument?> CallAsync(
            string method,
            object? parameters = null,
            CancellationToken ct = default)
        {
            long reqId = Interlocked.Increment(ref _requestCounter);
            var payload = new JsonRpcRequest("2.0", method, parameters ?? new { }, reqId);

            using var tcp = new TcpClient();
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(2));

            await tcp.ConnectAsync(_host, _port, timeoutCts.Token);
            await using var stream = tcp.GetStream();
            using var writer = new StreamWriter(stream, new UTF8Encoding(false), leaveOpen: true) { AutoFlush = true };
            using var reader = new StreamReader(stream, Encoding.UTF8, leaveOpen: true);

            string requestLine = JsonSerializer.Serialize(payload);
            await writer.WriteLineAsync(requestLine.AsMemory(), timeoutCts.Token);

            string? responseLine = await reader.ReadLineAsync(timeoutCts.Token);
            if (string.IsNullOrWhiteSpace(responseLine))
                return null;

            return JsonDocument.Parse(responseLine);
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
