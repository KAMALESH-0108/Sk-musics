import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useLyrics, LyricLine } from '../hooks/useLyrics';
import { usePlayerStore } from '../store/usePlayerStore';

export const LyricsDisplay: React.FC = () => {
  const { currentSong, progress } = usePlayerStore();
  const { lyrics, isLoading, error } = useLyrics(currentSong?.title, currentSong?.artist);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSynced = lyrics.length > 0 && lyrics[0].time >= 0;

  // Find the currently active lyric line
  const activeIndex = isSynced ? lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    if (nextLine) {
      return progress >= line.time && progress < nextLine.time;
    }
    return progress >= line.time;
  }) : -1;

  // Auto-scroll to the active lyric
  useEffect(() => {
    if (isAutoScrolling && activeIndex !== -1 && containerRef.current) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      const container = containerRef.current;
      
      if (activeElement && container) {
        const elementOffset = activeElement.offsetTop;
        const containerHalfHeight = container.clientHeight / 2;
        const elementHalfHeight = activeElement.clientHeight / 2;
        
        const targetScroll = elementOffset - containerHalfHeight + elementHalfHeight;
        
        // Use scrollTop directly for maximum compatibility with older WebViews.
        // The 'scroll-smooth' Tailwind class ensures this animates smoothly.
        container.scrollTop = targetScroll;
      }
    }
  }, [activeIndex, isAutoScrolling]);

  const handleUserInteraction = () => {
    setIsAutoScrolling(false);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    // Resume auto-scroll after 4 seconds of no interaction
    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
    }, 4000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>{error || "No lyrics available for this song."}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onWheel={handleUserInteraction}
      onTouchStart={handleUserInteraction}
      onTouchMove={handleUserInteraction}
      onPointerDown={handleUserInteraction}
      className="h-full overflow-y-auto px-6 py-48 custom-scrollbar space-y-6 relative scroll-smooth"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
      }}
    >
      {lyrics.map((line, index) => {
        const isActive = isSynced ? index === activeIndex : true;
        const isPast = isSynced ? index < activeIndex : false;
        
        return (
          <motion.div
            key={index}
            onClick={() => {
              if (isSynced) {
                usePlayerStore.getState().setProgress(line.time);
                window.dispatchEvent(new CustomEvent('seek', { detail: line.time }));
                setIsAutoScrolling(true);
              }
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: isActive ? 1 : isPast ? 0.4 : 0.2,
              scale: isSynced && isActive ? 1.05 : 1,
              y: 0
            }}
            transition={{ duration: 0.3 }}
            className={`text-2xl font-bold transition-colors duration-300 ${isSynced ? 'cursor-pointer hover:text-red-400' : ''} ${
              isSynced && isActive ? 'text-red-500' : 'text-white/80'
            }`}
          >
            {line.text}
          </motion.div>
        );
      })}
    </div>
  );
};
