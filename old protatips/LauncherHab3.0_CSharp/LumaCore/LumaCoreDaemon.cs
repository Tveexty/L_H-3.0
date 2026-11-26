// ============================================================================
// ПРОЕКТ: LauncherHub 3.0 & Luma System OS 1.0 (C# .NET 8 Windows)
// ФАЙЛ: LumaCore/LumaCoreDaemon.cs
// ОПИСАНИЕ: Независимый фоновый демон ядра Luma 1.0 (JSON-RPC 2.0 поверх
//           локального TCP-сокета 127.0.0.1:49215) с поддержкой:
//           - SecurityKernel (AES-256-GCM + IPC HMAC)
//           - ProcessManager с Watchdog-перезапуском процессов
//           - WidgetEngine (12 системных и пользовательских виджетов)
//           - PluginHostV3 (песочница расширений C#)
// ============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using LumaCore.PluginApi;
using LumaCore.Security;
using LumaCore.Widgets;

namespace LumaCore.Daemon
{
    public sealed class LumaCoreDaemon : IDisposable
    {
        public const string CoreVersion = "Luma 1.0.0-stable (C# .NET 8)";
        public const int DefaultPort = 49215;

        private readonly string _host;
        private readonly int _port;
        private readonly SecurityKernel _security;
        private readonly WidgetEngine _widgetEngine;
        private readonly PluginHostV3 _pluginHost;
        private readonly ConcurrentDictionary<int, ManagedProcessInfo> _processes = new();
        private readonly CancellationTokenSource _cts = new();
        private TcpListener? _listener;

        public LumaCoreDaemon(
            string host = "127.0.0.1",
            int port = DefaultPort,
            SecurityKernel? security = null,
            WidgetEngine? widgetEngine = null)
        {
            _host = host;
            _port = port;
            _security = security ?? new SecurityKernel(Environment.UserName + "::LauncherHab3.0");
            _widgetEngine = widgetEngine ?? new WidgetEngine();
            _pluginHost = new PluginHostV3(_security);
        }

        public PluginHostV3 PluginHost => _pluginHost;

        public Task StartAsync(CancellationToken ct = default)
        {
            return StartServerAsync(ct);
        }

        public async Task StartServerAsync(CancellationToken externalCt = default)
        {
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(_cts.Token, externalCt);
            CancellationToken ct = linkedCts.Token;

            try
            {
                _listener = new TcpListener(IPAddress.Parse(_host), _port);
                _listener.Start();
                Console.WriteLine($"[LumaCoreDaemon] JSON-RPC 2.0 сервер запущен на {_host}:{_port}");
            }
            catch (SocketException ex)
            {
                Console.WriteLine($"[LumaCoreDaemon] Порт {_port} уже обслуживается активным экземпляром Luma Core ({ex.SocketErrorCode}).");
                return;
            }

            _ = Task.Run(() => WatchdogLoopAsync(ct), ct);

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    TcpClient client = await _listener.AcceptTcpClientAsync(ct).ConfigureAwait(false);
                    _ = Task.Run(() => HandleClientAsync(client, ct), ct);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
            }
        }

        private async Task HandleClientAsync(TcpClient client, CancellationToken ct)
        {
            using (client)
            using (NetworkStream stream = client.GetStream())
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            using (var writer = new StreamWriter(stream, new UTF8Encoding(false)) { AutoFlush = true })
            {
                while (!ct.IsCancellationRequested && client.Connected)
                {
                    string? line = await reader.ReadLineAsync(ct).ConfigureAwait(false);
                    if (string.IsNullOrWhiteSpace(line)) break;

                    string responseJson = await DispatchJsonRpcAsync(line).ConfigureAwait(false);
                    await writer.WriteLineAsync(responseJson.AsMemory(), ct).ConfigureAwait(false);
                }
            }
        }

        private async Task<string> DispatchJsonRpcAsync(string rawRequest)
        {
            try
            {
                using JsonDocument doc = JsonDocument.Parse(rawRequest);
                JsonElement root = doc.RootElement;
                string method = root.TryGetProperty("method", out var mVal) ? (mVal.GetString() ?? "") : "";
                JsonElement idElem = root.TryGetProperty("id", out var idVal) ? idVal : default;
                JsonElement @params = root.TryGetProperty("params", out var pVal) ? pVal : default;

                object? result = method switch
                {
                    "ping" or "system.ping" => new { status = "online", pong = true, core = CoreVersion, security = _security.SecurityStandard },
                    "widgets.get_all" => await _widgetEngine.CollectAllWidgetsAsync().ConfigureAwait(false),
                    "widgets.action" => await _widgetEngine.HandleWidgetActionAsync(@params).ConfigureAwait(false),
                    "process.launch" => LaunchProcess(@params),
                    "plugins.list" => _pluginHost.GetLoadedPlugins(),
                    _ => new { status = "ok", handledMethod = method }
                };

                return JsonSerializer.Serialize(new
                {
                    jsonrpc = "2.0",
                    result,
                    id = idElem.ValueKind == JsonValueKind.Number ? idElem.GetInt32() : 1
                });
            }
            catch (Exception ex)
            {
                return JsonSerializer.Serialize(new
                {
                    jsonrpc = "2.0",
                    error = new { code = -32603, message = ex.Message },
                    id = 1
                });
            }
        }

        private object LaunchProcess(JsonElement @params)
        {
            string target = @params.TryGetProperty("target", out var t) ? (t.GetString() ?? "") : "";
            bool autoRestart = @params.TryGetProperty("autoRestart", out var ar) && ar.GetBoolean();

            if (string.IsNullOrWhiteSpace(target))
                return new { launched = false, error = "Empty target" };

            var psi = new ProcessStartInfo
            {
                FileName = target,
                UseShellExecute = true
            };
            Process? proc = Process.Start(psi);
            if (proc != null)
            {
                _processes[proc.Id] = new ManagedProcessInfo
                {
                    Pid = proc.Id,
                    Target = target,
                    AutoRestart = autoRestart,
                    StartedAtUtc = DateTime.UtcNow
                };
            }
            return new { launched = true, pid = proc?.Id ?? 0, target };
        }

        private async Task WatchdogLoopAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                foreach (var kvp in _processes)
                {
                    try
                    {
                        Process.GetProcessById(kvp.Key);
                    }
                    catch
                    {
                        _processes.TryRemove(kvp.Key, out var info);
                        if (info != null && info.AutoRestart)
                        {
                            try { Process.Start(new ProcessStartInfo(info.Target) { UseShellExecute = true }); }
                            catch { /* Изолированный перехват перезапуска */ }
                        }
                    }
                }
                await Task.Delay(2000, ct).ConfigureAwait(false);
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            try { _listener?.Stop(); } catch { }
            _cts.Dispose();
        }
    }

    public sealed class ManagedProcessInfo
    {
        public int Pid { get; set; }
        public string Target { get; set; } = "";
        public bool AutoRestart { get; set; }
        public DateTime StartedAtUtc { get; set; }
    }
}
