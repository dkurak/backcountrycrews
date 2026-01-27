'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, UserNotification, ACTIVITY_COLORS, ACTIVITY_ICONS } from '@/lib/partners';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationCard({
  notification,
  onDismiss
}: {
  notification: UserNotification;
  onDismiss: (id: string) => void;
}) {
  const activity = notification.tour_posts?.activity || 'ski_tour';
  const tripDate = notification.tour_posts?.tour_date
    ? new Date(notification.tour_posts.tour_date + 'T12:00:00')
    : null;

  const handleDismiss = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(notification.id);
    onDismiss(notification.id);
  };

  return (
    <div className={`relative bg-white rounded-lg border p-4 transition-all ${
      notification.is_read
        ? 'border-gray-200'
        : notification.type === 'participant_withdrawn'
          ? 'border-orange-200 bg-orange-50/50'
          : 'border-blue-200 bg-blue-50/50'
    }`}>
      <Link href={`/trips/${notification.trip_id}`} className="block">
        <div className="flex items-start gap-3">
          <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
            notification.type === 'participant_withdrawn'
              ? 'bg-orange-100 text-orange-600'
              : ACTIVITY_COLORS[activity]
          }`}>
            {notification.type === 'trip_accepted' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : notification.type === 'participant_withdrawn' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
            ) : (
              <span>{ACTIVITY_ICONS[activity]}</span>
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              {tripDate && (
                <span>
                  {tripDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
              <span>-</span>
              <span>{formatTimeAgo(notification.created_at)}</span>
            </div>
          </div>
          {!notification.is_read && (
            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
          )}
        </div>
      </Link>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'all'>('new');

  useEffect(() => {
    async function loadNotifications() {
      if (user) {
        setLoading(true);
        const data = await getUserNotifications(user.id, activeTab === 'new' ? 'unread' : 'all');
        setNotifications(data);
        setLoading(false);
      }
    }
    loadNotifications();
  }, [user, activeTab]);

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = async () => {
    if (user) {
      await markAllNotificationsRead(user.id);
      if (activeTab === 'new') {
        setNotifications([]);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (authLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Notifications</h1>
        <p className="text-gray-500 mb-4">Sign in to view your notifications.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && activeTab === 'new' && (
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'new'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          New
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All
        </button>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">
            {activeTab === 'new' ? '📭' : '📬'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeTab === 'new' ? 'No new notifications' : 'No notifications yet'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'new'
              ? "You're all caught up! Check back later for updates on your trips."
              : "When you join trips or receive updates, they'll appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
