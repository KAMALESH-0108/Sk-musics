import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from './usePlayerStore';

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: number;
  isCollaborative?: boolean;
  collabId?: string;
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
  reorderPlaylist: (playlistId: string, songs: Song[]) => void;
  updatePlaylistSongs: (playlistId: string, songs: Song[]) => void;
  makeCollaborative: (playlistId: string) => string;
  joinCollaborativePlaylist: (playlist: Playlist) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      history: [],
      playlists: [],
      
      toggleLike: (song) => {
        const { likedSongs } = get();
        const isLiked = (likedSongs || []).some((s) => s.id === song.id);
        
        if (isLiked) {
          set({ likedSongs: (likedSongs || []).filter((s) => s.id !== song.id) });
        } else {
          set({ likedSongs: [song, ...(likedSongs || [])] });
        }
      },
      
      isLiked: (songId) => (get().likedSongs || []).some((s) => s.id === songId),
      
      addToHistory: (song) => {
        const { history } = get();
        // Remove if already exists to move it to top
        const filteredHistory = (history || []).filter((s) => s.id !== song.id);
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
        set({ playlists: [...(playlists || []), newPlaylist] });
      },

      deletePlaylist: (id) => {
        const { playlists } = get();
        set({ playlists: (playlists || []).filter((p) => p.id !== id) });
      },

      addSongToPlaylist: (playlistId, song) => {
        const { playlists } = get();
        let updatedPlaylist: Playlist | undefined;
        
        set({
          playlists: (playlists || []).map((p) => {
            if (p.id === playlistId) {
              if (!(p.songs || []).some((s) => s.id === song.id)) {
                updatedPlaylist = { ...p, songs: [...(p.songs || []), song] };
                return updatedPlaylist;
              }
            }
            return p;
          }),
        });

        if (updatedPlaylist && updatedPlaylist.isCollaborative && updatedPlaylist.collabId) {
          import('socket.io-client').then(({ io }) => {
            const socket = io(window.location.origin);
            socket.emit('collab-playlist-update', {
              playlistId: updatedPlaylist!.collabId,
              songs: updatedPlaylist!.songs
            });
            setTimeout(() => socket.disconnect(), 1000);
          });
        }
      },

      removeSongFromPlaylist: (playlistId, songId) => {
        const { playlists } = get();
        let updatedPlaylist: Playlist | undefined;

        set({
          playlists: (playlists || []).map((p) => {
            if (p.id === playlistId) {
              updatedPlaylist = { ...p, songs: (p.songs || []).filter((s) => s.id !== songId) };
              return updatedPlaylist;
            }
            return p;
          }),
        });

        if (updatedPlaylist && updatedPlaylist.isCollaborative && updatedPlaylist.collabId) {
          import('socket.io-client').then(({ io }) => {
            const socket = io(window.location.origin);
            socket.emit('collab-playlist-update', {
              playlistId: updatedPlaylist!.collabId,
              songs: updatedPlaylist!.songs
            });
            setTimeout(() => socket.disconnect(), 1000);
          });
        }
      },

      reorderPlaylist: (playlistId, songs) => {
        const { playlists } = get();
        let updatedPlaylist: Playlist | undefined;

        set({
          playlists: (playlists || []).map((p) => {
            if (p.id === playlistId) {
              updatedPlaylist = { ...p, songs };
              return updatedPlaylist;
            }
            return p;
          }),
        });

        if (updatedPlaylist && updatedPlaylist.isCollaborative && updatedPlaylist.collabId) {
          import('socket.io-client').then(({ io }) => {
            const socket = io(window.location.origin);
            socket.emit('collab-playlist-update', {
              playlistId: updatedPlaylist!.collabId,
              songs: updatedPlaylist!.songs
            });
            setTimeout(() => socket.disconnect(), 1000);
          });
        }
      },

      updatePlaylistSongs: (playlistId, songs) => {
        const { playlists } = get();
        set({
          playlists: (playlists || []).map((p) => {
            if (p.id === playlistId || p.collabId === playlistId) {
              return { ...p, songs };
            }
            return p;
          }),
        });
      },

      makeCollaborative: (playlistId) => {
        const { playlists } = get();
        const collabId = Math.random().toString(36).substring(2, 9);
        let updatedPlaylist: Playlist | undefined;
        
        set({
          playlists: (playlists || []).map((p) => {
            if (p.id === playlistId) {
              updatedPlaylist = { ...p, isCollaborative: true, collabId };
              return updatedPlaylist;
            }
            return p;
          }),
        });

        if (updatedPlaylist) {
          import('socket.io-client').then(({ io }) => {
            const socket = io(window.location.origin);
            socket.emit('join-collab-playlist', {
              playlistId: collabId,
              user: { name: 'Creator' },
              initialSongs: updatedPlaylist!.songs
            });
            setTimeout(() => socket.disconnect(), 1000);
          });
        }

        return collabId;
      },

      joinCollaborativePlaylist: (playlist) => {
        const { playlists } = get();
        if (!(playlists || []).some(p => p.collabId === playlist.collabId)) {
          set({ playlists: [...(playlists || []), playlist] });
        }
      }
    }),
    {
      name: 'sk-music-library',
    }
  )
);
