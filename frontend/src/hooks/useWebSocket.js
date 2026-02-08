import { useEffect, useRef, useState, useCallback } from 'react'
import { useCampaignStore } from '../stores/campaignStore'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export default function useWebSocket(campaignId) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)

  const { handleMessage, setWsConnected } = useCampaignStore()

  const connect = useCallback(() => {
    if (!campaignId) return

    const wsUrl = `${WS_BASE_URL}/ws/transcript/${campaignId}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setWsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onerror = (e) => {
        console.error('WebSocket error:', e)
        setError('Connection error')
      }

      ws.onclose = (e) => {
        console.log('WebSocket closed:', e.code, e.reason)
        setIsConnected(false)
        setWsConnected(false)
        
        // Reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1
            connect()
          }, delay)
        }
      }
    } catch (e) {
      console.error('WebSocket connection failed:', e)
      setError('Failed to connect')
    }
  }, [campaignId, handleMessage, setWsConnected])

  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  return {
    isConnected,
    error,
    sendMessage
  }
}
