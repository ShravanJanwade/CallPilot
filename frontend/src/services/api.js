/**
 * API service layer for CallPilot frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Get auth token from localStorage (set by Google OAuth flow)
 */
function getAuthToken() {
  return localStorage.getItem('callpilot_token')
}

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }
  
  return response.json()
}

// ============ Campaign API ============

export const campaignApi = {
  /**
   * Start a new calling campaign
   */
  async startCampaign(formData) {
    return apiRequest('/api/campaign/start', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
  },
  
  /**
   * Get campaign status
   */
  async getCampaign(campaignId) {
    return apiRequest(`/api/campaign/${campaignId}`)
  },
  
  /**
   * Cancel an active campaign
   */
  async cancelCampaign(campaignId) {
    return apiRequest(`/api/campaign/${campaignId}/cancel`, {
      method: 'POST'
    })
  },
  
  /**
   * Confirm a booking with a specific provider
   */
  async confirmBooking(campaignId, providerId) {
    return apiRequest(`/api/campaign/${campaignId}/confirm/${providerId}`, {
      method: 'POST'
    })
  }
}

// ============ Provider API ============

export const providerApi = {
  /**
   * Search for providers
   */
  async searchProviders(category, latitude, longitude, maxDistance = 10, maxResults = 10) {
    const params = new URLSearchParams({
      category,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      max_distance: maxDistance.toString(),
      max_results: maxResults.toString()
    })
    return apiRequest(`/api/providers/search?${params}`)
  }
}

// ============ Bookings API ============

export const bookingsApi = {
  /**
   * Get all confirmed bookings
   */
  async getBookings() {
    return apiRequest('/api/tools/bookings')
  }
}

// ============ Auth API ============

export const authApi = {
  /**
   * Google OAuth callback
   */
  async googleAuth(code) {
    return apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
  },
  
  /**
   * Get current user info
   */
  async getCurrentUser() {
    return apiRequest('/api/auth/me')
  },
  
  /**
   * Logout (clears token)
   */
  logout() {
    localStorage.removeItem('callpilot_token')
    localStorage.removeItem('callpilot_user')
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!getAuthToken()
  }
}

export default {
  campaign: campaignApi,
  provider: providerApi,
  bookings: bookingsApi,
  auth: authApi
}
