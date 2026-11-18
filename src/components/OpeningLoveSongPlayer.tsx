import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Volume2,
  VolumeX,
  Heart,
  Music,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Globe,
  Radio,
  Search,
  X,
  Flame,
  Bell,
  BellOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LoveSong,
  TRENDING_LOVE_SONGS,
  WORLD_LOVE_REGIONS,
  WorldLoveRegion,
} from '../data/loveSongsData';
import { loveSongAudioService } from '../services/loveSongAudioService';
import { appSoundService } from '../services/appSoundService';

interface OpeningLoveSongPlayerProps {
  onOpenJamSession?: () => void;
  isVisible?: boolean;
  onDismiss?: () => void;
}

export const OpeningLoveSongPlayer: React.FC<OpeningLoveSongPlayerProps> = ({
  onOpenJamSession,
  isVisible = true,
  onDismiss,
}) => {
  const [localDismissed, setLocalDismissed] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<LoveSong>(TRENDING_LOVE_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const [activeRegion, setActiveRegion] = useState<WorldLoveRegion>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPopupMuted, setIsPopupMuted] = useState<boolean>(() =>
    appSoundService.getIsPopupSoundMuted()
  );

  useEffect(() => {
    // Subscribe to sound service
    const unsubSound = appSoundService.subscribe((muted) => {
      setIsPopupMuted(muted);
    });

    // Subscribe to service
    const unsubscribe = loveSongAudioService.subscribe((song, playing, prog) => {
      setCurrentSong(song);
      setIsPlaying(playing);
      setProgress(prog);
    });

    // Attempt direct playback; if browser autoplay policy delays it, resume on first user interaction
    loveSongAudioService.playSong(TRENDING_LOVE_SONGS[0]).catch(() => {
      const handleFirstInteraction = () => {
        loveSongAudioService.playSong(TRENDING_LOVE_SONGS[0]);
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      };
      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('touchstart', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });
    });

    return () => {
      unsubSound();
      unsubscribe();
    };
  }, []);

  const handleTogglePlay = () => {
    loveSongAudioService.togglePlay();
  };

  const filteredSongs = useMemo(() => {
    return TRENDING_LOVE_SONGS.filter((s) => {
      const matchesRegion = activeRegion === 'all' || s.region === activeRegion;
      if (!matchesRegion) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.countryLabel.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.featuredQuote.toLowerCase().includes(q)
      );
    });
  }, [activeRegion, searchQuery]);

  const handleNext = () => {
    loveSongAudioService.nextSong(filteredSongs);
  };

  const handlePrev = () => {
    loveSongAudioService.prevSong(filteredSongs);
  };

  const handleShuffle = () => {
    loveSongAudioService.shuffleSong(filteredSongs);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    loveSongAudioService.setVolume(nextMuted ? 0 : 0.75);
  };

  const handleRemoveBar = () => {
    setShowPlaylist(false);
    if (onDismiss) {
      onDismiss();
    } else {
      setLocalDismissed(true);
    }
  };

  if (!isVisible || (onDismiss === undefined && localDismissed)) {
    return null;
  }

  return (
    <aside
      aria-label="Worldwide Trending Love Songs Player"
      className="fixed top-16 right-3 sm:right-6 z-40 max-w-sm w-[92vw] sm:w-92 pointer-events-auto select-none"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        className="bg-[#141026]/95 backdrop-blur-2xl border-2 border-pink-500/40 rounded-3xl shadow-2xl shadow-pink-950/50 overflow-hidden text-left"
      >
        {/* Progress Bar Header */}
        <div className="w-full bg-white/10 h-1.5 relative overflow-hidden">
          <div
            className="bg-gradient-to-r from-pink-500 via-rose-400 to-amber-400 h-full transition-all duration-300 shadow-sm shadow-pink-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Player Header Bar */}
        <div className="p-3 flex items-center justify-between gap-2.5">
          {/* Album Cover with animated vinyl glow */}
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-pink-400/50 shadow-lg group">
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isPlaying ? 'scale-105' : ''
              }`}
            />
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <span className="text-sm drop-shadow">{currentSong.flag}</span>
            </div>
            {isPlaying && (
              <div className="absolute inset-0 ring-2 ring-pink-400/80 rounded-2xl animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-1.5 py-0.2 rounded-md bg-pink-500/25 text-pink-300 font-mono text-[9px] font-extrabold border border-pink-400/40 flex items-center gap-1">
                <span>{currentSong.flag}</span>
                <span>{currentSong.countryLabel}</span>
              </span>
              <span className="text-[9.5px] text-zinc-400 font-mono truncate">
                {currentSong.language}
              </span>
              {currentSong.isTrending && (
                <span className="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono text-[8.5px] font-bold border border-amber-400/30 flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  HOT
                </span>
              )}
            </div>
            <h4 className="text-xs font-black text-white truncate drop-shadow-sm">
              {currentSong.title}
            </h4>
            <p className="text-[10.5px] text-zinc-300 font-medium truncate">
              {currentSong.artist}
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="w-8.5 h-8.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/30 cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play Worldwide Love Song'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            {/* Next Song */}
            <button
              onClick={handleNext}
              className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Next Love Song"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Toggle Playlist / Expand */}
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`p-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                showPlaylist
                  ? 'text-pink-300 bg-pink-500/25 border border-pink-400/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
              title="Browse Worldwide Love Songs Catalog"
            >
              <Music className="w-4 h-4" />
            </button>

            {/* Mute Music toggle */}
            <button
              onClick={handleToggleMute}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Selected Music' : 'Mute Selected Music'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Pop-up Sounds Mute Toggle: Mutes app pop-ups while music continues */}
            <button
              onClick={() => appSoundService.togglePopupSoundMuted()}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                isPopupMuted
                  ? 'text-amber-400 bg-amber-500/20 border border-amber-400/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={
                isPopupMuted
                  ? 'App pop-up sounds are muted (Selected music plays uninterrupted)'
                  : 'Mute pop-up sounds (Keep selected music playing)'
              }
            >
              {isPopupMuted ? (
                <BellOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              title={isMinimized ? 'Expand Player' : 'Collapse'}
              aria-label={isMinimized ? 'Expand Music Bar' : 'Collapse Music Bar'}
            >
              {isMinimized ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            {/* Remove / Dismiss Floating Music Bar */}
            <button
              onClick={handleRemoveBar}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/50 text-zinc-300 hover:text-rose-200 transition-all cursor-pointer"
              title="Remove music bar (restore anytime from Audio menu)"
              aria-label="Remove music bar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audio Reactive Pulse Bar & Romantic Lyrics Quote */}
        {!isMinimized && (
          <div className="px-3 pb-2 pt-1 flex items-center justify-between text-[9.5px] font-mono text-zinc-400 border-t border-white/10 bg-black/30 gap-2">
            <div className="flex items-center gap-1.5 text-pink-300 min-w-0 pr-1">
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <span className={`w-1 h-2 rounded bg-pink-400 ${isPlaying ? 'animate-bounce' : ''}`} />
                <span className={`w-1 h-3 rounded bg-rose-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                <span className={`w-1 h-2.5 rounded bg-amber-400 ${isPlaying ? 'animate-bounce' : ''}`} />
              </span>
              <div className="min-w-0">
                <p className="italic truncate text-[9.5px] text-pink-200">
                  {currentSong.featuredQuote}
                </p>
                {currentSong.translation && (
                  <p className="text-[8.5px] text-zinc-400 truncate">
                    ≈ &quot;{currentSong.translation}&quot;
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => appSoundService.togglePopupSoundMuted()}
                className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  isPopupMuted
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                }`}
                title={
                  isPopupMuted
                    ? 'Pop-up sounds muted (music playing)'
                    : 'Click to mute app pop-up sounds'
                }
              >
                {isPopupMuted ? (
                  <BellOff className="w-2.5 h-2.5 text-amber-400" />
                ) : (
                  <Bell className="w-2.5 h-2.5" />
                )}
                <span>{isPopupMuted ? 'Popups Muted' : 'Popups On'}</span>
              </button>
              {onOpenJamSession && (
                <button
                  onClick={onOpenJamSession}
                  className="text-cyan-300 font-bold hover:text-cyan-200 transition-colors flex items-center gap-0.5 flex-shrink-0"
                >
                  VR Jam →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Playlist & Worldwide Regions Drawer */}
        <AnimatePresence>
          {showPlaylist && !isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/15 p-3 bg-black/85 space-y-2.5 max-h-72 overflow-y-auto"
            >
              {/* Header with Title & Quick Shuffle Button */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-white font-black uppercase tracking-wider text-[11px]">
                    World Love Songs ({filteredSongs.length})
                  </span>
                </div>
                <button
                  onClick={handleShuffle}
                  className="px-2 py-0.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold border border-pink-400/40 flex items-center gap-1 transition-all cursor-pointer"
                  title="Shuffle World Songs"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* Search Bar for Songs, Artists, Countries, Languages */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search song, artist, Kenya, Latin, K-Pop, Swahili..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Worldwide Regions Filter Carousel / Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono">
                {WORLD_LOVE_REGIONS.map((region) => {
                  const isSelected = activeRegion === region.id;
                  return (
                    <button
                      key={region.id}
                      onClick={() => setActiveRegion(region.id)}
                      className={`px-2 py-1 rounded-xl text-[10px] font-bold flex-shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-500/30'
                          : 'bg-white/5 text-zinc-400 hover:text-white border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span>{region.flag}</span>
                      <span>{region.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Songs List */}
              <div className="space-y-1.5 pt-1">
                {filteredSongs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400 font-mono bg-white/5 rounded-2xl">
                    No love songs found matching &quot;{searchQuery}&quot;. Try another country or artist!
                  </div>
                ) : (
                  filteredSongs.map((song) => {
                    const isCurrent = song.id === currentSong.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => loveSongAudioService.playSong(song)}
                        className={`p-2 rounded-2xl flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-gradient-to-r from-pink-500/25 via-purple-500/20 to-black border border-pink-400/50 text-white shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Mini Album Art */}
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
                            <img
                              src={song.coverUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-[10px]">
                              {song.flag}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11.5px] font-bold truncate text-white">
                                {song.title}
                              </p>
                              {song.isTrending && (
                                <span className="text-[8px] font-mono px-1 rounded bg-amber-400/20 text-amber-300">
                                  Trending
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {song.artist} • <span className="text-zinc-500">{song.countryLabel}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                          <span className="text-[9px] text-zinc-500">{song.bpm} BPM</span>
                          {isCurrent && isPlaying ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
                          ) : (
                            <Play className="w-3 h-3 text-zinc-500 group-hover:text-white" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </aside>
  );
};
