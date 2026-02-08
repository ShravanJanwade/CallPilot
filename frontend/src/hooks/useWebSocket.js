import { useEffect, useRef } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(roomId, onMessage) {
  const wsRef = useRef(null)

  useEffect(() => {
    if (!roomId) return

    const url = `${WS_URL}/ws/transcript/${roomId}`
    console.log('📡 Connecting WS:', url)

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => console.log('📡 WS connected')
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        console.log('📡 WS message:', data)
        onMessage(data)
      } catch (err) {
        console.error('WS parse error:', err)
      }
    }
    ws.onerror = (e) => console.error('📡 WS error:', e)
    ws.onclose = () => {
      console.log('📡 WS disconnected, reconnecting in 3s...')
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          // Reconnect logic would go here
        }
      }, 3000)
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [roomId])

  return wsRef
}
