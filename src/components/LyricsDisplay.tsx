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

  // Find the currently active lyric line
  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    if (nextLine) {
      return progress >= line.time && progress < nextLine.time;
    }
    return progress >= line.time;
  });

  // Auto-scroll to the active lyric
  useEffect(() => {
    if (isAutoScrolling && activeIndex !== -1 && containerRef.current) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        // Calculate the scroll position to center the active element
        const containerHeight = containerRef.current.clientHeight;
        const elementOffsetTop = activeElement.offsetTop;
        const elementHeight = activeElement.clientHeight;
        
        const scrollPosition = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
        
        containerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth',
        });
      }
    }
  }, [activeIndex, lyrics, isAutoScrolling]);

  const handleScroll = () => {
    setIsAutoScrolling(false);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    // Resume auto-scroll after 3 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
    }, 3000);
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
      onWheel={handleScroll}
      onTouchMove={handleScroll}
      onPointerDown={handleScroll}
      className="h-full overflow-y-auto px-6 py-12 hide-scrollbar space-y-6"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
      }}
    >
      {lyrics.map((line, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;
        
        return (
          <motion.div
            key={index}
            onClick={() => {
              usePlayerStore.getState().setProgress(line.time);
              window.dispatchEvent(new CustomEvent('seek', { detail: line.time }));
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: isActive ? 1 : isPast ? 0.4 : 0.2,
              scale: isActive ? 1.05 : 1,
              y: 0
            }}
            transition={{ duration: 0.3 }}
            className={`text-2xl font-bold transition-colors duration-300 cursor-pointer hover:text-red-400 ${
              isActive ? 'text-red-500' : 'text-white/60'
            }`}
          >
            {line.text}
          </motion.div>
        );
      })}
    </div>
  );
};
