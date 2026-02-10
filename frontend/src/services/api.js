const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Get auth token from localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('callpilot_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 
      'Content-Type': 'application/json', 
      ...getAuthHeaders(),
      ...options.headers 
    },
    ...options,
  })
  return res.json()
}

export const api = {
  health: () => request('/health'),

  // Auth - uses /signin for ID token credential flow
  googleAuth: (credential) => request('/api/auth/signin', {
    method: 'POST', body: JSON.stringify({ credential }),
  }),
  getMe: () => request('/api/auth/me'),

  // Campaign
  startCampaign: (data) => request('/api/campaign/start', {
    method: 'POST', body: JSON.stringify(data),
  }),
  getCampaign: (groupId) => request(`/api/campaign/${groupId}`),
  cancelCampaign: (groupId) => request(`/api/campaign/${groupId}/cancel`, { method: 'POST' }),
  optimizeCampaign: (groupId) => request(`/api/campaign/${groupId}/optimize`),
  confirmProvider: (groupId, providerId) =>
    request(`/api/campaign/${groupId}/confirm/${providerId}`, { method: 'POST' }),

  sendCallCommand: (groupId, providerId, action, message = '') =>
    request(`/api/campaign/${groupId}/call/${providerId}/command`, {
      method: 'POST',
      body: JSON.stringify({ action, message }),
    }),

  // Bookings
  getBookings: () => request('/api/tools/bookings'),

  // Providers
  searchProviders: (category, location, radius = 10) =>
    request(`/api/providers/search?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}&radius=${radius}`),

  // Calendar
  getCalendarEvents: (start, end) =>
    request(`/api/calendar/events?start=${start}&end=${end}`),
}