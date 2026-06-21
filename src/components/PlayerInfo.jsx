import React from 'react'

/**
 * 玩家信息组件
 * 显示头像、昵称、剩余牌数（叠牌图标）、AI标记、先手皇冠
 */
export default function PlayerInfo({ player, starterPlayer }) {
  if (!player) return null

  const isStarter = starterPlayer === player.id

  // 默认头像
  const avatarIcon = player.isAI ? '🤖' : (player.name.charAt(0))

  return (
    <div className={`player-info ${player.isCurrentPlayer ? 'active' : ''} ${player.isFinished ? 'finished' : ''}`}>
      {/* 先手皇冠 */}
      {isStarter && !player.isFinished && (
        <span className="starter-crown">👑</span>
      )}

      <div className="player-name">
        <span className="player-avatar">{avatarIcon}</span>
        {player.isAI && <span className="ai-badge">🤖</span>}
        {player.name}
        {player.isFinished && <span className="player-rank"> 🏆#{player.rank}</span>}
      </div>

      <div className="player-cards">
        {!player.isFinished ? (
          <div className="card-backs">
            {/* 牌叠图标 */}
            {player.cardCount > 0 && (
              <>
                <span className="card-back-icon">🂠</span>
                {player.cardCount >= 5 && <span className="card-back-icon">🂠</span>}
                {player.cardCount >= 10 && <span className="card-back-icon">🂠</span>}
              </>
            )}
            <span className="card-count">{player.cardCount}张</span>
          </div>
        ) : (
          <div className="card-backs finished">✅ 已出完</div>
        )}
      </div>
    </div>
  )
}
