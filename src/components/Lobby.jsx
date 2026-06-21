import React, { useState } from 'react'

/**
 * 大厅组件
 *
 * 支持：
 * - 单人 vs AI
 * - 联网对战（创建/加入房间）
 * - 2/3/4 人局选择（创建房间时）
 * - 等候室：显示真人/AI 空位
 * - 分享：Web Share API / 复制链接
 * - URL 参数 ?room=123456 自动填入房间号
 */
export default function Lobby({
  onStartSinglePlayer,
  onStartNetwork,
  onJoinRoom,
  connected,
  connecting,
  error,
  roomState,
  wsMode = 'online',
  onSwitchMode,
}) {
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [showNetwork, setShowNetwork] = useState(false)

  // 从 URL 读取房间号
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('room')
    if (code) {
      setRoomCode(code)
      setShowNetwork(true)
    }
  }, [])

  const handleJoin = () => {
    if (roomCode.trim()) onJoinRoom(roomCode.trim(), playerName || '玩家')
  }

  const handleCreateNetwork = () => {
    onStartNetwork(playerName || '玩家', maxPlayers)
  }

  // 如果已有 roomState（已创建/加入房间），显示等候室
  if (roomState?.roomId && !roomState?.game) {
    return (
      <WaitingRoom
        roomState={roomState}
        playerName={playerName}
        onLeave={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="lobby">
      <h1 className="lobby-title">🃏 争上游</h1>
      <p className="lobby-subtitle">四人扑克牌游戏</p>

      <div className="lobby-player-name">
        <label>你的名字：</label>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="输入昵称"
          maxLength={8}
          className="input-name"
        />
      </div>

      <div className="lobby-cards">
        <button className="lobby-btn primary" onClick={onStartSinglePlayer}>
          🎮 单人模式（vs AI）
        </button>
        <button className="lobby-btn" onClick={() => setShowNetwork(!showNetwork)}>
          🌐 {showNetwork ? '收起' : '联网对战'}
        </button>
      </div>

      {showNetwork && (
        <div className="network-section">
          {/* 模式选择：线上 / 局域网 */}
          <div className="mode-select">
            <button
              className={`mode-btn ${wsMode === 'online' ? 'active' : ''}`}
              onClick={() => onSwitchMode?.('online')}
            >
              <span className="mode-icon">☁️</span>
              <span className="mode-label">线上模式</span>
              <span className="mode-desc">不同网络都能玩</span>
            </button>
            <button
              className={`mode-btn ${wsMode === 'lan' ? 'active' : ''}`}
              onClick={() => onSwitchMode?.('lan')}
            >
              <span className="mode-icon">📡</span>
              <span className="mode-label">局域网模式</span>
              <span className="mode-desc">同一 WiFi 下</span>
            </button>
          </div>

          {/* 连接状态 */}
          <div className="mode-status">
            {connecting && <span className="network-status">⏳ 连接中...</span>}
            {!connecting && connected && <span className="network-status connected">
              🟢 已连接到 {wsMode === 'online' ? '线上服务器' : '局域网服务器'}
            </span>}
            {!connecting && !connected && !error && <span className="network-status">
              🔴 未连接
            </span>}
            {error && <p className="network-error">❌ {error}</p>}
          </div>

          {/* 人数选择 */}
          <div className="player-count-select">
            <label>本局人数：</label>
            <div className="count-options">
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`count-btn ${maxPlayers === n ? 'active' : ''}`}
                  onClick={() => setMaxPlayers(n)}
                >
                  {n}人局
                </button>
              ))}
            </div>
          </div>

          <div className="network-create">
            <button className="lobby-btn primary" onClick={handleCreateNetwork} disabled={!connected}>
              创建房间
            </button>
          </div>

          <div className="network-divider">或</div>

          <div className="network-join">
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="输入房间号"
              maxLength={6}
              className="input-room"
            />
            <button className="lobby-btn" onClick={handleJoin} disabled={!connected || !roomCode.trim()}>
              加入
            </button>
          </div>
        </div>
      )}

      <div className="lobby-rules">
        <h3>📖 简要规则</h3>
        <ul>
          <li>4人游戏，每人13张牌，♦4持有者先出</li>
          <li>首轮出牌必须包含♦4</li>
          <li>可出 1张、2张、3张、5张</li>
          <li>五张牌型：顺子 &lt; 葫芦 &lt; 四带一 &lt; 同花 &lt; 同花顺</li>
          <li>牌面：4 &lt; 5 &lt; ... &lt; A &lt; 2 &lt; 3 &lt; 小王 &lt; 大王</li>
          <li>先出完获胜，直至排出所有名次</li>
        </ul>
      </div>
    </div>
  )
}

/**
 * 等候室组件
 *
 * 显示房间号、玩家列表（真人/AI 空位）、分享按钮
 */
function WaitingRoom({ roomState, playerName, onLeave }) {
  const { roomId, players = [], maxPlayers = 4 } = roomState || {}
  const totalSlots = 4 // 始终显示4个卡槽
  const humanPlayers = players.filter(p => !p.isAI)
  const aiCount = 4 - maxPlayers // 需要补齐的AI数量
  const filledSlots = players.length // 已占用的槽位（包括AI）

  // 分享链接
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`
  const shareText = `🎴 来玩争上游！房间号：${roomId}\n${shareUrl}`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: '争上游扑克', text: shareText, url: shareUrl })
      } catch { /* 用户取消分享不处理 */ }
    } else {
      // 降级：复制到剪贴板
      try {
        await navigator.clipboard.writeText(shareText)
        alert('✅ 链接已复制到剪贴板！')
      } catch {
        // 手动复制
        prompt('复制以下链接发送给好友：', shareUrl)
      }
    }
  }

  // 渲染卡槽（显示真人/AI/空位）
  const renderSlot = (index) => {
    const player = players[index]
    if (player) {
      // 已占用的槽位
      return (
        <div key={index} className={`waiting-slot filled ${player.isAI ? 'ai' : 'human'}`}>
          <span className="slot-icon">{player.isAI ? '🤖' : '👤'}</span>
          <span className="slot-name">{player.name}</span>
          <span className="slot-type">{player.isAI ? 'AI' : '真人'}</span>
        </div>
      )
    }

    // 空位
    const isAISlot = index >= maxPlayers // 超出真人限额的槽位由AI填补
    return (
      <div key={index} className={`waiting-slot empty ${isAISlot ? 'ai-future' : ''}`}>
        <span className="slot-icon">{isAISlot ? '🤖' : '⬜'}</span>
        <span className="slot-name">{isAISlot ? 'AI 待加入' : '等待真人加入...'}</span>
      </div>
    )
  }

  return (
    <div className="waiting-room">
      <h2 className="waiting-title">🃏 等待玩家</h2>

      <div className="room-code-display">
        <span className="room-code-label">房间号</span>
        <span className="room-code-value">{roomId}</span>
      </div>

      <div className="waiting-slots">
        {[0, 1, 2, 3].map(renderSlot)}
      </div>

      <div className="waiting-info">
        <span>已准备 {humanPlayers.length}/{maxPlayers} 位真人</span>
        {aiCount > 0 && <span className="ai-info">🤖 AI将补齐 {aiCount} 位</span>}
      </div>

      <div className="waiting-actions">
        <button className="lobby-btn primary share-btn" onClick={handleShare}>
          📤 邀请好友
        </button>
        <button className="lobby-btn" onClick={onLeave}>
          ✖ 离开房间
        </button>
      </div>

      {humanPlayers.length < maxPlayers && (
        <p className="waiting-hint">将链接分享给好友，凑齐 {maxPlayers} 人自动开始</p>
      )}
    </div>
  )
}
