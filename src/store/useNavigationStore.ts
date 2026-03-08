import { create } from 'zustand';

interface NavigationState {
  activeTab: string;
  selectedArtistId: string | null;
  selectedAlbumId: string | null;
  setActiveTab: (tab: string) => void;
  setSelectedArtistId: (id: string | null) => void;
  setSelectedAlbumId: (id: string | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'home',
  selectedArtistId: null,
  selectedAlbumId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedArtistId: (id) => set({ selectedArtistId: id }),
  setSelectedAlbumId: (id) => set({ selectedAlbumId: id }),
}));
