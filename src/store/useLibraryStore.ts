import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from './usePlayerStore';

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: number;
}

interface LibraryState {
  likedSongs: Song[];
  history: Song[];
  playlists: Playlist[];
  
  toggleLike: (song: Song) => void;
  isLiked: (songId: string) => boolean;
  addToHistory: (song: Song) => void;
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      history: [],
      playlists: [],
      
      toggleLike: (song) => {
        const { likedSongs } = get();
        const isLiked = likedSongs.some((s) => s.id === song.id);
        
        if (isLiked) {
          set({ likedSongs: likedSongs.filter((s) => s.id !== song.id) });
        } else {
          set({ likedSongs: [song, ...likedSongs] });
        }
      },
      
      isLiked: (songId) => get().likedSongs.some((s) => s.id === songId),
      
      addToHistory: (song) => {
        const { history } = get();
        // Remove if already exists to move it to top
        const filteredHistory = history.filter((s) => s.id !== song.id);
        set({ history: [song, ...filteredHistory].slice(0, 50) }); // Keep last 50
      },

      createPlaylist: (name) => {
        const { playlists } = get();
        const newPlaylist: Playlist = {
          id: Date.now().toString(),
          name,
          songs: [],
          createdAt: Date.now(),
        };
        set({ playlists: [...playlists, newPlaylist] });
      },

      deletePlaylist: (id) => {
        const { playlists } = get();
        set({ playlists: playlists.filter((p) => p.id !== id) });
      },

      addSongToPlaylist: (playlistId, song) => {
        const { playlists } = get();
        set({
          playlists: playlists.map((p) => {
            if (p.id === playlistId) {
              // Prevent duplicates
              if (!p.songs.some((s) => s.id === song.id)) {
                return { ...p, songs: [...p.songs, song] };
              }
            }
            return p;
          }),
        });
      },

      removeSongFromPlaylist: (playlistId, songId) => {
        const { playlists } = get();
        set({
          playlists: playlists.map((p) => {
            if (p.id === playlistId) {
              return { ...p, songs: p.songs.filter((s) => s.id !== songId) };
            }
            return p;
          }),
        });
      },
    }),
    {
      name: 'sk-music-library',
    }
  )
);
