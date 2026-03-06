import { create } from 'zustand';

interface NotificationState {
  message: string | null;
  showNotification: (msg: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  message: null,
  showNotification: (msg) => {
    set({ message: msg });
    setTimeout(() => {
      set({ message: null });
    }, 3000);
  }
}));
