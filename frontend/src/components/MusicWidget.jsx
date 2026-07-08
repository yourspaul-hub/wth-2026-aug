import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '../lib/api';

const STORAGE_KEY = 'wth_music_state';

const readState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const writeState = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
};

/**
 * Ambient music: autoplay-on-arrival with a graceful fallback to comply with
 * browser autoplay policies.
 *   1. Fetch admin settings; if enabled, attempt unmuted autoplay at the admin volume (~30%).
 *   2. If the browser blocks autoplay, fall back to MUTED autoplay (allowed by all major browsers).
 *   3. On the very first user gesture (click/touch/keydown/scroll), unmute the audio.
 *   4. Visitor can still Pause/Mute/Hide from the floating widget. Preferences persist via localStorage.
 */
const MusicWidget = () => {
  const [settings, setSettings] = useState(null);
  const persisted = useMemo(readState, []);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(persisted.muted ?? true); // start muted → HTML5 autoplay is allowed everywhere
  const [volume, setVolume] = useState(persisted.volume ?? 0.30);
  const [collapsed, setCollapsed] = useState(persisted.collapsed ?? true);
  const [hidden, setHidden] = useState(persisted.hidden ?? false);
  const audioRef = useRef(null);
  const widgetRef = useRef(null);
  const autoplayTriedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    api.get('/settings/public').then(r => {
      if (!alive) return;
      const s = r.data?.music || {};
      setSettings(s);
      if (persisted.volume == null && typeof s.volume === 'number') setVolume(s.volume);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Keep the audio element in sync with widget state.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  // Persist widget state — only visual preferences carry across visits.
  useEffect(() => {
    writeState({ volume, muted, collapsed, hidden });
  }, [volume, muted, collapsed, hidden]);

  // Autoplay on arrival. We ALWAYS attempt playback on load — the only way to
  // silence music is to hide the widget ("Hide music widget" link). Any
  // session-level pause the visitor did previously does not carry over.
  useEffect(() => {
    if (!settings?.enabled || !settings.url || hidden) return;
    if (autoplayTriedRef.current) return;
    autoplayTriedRef.current = true;
    const a = audioRef.current;
    if (!a) return;
    a.muted = true;                    // start muted → browsers allow autoplay
    a.volume = volume || 0.30;
    a.play().catch(() => { /* recover via gesture handler */ });
    armUnmuteOnGesture();
  }, [settings, hidden]);

  // Chrome / Safari / iOS / Android require a real activation gesture
  // (click, tap, keydown) to unmute audio — mousemove does NOT count. The
  // handler must be SYNCHRONOUS: iOS/Android invalidate the user-gesture
  // context if we `await` anything before calling play(). We also listen for
  // `touchstart` which fires earliest on Android for maximum responsiveness.
  const armUnmuteOnGesture = () => {
    const events = ['touchstart', 'touchend', 'pointerup', 'click', 'keydown'];
    let done = false;
    const unmute = (e) => {
      if (done) return;
      // Skip gestures on the widget itself so its pause/play button keeps working.
      if (e && widgetRef.current && widgetRef.current.contains(e.target)) return;
      done = true;
      const a = audioRef.current;
      if (a) {
        a.muted = false;
        a.volume = 0.30;
        // Fire play() SYNCHRONOUSLY inside the gesture callback (iOS/Android require this).
        try { const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch { /* noop */ }
      }
      setMuted(false);
      events.forEach(ev => document.removeEventListener(ev, unmute));
    };
    events.forEach(ev => document.addEventListener(ev, unmute, { passive: true }));
  };

  if (!settings || !settings.enabled || !settings.url || hidden) return null;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      // If audio is playing muted (autoplay phase), a tap should UNMUTE, not pause.
      if (playing && muted) {
        a.muted = false;
        a.volume = 0.30;
        try { const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch { /* noop */ }
        setMuted(false);
        setCollapsed(false);
        return;
      }
      if (playing) { a.pause(); setPlaying(false); }
      else { a.muted = muted; await a.play(); setPlaying(true); }
      setCollapsed(false);
    } catch { /* ignore */ }
  };

  return (
    <div
      ref={widgetRef}
      className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 select-none"
      data-testid="music-widget"
    >
      <audio
        ref={audioRef}
        src={settings.url}
        loop
        autoPlay
        muted={muted}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => { if (!hidden) setPlaying(false); }}
      />

      {/* Collapsed pill */}
      {collapsed && (
        <button
          onClick={toggle}
          onDoubleClick={() => setCollapsed(false)}
          className="group flex items-center gap-2 pl-3 pr-4 py-2.5 bg-[#1A1A1A]/95 hover:bg-[#B4593F] text-white rounded-full shadow-2xl backdrop-blur transition-all"
          aria-label={playing ? 'Pause ambient music' : 'Play ambient music'}
          data-testid="music-widget-toggle"
        >
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#B4593F] group-hover:bg-white/20 transition-colors">
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 pl-0.5" />}
            {playing && !muted && (
              <span className="absolute inset-0 rounded-full ring-2 ring-[#E88864] animate-ping opacity-60" aria-hidden />
            )}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em]">
            {playing ? (muted ? 'Tap to unmute' : 'Playing') : 'Music'}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setCollapsed(false); } }}
            className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Expand music player"
            data-testid="music-widget-expand"
          >
            <Music className="w-3 h-3" />
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {!collapsed && (
        <div className="bg-[#1A1A1A]/95 text-white rounded-2xl shadow-2xl backdrop-blur px-4 py-3 w-72 border border-white/10" data-testid="music-widget-panel">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#B4593F] flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Now playing</div>
              <div className="text-sm truncate" title={settings.label}>{settings.label || 'Ambient'}</div>
            </div>
            <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-white/10" aria-label="Minimize" data-testid="music-widget-collapse">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full bg-[#B4593F] hover:bg-[#E88864] transition-colors flex items-center justify-center"
              aria-label={playing ? 'Pause' : 'Play'}
              data-testid="music-widget-play"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
            </button>
            <button
              onClick={() => setMuted(m => !m)}
              className="p-2 rounded-full hover:bg-white/10"
              aria-label={muted ? 'Unmute' : 'Mute'}
              data-testid="music-widget-mute"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-[#B4593F]"
              aria-label="Volume"
              data-testid="music-widget-volume"
            />
          </div>

          <button
            onClick={() => { setHidden(true); const a = audioRef.current; if (a) { a.pause(); } setPlaying(false); }}
            className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80 w-full text-left"
            data-testid="music-widget-hide"
          >
            Hide music widget
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicWidget;
