import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notifications';
import { getStoredRole, AUTH_CHANGED_EVENT } from '../services/auth';
import { USER_ROLES } from '../constants/domainLabels';
import { notifyError } from '../utils/toast';

const BELL_VISIBLE_ROLES = new Set([
  USER_ROLES.AGENT,
  USER_ROLES.CLAIMS_MANAGER,
  USER_ROLES.SUPERVISOR,
]);

const formatRelativeTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const ranges = [
    { limit: 60, unit: 'second', divisor: 1 },
    { limit: 3600, unit: 'minute', divisor: 60 },
    { limit: 86400, unit: 'hour', divisor: 3600 },
    { limit: 604800, unit: 'day', divisor: 86400 },
    { limit: 2592000, unit: 'week', divisor: 604800 },
    { limit: 31536000, unit: 'month', divisor: 2592000 },
    { limit: Infinity, unit: 'year', divisor: 31536000 },
  ];

  const range = ranges.find((item) => Math.abs(diffInSeconds) < item.limit);
  return rtf.format(Math.round(diffInSeconds / range.divisor), range.unit);
};

function NotificationBellButton() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [role, setRole] = useState(() => getStoredRole());
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState(null);

  const canShowBell = useMemo(() => BELL_VISIBLE_ROLES.has(role), [role]);

  // Stay in sync with auth changes (login/logout).
  useEffect(() => {
    const sync = () => setRole(getStoredRole());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount();
      setUnreadCount(Number(res?.unread_count || 0));
    } catch {
      // Background poll — never surface errors to the user.
    }
  }, []);

  const loadRecentNotifications = useCallback(async () => {
    try {
      setIsLoadingList(true);
      const res = await getNotifications(1, 8);
      setNotifications(Array.isArray(res?.data) ? res.data : []);
    } catch {
      notifyError('Failed to load notifications.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Poll unread badge every 30 s while the bell is mounted for the current role.
  useEffect(() => {
    if (!canShowBell) return;

    loadUnreadCount();
    const id = window.setInterval(loadUnreadCount, 30_000);
    return () => window.clearInterval(id);
  }, [canShowBell, loadUnreadCount]);

  // While the panel is open, refresh the list every 60 s (interval only — no
  // immediate call here; the on-open fetch is done inside handleToggleBell).
  useEffect(() => {
    if (!canShowBell || !isOpen) return;

    const id = window.setInterval(loadRecentNotifications, 60_000);
    return () => window.clearInterval(id);
  }, [canShowBell, isOpen, loadRecentNotifications]);

  // Close when clicking outside.
  useEffect(() => {
    if (!isOpen) return;

    const onClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  if (!canShowBell) return null;

  const handleToggleBell = async () => {
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening) {
      // Single coordinated fetch — not duplicated by any effect.
      await Promise.all([loadUnreadCount(), loadRecentNotifications()]);
    }
  };

  const handleNotificationClick = async (notification) => {
    const url = notification?.action_url || '/dossiers';
    const isUnread = !notification?.is_read;

    try {
      setActiveNotificationId(notification.id);

      if (isUnread) {
        const res = await markNotificationRead(notification.id);
        const updated = res?.notification;

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, ...(updated || {}), is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setIsOpen(false);
      navigate(url);
    } catch {
      notifyError('Failed to open notification.');
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAllRead || unreadCount === 0) return;

    try {
      setIsMarkingAllRead(true);
      await markAllNotificationsRead();

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch {
      notifyError('Failed to mark all notifications as read.');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const displayBadge = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="position-relative" ref={containerRef}>
      <button
        type="button"
        className="nb-bell"
        onClick={handleToggleBell}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="nb-bell-btn"
      >
        <i className={`bi ${unreadCount > 0 ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="nb-bell__badge" aria-hidden="true">
            {displayBadge}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="nb-bell-panel"
          role="dialog"
          aria-label="Notifications"
          aria-labelledby="nb-bell-btn"
        >
          <div className="nb-bell-panel__header">
            <span className="nb-bell-panel__title">Notifications</span>
            {unreadCount > 0 && (
              <span className="nb-bell-panel__count">{unreadCount} unread</span>
            )}
          </div>

          {notifications.length > 0 && unreadCount > 0 && (
            <div className="nb-bell-panel__actions">
              <button
                type="button"
                className="nb-bell-panel__mark-all"
                onClick={handleMarkAllRead}
                disabled={isMarkingAllRead}
              >
                {isMarkingAllRead ? 'Marking…' : 'Mark all as read'}
              </button>
            </div>
          )}

          <div className="nb-bell-panel__list">
            {isLoadingList ? (
              <div className="nb-bell-panel__empty">
                <div
                  className="spinner-border spinner-border-sm text-secondary mb-2"
                  aria-hidden="true"
                />
                <p className="nb-bell-panel__empty-text mb-0">Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="nb-bell-panel__empty">
                <i className="bi bi-bell-slash nb-bell-panel__empty-icon" aria-hidden="true" />
                <p className="nb-bell-panel__empty-text mb-0">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isUnread = !notification.is_read;
                const isBusy = activeNotificationId === notification.id;
                const actorName = notification.actor?.name || 'System';

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={`nb-bell-item${isUnread ? ' nb-bell-item--unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    disabled={isBusy}
                  >
                    <div className="nb-bell-item__row">
                      {isUnread && <span className="nb-bell-item__dot" aria-hidden="true" />}
                      <span className="nb-bell-item__title">{notification.title}</span>
                      {isBusy && (
                        <span
                          className="spinner-border spinner-border-sm text-primary ms-auto"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <p className="nb-bell-item__message">{notification.message}</p>
                    <div className="nb-bell-item__meta">
                      <span className="nb-bell-item__actor">{actorName}</span>
                      <span className="nb-bell-item__sep" aria-hidden="true">·</span>
                      <span className="nb-bell-item__time">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBellButton;