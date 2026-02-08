import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Phone
      phoneNumber: '',
      
      // Default weights
      defaultWeightAvailability: 40,
      defaultWeightRating: 30,
      defaultWeightDistance: 20,
      defaultWeightPreference: 10,
      
      // Default agent config
      defaultAgentVoice: '',
      defaultAgentName: 'Alex',
      defaultFirstMessage: "Hi, I'm calling on behalf of a patient to schedule an appointment.",
      defaultSystemPrompt: '',
      
      // Preferences
      defaultMaxDistance: 10,
      defaultMaxProviders: 5,
      calendarId: 'primary',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Update functions
      updateSetting: (key, value) => set({ [key]: value }),
      
      updateSettings: (settings) => set(settings),
      
      // Save to backend
      saveSettings: async () => {
        const state = get()
        try {
          const response = await fetch('http://localhost:8000/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone_number: state.phoneNumber,
              default_weights: {
                availability: state.defaultWeightAvailability,
                rating: state.defaultWeightRating,
                distance: state.defaultWeightDistance,
                preference: state.defaultWeightPreference
              },
              default_agent_config: {
                voice: state.defaultAgentVoice,
                name: state.defaultAgentName,
                first_message: state.defaultFirstMessage,
                system_prompt: state.defaultSystemPrompt
              },
              default_max_distance: state.defaultMaxDistance,
              default_max_providers: state.defaultMaxProviders,
              calendar_id: state.calendarId,
              timezone: state.timezone
            })
          })
          
          if (!response.ok) throw new Error('Save failed')
          return true
        } catch (error) {
          console.error('Save settings error:', error)
          return false
        }
      },
      
      // Load from backend
      loadSettings: async () => {
        try {
          const response = await fetch('http://localhost:8000/api/settings')
          if (!response.ok) throw new Error('Load failed')
          
          const data = await response.json()
          set({
            phoneNumber: data.phone_number || '',
            defaultWeightAvailability: data.default_weights?.availability || 40,
            defaultWeightRating: data.default_weights?.rating || 30,
            defaultWeightDistance: data.default_weights?.distance || 20,
            defaultWeightPreference: data.default_weights?.preference || 10,
            defaultAgentVoice: data.default_agent_config?.voice || '',
            defaultAgentName: data.default_agent_config?.name || 'Alex',
            defaultFirstMessage: data.default_agent_config?.first_message || '',
            defaultSystemPrompt: data.default_agent_config?.system_prompt || '',
            defaultMaxDistance: data.default_max_distance || 10,
            defaultMaxProviders: data.default_max_providers || 5,
            calendarId: data.calendar_id || 'primary',
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
          })
        } catch (error) {
          console.error('Load settings error:', error)
        }
      }
    }),
    {
      name: 'callpilot-settings'
    }
  )
)
