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
 * Floating ambient music widget. Bottom-right on every page.
 * - Fetches URL/label/default volume from /api/settings/public
 * - Starts paused (browser autoplay policy). If the visitor previously enabled
 *   playback, we attempt resume; otherwise we show a subtle "Play" pulse.
 * - Persists play state, volume, and mute across visits (localStorage).
 * - Hides itself completely when the admin has disabled music.
 */
const MusicWidget = () => {
  const [settings, setSettings] = useState(null);
  const persisted = useMemo(readState, []);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(persisted.muted ?? false);
  const [volume, setVolume] = useState(persisted.volume ?? 0.35);
  const [collapsed, setCollapsed] = useState(persisted.collapsed ?? true);
  const [hidden, setHidden] = useState(persisted.hidden ?? false);
  const [showPlayHint, setShowPlayHint] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get('/settings/public').then(r => {
      if (!alive) return;
      const s = r.data?.music || {};
      setSettings(s);
      // Prefer persisted volume; fall back to admin default
      if (persisted.volume == null && typeof s.volume === 'number') setVolume(s.volume);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Sync <audio> element with state
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  // Persist on any change
  useEffect(() => {
    writeState({ volume, muted, collapsed, hidden, wantsPlay: playing });
  }, [volume, muted, collapsed, hidden, playing]);

  // Attempt to resume audio if the visitor previously enabled it
  useEffect(() => {
    if (!settings?.enabled || !settings.url) return;
    if (!persisted.wantsPlay) return;
    const a = audioRef.current;
    if (!a) return;
    const attempt = async () => {
      try {
        await a.play();
        setPlaying(true);
        setShowPlayHint(false);
      } catch {
        // Autoplay blocked — surface a gentle CTA the first time
        setShowPlayHint(true);
      }
    };
    attempt();
  }, [settings]);

  if (!settings || !settings.enabled || !settings.url || hidden) return null;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (playing) { a.pause(); setPlaying(false); }
      else { await a.play(); setPlaying(true); }
      setShowPlayHint(false);
      setCollapsed(false);
    } catch { setShowPlayHint(true); }
  };

  return (
    <div
      className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 select-none"
      data-testid="music-widget"
    >
      <audio ref={audioRef} src={settings.url} loop preload="none" />

      {/* Collapsed pill */}
      {collapsed && (
        <button
          onClick={toggle}
          onDoubleClick={() => setCollapsed(false)}
          className={`group flex items-center gap-2 pl-3 pr-4 py-2.5 bg-[#1A1A1A]/95 hover:bg-[#B4593F] text-white rounded-full shadow-2xl backdrop-blur transition-all ${showPlayHint ? 'ring-2 ring-[#E88864] animate-pulse' : ''}`}
          aria-label={playing ? 'Pause ambient music' : 'Play ambient music'}
          data-testid="music-widget-toggle"
        >
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#B4593F] group-hover:bg-white/20 transition-colors">
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 pl-0.5" />}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em]">{playing ? 'Playing' : 'Music'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label="Expand music player"
            data-testid="music-widget-expand"
          >
            <Music className="w-3 h-3" />
          </button>
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
            Hide for this session
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicWidget;
