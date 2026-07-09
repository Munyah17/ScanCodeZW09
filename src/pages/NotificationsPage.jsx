import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications/list', {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotifications(data.notifications ?? []);
      }
    } catch { /* network error */ }
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ id: notificationId }),
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch { /* error */ }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await fetch(`/api/notifications/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ id: notificationId }),
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch { /* error */ }
  };

  return (
    <DashLayout active="notifications" title="Notifications">
      {loading ? (
        <div className="dp-loading"><div className="dp-spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="dp-empty">
          <div className="dp-empty-icon">🔔</div>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: n.read ? '#f9fafb' : '#fef3c7',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1f2937' }}>{n.title}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{n.message}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="dp-btn dp-btn-sm dp-btn-ghost"
                    title="Mark as read"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="dp-btn dp-btn-sm dp-btn-ghost"
                  style={{ color: '#ef4444' }}
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashLayout>
  );
}
