import React from 'react';
import { ClockStyleKey } from '../data/launcherData';

export interface LumaClockRendererProps {
  now: Date;
  clockStyle: ClockStyleKey;
  timeFormat: '24' | '12';
  showSeconds: boolean;
  showDate: boolean;
  clockAccentColor: string;
  clockGlowEnabled: boolean;
  clockGlowIntensity: number;
  clockBlinkColon: boolean;
  isDark: boolean;
  cityLabel?: string;
  compact?: boolean;
}

export const LumaClockRenderer: React.FC<LumaClockRendererProps> = ({
  now,
  clockStyle,
  timeFormat,
  showSeconds,
  showDate,
  clockAccentColor,
  clockGlowEnabled,
  clockGlowIntensity,
  clockBlinkColon,
  isDark,
  cityLabel = 'LUMA DESKTOP',
  compact = false,
}) => {
  const rawH = now.getHours();
  const isPM = rawH >= 12;
  const displayH = timeFormat === '12' ? rawH % 12 || 12 : rawH;
  const hrs = String(displayH).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const ampm = timeFormat === '12' ? (isPM ? 'PM' : 'AM') : '';
  const colonVisible = !clockBlinkColon || now.getSeconds() % 2 === 0;
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
  const shortDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  const accent = clockAccentColor || 'var(--luma-accent)';
  const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const glowStyle: React.CSSProperties | undefined = clockGlowEnabled
    ? { textShadow: `0 0 ${Math.max(4, clockGlowIntensity)}px ${accent}` }
    : undefined;

  const colonSpan = (cls = 'mx-0.5') => (
    <span
      className={cls}
      style={{
        color: accent,
        opacity: colonVisible ? 1 : 0.18,
        transition: 'opacity 140ms ease',
      }}
    >
      :
    </span>
  );

  // Analog angles for analog_hybrid
  const secDeg = now.getSeconds() * 6;
  const minDeg = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const hrDeg = (rawH % 12) * 30 + now.getMinutes() * 0.5;

  const szBig = compact ? 'text-4xl' : 'text-5xl xl:text-6xl';
  const szMed = compact ? 'text-3xl' : 'text-4xl xl:text-5xl';

  switch (clockStyle) {
    case 'android_vertical':
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em]">
            <span className={mutedCls}>{cityLabel}</span>
            {showSeconds && <span style={{ color: accent }}>{secs}s</span>}
          </div>
          <div className="flex items-center gap-3 leading-none">
            <div className="flex flex-col font-extrabold tracking-tight tabular-nums" style={glowStyle}>
              <span className={compact ? 'text-3xl leading-[0.95]' : 'text-4xl xl:text-5xl leading-[0.92]'}>{hrs}</span>
              <span className={compact ? 'text-3xl leading-[0.95]' : 'text-4xl xl:text-5xl leading-[0.92]'} style={{ color: accent }}>
                {mins}
              </span>
            </div>
            <div className="flex flex-col justify-center gap-1 min-w-0">
              {ampm && <span className="text-[10px] font-mono font-bold uppercase" style={{ color: accent }}>{ampm}</span>}
              {showDate && <span className={`text-[11px] font-medium leading-snug capitalize ${mutedCls}`}>{dateStr}</span>}
            </div>
          </div>
        </div>
      );

    case 'stacked':
      return (
        <div className="h-full flex flex-col justify-center items-center text-center gap-1">
          <div className="font-black tracking-tighter tabular-nums leading-[0.88]" style={glowStyle}>
            <div className={compact ? 'text-3xl' : 'text-4xl xl:text-5xl'}>{hrs}</div>
            <div className={compact ? 'text-3xl' : 'text-4xl xl:text-5xl'} style={{ color: accent }}>
              {mins}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase">
            {showSeconds && <span>{secs}</span>}
            {ampm && <span style={{ color: accent }}>{ampm}</span>}
            {showDate && <span className={mutedCls}>{shortDate}</span>}
          </div>
        </div>
      );

    case 'standard':
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
            <span className={mutedCls}>{cityLabel}</span>
            {ampm && <span className="font-mono font-bold" style={{ color: accent }}>{ampm}</span>}
          </div>
          <div className={`font-semibold tracking-tight tabular-nums leading-none ${szBig}`} style={glowStyle}>
            {hrs}
            {colonSpan()}
            {mins}
            {showSeconds && (
              <span className={`text-xl font-normal ml-1 ${mutedCls}`}>{secs}</span>
            )}
          </div>
          {showDate && <div className={`text-xs capitalize truncate ${mutedCls}`}>{dateStr}</div>}
        </div>
      );

    case 'pill_glass':
      return (
        <div className="h-full flex flex-col items-center justify-center gap-2">
          <div
            className={`px-5 py-2.5 rounded-full border flex items-baseline gap-1 font-mono font-bold tabular-nums ${
              isDark ? 'bg-white/[0.06] border-white/15' : 'bg-zinc-900/[0.05] border-zinc-900/15'
            }`}
            style={{
              boxShadow: clockGlowEnabled ? `0 0 ${clockGlowIntensity}px ${accent}55` : undefined,
            }}
          >
            <span className={compact ? 'text-2xl' : 'text-3xl xl:text-4xl'}>{hrs}</span>
            {colonSpan()}
            <span className={compact ? 'text-2xl' : 'text-3xl xl:text-4xl'}>{mins}</span>
            {showSeconds && <span className="text-sm ml-1 opacity-70">{secs}</span>}
            {ampm && <span className="text-[10px] ml-1.5" style={{ color: accent }}>{ampm}</span>}
          </div>
          {showDate && <div className={`text-[11px] font-mono uppercase tracking-wider ${mutedCls}`}>{dateStr}</div>}
        </div>
      );

    case 'split_flip':
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
            <span className={mutedCls}>FLIP CLOCK</span>
            {showDate && <span className={mutedCls}>{shortDate}</span>}
          </div>
          <div className="flex items-center justify-center gap-2 font-mono font-extrabold tabular-nums">
            {[hrs, mins, ...(showSeconds ? [secs] : [])].map((part, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && colonSpan('text-2xl')}
                <div
                  className={`relative px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#1b1b20] border-white/15 text-white' : 'bg-zinc-900 text-white border-zinc-700'
                  }`}
                  style={glowStyle}
                >
                  <span className={compact ? 'text-2xl' : 'text-3xl xl:text-4xl'}>{part}</span>
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] bg-black/45" />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className={mutedCls}>{cityLabel}</span>
            {ampm && <span style={{ color: accent }}>{ampm}</span>}
          </div>
        </div>
      );

    case 'cyber_mono':
      return (
        <div className="h-full flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
            <span style={{ color: accent }}>[SYS::CLK]</span>
            <span className={mutedCls}>{shortDate}</span>
          </div>
          <div className={`font-bold tracking-widest tabular-nums leading-none ${szMed}`} style={{ color: accent, ...glowStyle }}>
            {hrs}
            <span style={{ opacity: colonVisible ? 1 : 0.2 }}>:</span>
            {mins}
            {showSeconds && <span className="text-lg opacity-80">:{secs}</span>}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className={mutedCls}>TZ://{cityLabel}</span>
            <span style={{ color: accent }}>24H={timeFormat === '24' ? 'ON' : ampm}</span>
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1">
          <div className={`font-extralight tracking-wider tabular-nums leading-none ${szBig}`} style={glowStyle}>
            {hrs}
            {colonSpan('mx-1 font-light')}
            {mins}
            {showSeconds && <span className={`text-lg ml-1.5 font-light ${mutedCls}`}>{secs}</span>}
          </div>
          {showDate && (
            <div className={`text-[11px] tracking-[0.18em] uppercase ${mutedCls}`}>
              {dateStr} {ampm}
            </div>
          )}
        </div>
      );

    case 'compact_badge':
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-white" style={{ backgroundColor: accent }}>
              TIME
            </span>
            <span className={`text-[10px] font-mono uppercase truncate ${mutedCls}`}>{cityLabel}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className={`font-mono font-extrabold tabular-nums leading-none ${szMed}`} style={glowStyle}>
              {hrs}
              {colonSpan()}
              {mins}
            </div>
            {showSeconds && (
              <span className="px-2 py-0.5 rounded-lg border text-xs font-mono font-bold" style={{ borderColor: accent, color: accent }}>
                {secs}
              </span>
            )}
          </div>
          {showDate && <div className={`text-[11px] font-mono truncate ${mutedCls}`}>{dateStr} {ampm}</div>}
        </div>
      );

    case 'ios_standby':
      return (
        <div className="h-full flex flex-col justify-center items-center text-center">
          <div
            className={`font-black tracking-tight tabular-nums leading-none ${compact ? 'text-4xl' : 'text-5xl xl:text-6xl'}`}
            style={{ color: accent, ...glowStyle }}
          >
            {hrs}
            <span style={{ opacity: colonVisible ? 1 : 0.25 }}>:</span>
            {mins}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            {showDate && <span className="opacity-85">{dateStr}</span>}
            {showSeconds && <span className="font-mono opacity-65">{secs}</span>}
            {ampm && <span style={{ color: accent }}>{ampm}</span>}
          </div>
        </div>
      );

    case 'samsung_oneui':
      return (
        <div className="h-full flex flex-col justify-between pl-1">
          <div className={`text-[11px] font-medium capitalize ${mutedCls}`}>
            {showDate ? dateStr : cityLabel}
          </div>
          <div className={`font-light tracking-tight tabular-nums leading-none ${szBig}`} style={glowStyle}>
            {hrs}
            {colonSpan()}
            {mins}
            {showSeconds && <span className={`text-xl ml-1 ${mutedCls}`}>{secs}</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-6 h-[3px] rounded-full" style={{ backgroundColor: accent }} />
            <span className={mutedCls}>{cityLabel} {ampm}</span>
          </div>
        </div>
      );

    case 'neon_synthwave':
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
            <span style={{ color: accent }}>PULSE // 84</span>
            {showSeconds && <span className="text-fuchsia-400">{secs}s</span>}
          </div>
          <div
            className={`font-mono font-black italic tracking-tight tabular-nums leading-none ${szMed}`}
            style={{
              backgroundImage: `linear-gradient(90deg, ${accent}, #ec4899, #38bdf8)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: clockGlowEnabled ? `drop-shadow(0 0 ${Math.max(4, clockGlowIntensity / 2)}px ${accent})` : undefined,
            }}
          >
            {hrs}
            <span style={{ opacity: colonVisible ? 1 : 0.25 }}>:</span>
            {mins}
          </div>
          {showDate && <div className={`text-[10px] font-mono uppercase tracking-[0.18em] ${mutedCls}`}>{dateStr} {ampm}</div>}
        </div>
      );

    case 'retro_casio':
      return (
        <div
          className={`h-full rounded-xl p-2.5 flex flex-col justify-between font-mono border ${
            isDark
              ? 'bg-[#1c231c] border-[#3b4d3b] text-[#b7d3a8]'
              : 'bg-[#cfd8c5] border-[#8b9880] text-[#1d261a]'
          }`}
        >
          <div className="flex items-center justify-between text-[9px] uppercase tracking-widest opacity-75">
            <span>QUARTZ · {timeFormat}H</span>
            <span>{shortDate}</span>
          </div>
          <div className="flex items-baseline justify-center gap-1 font-bold tracking-wider tabular-nums">
            <span className={compact ? 'text-3xl' : 'text-4xl xl:text-5xl'}>{hrs}</span>
            <span style={{ opacity: colonVisible ? 1 : 0.15 }}>:</span>
            <span className={compact ? 'text-3xl' : 'text-4xl xl:text-5xl'}>{mins}</span>
            {showSeconds && <span className="text-base ml-0.5 opacity-85">{secs}</span>}
          </div>
          <div className="flex items-center justify-between text-[9px] uppercase opacity-75">
            <span>LUMA LCD</span>
            <span>{ampm || 'ALARM ON'}</span>
          </div>
        </div>
      );

    case 'macos_sonoma':
      return (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1">
          {showDate && <div className="text-xs font-semibold capitalize opacity-80">{dateStr}</div>}
          <div className={`font-bold tracking-tight tabular-nums leading-none ${szBig}`} style={glowStyle}>
            {hrs}
            {colonSpan()}
            {mins}
          </div>
          {(showSeconds || ampm) && (
            <div className={`text-[10px] font-mono uppercase ${mutedCls}`}>
              {showSeconds ? `${secs} сек` : ''} {ampm}
            </div>
          )}
        </div>
      );

    case 'futuristic_hud':
      return (
        <div className="h-full flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em]">
            <span style={{ color: accent }}>┌ HUD.CLK</span>
            <span className={mutedCls}>{secs} SEC ┐</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-8 rounded-full" style={{ backgroundColor: accent }} />
            <span className={`font-bold tracking-widest tabular-nums leading-none ${szMed}`} style={glowStyle}>
              {hrs}
              {colonSpan()}
              {mins}
            </span>
            <span className="w-1.5 h-8 rounded-full opacity-40" style={{ backgroundColor: accent }} />
          </div>
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em]">
            <span className={mutedCls}>└ {cityLabel}</span>
            <span className={mutedCls}>{showDate ? shortDate : ampm} ┘</span>
          </div>
        </div>
      );

    case 'analog_hybrid':
      return (
        <div className="h-full flex items-center justify-between gap-3">
          <svg viewBox="0 0 100 100" className={compact ? 'w-16 h-16 shrink-0' : 'w-20 h-20 xl:w-24 xl:h-24 shrink-0'}>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(17,17,19,0.18)'}
              strokeWidth="2.5"
            />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="50"
                y1="9"
                x2="50"
                y2={deg % 90 === 0 ? '17' : '13'}
                stroke={deg % 90 === 0 ? accent : 'currentColor'}
                strokeWidth={deg % 90 === 0 ? '2.5' : '1.4'}
                strokeLinecap="round"
                transform={`rotate(${deg} 50 50)`}
              />
            ))}
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="25"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              transform={`rotate(${hrDeg} 50 50)`}
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="16"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              transform={`rotate(${minDeg} 50 50)`}
            />
            {showSeconds && (
              <line
                x1="50"
                y1="56"
                x2="50"
                y2="14"
                stroke={accent}
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${secDeg} 50 50)`}
              />
            )}
            <circle cx="50" cy="50" r="3.5" fill={accent} />
          </svg>
          <div className="min-w-0 flex-1 text-right">
            <div className={`font-mono font-bold tabular-nums leading-none ${compact ? 'text-2xl' : 'text-3xl'}`} style={glowStyle}>
              {hrs}
              {colonSpan()}
              {mins}
            </div>
            {showDate && <div className={`text-[11px] font-mono uppercase mt-1 truncate ${mutedCls}`}>{dateStr}</div>}
            <div className={`text-[9px] font-mono uppercase mt-0.5 ${mutedCls}`}>{cityLabel} {ampm}</div>
          </div>
        </div>
      );

    case 'vertical_neon_bar':
      return (
        <div className="h-full flex items-center gap-3.5 pl-1">
          <div
            className="w-1.5 h-4/5 rounded-full shrink-0"
            style={{
              backgroundColor: accent,
              boxShadow: clockGlowEnabled ? `0 0 ${Math.max(6, clockGlowIntensity)}px ${accent}` : undefined,
            }}
          />
          <div className="flex flex-col justify-center min-w-0">
            <div className={`font-mono font-extrabold tabular-nums leading-none ${szMed}`} style={glowStyle}>
              {hrs}
              {colonSpan()}
              {mins}
              {showSeconds && <span className={`text-lg ml-1 ${mutedCls}`}>{secs}</span>}
            </div>
            {showDate && <div className={`text-[11px] font-mono uppercase mt-1.5 truncate ${mutedCls}`}>{dateStr} {ampm}</div>}
          </div>
        </div>
      );

    case 'material_expressive':
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${accent}22`, color: accent }}>
              {cityLabel}
            </span>
            {showSeconds && <span className={`font-mono ${mutedCls}`}>{secs}s</span>}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-black tracking-tight tabular-nums leading-none ${szBig}`}
              style={{ color: accent, ...glowStyle }}
            >
              {hrs}
            </span>
            <span className={`font-light leading-none ${szMed}`} style={{ opacity: colonVisible ? 0.5 : 0.12 }}>
              :
            </span>
            <span className={`font-extrabold tracking-tight tabular-nums leading-none ${szBig}`} style={glowStyle}>
              {mins}
            </span>
            {ampm && <span className={`text-xs font-bold ml-1 ${mutedCls}`}>{ampm}</span>}
          </div>
          {showDate && <div className={`text-xs font-medium capitalize truncate ${mutedCls}`}>{dateStr}</div>}
        </div>
      );

    case 'nothing_dot':
    default:
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em]">
            <span className={mutedCls}>{cityLabel}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
              <span className={mutedCls}>{showSeconds ? secs : ampm || 'DOT'}</span>
            </span>
          </div>
          <div className={`font-mono font-bold tracking-tighter tabular-nums leading-none ${szBig}`} style={glowStyle}>
            {hrs}
            {colonSpan()}
            {mins}
            {showSeconds && <span className={`text-xl ml-1 font-normal ${mutedCls}`}>{secs}</span>}
          </div>
          {showDate && (
            <div className={`text-[11px] font-mono uppercase tracking-wider truncate ${mutedCls}`}>
              {dateStr}
            </div>
          )}
        </div>
      );
  }
};
