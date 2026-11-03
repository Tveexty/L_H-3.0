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

namespace LauncherHab3.LumaCore
{
    /// <summary>
    /// Независимое фоновое ядро Luma 1.0 (Headless Core Daemon на C# .NET 8)
    /// Протокол: JSON-RPC 2.0 поверх локального TCP-сокета 127.0.0.1:49215
    /// Включает:
    /// - SecurityKernel (AES-256-GCM + IPC HMAC)
    /// - ProcessManager с Watchdog-перезапуском упавших процессов
    /// - ConfigManager с атомарной UTF-8 записью
    /// - WidgetEngine (12 системных и пользовательских виджетов)
    /// - PluginHostV3 (песочница расширений C#)
    /// </summary>
    public sealed class LumaCoreDaemon : IDisposable
    {
        public const string CoreVersion = "Luma 1.0.0-stable (C# .NET 8)";
        public const int DefaultPort = 49215;

        private readonly SecurityKernel _security;
        private readonly WidgetEngine _widgetEngine;
        private readonly PluginHostV3 _pluginHost;
        private readonly ConcurrentDictionary<int, ManagedProcessInfo> _processes = new();
        private readonly CancellationTokenSource _cts = new();
        private TcpListener? _listener;

        public LumaCoreDaemon()
        {
            _security = new SecurityKernel(Environment.UserName + "::LauncherHab3.0");
            _widgetEngine = new WidgetEngine();
            _pluginHost = new PluginHostV3(_security);
        }

        public async Task StartServerAsync()
        {
            _listener = new TcpListener(IPAddress.Loopback, DefaultPort);
            _listener.Start();
            _ = Task.Run(() => WatchdogLoopAsync(_cts.Token));

            while (!_cts.Token.IsCancellationRequested)
            {
                try
                {
                    TcpClient client = await _listener.AcceptTcpClientAsync(_cts.Token);
                    _ = Task.Run(() => HandleClientAsync(client, _cts.Token));
                }
                catch (OperationCanceledException)
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
                    string? line = await reader.ReadLineAsync(ct);
                    if (string.IsNullOrWhiteSpace(line)) break;

                    string responseJson = await DispatchJsonRpcAsync(line);
                    await writer.WriteLineAsync(responseJson);
                }
            }
        }

        private async Task<string> DispatchJsonRpcAsync(string rawRequest)
        {
            try
            {
                using JsonDocument doc = JsonDocument.Parse(rawRequest);
                JsonElement root = doc.RootElement;
                string method = root.GetProperty("method").GetString() ?? "";
                JsonElement idElem = root.TryGetProperty("id", out var idVal) ? idVal : default;
                JsonElement @params = root.TryGetProperty("params", out var pVal) ? pVal : default;

                object? result = method switch
                {
                    "system.ping" => new { status = "pong", core = CoreVersion, security = _security.SecurityStandard },
                    "widgets.get_all" => await _widgetEngine.CollectAllWidgetsAsync(),
                    "widgets.action" => await _widgetEngine.HandleWidgetActionAsync(@params),
                    "process.launch" => LaunchProcess(@params),
                    "plugins.list" => _pluginHost.GetLoadedPlugins(),
                    _ => throw new InvalidOperationException($"Неизвестный метод JSON-RPC: {method}")
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
            string target = @params.GetProperty("target").GetString() ?? "";
            bool autoRestart = @params.TryGetProperty("autoRestart", out var ar) && ar.GetBoolean();

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
                            catch { /* log suppressed */ }
                        }
                    }
                }
                await Task.Delay(2000, ct);
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _listener?.Stop();
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
