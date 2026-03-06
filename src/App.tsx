import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useMotionTemplate } from 'motion/react';
import { Home, Search, Library, Play, Pause, SkipForward, SkipBack, ChevronDown, Repeat, Shuffle, Heart, ListMusic, Plus, X, Mic2, User, Users, Download, CheckCircle2, Loader2, MoreVertical, Share2, Settings, Bell, Wifi, Shield, LogOut, ChevronRight, Smartphone } from 'lucide-react';
import { io } from 'socket.io-client';
import { usePlayerStore, Song } from './store/usePlayerStore';
import { useLibraryStore } from './store/useLibraryStore';
import { useDownloadStore } from './store/useDownloadStore';
import { useNotificationStore } from './store/useNotificationStore';
import { useAuthStore } from './store/useAuthStore';
import { signInWithGoogle, logOut, auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchTamilMusic, fetchRecommendations } from './services/api';
import { LyricsDisplay } from './components/LyricsDisplay';

// --- Components ---

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-red-900/30 pb-safe pt-2 px-6 z-40">
      <div className="flex justify-between items-center max-w-md mx-auto h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center w-16 transition-colors ${
                isActive ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const MiniPlayer = () => {
  const { currentSong, isPlaying, togglePlay, setPlayerOpen, progress, duration, isPlayerOpen } = usePlayerStore();
  
  if (!currentSong || isPlayerOpen) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-[72px] left-2 right-2 z-40"
    >
      <div 
        onClick={() => setPlayerOpen(true)}
        className="bg-zinc-900/90 backdrop-blur-xl border border-red-900/30 rounded-xl p-2 flex items-center gap-3 shadow-2xl cursor-pointer overflow-hidden relative"
      >
        {/* Progress Bar Background */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-white/10 w-full" />
        <div 
          className="absolute bottom-0 left-0 h-[2px] bg-red-600 transition-all duration-300 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />

        {currentSong.artworkUrl ? (
          <img 
            src={currentSong.artworkUrl} 
            alt={currentSong.title} 
            className="w-10 h-10 rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-500">
            <ListMusic size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{currentSong.title}</h4>
          <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="p-2 text-white hover:text-red-400 transition-colors"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>
    </motion.div>
  );
};

const InteractiveAlbumArt = ({ song, isPlaying, onNext, onPrevious }: { song: Song, isPlaying: boolean, onNext: () => void, onPrevious: () => void }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const isDragging = useRef(false);

  // More fluid spring configuration
  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const rotateX = useTransform(springY, [-200, 200], [20, -20]);
  const rotateY = useTransform(springX, [-200, 200], [-20, 20]);
  
  const glareX = useTransform(springX, [-200, 200], ['-150%', '150%']);
  const glareY = useTransform(springY, [-200, 200], ['-150%', '150%']);

  const shadowX = useTransform(springX, [-200, 200], [20, -20]);
  const shadowY = useTransform(springY, [-200, 200], [20, -20]);
  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 40px rgba(0,0,0,0.6)`;

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (isDragging.current) return;
      
      const gamma = event.gamma || 0; // Left/Right
      const beta = event.beta || 0;   // Front/Back

      // Assume device is held at a ~45 degree angle
      const adjustedBeta = beta - 45;
      
      // Clamp values to prevent extreme rotation
      const clampedGamma = Math.max(-30, Math.min(30, gamma));
      const clampedBeta = Math.max(-30, Math.min(30, adjustedBeta));

      // Map to [-200, 200] range
      x.set(clampedGamma * (200 / 30));
      y.set(clampedBeta * (200 / 30));
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [x, y]);

  // Desktop hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from center [-200, 200]
    const moveX = ((e.clientX - centerX) / (rect.width / 2)) * 200;
    const moveY = ((e.clientY - centerY) / (rect.height / 2)) * 200;
    
    x.set(moveX);
    y.set(moveY);
  };

  const handleMouseLeave = () => {
    if (isDragging.current) return;
    x.set(0);
    y.set(0);
  };

  const lastTap = useRef(0);
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const rect = e.currentTarget.getBoundingClientRect();
      let clientX;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = (e as React.MouseEvent).clientX;
      }
      
      const isRightSide = clientX > rect.left + rect.width / 2;
      const { progress, duration, setProgress } = usePlayerStore.getState();
      
      if (isRightSide) {
        // Skip forward 10s
        const newTime = Math.min(progress + 10, duration);
        setProgress(newTime);
        window.dispatchEvent(new CustomEvent('seek', { detail: newTime }));
      } else {
        // Skip backward 10s
        const newTime = Math.max(progress - 10, 0);
        setProgress(newTime);
        window.dispatchEvent(new CustomEvent('seek', { detail: newTime }));
      }
    }
    lastTap.current = now;
  };

  return (
    <div className="flex-1 flex items-center justify-center mb-8 relative" style={{ perspective: 1200 }}>
      {/* Glowing Backdrop */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <motion.div
          className="w-[300px] h-[300px] rounded-full blur-[80px] opacity-60 mix-blend-screen"
          style={{
            backgroundImage: `url(${song.artworkUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          animate={{
            rotate: isPlaying ? 360 : 0,
            scale: isPlaying ? [1.1, 1.3, 1.1] : 1,
          }}
          transition={{
            rotate: { repeat: Infinity, duration: 20, ease: "linear" },
            scale: { repeat: Infinity, duration: 4, ease: "easeInOut" }
          }}
        />
      </motion.div>

      {/* Spinning Vinyl */}
      <motion.div
        className="absolute w-[280px] h-[280px] rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center"
        initial={false}
        animate={{ 
          x: isPlaying ? 60 : 0, 
          rotate: isPlaying ? 360 : 0,
          scale: isPlaying ? 1 : 0.8,
          opacity: isPlaying ? 1 : 0
        }}
        transition={{ 
          x: { type: 'spring', damping: 20 },
          scale: { type: 'spring', damping: 20 },
          opacity: { duration: 0.3 },
          rotate: { repeat: Infinity, duration: 4, ease: "linear" }
        }}
      >
        <div className="w-[260px] h-[260px] rounded-full border border-red-900/30 flex items-center justify-center">
          <div className="w-[240px] h-[240px] rounded-full border border-red-900/30 flex items-center justify-center">
            <div className="w-[100px] h-[100px] rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden relative">
              {song.artworkUrl ? (
                <img src={song.artworkUrl} className="w-full h-full object-cover opacity-50 blur-[2px]" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 opacity-50 blur-[2px]">
                  <ListMusic size={32} />
                </div>
              )}
              <div className="absolute w-4 h-4 bg-zinc-900 rounded-full border border-red-900/50" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3D Album Cover */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={() => {
          isDragging.current = true;
        }}
        onDrag={(e, info) => {
          x.set(info.offset.x);
          y.set(info.offset.y);
        }}
        onDragEnd={(e, info) => {
          isDragging.current = false;
          x.set(0);
          y.set(0);
          if (info.offset.x < -80) onNext();
          if (info.offset.x > 80) onPrevious();
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
        onTouchEnd={handleTap}
        style={{
          rotateX,
          rotateY,
          boxShadow,
          z: 50,
          transformStyle: 'preserve-3d'
        }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 w-full max-w-[320px] aspect-square rounded-2xl cursor-grab active:cursor-grabbing bg-zinc-900 border border-white/10"
      >
        <motion.img 
          src={song.artworkUrl} 
          alt={song.title} 
          className="w-full h-full object-cover rounded-2xl pointer-events-none"
          style={{ translateZ: 30 }}
        />
        
        {/* Glass Reflection */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/20" style={{ transform: 'translateZ(40px)' }} />
        
        {/* Glare Effect Wrapper */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" style={{ transform: 'translateZ(50px)' }}>
          <motion.div 
            className="absolute w-[200%] h-[200%] -left-[50%] -top-[50%] opacity-40 mix-blend-overlay"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 40%)',
              x: glareX,
              y: glareY,
            }}
          />
        </div>
        
        {/* Edge Highlight */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]" style={{ transform: 'translateZ(20px)' }} />
      </motion.div>
    </div>
  );
};

const FullScreenPlayer = () => {
  const { currentSong, queue, isPlaying, togglePlay, next, previous, isPlayerOpen, setPlayerOpen, progress, duration, setProgress, isShuffle, isRepeat, toggleShuffle, toggleRepeat, setCurrentSong, jamId, jamUsers } = usePlayerStore();
  const { toggleLike, isLiked } = useLibraryStore();
  const { downloadSong, isDownloaded, isDownloading } = useDownloadStore();
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showJam, setShowJam] = useState(false);
  
  if (!currentSong) return null;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = isLiked(currentSong.id);
  const downloaded = isDownloaded(currentSong.id);
  const downloading = isDownloading[currentSong.id];

  const startJam = () => {
    const newJamId = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.dispatchEvent(new CustomEvent('join-jam', { detail: newJamId }));
  };

  const leaveJam = () => {
    window.dispatchEvent(new CustomEvent('leave-jam'));
  };

  return (
    <AnimatePresence>
      {isPlayerOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.y > 100 || velocity.y > 500) {
              setPlayerOpen(false);
            }
          }}
          className="fixed inset-0 z-50 bg-zinc-900 flex flex-col"
        >
          {/* Dynamic Background Blur */}
          <div 
            className="absolute inset-0 opacity-40 blur-[80px] scale-150 pointer-events-none transition-all duration-1000 mix-blend-screen"
            style={{ 
              backgroundImage: `url(${currentSong.artworkUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-red-950/30 to-zinc-900/80 pointer-events-none" />

          <div className="relative z-10 flex-1 flex flex-col p-6 pt-12">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setPlayerOpen(false)} className="p-2 text-white/70 hover:text-white">
                <ChevronDown size={28} />
              </button>
              <span className="text-xs font-semibold tracking-widest text-red-500/70 uppercase">
                {showJam ? 'Jam Session' : showQueue ? 'Up Next' : showLyrics ? 'Lyrics' : 'Now Playing'}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setShowJam(!showJam);
                    if (!showJam) { setShowLyrics(false); setShowQueue(false); }
                  }} 
                  className={`p-2 transition-colors ${showJam || jamId ? 'text-red-500' : 'text-white/70 hover:text-white'}`}
                >
                  <Users size={24} />
                </button>
                <button 
                  onClick={() => {
                    setShowLyrics(!showLyrics);
                    if (!showLyrics) { setShowQueue(false); setShowJam(false); }
                  }} 
                  className={`p-2 transition-colors ${showLyrics ? 'text-red-500' : 'text-white/70 hover:text-white'}`}
                >
                  <Mic2 size={24} />
                </button>
                <button 
                  onClick={() => {
                    setShowQueue(!showQueue);
                    if (!showQueue) { setShowLyrics(false); setShowJam(false); }
                  }} 
                  className={`p-2 transition-colors ${showQueue ? 'text-red-500' : 'text-white/70 hover:text-white'}`}
                >
                  <ListMusic size={24} />
                </button>
              </div>
            </div>

            {showJam ? (
              <div className="flex-1 overflow-y-auto mb-8 bg-zinc-900/40 rounded-2xl p-6 backdrop-blur-md border border-red-900/30">
                <h3 className="text-xl font-bold text-white mb-6 text-center">Jam Session</h3>
                
                {jamId ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-zinc-900/80 border border-red-500/30 rounded-xl p-4 mb-6 w-full text-center">
                      <p className="text-zinc-400 text-sm mb-1">Session ID</p>
                      <p className="text-3xl font-mono font-bold text-red-500 tracking-widest">{jamId}</p>
                      <p className="text-xs text-zinc-500 mt-2">Share this ID with friends to listen together</p>
                    </div>
                    
                    <div className="w-full mb-6">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3">Listeners ({jamUsers.length})</h4>
                      <div className="flex flex-col gap-2">
                        {jamUsers.map((u: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center text-red-300 font-bold">
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </div>
                            <span className="text-white text-sm">{u.name || 'Anonymous User'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={leaveJam}
                      className="w-full py-3 rounded-xl border border-red-900/50 text-red-400 font-semibold hover:bg-red-900/20 transition-colors"
                    >
                      Leave Session
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/30">
                      <Users size={40} className="text-red-500" />
                    </div>
                    <p className="text-center text-zinc-400 px-4">
                      Start a Jam session to listen to music in sync with your friends.
                    </p>
                    <button 
                      onClick={startJam}
                      className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                    >
                      Start a Jam
                    </button>
                    
                    <div className="w-full relative flex items-center py-2">
                      <div className="flex-1 border-t border-zinc-800"></div>
                      <span className="px-4 text-zinc-500 text-sm">or join one</span>
                      <div className="flex-1 border-t border-zinc-800"></div>
                    </div>
                    
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('jamId') as HTMLInputElement;
                        if (input.value) {
                          window.dispatchEvent(new CustomEvent('join-jam', { detail: input.value.toUpperCase() }));
                        }
                      }}
                      className="w-full flex gap-2"
                    >
                      <input 
                        name="jamId"
                        type="text" 
                        placeholder="Enter Session ID" 
                        className="flex-1 bg-zinc-900/80 border border-zinc-700 text-white rounded-xl px-4 focus:outline-none focus:border-red-500 uppercase font-mono"
                        maxLength={6}
                      />
                      <button type="submit" className="px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors">
                        Join
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : showQueue ? (
              <div className="flex-1 overflow-y-auto mb-8 bg-zinc-900/40 rounded-2xl p-4 backdrop-blur-md border border-red-900/30 hide-scrollbar flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-white font-bold">Up Next</h3>
                  {queue.slice(queue.findIndex(s => s.id === currentSong.id) + 1).length > 1 && (
                    <button 
                      onClick={() => {
                        usePlayerStore.getState().shuffleQueue();
                        useNotificationStore.getState().showNotification('Queue shuffled');
                      }}
                      className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors bg-red-900/20 px-3 py-1.5 rounded-full"
                    >
                      <Shuffle size={14} />
                      Shuffle Queue
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {queue.slice(queue.findIndex(s => s.id === currentSong.id) + 1).map((song, idx) => {
                    const actualIndex = queue.findIndex(s => s.id === currentSong.id) + 1 + idx;
                    return (
                      <div key={`${song.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-900/20 transition-colors">
                        {song.artworkUrl ? (
                          <img src={song.artworkUrl} className="w-10 h-10 rounded object-cover" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <ListMusic size={16} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCurrentSong(song)}>
                          <h4 className="text-sm font-medium text-white truncate">{song.title}</h4>
                          <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                        </div>
                        <button 
                          onClick={() => usePlayerStore.getState().removeFromQueue(actualIndex)}
                          className="p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )
                  })}
                  {queue.slice(queue.findIndex(s => s.id === currentSong.id) + 1).length === 0 && (
                    <div className="text-center text-zinc-500 mt-10 flex flex-col items-center gap-2">
                      <ListMusic size={32} className="opacity-50" />
                      <p>Queue is empty</p>
                    </div>
                  )}
                </div>
              </div>
            ) : showLyrics ? (
              <div className="flex-1 mb-8 bg-zinc-900/40 rounded-2xl backdrop-blur-md border border-red-900/30 overflow-hidden relative">
                 <LyricsDisplay />
              </div>
            ) : (
              <InteractiveAlbumArt 
                song={currentSong} 
                isPlaying={isPlaying} 
                onNext={next} 
                onPrevious={previous} 
              />
            )}

            {/* Song Info */}
            <div className="mb-8 flex justify-between items-end">
              <div className="flex-1 pr-4">
                <h2 className="text-2xl font-bold text-white mb-1 truncate">{currentSong.title}</h2>
                <p className="text-lg text-zinc-400 truncate">{currentSong.artist}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (!downloaded && !downloading) {
                      downloadSong(currentSong);
                    }
                  }}
                  className={`p-2 transition-colors ${downloaded ? 'text-green-500' : downloading ? 'text-zinc-400' : 'text-white/50 hover:text-white'}`}
                  disabled={downloaded || downloading}
                >
                  {downloading ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : downloaded ? (
                    <CheckCircle2 size={28} />
                  ) : (
                    <Download size={28} />
                  )}
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: currentSong.title,
                        text: `Listen to ${currentSong.title} by ${currentSong.artist}`,
                        url: window.location.href,
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(`${currentSong.title} by ${currentSong.artist} - ${window.location.href}`);
                      useNotificationStore.getState().showNotification('Link copied to clipboard');
                    }
                  }}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <Share2 size={28} />
                </button>
                <button 
                  onClick={() => toggleLike(currentSong)}
                  className={`p-2 transition-colors ${liked ? 'text-red-500' : 'text-white/50 hover:text-white'}`}
                >
                  <Heart size={28} fill={liked ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div 
                className="h-3 bg-red-900/30 rounded-full relative cursor-pointer group flex items-center"
                onPointerDown={(e) => {
                  const bounds = e.currentTarget.getBoundingClientRect();
                  const updateProgress = (clientX: number) => {
                    const x = Math.max(0, Math.min(clientX - bounds.left, bounds.width));
                    const percent = x / bounds.width;
                    const newTime = percent * duration;
                    setProgress(newTime);
                    window.dispatchEvent(new CustomEvent('seek', { detail: newTime }));
                  };
                  
                  updateProgress(e.clientX);
                  
                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    updateProgress(moveEvent.clientX);
                  };
                  
                  const handlePointerUp = () => {
                    window.removeEventListener('pointermove', handlePointerMove);
                    window.removeEventListener('pointerup', handlePointerUp);
                  };
                  
                  window.addEventListener('pointermove', handlePointerMove);
                  window.addEventListener('pointerup', handlePointerUp);
                }}
              >
                <div 
                  className="absolute left-0 h-1.5 bg-red-500 rounded-full pointer-events-none"
                  style={{ width: `${progressPercent}%` }}
                />
                <div 
                  className="absolute h-3 w-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mb-12">
              <button 
                onClick={toggleShuffle}
                className={`p-3 transition-colors ${isShuffle ? 'text-red-500' : 'text-white/50 hover:text-white'}`}
              >
                <Shuffle size={24} />
              </button>
              
              <button onClick={() => { previous(); useNotificationStore.getState().showNotification('Skipped to previous song'); }} className="p-3 text-white hover:text-red-400 transition-colors">
                <SkipBack size={36} fill="currentColor" />
              </button>
              
              <button 
                onClick={togglePlay} 
                className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-red-600/20"
              >
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
              </button>
              
              <button onClick={() => { next(); useNotificationStore.getState().showNotification('Skipped to next song'); }} className="p-3 text-white hover:text-red-400 transition-colors">
                <SkipForward size={36} fill="currentColor" />
              </button>
              
              <button 
                onClick={toggleRepeat}
                className={`p-3 transition-colors ${isRepeat ? 'text-red-500' : 'text-white/50 hover:text-white'}`}
              >
                <Repeat size={24} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Views ---

const SongList = ({ songs, title, playlistId }: { songs: Song[], title: string, playlistId?: string }) => {
  const { setCurrentSong, setQueue, currentSong, isPlaying } = usePlayerStore();
  const { addToHistory, playlists, addSongToPlaylist, removeSongFromPlaylist } = useLibraryStore();
  const { downloadSong, isDownloaded, isDownloading, removeDownload } = useDownloadStore();
  const [showPlaylistsFor, setShowPlaylistsFor] = useState<string | null>(null);

  const handlePlay = (song: Song, index: number) => {
    setCurrentSong(song);
    setQueue(songs);
    addToHistory(song);
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 px-4">{title}</h2>
      <div className="flex flex-col gap-2 px-4">
        {songs.map((song, idx) => {
          const isCurrent = currentSong?.id === song.id;
          const downloaded = isDownloaded(song.id);
          const downloading = isDownloading[song.id];

          return (
            <div key={song.id} className="relative">
              <div 
                onClick={() => handlePlay(song, idx)}
                className={`flex items-center gap-4 p-2 rounded-xl transition-colors cursor-pointer ${
                  isCurrent ? 'bg-red-900/20' : 'hover:bg-red-900/10'
                }`}
              >
                <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800">
                  {song.artworkUrl ? (
                    <img src={song.artworkUrl} alt={song.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <ListMusic size={20} />
                    </div>
                  )}
                  {isCurrent && isPlaying && (
                    <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                      <div className="flex gap-0.5 h-4 items-end">
                        <motion.div animate={{ height: ['20%', '100%', '40%'] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-red-600 rounded-t-sm" />
                        <motion.div animate={{ height: ['60%', '30%', '100%'] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-red-600 rounded-t-sm" />
                        <motion.div animate={{ height: ['100%', '50%', '80%'] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-red-600 rounded-t-sm" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-base font-medium truncate ${isCurrent ? 'text-red-500' : 'text-white'}`}>
                    {song.title}
                  </h4>
                  <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (downloaded) {
                        removeDownload(song.id);
                      } else if (!downloading) {
                        downloadSong(song);
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                    title={downloaded ? "Remove Download" : "Download"}
                  >
                    {downloading ? (
                      <Loader2 size={20} className="animate-spin text-red-500" />
                    ) : downloaded ? (
                      <CheckCircle2 size={20} className="text-red-500" />
                    ) : (
                      <Download size={20} />
                    )}
                  </button>

                  {playlistId ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSongFromPlaylist(playlistId, song.id);
                      }}
                      className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                      title="Remove from Playlist"
                    >
                      <X size={20} />
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlaylistsFor(showPlaylistsFor === song.id ? null : song.id);
                      }}
                      className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                      title="More Options"
                    >
                      <MoreVertical size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Playlist Selection Dropdown */}
              {showPlaylistsFor === song.id && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-2 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      usePlayerStore.getState().addToQueue(song);
                      useNotificationStore.getState().showNotification(`Added "${song.title}" to queue`);
                      setShowPlaylistsFor(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    Add to Queue
                  </button>
                  <div className="h-px bg-zinc-800 my-1" />
                  <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Add to Playlist</div>
                  {playlists.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-zinc-400">No playlists yet</div>
                  ) : (
                    playlists.map(p => (
                      <button
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          addSongToPlaylist(p.id, song);
                          useNotificationStore.getState().showNotification(`Added to "${p.name}"`);
                          setShowPlaylistsFor(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-800 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AppLogo = () => (
  <div className="flex items-center gap-4 mb-2">
    <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.4)] overflow-hidden group">
      <div className="absolute inset-0 bg-red-500/20 blur-xl group-hover:bg-red-500/40 transition-colors duration-500" />
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        className="absolute w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(239,68,68,0.5)_360deg)] opacity-50"
      />
      <div className="absolute inset-[2px] bg-zinc-900 rounded-[14px] flex items-center justify-center">
        <ListMusic className="text-red-500 relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" size={28} />
      </div>
    </div>
    <div className="flex flex-col">
      <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-orange-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] leading-none">
        SK MUSIC
      </h1>
      <span className="text-[10px] font-bold text-red-500/80 tracking-[0.3em] uppercase mt-1">Premium Audio</span>
    </div>
  </div>
);

const HomeView = () => {
  const [trending, setTrending] = useState<Song[]>([]);
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { history, likedSongs } = useLibraryStore();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [trendData, newData, recData] = await Promise.all([
        fetchTamilMusic('tamil hit songs', 10),
        fetchTamilMusic('latest tamil songs 2024', 10),
        fetchRecommendations(history, likedSongs)
      ]);
      setTrending(trendData);
      setNewReleases(newData);
      setRecommendations(recData);
      setLoading(false);
    };
    loadData();
  }, [history, likedSongs]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500">Loading Tamil Hits...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="flex-1 overflow-y-auto pb-32 pt-12"
    >
      <div className="px-4 mb-8">
        <AppLogo />
        <p className="text-zinc-400 mt-2">Discover Tamil Music</p>
      </div>
      
      {/* Featured Carousel (Simplified) */}
      <div className="px-4 mb-8 flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar">
        {trending.slice(0, 5).map((song) => (
          <div 
            key={song.id} 
            onClick={() => {
              usePlayerStore.getState().setCurrentSong(song);
              usePlayerStore.getState().setQueue(trending);
              useLibraryStore.getState().addToHistory(song);
            }}
            className="snap-center shrink-0 w-64 aspect-video rounded-2xl overflow-hidden relative cursor-pointer"
          >
            {song.artworkUrl ? (
              <img src={song.artworkUrl} alt={song.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                <ListMusic size={32} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-white font-bold truncate">{song.title}</h3>
              <p className="text-zinc-300 text-sm truncate">{song.artist}</p>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <SongList title="Recommended for You" songs={recommendations} />
      )}
      <SongList title="Trending Now" songs={trending} />
      <SongList title="New Releases" songs={newReleases} />
    </motion.div>
  );
};

const SearchView = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const { history, likedSongs } = useLibraryStore();

  useEffect(() => {
    const savedHistory = localStorage.getItem('music_search_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
    
    const loadRecommendations = async () => {
      const recs = await fetchRecommendations(history, likedSongs);
      setRecommendations(recs.slice(0, 10));
    };
    loadRecommendations();
  }, [history, likedSongs]);

  const saveSearchToHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    const newHistory = [searchTerm, ...searchHistory.filter(item => item !== searchTerm)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('music_search_history', JSON.stringify(newHistory));
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(item => item !== itemToRemove);
    setSearchHistory(newHistory);
    localStorage.setItem('music_search_history', JSON.stringify(newHistory));
  };

  useEffect(() => {
    const search = async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      const data = await fetchTamilMusic(`tamil ${query}`, 50);
      setResults(data);
      setLoading(false);
      
      // Save to history when results are found
      if (data.length > 0) {
        saveSearchToHistory(query);
      }
    };

    const debounce = setTimeout(search, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="flex-1 flex flex-col pt-12 pb-32"
    >
      <div className="px-4 mb-6 sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md py-4">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder="Artists, songs, or podcasts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full bg-zinc-900/50 border border-red-900/30 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isFocused && query.length < 3 && searchHistory.length > 0 ? (
          <div className="px-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-zinc-400">Recent Searches</h3>
              <button 
                onClick={() => {
                  setSearchHistory([]);
                  localStorage.removeItem('music_search_history');
                }}
                className="text-xs text-red-500 hover:text-red-400 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {searchHistory.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setQuery(item)}
                  className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-zinc-500" />
                    <span className="text-white text-sm">{item}</span>
                  </div>
                  <button 
                    onClick={(e) => removeHistoryItem(e, item)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="text-center text-zinc-500 mt-10">Searching...</div>
        ) : results.length > 0 ? (
          <SongList title="Top Results" songs={results} />
        ) : query.length >= 3 ? (
          <div className="text-center text-zinc-500 mt-10">No results found for "{query}"</div>
        ) : (
          <div className="flex flex-col gap-8 pb-8">
            <div className="px-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">Browse Categories</h3>
              <div className="grid grid-cols-2 gap-4">
                {['Kollywood', 'Indie', 'Devotional', 'Folk'].map((cat, i) => (
                  <div 
                    key={cat} 
                    onClick={() => setQuery(cat)}
                    className={`aspect-video rounded-xl p-4 flex items-end cursor-pointer hover:scale-105 transition-transform ${
                      ['bg-purple-600', 'bg-blue-600', 'bg-orange-600', 'bg-red-600'][i]
                    }`}
                  >
                    <span className="text-white font-bold">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {recommendations.length > 0 && (
              <SongList title="Recommended for You" songs={recommendations} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const LibraryView = () => {
  const { likedSongs, history, playlists, createPlaylist, deletePlaylist } = useLibraryStore();
  const { downloadedSongs } = useDownloadStore();
  const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'playlists' | 'downloads'>('playlists');
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const viewingPlaylist = playlists.find(p => p.id === viewingPlaylistId);

  if (viewingPlaylist) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex-1 flex flex-col pt-12 pb-32"
      >
        <div className="px-4 mb-6 flex items-center gap-4">
          <button onClick={() => setViewingPlaylistId(null)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
            <ChevronDown className="rotate-90" size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white truncate">{viewingPlaylist.name}</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {viewingPlaylist.songs.length > 0 ? (
            <SongList title={`${viewingPlaylist.songs.length} songs`} songs={viewingPlaylist.songs} playlistId={viewingPlaylist.id} />
          ) : (
            <div className="text-center text-zinc-500 mt-10">This playlist is empty.</div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="flex-1 flex flex-col pt-12 pb-32"
    >
      <div className="px-4 mb-6">
        <h1 className="text-3xl font-bold text-red-500 mb-6">Your Library</h1>
        <div className="flex gap-4 border-b border-red-900/30 pb-2 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('playlists')}
            className={`text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'playlists' ? 'text-white border-b-2 border-red-500' : 'text-zinc-500'}`}
          >
            Playlists
          </button>
          <button 
            onClick={() => setActiveTab('liked')}
            className={`text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'liked' ? 'text-white border-b-2 border-red-500' : 'text-zinc-500'}`}
          >
            Liked Songs
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'history' ? 'text-white border-b-2 border-red-500' : 'text-zinc-500'}`}
          >
            Recently Played
          </button>
          <button 
            onClick={() => setActiveTab('downloads')}
            className={`text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'downloads' ? 'text-white border-b-2 border-red-500' : 'text-zinc-500'}`}
          >
            Downloads
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'playlists' ? (
          <div className="px-4">
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">Create Playlist</span>
            </button>

            {isCreating && (
              <form onSubmit={handleCreatePlaylist} className="mb-6 bg-zinc-900/50 p-4 rounded-xl border border-red-900/30">
                <input
                  type="text"
                  placeholder="Playlist Name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-lg py-2 px-3 focus:outline-none focus:border-red-500 mb-3"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newPlaylistName.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 gap-4">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  onClick={() => setViewingPlaylistId(playlist.id)}
                  className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 hover:border-red-900/50 transition-colors relative group cursor-pointer"
                >
                  <div className="aspect-square rounded-lg bg-zinc-800 mb-3 flex items-center justify-center overflow-hidden">
                    {playlist.songs.length > 0 && playlist.songs[0].artworkUrl ? (
                      <img src={playlist.songs[0].artworkUrl} className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <ListMusic size={32} className="text-zinc-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-white truncate">{playlist.name}</h3>
                  <p className="text-xs text-zinc-400">{playlist.songs.length} songs</p>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlaylist(playlist.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-zinc-900/60 rounded-full text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            {playlists.length === 0 && !isCreating && (
              <div className="text-center text-zinc-500 mt-10">No playlists yet.</div>
            )}
          </div>
        ) : activeTab === 'liked' ? (
          likedSongs.length > 0 ? (
            <SongList title={`${likedSongs.length} songs`} songs={likedSongs} />
          ) : (
            <div className="text-center text-zinc-500 mt-10">No liked songs yet.</div>
          )
        ) : activeTab === 'downloads' ? (
          Object.values(downloadedSongs).length > 0 ? (
            <SongList title={`${Object.values(downloadedSongs).length} downloaded songs`} songs={Object.values(downloadedSongs)} />
          ) : (
            <div className="text-center text-zinc-500 mt-10">No downloaded songs yet.</div>
          )
        ) : (
          history.length > 0 ? (
            <SongList title="Recent" songs={history} />
          ) : (
            <div className="text-center text-zinc-500 mt-10">No listening history.</div>
          )
        )}
      </div>
    </motion.div>
  );
};

const ProfileView = () => {
  const { user, isLoading } = useAuthStore();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Preferences State
  const [audioQuality, setAudioQuality] = useState('High');
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Failed to login with Google', err);
      setAuthError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('Email authentication is currently disabled. Please use Google Sign-In.');
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <div 
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${checked ? 'bg-red-600' : 'bg-zinc-700'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
    </div>
  );

  const SettingRow = ({ icon: Icon, title, subtitle, rightElement, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between py-4 border-b border-zinc-800/50 ${onClick ? 'cursor-pointer hover:bg-zinc-800/30 -mx-4 px-4 transition-colors' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
          <Icon size={20} />
        </div>
        <div>
          <div className="text-white font-medium">{title}</div>
          {subtitle && <div className="text-sm text-zinc-500">{subtitle}</div>}
        </div>
      </div>
      <div>
        {rightElement || (onClick && <ChevronRight size={20} className="text-zinc-600" />)}
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="flex-1 flex flex-col pt-12 pb-32 px-4 overflow-y-auto hide-scrollbar"
    >
      <h1 className="text-3xl font-bold text-red-500 mb-8 px-2">Profile</h1>
      
      {isLoading ? (
        <div className="text-center text-zinc-500 mt-10">Loading...</div>
      ) : user ? (
        <div className="flex flex-col w-full max-w-md mx-auto">
          {/* Profile Header */}
          <div className="flex items-center gap-6 mb-10 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-24 h-24 rounded-full border-2 border-red-500 object-cover shadow-lg shadow-red-900/20" loading="lazy" />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-red-500 bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-lg shadow-red-900/20">
                <User size={40} />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{user.displayName || 'User'}</h2>
              <p className="text-zinc-400 text-sm mb-3">{user.email}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium uppercase tracking-wider">
                Free Plan
              </div>
            </div>
          </div>
          
          {/* Preferences Sections */}
          <div className="space-y-8">
            
            {/* Playback Settings */}
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">Playback</h3>
              <div className="bg-zinc-900/40 rounded-3xl p-4 border border-zinc-800/50">
                <SettingRow 
                  icon={Wifi} 
                  title="Audio Quality" 
                  subtitle="Streaming quality on Wi-Fi"
                  rightElement={<span className="text-red-400 font-medium text-sm">{audioQuality}</span>}
                  onClick={() => setAudioQuality(q => q === 'High' ? 'Normal' : q === 'Normal' ? 'Low' : 'High')}
                />
                <SettingRow 
                  icon={Smartphone} 
                  title="Data Saver" 
                  subtitle="Sets audio quality to low"
                  rightElement={<Toggle checked={dataSaver} onChange={() => setDataSaver(!dataSaver)} />}
                />
                <SettingRow 
                  icon={Download} 
                  title="Download over Wi-Fi only" 
                  rightElement={<Toggle checked={downloadWifiOnly} onChange={() => setDownloadWifiOnly(!downloadWifiOnly)} />}
                />
                <SettingRow 
                  icon={CheckCircle2} 
                  title="Offline Mode" 
                  subtitle="Only play downloaded songs"
                  rightElement={<Toggle checked={offlineMode} onChange={() => setOfflineMode(!offlineMode)} />}
                />
              </div>
            </section>

            {/* Account Settings */}
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">Account</h3>
              <div className="bg-zinc-900/40 rounded-3xl p-4 border border-zinc-800/50">
                <SettingRow 
                  icon={Bell} 
                  title="Notifications" 
                  subtitle="Push notifications for new releases"
                  rightElement={<Toggle checked={notifications} onChange={() => setNotifications(!notifications)} />}
                />
                <SettingRow 
                  icon={Shield} 
                  title="Privacy & Security" 
                  onClick={() => {}}
                />
                <SettingRow 
                  icon={Settings} 
                  title="App Settings" 
                  onClick={() => {}}
                />
              </div>
            </section>

            {/* Actions */}
            <section className="px-2 pt-4">
              <button 
                onClick={handleLogout}
                className="w-full py-4 rounded-2xl border border-red-900/50 text-red-400 font-bold hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Log Out
              </button>
              <p className="text-center text-zinc-600 text-xs mt-6">
                Music App v1.0.0
              </p>
            </section>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-sm mx-auto">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
            <User size={40} className="text-zinc-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-zinc-400 text-center mb-8 px-4">
            {authMode === 'login' 
              ? 'Sign in to access your saved songs and playlists.' 
              : 'Sign up to save your favorite songs and create playlists.'}
          </p>

          <form onSubmit={handleEmailAuth} className="w-full mb-6">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">
                {authError}
              </div>
            )}
            
            {authMode === 'signup' && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-red-900/30 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  required
                />
              </div>
            )}
            <div className="mb-4">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/50 border border-red-900/30 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-red-900/30 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="flex items-center w-full mb-6">
            <div className="flex-1 h-px bg-zinc-800"></div>
            <span className="px-4 text-zinc-500 text-sm">or</span>
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors mb-6"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Continue with Google
          </button>

          <p className="text-zinc-400 text-sm">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-red-500 hover:text-red-400 font-medium transition-colors"
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      )}
    </motion.div>
  );
};

// --- Main App ---

const socket = io();

interface ErrorBoundaryProps {
  children: React.ReactNode;
  key?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/50 text-white rounded-lg m-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <pre className="text-sm overflow-auto">{this.state.error?.toString()}</pre>
          <pre className="text-xs text-zinc-400 mt-2">{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { currentSong, isPlaying, setProgress, setDuration, next, jamId, setJamSession, syncJamState } = usePlayerStore();
  const { setUser, setIsLoading } = useAuthStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setIsLoading]);

  // Socket.io Jam Session Logic
  useEffect(() => {
    socket.on('jam-updated', (session) => {
      setJamSession(jamId, session.users);
      if (session.currentSong && !isPlaying) {
        syncJamState({
          currentSong: session.currentSong,
          isPlaying: session.isPlaying,
          progress: session.currentTime
        });
        if (audioRef.current) {
          audioRef.current.currentTime = session.currentTime;
        }
      }
    });

    socket.on('jam-sync-update', (state) => {
      syncJamState(state);
      if (audioRef.current && Math.abs(audioRef.current.currentTime - state.progress) > 2) {
        audioRef.current.currentTime = state.progress;
      }
    });

    const handleJoinJam = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const newJamId = customEvent.detail;
      const user = { name: 'User ' + Math.floor(Math.random() * 1000) }; // Basic mock user
      socket.emit('join-jam', { jamId: newJamId, user });
      setJamSession(newJamId, [user]);
    };

    const handleLeaveJam = () => {
      if (jamId) {
        socket.emit('leave-jam', { jamId });
        setJamSession(null, []);
      }
    };

    window.addEventListener('join-jam', handleJoinJam);
    window.addEventListener('leave-jam', handleLeaveJam);

    return () => {
      socket.off('jam-updated');
      socket.off('jam-sync-update');
      window.removeEventListener('join-jam', handleJoinJam);
      window.removeEventListener('leave-jam', handleLeaveJam);
    };
  }, [jamId]);

  // Sync state to server if we are the ones changing it
  useEffect(() => {
    if (jamId && currentSong) {
      socket.emit('jam-sync', {
        jamId,
        state: {
          currentSong,
          isPlaying,
          progress: audioRef.current?.currentTime || 0
        }
      });
    }
  }, [currentSong, isPlaying, jamId]);

  // Audio Engine Logic
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime);
          if ('mediaSession' in navigator && !isNaN(audioRef.current.duration)) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audioRef.current.duration,
                playbackRate: audioRef.current.playbackRate,
                position: audioRef.current.currentTime
              });
            } catch (e) {
              // Ignore errors if position state is invalid
            }
          }
        }
      });
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      });

      audioRef.current.addEventListener('ended', async () => {
        const { currentSong, queue, isRepeat, isShuffle, next, setQueue } = usePlayerStore.getState();
        
        if (!isRepeat && !isShuffle && currentSong) {
          const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
          if (currentIndex === queue.length - 1) {
            // Reached the end of the queue, fetch similar songs
            useNotificationStore.getState().showNotification('Fetching similar songs for auto-play...');
            try {
              const artist = currentSong.artist.split(',')[0].trim();
              const similarSongs = await fetchTamilMusic(`tamil ${artist}`, 10);
              const newSongs = similarSongs.filter(s => !queue.find(qs => qs.id === s.id));
              
              if (newSongs.length > 0) {
                setQueue([...queue, ...newSongs]);
                useNotificationStore.getState().showNotification('Added similar songs to queue');
              }
            } catch (error) {
              console.error('Failed to fetch similar songs', error);
            }
          }
        }
        next();
      });

      const handleSeek = (e: Event) => {
        const customEvent = e as CustomEvent<number>;
        if (audioRef.current) {
          audioRef.current.currentTime = customEvent.detail;
        }
      };
      window.addEventListener('seek', handleSeek);

      // Store cleanup function
      (audioRef.current as any).cleanup = () => {
        window.removeEventListener('seek', handleSeek);
      };
    }

    return () => {
      if (audioRef.current) {
        if ((audioRef.current as any).cleanup) {
          (audioRef.current as any).cleanup();
        }
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      if (audioRef.current.src !== currentSong.previewUrl) {
        audioRef.current.src = currentSong.previewUrl;
      }
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }

      // Update Media Session API for lock screen / notification controls
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.artist,
          album: currentSong.album,
          artwork: [
            { src: currentSong.artworkUrl || 'https://picsum.photos/seed/music/512/512', sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          usePlayerStore.getState().play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          usePlayerStore.getState().pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          usePlayerStore.getState().previous();
          useNotificationStore.getState().showNotification('Skipped to previous song');
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          usePlayerStore.getState().next();
          useNotificationStore.getState().showNotification('Skipped to next song');
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.fastSeek && 'fastSeek' in audioRef.current!) {
            audioRef.current!.fastSeek(details.seekTime || 0);
            return;
          }
          audioRef.current!.currentTime = details.seekTime || 0;
          usePlayerStore.getState().setProgress(details.seekTime || 0);
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          audioRef.current!.currentTime = Math.max(audioRef.current!.currentTime - skipTime, 0);
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          audioRef.current!.currentTime = Math.min(audioRef.current!.currentTime + skipTime, audioRef.current!.duration);
        });
      }
    }
  }, [currentSong, isPlaying]);

  const { message } = useNotificationStore();

  return (
    <div className="bg-zinc-900 min-h-screen text-white font-sans flex flex-col max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Subtle Red Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-zinc-900/80 to-zinc-900 pointer-events-none" />
      
      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' && <HomeView key="home" />}
        {activeTab === 'search' && <SearchView key="search" />}
        {activeTab === 'library' && <LibraryView key="library" />}
        {activeTab === 'profile' && (
          <ErrorBoundary key="profile">
            <ProfileView />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <MiniPlayer />
      <FullScreenPlayer />
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-medium whitespace-nowrap"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
