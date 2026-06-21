/**
 * WebSocket 连接管理 Hook
 *
 * 支持两种模式：
 *   online — 连接线上服务器（部署在 Render），跨网络对战
 *   lan    — 连接局域网服务器（本地开发），同一 WiFi
 *
 * 自动判断默认模式：
 *   - 本地开发（localhost/192.168.x.x）→ 局域网模式
 *   - 线上部署（Vercel 域名）         → 线上模式
 * 可通过 .env 设置 VITE_WS_URL 覆盖线上地址。
 */
import { useState, useCallback, useRef } from 'react'

// 是否本地开发环境
const IS_LOCAL = window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.hostname.startsWith('192.168.')
  || window.location.hostname.startsWith('10.')
  || window.location.hostname.startsWith('172.')

// 线上服务器地址（通过环境变量配置）
const PRODUCTION_WS = import.meta.env.VITE_WS_URL || ''
const LAN_PORT = import.meta.env.VITE_WS_LAN_PORT || 4050

function getLanUrl() {
  const host = window.location.hostname || 'localhost'
  return `ws://${host}:${LAN_PORT}`
}

// 本地开发默认局域网，部署后默认线上
const DEFAULT_MODE = (!PRODUCTION_WS || IS_LOCAL) ? 'lan' : 'online'

export default function useWebSocket(initialMode) {
  const actualInitial = initialMode || DEFAULT_MODE
  const [mode, setMode] = useState(actualInitial)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [roomState, setRoomState] = useState(null)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const handlersRef = useRef({})
  const modeRef = useRef(initialMode)

  const getUrl = useCallback((m) => {
    return m === 'online' ? PRODUCTION_WS : getLanUrl()
  }, [])

  const connect = useCallback((m) => {
    const targetMode = m || mode
    modeRef.current = targetMode

    // 关闭旧连接
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setConnecting(true)
    setError(null)
    setConnected(false)

    const url = getUrl(targetMode)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setConnecting(false)
      setError(null)
    }

    ws.onclose = () => {
      setConnected(false)
      setConnecting(false)
      wsRef.current = null
    }

    ws.onerror = () => {
      // 不立即报错，让 onclose 处理
    }

    ws.onmessage = (event) => {
      let msg
      try { msg = JSON.parse(event.data) } catch { return }
      switch (msg.type) {
        case 'room_created':
        case 'room_joined':
          setRoomState(p => ({
            ...p, roomId: msg.roomId, playerId: msg.playerId,
            maxPlayers: msg.maxPlayers || 4, game: null,
          }))
          break
        case 'room_update':
          setRoomState(p => ({ ...p, players: msg.players, maxPlayers: msg.maxPlayers }))
          break
        case 'game_start':
          setRoomState(p => ({
            ...p,
            game: {
              handCards: msg.handCards,
              currentPlayer: msg.currentPlayer,
              isFirstRound: msg.isFirstRound,
              totalPlayers: msg.totalPlayers || 4,
            },
          }))
          break
        case 'game_state':
          setRoomState(p => ({ ...p, game: { ...(p?.game || {}), summary: msg.summary } }))
          break
        case 'hand_update':
          setRoomState(p => ({ ...p, game: { ...(p?.game || {}), handCards: msg.handCards } }))
          break
        case 'game_over':
          setRoomState(p => ({ ...p, game: { ...(p?.game || {}), gameOver: true, rankings: msg.rankings } }))
          break
        case 'error':
          setError(msg.message)
          break
      }
      const h = handlersRef.current[msg.type]
      if (h) h(msg)
    }
  }, [mode, getUrl])

  const switchMode = useCallback((newMode) => {
    setMode(newMode)
    setRoomState(null)
    connect(newMode)
  }, [connect])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
    setConnecting(false)
    setRoomState(null)
  }, [])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const on = useCallback((type, handler) => { handlersRef.current[type] = handler }, [])

  const createRoom = useCallback((name, maxPlayers = 4) =>
    send({ type: 'create_room', playerName: name, maxPlayers }), [send])

  const joinRoom = useCallback((id, name) =>
    send({ type: 'join_room', roomId: id, playerName: name }), [send])

  const playCards = useCallback((roomId, cardIds) =>
    send({ type: 'play_cards', roomId, cardIds }), [send])

  const pass = useCallback((roomId) =>
    send({ type: 'pass', roomId }), [send])

  return {
    mode, connected, connecting, roomState, error,
    connect, disconnect, switchMode, createRoom, joinRoom, playCards, pass, on,
    clearError: () => setError(null),
  }
}
