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

  // Handle WebSocket messages
  handleMessage: (message) => {
    const state = get()
    
    switch (message.type) {
      case 'call_started':
        set({
          calls: [...state.calls, {
            providerId: message.provider_id,
            providerName: message.provider_name,
            status: 'ringing',
            transcript: [],
            offeredSlot: null,
            score: null,
            duration: 0,
            startedAt: new Date().toISOString()
          }],
          activeCalls: state.activeCalls + 1
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

      case 'call_completed':
        const completedCall = state.calls.find(c => c.providerId === message.provider_id)
        const duration = completedCall 
          ? (new Date() - new Date(completedCall.startedAt)) / 1000 
          : 0
        
        set({
          calls: state.calls.map(c => 
            c.providerId === message.provider_id 
              ? { 
                  ...c, 
                  status: message.status, // 'booked', 'no_availability', 'failed'
                  duration,
                  result: message.result,
                  score: message.result?.score
                }
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
          rankedResults: message.ranked_results || [],
          bestMatch: message.ranked_results?.[0] || null
        })
        break

      default:
        console.log('Unknown message type:', message.type)
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
