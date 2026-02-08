import { create } from 'zustand'

export const useCampaignStore = create((set, get) => ({
  // Campaign state
  campaignId: null,
  status: 'idle', // idle, searching, calling, complete, cancelled, failed
  startedAt: null,
  completedAt: null,
  
  // Calls state
  calls: [], // { providerId, providerName, status, transcript, offeredSlot, score, duration }
  activeCalls: 0,
  completedCalls: 0,
  
  // Results
  rankedResults: [],
  bestMatch: null,
  
  // WebSocket
  wsConnected: false,
  
  // Actions
  setCampaign: (campaignId) => set({ 
    campaignId, 
    status: 'searching',
    startedAt: new Date().toISOString(),
    calls: [],
    rankedResults: [],
    bestMatch: null
  }),

  setStatus: (status) => set({ status }),
  
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // Fetch full campaign state (sync)
  fetchCampaign: async (campaignId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/campaign/${campaignId}`)
      if (!response.ok) throw new Error('Failed to fetch campaign')
      
      const campaign = await response.json()
      set((state) => ({
        status: campaign.status || state.status,
        calls: campaign.calls || state.calls,
        rankedResults: campaign.ranked_results || state.rankedResults,
        bestMatch: campaign.best_match || state.bestMatch,
        startedAt: campaign.started_at || state.startedAt,
        completedAt: campaign.completed_at || state.completedAt,
        activeCalls: (campaign.calls || []).filter(c => 
          ['dialing', 'ringing', 'connected', 'negotiating'].includes(c.status)
        ).length,
        completedCalls: (campaign.calls || []).filter(c => 
          ['booked', 'no_availability', 'failed'].includes(c.status)
        ).length
      }))
    } catch (error) {
      console.error('Fetch campaign error:', error)
    }
  },

  // Handle WebSocket messages
  handleMessage: (message) => {
    const state = get()
    console.log('socket event:', message.type, message)
    
    switch (message.type) {
      case 'campaign_update':
        // Full campaign update from backend
        const campaign = message.campaign
        if (campaign) {
          set({
            status: campaign.status || state.status,
            calls: campaign.calls || state.calls,
            rankedResults: campaign.ranked_results || state.rankedResults,
            bestMatch: campaign.best_match || state.bestMatch,
            activeCalls: (campaign.calls || []).filter(c => 
              ['dialing', 'ringing', 'connected', 'negotiating'].includes(c.status)
            ).length,
            completedCalls: (campaign.calls || []).filter(c => 
              ['booked', 'no_availability', 'failed'].includes(c.status)
            ).length
          })
        }
        break

      case 'provider_found':
        // A new provider was found during search
        if (!state.calls.find(c => c.providerId === message.provider?.id)) {
          set({
            status: 'searching',
            calls: [...state.calls, {
              providerId: message.provider?.id || message.provider_id,
              providerName: message.provider?.name,
              status: 'found',
              rating: message.provider?.rating,
              distance: message.provider?.distance,
              latitude: message.provider?.lat,
              longitude: message.provider?.lng,
              transcript: [],
              offeredSlot: null,
              score: null
            }]
          })
        }
        break

      case 'providers_found':
        // Backend sends all providers at once after search
        const newCalls = (message.providers || []).map(p => ({
          providerId: p.provider_id || p.place_id,
          providerName: p.name,
          status: 'found',
          rating: p.rating,
          distance: p.distance_miles,
          latitude: p.lat,
          longitude: p.lng,
          transcript: [],
          offeredSlot: null,
          score: null
        }))
        set({
          status: 'calling',
          calls: newCalls,
          origin: message.origin
        })
        break

      case 'call_started':
        // Add provider to calls if not already present, then update status
        const existingCall = state.calls.find(c => c.providerId === message.provider_id)
        if (existingCall) {
          set({
            status: 'calling',
            calls: state.calls.map(c =>
              c.providerId === message.provider_id
                ? { ...c, status: 'dialing', startedAt: new Date().toISOString() }
                : c
            ),
            activeCalls: state.activeCalls + 1
          })
        } else {
          // Provider not in calls yet, add it
          set({
            status: 'calling',
            calls: [...state.calls, {
              providerId: message.provider_id,
              providerName: message.provider_name,
              status: 'dialing',
              rating: message.provider_rating,
              distance: message.provider_distance,
              transcript: [],
              offeredSlot: null,
              score: null,
              startedAt: new Date().toISOString()
            }],
            activeCalls: state.activeCalls + 1
          })
        }
        break

      case 'call_status':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { ...c, status: message.status, conversationId: message.conversation_id }
              : c
          )
        })
        break

      case 'call_connected':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { ...c, status: 'connected' }
              : c
          )
        })
        break

      case 'transcript_chunk':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { 
                  ...c, 
                  transcript: [...c.transcript, { 
                    speaker: message.speaker, 
                    text: message.text,
                    timestamp: new Date().toISOString()
                  }]
                }
              : c
          )
        })
        break

      case 'tool_called':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { ...c, status: 'negotiating', lastTool: message.tool }
              : c
          )
        })
        break

      case 'tool_result':
        if (message.tool === 'check_calendar' && message.result?.available) {
          set({
            calls: state.calls.map(c => 
              c.providerId === message.provider_id 
                ? { ...c, offeredSlot: message.result.slot }
                : c
            )
          })
        }
        break

      case 'slot_offered':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { ...c, offeredSlot: { date: message.date, time: message.time } }
              : c
          )
        })
        break

      case 'booking_confirmed':
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { 
                  ...c, 
                  status: 'booked',
                  bookingConfirmed: true,
                  booking: message.booking,
                  offeredSlot: { 
                    date: message.booking?.date, 
                    time: message.booking?.time 
                  }
                }
              : c
          )
        })
        break

      case 'call_ended':
        const endedCall = state.calls.find(c => c.providerId === message.provider_id)
        const duration = endedCall?.startedAt
          ? (new Date() - new Date(endedCall.startedAt)) / 1000 
          : 0
        
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { 
                  ...c, 
                  status: message.status || 'completed',
                  duration,
                  reason: message.reason
                }
              : c
          ),
          activeCalls: Math.max(0, state.activeCalls - 1),
          completedCalls: state.completedCalls + 1
        })
        break

      case 'call_completed':
        const completedCall = state.calls.find(c => c.providerId === message.provider_id)
        const callDuration = completedCall?.startedAt
          ? (new Date() - new Date(completedCall.startedAt)) / 1000 
          : 0
        
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { 
                  ...c, 
                  status: message.status,
                  duration: callDuration,
                  result: message.result,
                  score: message.result?.score
                }
              : c
          ),
          activeCalls: Math.max(0, state.activeCalls - 1),
          completedCalls: state.completedCalls + 1
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
          status: 'complete',
          completedAt: new Date().toISOString(),
          rankedResults: message.results || message.ranked_results || [],
          bestMatch: message.best_match || message.results?.[0] || null
        })
        break

      case 'group_complete':
        set({
          status: 'complete',
          completedAt: new Date().toISOString()
        })
        break

      case 'campaign_status':
        // Status update during search/calling phase
        console.log('Campaign status:', message.status, message.message)
        if (message.status === 'searching' || message.status === 'calling') {
          set({ status: message.status })
        }
        break

      case 'campaign_error':
        console.error('Campaign error:', message.error)
        set({ status: 'failed' })
        break

      default:
        console.log('Unknown message type:', message.type, message)
    }
  },


  // Confirm a booking
  confirmBooking: async (providerId) => {
    const state = get()
    try {
      const response = await fetch(`http://localhost:8000/api/campaign/${state.campaignId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId })
      })
      
      if (!response.ok) throw new Error('Confirmation failed')
      
      const result = await response.json()
      set({ status: 'confirmed', confirmedBooking: result })
      return result
    } catch (error) {
      console.error('Confirm booking error:', error)
      throw error
    }
  },

  // Cancel campaign
  cancelCampaign: async () => {
    const state = get()
    try {
      await fetch(`http://localhost:8000/api/campaign/${state.campaignId}/cancel`, {
        method: 'POST'
      })
      set({ status: 'cancelled' })
    } catch (error) {
      console.error('Cancel campaign error:', error)
    }
  },

  // Reset
  reset: () => set({
    campaignId: null,
    status: 'idle',
    startedAt: null,
    completedAt: null,
    calls: [],
    activeCalls: 0,
    completedCalls: 0,
    rankedResults: [],
    bestMatch: null,
    wsConnected: false
  })
}))
