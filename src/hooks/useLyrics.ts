import { useState, useEffect } from 'react';

export interface LyricLine {
  time: number;
  text: string;
}

export const useLyrics = (trackName?: string, artistName?: string) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackName || !artistName) {
      setLyrics([]);
      return;
    }

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const targetUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch lyrics');
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
          // Find the first result with syncedLyrics
          const resultWithSynced = data.find((item: any) => item.syncedLyrics);
          
          if (resultWithSynced) {
            const parsedLyrics = parseLrc(resultWithSynced.syncedLyrics);
            setLyrics(parsedLyrics);
          } else if (data[0].plainLyrics) {
             // Fallback to plain lyrics, just split by newline and give them fake times or 0
             const plainLines = data[0].plainLyrics.split('\n').map((line: string) => ({
                time: 0,
                text: line
             }));
             setLyrics(plainLines);
          } else {
            setLyrics([]);
            setError('No lyrics found');
          }
        } else {
          setLyrics([]);
          setError('No lyrics found');
        }
      } catch (err) {
        console.error('Error fetching lyrics:', err);
        setError('Failed to load lyrics');
        setLyrics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [trackName, artistName]);

  return { lyrics, isLoading, error };
};

// Helper function to parse LRC format
function parseLrc(lrcString: string): LyricLine[] {
  const lines = lrcString.split('\n');
  const parsedLines: LyricLine[] = [];

  // Match one or more timestamps at the beginning of the line
  const timeRegex = /\[(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of lines) {
    let match;
    const timestamps: number[] = [];
    
    // Extract all timestamps from the line
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      // Pad or truncate milliseconds to 3 digits
      const ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
      
      const timeInSeconds = minutes * 60 + seconds + ms / 1000;
      timestamps.push(timeInSeconds);
    }

    if (timestamps.length > 0) {
      // Remove all timestamps to get the text
      const text = line.replace(/\[\d{2,}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
      
      if (text) {
        for (const time of timestamps) {
          parsedLines.push({ time, text });
        }
      }
    }
  }

  // Sort by time since multiple timestamps can put lines out of order
  return parsedLines.sort((a, b) => a.time - b.time);
}
