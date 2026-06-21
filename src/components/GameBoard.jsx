import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import HandCards from './HandCards'
import PlayArea from './PlayArea'
import PlayerInfo from './PlayerInfo'
import Result from './Result'
import { GAME_STATE } from '../game/GameEngine'
import { getPlayType } from '../game/Rules'
import { playCardSound, playPassSound, playBombSound, playYourTurnSound, playSelectSound } from '../game/Sound'

const FIVE_NAMES = ['顺子', '葫芦', '四带一', '同花', '同花顺']
const FIVE_TYPES = ['straight', 'full_house', 'four_one', 'flush', 'straight_flush']

/** 是否为大牌（需要特效） */
function isBigPlay(typeInfo) {
  if (!typeInfo) return false
  if (typeInfo.fiveType === 'straight_flush') return true
  if (typeInfo.fiveType === 'four_one') return true // 四带一当炸弹处理
  if (typeInfo.fiveType === 'flush') return true
  if (typeInfo.type === 'triple' && typeInfo.key >= 11) return true // 大三条（A/2/3/王）
  return false
}

export default function GameBoard({
  game, summary, handCards, thinking, isNetwork, isMyTurn,
  humanRankings, roundScores, cumulativeScores,
  onPlayCards, onPass, onRestart, onPlayAgain
}) {
  const [selected, setSelected] = useState(new Set())
  const [isLandscape, setIsLandscape] = useState(false)
  const [shakeHands, setShakeHands] = useState(0) // 手牌抖动触发
  const [bombEffect, setBombEffect] = useState(null) // { type: 'bomb'|'sf' }
  const [passEffect, setPassEffect] = useState(false) // "过" 效果
  const [showGlow, setShowGlow] = useState(false)
  const boardRef = useRef(null)
  const prevMyTurn = useRef(false)

  // 横竖屏检测
  useEffect(() => {
    const check = () => setIsLandscape(window.matchMedia('(orientation: landscape) and (max-height: 600px)').matches)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 轮到你了 → 金色呼吸灯 + 提示音
  useEffect(() => {
    if (isMyTurn && !prevMyTurn.current) {
      setShowGlow(true)
      playYourTurnSound()
    }
    prevMyTurn.current = isMyTurn
  }, [isMyTurn])

  const handleToggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      next.add(id)
      playSelectSound()
      return next
    })
  }, [])

  const selectedCards = useMemo(() => handCards.filter(c => selected.has(c.id)), [handCards, selected])
  const typeInfo = useMemo(() => {
    if (selectedCards.length === 0) return null
    return getPlayType(selectedCards)
  }, [selectedCards])

  const canPlay = useMemo(() => isMyTurn && !thinking && typeInfo?.type !== 'invalid', [isMyTurn, thinking, typeInfo])
  const canPass = useMemo(() => {
    if (!isMyTurn || thinking) return false
    if (summary?.isFirstRound) return false
    if (!summary?.lastPlay) return false
    return true
  }, [isMyTurn, thinking, summary])

  const handlePlay = useCallback(() => {
    if (!canPlay) {
      // 牌型不合法 → 抖动，不弹窗
      setShakeHands(n => n + 1)
      return
    }
    const bomb = isBigPlay(typeInfo)
    if (bomb) {
      setBombEffect(typeInfo.fiveType === 'straight_flush' ? 'sf' : 'bomb')
      playBombSound()
      setTimeout(() => setBombEffect(null), 1000)
    } else {
      playCardSound()
    }
    onPlayCards([...selected])
    setSelected(new Set())
  }, [canPlay, onPlayCards, selected, typeInfo])

  const handlePass = useCallback(() => {
    if (!canPass) return
    playPassSound()
    setPassEffect(true)
    setTimeout(() => setPassEffect(false), 500)
    onPass()
    setSelected(new Set())
  }, [canPass, onPass])

  const handleQuickSelect = useCallback(() => {
    if (selectedCards.length === 0) return
    const rank = selectedCards[0].rank
    setSelected(new Set(handCards.filter(c => c.rank === rank).map(c => c.id)))
  }, [selectedCards, handCards])

  const isGameOver = game?.state === GAME_STATE.FINISHED || summary?.state === GAME_STATE.FINISHED
  if (isGameOver) return (
    <Result
      summary={summary}
      humanRankings={humanRankings}
      roundScores={roundScores}
      cumulativeScores={cumulativeScores}
      onRestart={onRestart}
      onPlayAgain={onPlayAgain}
    />
  )

  const typeName = typeInfo && typeInfo.type !== 'invalid'
    ? typeInfo.fiveType
      ? FIVE_NAMES[FIVE_TYPES.indexOf(typeInfo.fiveType)]
      : typeInfo.type === 'single' ? '单张'
      : typeInfo.type === 'pair' ? '对子'
      : '三条'
    : selectedCards.length > 0 ? '无效牌型' : ''

  const opponentPlayers = summary?.players?.filter(p => p.id !== 0) || []

  return (
    <div ref={boardRef} className={`game-board ${isLandscape ? 'landscape' : ''}`}>
      {/* 得分栏 */}
      <div className="score-bar">
        <span className="game-title">🃏 争上游</span>
        <div className="score-list">
          {(summary?.players || []).slice(0, 4).map((p, i) => (
            <span key={p.id} className="score-item">
              {p.name}: <b>{cumulativeScores?.[p.name] ?? 0}</b>
              {i < 3 && <span className="score-sep">|</span>}
            </span>
          ))}
        </div>
      </div>

      {!isLandscape && (
        <div className="players-top">
          {opponentPlayers.slice(0, 2).map(p => (
            <PlayerInfo key={p.id} player={p} starterPlayer={summary?.lastPlay?.playerId} />
          ))}
        </div>
      )}

      {summary && (
        <PlayArea
          summary={summary}
          thinking={thinking}
          bombEffect={bombEffect}
          passEffect={passEffect}
        />
      )}

      {!isLandscape && opponentPlayers[2] && (
        <PlayerInfo player={opponentPlayers[2]} starterPlayer={summary?.lastPlay?.playerId} />
      )}

      {isLandscape && opponentPlayers.map((p, i) => (
        <div key={p.id} className={`player-pos-${i + 1}`}>
          <PlayerInfo player={p} starterPlayer={summary?.lastPlay?.playerId} />
        </div>
      ))}

      <div className="game-controls">
        <div className="hand-area">
          <HandCards
            cards={handCards}
            selected={selected}
            onToggleCard={handleToggle}
            disabled={!isMyTurn || thinking}
            glow={showGlow}
            shakeKey={shakeHands}
          />
        </div>
        <div className="action-bar">
          <span className="type-hint">{typeName}</span>
          <div className="action-buttons">
            <button className="btn btn-action" onClick={handleQuickSelect} disabled={selectedCards.length === 0}>同rank</button>
            <button className="btn btn-primary" onClick={handlePlay} disabled={!isMyTurn || thinking}>出牌</button>
            <button className="btn btn-secondary" onClick={handlePass} disabled={!canPass}>过</button>
          </div>
        </div>
      </div>
    </div>
  )
}
