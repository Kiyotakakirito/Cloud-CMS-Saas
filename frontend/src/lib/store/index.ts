// Global state management with Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, getUser, fetchMe } from '@/lib/auth';
import { api, API_ENDPOINTS } from '@/lib/api';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // UI state
  sidebarOpen: boolean;
  notifications: Notification[];

  // Data state
  customers: any[];
  billingPlans: any[];
  invoices: any[];
  tickets: any[];

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;

  // Data actions
  loadUser: () => Promise<void>;
  loadCustomers: (params?: any) => Promise<void>;
  loadBillingPlans: () => Promise<void>;
  loadInvoices: (params?: any) => Promise<void>;
  loadTickets: (params?: any) => Promise<void>;

  // CRUD operations
  createCustomer: (data: any) => Promise<any>;
  updateCustomer: (id: number, data: any) => Promise<any>;
  deleteCustomer: (id: number) => Promise<void>;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sidebarOpen: true,
      notifications: [],
      customers: [],
      billingPlans: [],
      invoices: [],
      tickets: [],

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ isLoading: loading }),

      // UI actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // Data loading actions
      loadUser: async () => {
        const user = getUser();
        if (user) {
          set({ user, isAuthenticated: true });
          return;
        }

        // Try to fetch user from API
        try {
          set({ isLoading: true });
          const userData = await fetchMe();
          if (userData) {
            set({ user: userData, isAuthenticated: true });
          }
        } catch (error) {
          console.error('Failed to load user:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadCustomers: async (params = {}) => {
        try {
          set({ isLoading: true });
          const response = await api.get(API_ENDPOINTS.CUSTOMERS.LIST, { params });

          if (response.data) {
            set({ customers: response.data });
          } else if (response.error) {
            get().addNotification({
              id: Date.now().toString(),
              type: 'error',
              title: 'Error',
              message: response.error,
            });
          }
        } catch (error) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: 'Failed to load customers',
          });
        } finally {
          set({ isLoading: false });
        }
      },

      loadBillingPlans: async () => {
        try {
          set({ isLoading: true });
          const response = await api.get(API_ENDPOINTS.BILLING.PLANS);

          if (response.data) {
            set({ billingPlans: response.data });
          }
        } catch (error) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: 'Failed to load billing plans',
          });
        } finally {
          set({ isLoading: false });
        }
      },

      loadInvoices: async (params = {}) => {
        try {
          set({ isLoading: true });
          const response = await api.get(API_ENDPOINTS.BILLING.INVOICES, { params });

          if (response.data) {
            set({ invoices: response.data });
          }
        } catch (error) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: 'Failed to load invoices',
          });
        } finally {
          set({ isLoading: false });
        }
      },

      loadTickets: async (params = {}) => {
        try {
          set({ isLoading: true });
          const response = await api.get(API_ENDPOINTS.TICKETS.LIST, { params });

          if (response.data) {
            set({ tickets: response.data });
          }
        } catch (error) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: 'Failed to load tickets',
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // CRUD operations
      createCustomer: async (data) => {
        try {
          set({ isLoading: true });
          const response = await api.post(API_ENDPOINTS.CUSTOMERS.CREATE, data);

          if (response.data) {
            get().addNotification({
              id: Date.now().toString(),
              type: 'success',
              title: 'Success',
              message: 'Customer created successfully',
            });
            // Refresh customers list
            get().loadCustomers();
            return response.data;
          } else if (response.error) {
            throw new Error(response.error);
          }
        } catch (error: any) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: error.message || 'Failed to create customer',
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateCustomer: async (id, data) => {
        try {
          set({ isLoading: true });
          const response = await api.put(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data);

          if (response.data) {
            get().addNotification({
              id: Date.now().toString(),
              type: 'success',
              title: 'Success',
              message: 'Customer updated successfully',
            });
            // Refresh customers list
            get().loadCustomers();
            return response.data;
          }
        } catch (error: any) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: error.message || 'Failed to update customer',
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteCustomer: async (id) => {
        try {
          set({ isLoading: true });
          const response = await api.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id));

          if (response.status === 200) {
            get().addNotification({
              id: Date.now().toString(),
              type: 'success',
              title: 'Success',
              message: 'Customer deleted successfully',
            });
            // Refresh customers list
            get().loadCustomers();
          }
        } catch (error: any) {
          get().addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Error',
            message: error.message || 'Failed to delete customer',
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: state.user,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Hook for notifications
export const useNotifications = () => {
  const { notifications, removeNotification } = useAppStore();

  const addNotification = useAppStore((state) => state.addNotification);

  return {
    notifications,
    addNotification,
    removeNotification,
  };
};

// Hook for auth
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, loadUser } = useAppStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    loadUser,
  };
};

// Hook for customers
export const useCustomers = () => {
  const { customers, isLoading, loadCustomers, createCustomer, updateCustomer, deleteCustomer } = useAppStore();

  return {
    customers,
    isLoading,
    loadCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};