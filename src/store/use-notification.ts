import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'CRITICAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'PATIENT' | 'DOCTOR' | 'INVENTORY' | 'BILLING' | 'SYSTEM' | 'SECURITY' | 'BACKUP';
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  fetchNotifications: (query?: { limit?: number; offset?: number; category?: string; search?: string; isRead?: boolean }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id?: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  deleteNotification: (id?: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,

  fetchNotifications: async (query) => {
    set({ isLoading: true });
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const { useAuthStore } = await import('./auth.store');
        const role = useAuthStore.getState().user?.role;
        const res = await window.electronAPI.invoke('notification:getAll', { ...query, role });
        if (res?.success) {
          set({ 
            notifications: res.data.notifications,
            total: res.data.total
          });
          // After fetching, refresh unread count
          await get().fetchUnreadCount();
        }
      } catch (err) {
        console.error(err);
      }
    }
    set({ isLoading: false });
  },

  fetchUnreadCount: async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const { useAuthStore } = await import('./auth.store');
        const role = useAuthStore.getState().user?.role;
        const res = await window.electronAPI.invoke('notification:getUnreadCount', { role });
        if (res?.success) {
          set({ unreadCount: res.data });
        }
      } catch (err) {
        console.error(err);
      }
    }
  },

  markAsRead: async (id) => {
    // Optimistic update
    set((state) => {
      if (id) {
        return {
          notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
          unreadCount: Math.max(0, state.unreadCount - 1)
        };
      }
      return {
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0
      };
    });

    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.invoke('notification:markRead', id);
    }
  },

  markAsUnread: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: false } : n),
      unreadCount: state.unreadCount + 1
    }));
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.invoke('notification:markUnread', id);
    }
  },

  deleteNotification: async (id) => {
    // Optimistic update
    set((state) => {
      if (id) {
        const notif = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: notif && !notif.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          total: Math.max(0, state.total - 1)
        };
      }
      return {
        notifications: [],
        unreadCount: 0,
        total: 0
      };
    });

    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.invoke('notification:delete', id);
    }
  }
}));
