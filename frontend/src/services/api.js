const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  return res.json()
}

export const api = {
  health: () => request('/health'),

  startCampaign: (data) => request('/api/campaign/start', {
    method: 'POST', body: JSON.stringify(data),
  }),
  getCampaign: (groupId) => request(`/api/campaign/${groupId}`),
  cancelCampaign: (groupId) => request(`/api/campaign/${groupId}/cancel`, { method: 'POST' }),
  optimizeCampaign: (groupId) => request(`/api/campaign/${groupId}/optimize`),
  confirmProvider: (groupId, providerId) =>
    request(`/api/campaign/${groupId}/confirm/${providerId}`, { method: 'POST' }),

  getBookings: () => request('/api/tools/bookings'),

  searchProviders: (category, location, radius = 10) =>
    request(`/api/providers/search?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}&radius=${radius}`),

  getCalendarEvents: (start, end) =>
    request(`/api/calendar/events?start=${start}&end=${end}`),
}