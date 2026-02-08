import { create } from 'zustand'

const defaultBookingState = {
  // Step 1: Service
  serviceType: '',
  description: '',
  preferredProviders: [], // { name, phone }
  
  // Step 2: Date/Time
  dateRangeStart: null,
  dateRangeEnd: null,
  timePreference: 'any', // morning, afternoon, evening, any
  duration: 60, // minutes
  
  // Step 3: Location
  location: '',
  latitude: null,
  longitude: null,
  maxDistance: 10, // miles
  
  // Step 4: Priorities
  weightAvailability: 40,
  weightRating: 30,
  weightDistance: 20,
  weightPreference: 10,
  maxProviders: 5,
  
  // Step 5: Agent Config
  agentVoice: '',
  agentName: 'Alex',
  firstMessage: "Hi, I'm calling on behalf of a patient to schedule an appointment.",
  systemPrompt: '',
  userPhone: '',
  
  // Step tracking
  currentStep: 1,
  
  // Provider search results
  providers: [],
  isSearchingProviders: false
}

export const useBookingStore = create((set, get) => ({
  ...defaultBookingState,

  // Step navigation
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 6) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

  // Field updates
  updateField: (field, value) => set({ [field]: value }),
  
  // Preferred providers
  addPreferredProvider: (provider) => set((state) => ({
    preferredProviders: [...state.preferredProviders, provider]
  })),
  removePreferredProvider: (index) => set((state) => ({
    preferredProviders: state.preferredProviders.filter((_, i) => i !== index)
  })),

  // Priority sliders (ensure they sum to 100)
  updateWeights: (weights) => set(weights),

  // Provider search
  setProviders: (providers) => set({ providers }),
  setSearchingProviders: (isSearching) => set({ isSearchingProviders: isSearching }),

  // Search providers from API
  searchProviders: async () => {
    const state = get()
    set({ isSearchingProviders: true })
    
    try {
      const params = new URLSearchParams({
        category: state.serviceType,
        location: state.location,
        max_results: String(state.maxProviders),
        radius_miles: String(state.maxDistance)
      })
      
      const response = await fetch(`http://localhost:8000/api/providers/search?${params}`)
      if (!response.ok) throw new Error('Provider search failed')
      
      const data = await response.json()
      set({ providers: data.providers || [], isSearchingProviders: false })
      return data.providers
    } catch (error) {
      console.error('Provider search error:', error)
      set({ isSearchingProviders: false })
      return []
    }
  },

  // Reset form
  reset: () => set(defaultBookingState),

  // Get form data for API submission
  getFormData: () => {
    const state = get()
    return {
      service_type: state.serviceType,
      description: state.description,
      preferred_providers: state.preferredProviders,
      date_range_start: state.dateRangeStart,
      date_range_end: state.dateRangeEnd,
      time_preference: state.timePreference,
      duration: state.duration,
      location: state.location,
      latitude: state.latitude,
      longitude: state.longitude,
      max_distance_miles: state.maxDistance,
      weights: {
        availability: state.weightAvailability / 100,
        rating: state.weightRating / 100,
        distance: state.weightDistance / 100,
        preference: state.weightPreference / 100
      },
      max_providers: state.maxProviders,
      agent_config: {
        voice: state.agentVoice,
        name: state.agentName,
        first_message: state.firstMessage,
        system_prompt: state.systemPrompt,
        user_phone: state.userPhone
      }
    }
  }
}))
