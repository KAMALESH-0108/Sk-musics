import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from './usePlayerStore';

interface DownloadState {
  downloadedSongs: Record<string, Song>;
  isDownloading: Record<string, boolean>;
  downloadProgress: Record<string, number>;
  
  downloadSong: (song: Song) => Promise<void>;
  removeDownload: (songId: string) => Promise<void>;
  isDownloaded: (songId: string) => boolean;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      downloadedSongs: {},
      isDownloading: {},
      downloadProgress: {},

      downloadSong: async (song) => {
        const { isDownloading, downloadedSongs } = get();
        if (isDownloading[song.id] || downloadedSongs[song.id]) return;

        set((state) => ({
          isDownloading: { ...state.isDownloading, [song.id]: true },
          downloadProgress: { ...state.downloadProgress, [song.id]: 0 }
        }));

        try {
          const response = await fetch(song.previewUrl);
          if (!response.ok) throw new Error('Network response was not ok');
          
          const contentLength = response.headers.get('content-length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          
          const reader = response.body?.getReader();
          if (!reader) throw new Error('Failed to get reader');

          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            received += value.length;
            
            if (total) {
              set((state) => ({
                downloadProgress: { ...state.downloadProgress, [song.id]: (received / total) * 100 }
              }));
            }
          }

          const blob = new Blob(chunks, { type: 'audio/mp4' }); // Assuming mp4/m4a from JioSaavn
          
          // Store in Cache API
          const cache = await caches.open('sk-music-downloads');
          const responseToCache = new Response(blob);
          await cache.put(`/downloaded/${song.id}`, responseToCache);

          // Update state with local URL
          const localSong = { ...song, previewUrl: `/downloaded/${song.id}`, isOffline: true };
          
          set((state) => ({
            downloadedSongs: { ...state.downloadedSongs, [song.id]: localSong },
            isDownloading: { ...state.isDownloading, [song.id]: false }
          }));

        } catch (error) {
          console.error('Download failed:', error);
          set((state) => ({
            isDownloading: { ...state.isDownloading, [song.id]: false }
          }));
        }
      },

      removeDownload: async (songId) => {
        try {
          const cache = await caches.open('sk-music-downloads');
          await cache.delete(`/downloaded/${songId}`);
          
          set((state) => {
            const newDownloaded = { ...state.downloadedSongs };
            delete newDownloaded[songId];
            return { downloadedSongs: newDownloaded };
          });
        } catch (error) {
          console.error('Failed to remove download:', error);
        }
      },

      isDownloaded: (songId) => {
        return !!get().downloadedSongs[songId];
      }
    }),
    {
      name: 'sk-music-downloads',
      partialize: (state) => ({ downloadedSongs: state.downloadedSongs }),
    }
  )
);
