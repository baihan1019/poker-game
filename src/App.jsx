import React, { useState, useCallback, useRef, useEffect } from 'react'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import { createGame, startGame, playCards, pass, getGameSummary, GAME_STATE } from './game/GameEngine'
import { aiChoosePlay } from './game/AI'
import { updateScores, loadAllScores, getPlayerScore } from './game/Score'
import useWebSocket from './hooks/useWebSocket'

export default function App() {
  const [mode, setMode] = useState(null) // null | 'single' | 'network'
  const [game, setGame] = useState(null)
  const [summary, setSummary] = useState(null)
  const [handCards, setHandCards] = useState([])
  const [thinking, setThinking] = useState(false)
  const gameRef = useRef(null)
  const [humanRankings, setHumanRankings] = useState(null)
  const [roundScores, setRoundScores] = useState(null) // 本局各人得分
  const [cumulativeScores, setCumulativeScores] = useState(null) // 累计积分

  const ws = useWebSocket()
  const networkReady = useRef(false)

  // ===== 单机模式 AI 回合 =====
  const doAiTurn = useCallback((g) => {
    setThinking(true)
    setTimeout(() => {
      if (!g || g.state !== GAME_STATE.PLAYING) { setThinking(false); return }
      const pid = g.currentPlayer
      if (pid === 0) { setThinking(false); return }
      const hand = g.players[pid].handCards
      const choice = aiChoosePlay(hand, g.lastPlay, g.isFirstRound)
      if (choice) playCards(g, pid, choice)
      else pass(g, pid)
      setGame({ ...g })
      setSummary(getGameSummary(g))
      if (g.state === GAME_STATE.FINISHED) { setThinking(false); return }
      if (g.currentPlayer !== 0) doAiTurn(g)
      else { setThinking(false); setHandCards([...g.players[0].handCards]) }
    }, 800)
  }, [])

  // ===== 开始单机 =====
  const startSingleGame = useCallback((playerNames) => {
    const g = createGame(playerNames || ['你', 'AI 1', 'AI 2', 'AI 3'])
    startGame(g)
    gameRef.current = g
    setHandCards([...g.players[0].handCards])
    setGame(g)
    setSummary(getGameSummary(g))
    setRoundScores(null)
    setCumulativeScores(loadAllScores())
    setMode('single')
    if (g.currentPlayer !== 0) doAiTurn(g)
  }, [doAiTurn])

  const handleStartSingle = useCallback(() => {
    startSingleGame()
  }, [startSingleGame])

  // ===== 处理游戏结束（积分结算）=====
  const handleGameOver = useCallback((players) => {
    // players: [{ name, rank, isAI? }]
    const { roundScores: rs, cumulative } = updateScores(players)
    setRoundScores(rs)
    setCumulativeScores(cumulative)
  }, [])

  // 监听单机模式结束
  useEffect(() => {
    if (mode !== 'single' || !game) return
    if (game.state === GAME_STATE.FINISHED) {
      const players = game.players.map(p => ({ name: p.name, rank: p.rank || 4 }))
      handleGameOver(players)
    }
  }, [mode, game, handleGameOver])

  // 监听联网模式结束
  useEffect(() => {
    if (mode !== 'network' || !ws.roomState?.game) return
    const g = ws.roomState.game
    const s = g.summary
    if (g.gameOver && g.rankings) {
      const rankings = g.rankings
      handleGameOver(rankings.map(r => ({ name: r.name, rank: r.rank || 4 })))

      const humanOnly = rankings.filter(r => !r.isAI)
      const reRanked = humanOnly.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((p, i) => ({ ...p, rank: i + 1 }))
      setHumanRankings(reRanked)

      const rankedPlayers = (s?.players || []).map(p => ({
        ...p, rank: rankings.find(r => r.id === p.id)?.rank || 4,
      }))
      const humanOnlyPlayers = rankedPlayers.filter(p => {
        const r = rankings.find(r => r.id === p.id)
        return r && !r.isAI
      })
      setSummary({ ...s, players: humanOnlyPlayers })
      return
    }
    if (s) setSummary(s)
    if (s) {
      gameRef.current = {
        state: s.state, currentPlayer: s.currentPlayer,
        players: s.players.map(p => ({
          id: p.id, name: p.name,
          handCards: p.id === ws.roomState?.playerId ? (g.handCards || []) : [],
          isFinished: p.isFinished, rank: p.rank, isAI: p.isAI,
        })),
        lastPlay: s.lastPlay ? { playerId: s.lastPlay.playerId, cards: s.lastPlay.cards, typeInfo: { type: '', fiveType: s.lastPlay.typeName } } : null,
        isFirstRound: s.isFirstRound,
      }
    }
  }, [ws.roomState, mode, handleGameOver])

  // ===== 出牌 / 过牌 =====
  const handlePlayCards = useCallback((cardIds) => {
    const g = gameRef.current
    if (!g || !g.state) return
    if (mode === 'single') {
      if (g.currentPlayer !== 0 || thinking || g.state !== GAME_STATE.PLAYING) return
      const r = playCards(g, 0, cardIds)
      if (!r.success) return // 不合法则静默（由 UI 处理抖动）
      setGame({ ...g })
      setSummary(getGameSummary(g))
      setHandCards([...g.players[0].handCards])
      if (g.state !== GAME_STATE.FINISHED) doAiTurn(g)
    } else if (mode === 'network') {
      ws.playCards(ws.roomState?.roomId, cardIds)
    }
  }, [mode, thinking, doAiTurn, ws])

  const handlePass = useCallback(() => {
    if (mode === 'single') {
      const g = gameRef.current
      if (!g || g.currentPlayer !== 0 || thinking || g.state !== GAME_STATE.PLAYING) return
      pass(g, 0)
      setGame({ ...g })
      setSummary(getGameSummary(g))
      doAiTurn(g)
    } else if (mode === 'network') {
      ws.pass(ws.roomState?.roomId)
    }
  }, [mode, thinking, doAiTurn, ws])

  // ===== 联网（自动判断线上/局域网）=====
  useEffect(() => {
    if (!networkReady.current) {
      ws.connect() // 自动判断模式
      networkReady.current = true
    }
  }, [ws])

  const handleStartNetwork = useCallback((name, maxPlayers) => { ws.createRoom(name, maxPlayers) }, [ws])
  const handleJoinRoom = useCallback((roomId, name) => { ws.joinRoom(roomId, name) }, [ws])

  // ===== 再来一局（单机）=====
  const handlePlayAgain = useCallback(() => {
    startSingleGame(['你', 'AI 1', 'AI 2', 'AI 3'])
  }, [startSingleGame])

  // ===== 退出 =====
  const handleRestart = useCallback(() => {
    setMode(null); setGame(null); setSummary(null)
    setHandCards([]); setThinking(false); gameRef.current = null
    setHumanRankings(null); setRoundScores(null); setCumulativeScores(null)
    ws.disconnect()
    setTimeout(() => { ws.connect(); networkReady.current = true }, 100)
  }, [ws])

  // ===== 渲染 =====
  if (!mode) {
    return (
      <Lobby
        onStartSinglePlayer={handleStartSingle}
        onStartNetwork={handleStartNetwork}
        onJoinRoom={handleJoinRoom}
        connected={ws.connected}
        connecting={ws.connecting}
        error={ws.error}
        roomState={ws.roomState}
        wsMode={ws.mode}
        onSwitchMode={ws.switchMode}
      />
    )
  }

  const myTurn = mode === 'single'
    ? game?.currentPlayer === 0
    : summary?.currentPlayer === ws.roomState?.playerId

  return (
    <GameBoard
      game={mode === 'single' ? game : gameRef.current}
      summary={summary}
      handCards={handCards}
      thinking={thinking || (mode === 'network' && !myTurn)}
      isNetwork={mode === 'network'}
      isMyTurn={myTurn}
      humanRankings={humanRankings}
      roundScores={roundScores}
      cumulativeScores={cumulativeScores}
      onPlayCards={handlePlayCards}
      onPass={handlePass}
      onRestart={handleRestart}
      onPlayAgain={handlePlayAgain}
    />
  )
}
