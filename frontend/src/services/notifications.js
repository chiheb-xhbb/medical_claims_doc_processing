import api from './api';

// Fetch paginated notifications for the current user.
export async function getNotifications(page = 1, perPage = 10) {
  const response = await api.get('/notifications', {
    params: {
      page,
      per_page: perPage,
    },
  });

  return response.data;
}

// Small endpoint for the navbar badge count.
export async function getUnreadNotificationCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data;
}

// Mark one notification as read before navigating.
export async function markNotificationRead(notificationId) {
  const response = await api.post(`/notifications/${notificationId}/read`);
  return response.data;
}

// Mark all current-user notifications as read.
export async function markAllNotificationsRead() {
  const response = await api.post('/notifications/read-all');
  return response.data;
}