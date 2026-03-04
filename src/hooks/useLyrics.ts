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
        const response = await fetch(
          `https://lrclib.net/api/search?track_name=${encodeURIComponent(
            trackName
          )}&artist_name=${encodeURIComponent(artistName)}`
        );
        
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

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
      
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      
      if (text) {
        parsedLines.push({ time: timeInSeconds, text });
      }
    }
  }

  return parsedLines;
}
