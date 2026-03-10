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
  originalQueue: Song[];
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
  appendQueue: (songs: Song[]) => void;
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
  reorderUpcomingQueue: (newUpcomingQueue: Song[]) => void;
  setJamSession: (jamId: string | null, users?: any[]) => void;
  syncJamState: (state: Partial<PlayerState>) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  originalQueue: [],
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
  setQueue: (queue) => set((state) => {
    if (state.isShuffle) {
      // If we are setting a completely new queue while shuffle is on, we should shuffle it immediately
      const shuffled = [...queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { queue: shuffled, originalQueue: queue };
    }
    return { queue, originalQueue: queue };
  }),
  appendQueue: (songs) => set((state) => {
    if (state.isShuffle) {
      const shuffledNew = [...songs];
      for (let i = shuffledNew.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledNew[i], shuffledNew[j]] = [shuffledNew[j], shuffledNew[i]];
      }
      return { 
        queue: [...state.queue, ...shuffledNew], 
        originalQueue: [...state.originalQueue, ...songs] 
      };
    }
    return { 
      queue: [...state.queue, ...songs], 
      originalQueue: [...state.originalQueue, ...songs] 
    };
  }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  next: () => {
    const { currentSong, queue, isRepeat } = get();
    if (!currentSong || queue.length === 0) return;
    
    if (isRepeat) {
      set({ progress: 0, isPlaying: true });
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
  toggleShuffle: () => set((state) => {
    const isShuffle = !state.isShuffle;
    if (isShuffle) {
      if (!state.currentSong || state.queue.length <= 1) return { isShuffle };
      const currentIndex = state.queue.findIndex((s) => s.id === state.currentSong!.id);
      if (currentIndex === -1) return { isShuffle };
      
      const playedSongs = state.queue.slice(0, currentIndex + 1);
      const remainingSongs = state.queue.slice(currentIndex + 1);
      
      for (let i = remainingSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
      }
      
      return { isShuffle, queue: [...playedSongs, ...remainingSongs] };
    } else {
      return { isShuffle, queue: state.originalQueue };
    }
  }),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
  setPlayerOpen: (isOpen) => set({ isPlayerOpen: isOpen }),
  addToQueue: (song) => set((state) => {
    if (!state.currentSong) {
      return { currentSong: song, queue: [song], originalQueue: [song], isPlaying: true };
    }
    return { queue: [...state.queue, song], originalQueue: [...state.originalQueue, song] };
  }),
  removeFromQueue: (index) => set((state) => {
    const newQueue = [...state.queue];
    const removedSong = newQueue.splice(index, 1)[0];
    const newOriginalQueue = state.originalQueue.filter(s => s.id !== removedSong.id);
    return { queue: newQueue, originalQueue: newOriginalQueue };
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
  reorderUpcomingQueue: (newUpcomingQueue) => set((state) => {
    if (!state.currentSong) return state;
    const currentIndex = state.queue.findIndex((s) => s.id === state.currentSong!.id);
    if (currentIndex === -1) return state;
    
    const playedSongs = state.queue.slice(0, currentIndex + 1);
    const newQueue = [...playedSongs, ...newUpcomingQueue];
    
    if (state.isShuffle) {
      return { queue: newQueue };
    }
    return { queue: newQueue, originalQueue: newQueue };
  }),
  setJamSession: (jamId, users = []) => set({ jamId, jamUsers: users }),
  syncJamState: (state) => set({ ...state }),
}));
