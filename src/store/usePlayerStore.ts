import { create } from 'zustand';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
}

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  isRepeat: boolean;
  isPlayerOpen: boolean;
  jamId: string | null;
  jamUsers: any[];
  
  setCurrentSong: (song: Song) => void;
  setQueue: (queue: Song[]) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setPlayerOpen: (isOpen: boolean) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  shuffleQueue: () => void;
  setJamSession: (jamId: string | null, users?: any[]) => void;
  syncJamState: (state: Partial<PlayerState>) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 1,
  isShuffle: false,
  isRepeat: false,
  isPlayerOpen: false,
  jamId: null,
  jamUsers: [],

  setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),
  setQueue: (queue) => set({ queue }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  next: () => {
    const { currentSong, queue, isShuffle, isRepeat } = get();
    if (!currentSong || queue.length === 0) return;
    
    if (isRepeat) {
      set({ progress: 0, isPlaying: true });
      return;
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      set({ currentSong: queue[randomIndex], isPlaying: true });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    set({ currentSong: queue[nextIndex], isPlaying: true });
  },
  previous: () => {
    const { currentSong, queue, progress } = get();
    if (!currentSong || queue.length === 0) return;
    
    // If played more than 3 seconds, restart current song
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentSong: queue[prevIndex], isPlaying: true });
  },
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
  setPlayerOpen: (isOpen) => set({ isPlayerOpen: isOpen }),
  addToQueue: (song) => set((state) => {
    if (!state.currentSong) {
      return { currentSong: song, queue: [song], isPlaying: true };
    }
    return { queue: [...state.queue, song] };
  }),
  removeFromQueue: (index) => set((state) => {
    const newQueue = [...state.queue];
    newQueue.splice(index, 1);
    return { queue: newQueue };
  }),
  shuffleQueue: () => set((state) => {
    if (!state.currentSong || state.queue.length <= 1) return state;
    const currentIndex = state.queue.findIndex((s) => s.id === state.currentSong!.id);
    if (currentIndex === -1) return state;
    
    const playedSongs = state.queue.slice(0, currentIndex + 1);
    const remainingSongs = state.queue.slice(currentIndex + 1);
    
    for (let i = remainingSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
    }
    
    return { queue: [...playedSongs, ...remainingSongs] };
  }),
  setJamSession: (jamId, users = []) => set({ jamId, jamUsers: users }),
  syncJamState: (state) => set({ ...state }),
}));
