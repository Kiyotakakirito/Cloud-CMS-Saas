// Notification system component

'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/lib/store';
import { cn } from '@/lib/utils';

const notificationTypes = {
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: '✅',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: '❌',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: 'ℹ️',
  },
};

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
  };
  onClose: (id: string) => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { bg, text, icon } = notificationTypes[notification.type];

  useEffect(() => {
    if (notification.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onClose]);

  return (
    <div
      className={cn(
        'flex items-start p-4 rounded-lg border shadow-sm transform transition-all duration-300',
        bg,
        text
      )}
      role="alert"
    >
      <span className="text-lg mr-3">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{notification.title}</p>
        <p className="text-sm opacity-90">{notification.message}</p>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="ml-4 text-gray-400 hover:text-gray-600 transition"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}

// Hook for easy notification usage
export function useNotify() {
  const { addNotification } = useNotifications();

  const notify = {
    success: (title: string, message: string, duration?: number) =>
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title,
        message,
        duration,
      }),

    error: (title: string, message: string, duration?: number) =>
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title,
        message,
        duration,
      }),

    warning: (title: string, message: string, duration?: number) =>
      addNotification({
        id: Date.now().toString(),
        type: 'warning',
        title,
        message,
        duration,
      }),

    info: (title: string, message: string, duration?: number) =>
      addNotification({
        id: Date.now().toString(),
        type: 'info',
        title,
        message,
        duration,
      }),
  };

  return notify;
}
