import { create } from 'zustand'

export const useCampaignStore = create((set, get) => ({
  groupId: null,
  status: 'idle', // idle | searching | calling | completed | error
  message: '',
  campaigns: {},   // campaignId → {service_type, status, providers, results, bestMatch}
  calls: {},       // providerId → {status, name, rating, distance, transcript, slot, ...}
  origin: null,    // {lat, lng}

  reset: () => set({
    groupId: null, status: 'idle', message: '',
    campaigns: {}, calls: {}, origin: null,
  }),

  setGroupId: (id) => set({ groupId: id }),

  handleWsMessage: (msg) => {
    const s = get()
    switch (msg.type) {
      case 'campaign_status':
        set({
          status: msg.status,
          message: msg.message || '',
          campaigns: {
            ...s.campaigns,
            [msg.campaign_id]: { ...s.campaigns[msg.campaign_id], status: msg.status }
          }
        })
        break

      case 'providers_found':
        set({
          origin: msg.origin,
          campaigns: {
            ...s.campaigns,
            [msg.campaign_id]: {
              ...s.campaigns[msg.campaign_id],
              providers: msg.providers,
            }
          }
        })
        // Init call cards
        const newCalls = { ...s.calls }
        msg.providers.forEach(p => {
          newCalls[p.provider_id] = {
            status: 'queued', name: p.name, rating: p.rating,
            distance: p.distance_miles, photo: p.photo_url,
            lat: p.lat, lng: p.lng, campaignId: msg.campaign_id,
          }
        })
        set({ calls: newCalls })
        break

      case 'call_started':
        set({
          status: 'calling',
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'ringing', name: msg.provider_name,
              rating: msg.provider_rating, distance: msg.provider_distance,
              photo: msg.photo_url, campaignId: msg.campaign_id,
            }
          }
        })
        break

      case 'call_connected':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'connected', conversationId: msg.conversation_id,
            }
          }
        })
        break

      case 'tool_called':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'negotiating', lastTool: msg.tool,
            }
          }
        })
        break

      case 'booking_confirmed':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'booked',
              slot: { date: msg.date, time: msg.time },
              serviceType: msg.service_type,
            }
          }
        })
        break

      case 'no_availability':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'no_availability', reason: msg.reason,
            }
          }
        })
        break

      case 'call_ended':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: s.calls[msg.provider_id]?.status === 'booked'
                ? 'booked' : 'completed',
              transcript: msg.transcript || s.calls[msg.provider_id]?.transcript || [],
            }
          }
        })
        break

      case 'transcript_loaded':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              transcript: msg.transcript || [],
            }
          }
        })
        break

      case 'call_failed':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'failed', error: msg.error,
            }
          }
        })
        break

      case 'call_skipped':
        set({
          calls: {
            ...s.calls,
            [msg.provider_id]: {
              ...s.calls[msg.provider_id],
              status: 'skipped', reason: msg.reason,
            }
          }
        })
        break

      case 'call_failed':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { ...c, status: 'failed', reason: message.reason }
              : c
          ),
          activeCalls: Math.max(0, state.activeCalls - 1),
          completedCalls: state.completedCalls + 1
        })
        break

      case 'campaign_complete':
        set({
          status: 'completed',
          campaigns: {
            ...s.campaigns,
            [msg.campaign_id]: {
              ...s.campaigns[msg.campaign_id],
              status: 'completed',
              results: msg.results,
              bestMatch: msg.best_match,
            }
          }
        })
        break

      case 'campaign_error':
        set({ status: 'error', message: msg.error })
        break
    }
  },
}))