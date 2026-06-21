import React from 'react'

/**
 * 出牌区组件
 * 显示当前出牌、牌型、大牌特效、轮到谁
 */
export default function PlayArea({ summary, thinking, bombEffect, passEffect }) {
  const lastPlay = summary?.lastPlay

  return (
    <div className={`play-area ${lastPlay ? 'has-play' : ''}`}>
      {/* 思考中 */}
      {thinking && <div className="thinking">🤔 AI 正在思考...</div>}

      {/* 炸弹/同花顺特效 */}
      {bombEffect && (
        <div className="bomb-overlay">
          <div className="star-burst" />
          <span className={bombEffect === 'sf' ? 'sf-text' : 'bomb-text'}>
            {bombEffect === 'sf' ? '🔥 同花顺' : '💣 炸弹'}
          </span>
        </div>
      )}

      {/* 有出牌 */}
      {lastPlay ? (
        <div className="last-play">
          <div className="play-info">
            <span className="play-player">
              {summary.players[lastPlay.playerId]?.name}
            </span>
            <span className="play-type">{lastPlay.typeName}</span>
          </div>
          <div className="play-cards">
            {lastPlay.cards.map(card => (
              <div key={card.id} className={`played-card ${card.color === 'red' ? 'red' : ''}`}>
                <span className="card-rank">
                  {card.rank === 'SJ' ? '小' : card.rank === 'BJ' ? '大' : card.rank}
                </span>
                {card.suit && <span className="card-suit">{card.suit}</span>}
                {!card.suit && <span className="card-suit" style={{fontSize:'0.6rem'}}>王</span>}
              </div>
            ))}
          </div>
        </div>
      ) : passEffect ? (
        <div className="pass-text">过</div>
      ) : (
        <div className="last-play empty">
          {summary?.isFirstRound ? '🎯 首轮（必须带 ♦4）' : '等待出牌...'}
        </div>
      )}

      {/* 回合指示 */}
      {summary && !thinking && (
        <div className="turn-indicator">
          轮到：<strong>{summary.players[summary.currentPlayer]?.name}</strong>
        </div>
      )}
    </div>
  )
}
