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
  const [muted, setMuted] = useState(persisted.muted ?? true); // start muted → HTML5 autoplay is allowed on all browsers
  const [volume, setVolume] = useState(persisted.volume ?? 0.30);
  const [collapsed, setCollapsed] = useState(persisted.collapsed ?? true);
  const [hidden, setHidden] = useState(persisted.hidden ?? false);
  // Welcome prompt: shown on the very first visit until the user makes a choice.
  const [askedPref, setAskedPref] = useState(persisted.askedPref ?? false);
  const [showPrompt, setShowPrompt] = useState(false);
  const audioRef = useRef(null);
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

  // Persist widget state (volume, muted, collapsed, hidden, playing, askedPref) — used on the next visit.
  useEffect(() => {
    writeState({ volume, muted, collapsed, hidden, wantsPlay: playing, askedPref });
  }, [volume, muted, collapsed, hidden, playing, askedPref]);

  // Autoplay attempt (on arrival). Runs once when settings arrive and playback isn't explicitly hidden.
  useEffect(() => {
    if (!settings?.enabled || !settings.url || hidden) return;
    if (autoplayTriedRef.current) return;
    autoplayTriedRef.current = true;
    const a = audioRef.current;
    if (!a) return;

    // Returning visitor who declined the welcome prompt → don't play anything.
    if (askedPref && persisted.wantsPlay === false) { a.pause(); return; }

    // Returning visitor who accepted → resume playback unmuted at their volume.
    if (askedPref && persisted.wantsPlay !== false) {
      a.muted = false;
      a.volume = volume;
      a.play().catch(() => {
        // Rare edge — recover on next gesture.
        a.muted = true; a.play().catch(() => {});
        armUnmuteOnGesture();
      });
      return;
    }

    // First-time visitor → show the welcome prompt. Meanwhile HTML5 autoPlay muted is running in the background.
    setShowPrompt(true);
  }, [settings, hidden]);

  // User's choice from the welcome prompt.
  const acceptMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = false;
    a.volume = 0.30;
    a.play().catch(() => {});
    setMuted(false);
    setVolume(0.30);
    setAskedPref(true);
    setShowPrompt(false);
  };
  const declineMusic = () => {
    const a = audioRef.current;
    if (a) a.pause();
    setPlaying(false);
    setAskedPref(true);
    setShowPrompt(false);
  };

  // Unmute + resume playback on the FIRST user signal — mousemove, scroll,
  // click, keydown, or touchstart. In practice mousemove fires within ~200ms
  // of page load on desktop, so the visitor perceives it as immediate autoplay.
  const armUnmuteOnGesture = () => {
    const events = ['mousemove', 'pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'];
    const unmute = () => {
      const a = audioRef.current;
      if (a) {
        a.muted = false;
        a.volume = volume || 0.30;
        if (a.paused) { a.play().catch(() => {}); }
      }
      setMuted(false);
      events.forEach(ev => window.removeEventListener(ev, unmute, true));
    };
    events.forEach(ev => window.addEventListener(ev, unmute, { capture: true, once: true, passive: true }));
  };

  if (!settings || !settings.enabled || !settings.url || hidden) return null;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (playing) { a.pause(); setPlaying(false); }
      else { a.muted = muted; await a.play(); setPlaying(true); }
      setCollapsed(false);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 select-none"
      data-testid="music-widget"
    >
      <audio
        ref={audioRef}
        src={settings.url}
        loop
        autoPlay
        muted
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => { if (!hidden) setPlaying(false); }}
      />

      {/* First-visit welcome prompt — a click here counts as a user gesture,
          so we can start audio unmuted immediately after "Yes, play". */}
      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) declineMusic(); }}
          data-testid="music-welcome-modal"
        >
          <div className="w-full sm:w-[440px] mx-4 mb-4 sm:mb-0 bg-[#FDF3EB] rounded-3xl shadow-2xl overflow-hidden border border-[#EBD9CE]">
            <div className="relative bg-gradient-to-br from-[#F5D0CE] via-[#FDF3EB] to-[#EBD9CE] px-8 pt-8 pb-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white shadow-lg flex items-center justify-center border border-[#EBD9CE]">
                <Music className="w-7 h-7 text-[#B4593F]" />
              </div>
              <h3 className="mt-5 font-serif-display text-2xl md:text-3xl text-[#1A1A1A] leading-tight">
                A little <span className="italic text-[#B4593F]">hope</span> in your ears?
              </h3>
              <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
                We&apos;ve set aside a gentle worship track to keep you company while you browse. Softly, at 30% volume.
              </p>
            </div>
            <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={acceptMusic}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] transition-colors"
                data-testid="music-welcome-accept"
                autoFocus
              >
                <Play className="w-3.5 h-3.5" /> Yes, play softly
              </button>
              <button
                onClick={declineMusic}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F5D0CE]/60 text-[#1A1A1A] border border-[#EBD9CE] px-5 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] transition-colors"
                data-testid="music-welcome-decline"
              >
                No, thanks
              </button>
            </div>
            <div className="px-6 pb-5 text-center text-[10px] text-neutral-500">
              You can pause anytime from the player at the bottom-right.
            </div>
          </div>
        </div>
      )}

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
