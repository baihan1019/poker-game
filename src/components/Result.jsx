import React from 'react'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣']

/**
 * 结算排名组件
 *
 * 显示本局排名、本局得分、累计总积分
 * 提供"再来一局"和"退出房间"两个按钮
 *
 * @param {object} summary
 * @param {Array|null} humanRankings - 联网模式仅真人排名
 * @param {object|null} roundScores - { playerName: roundScore }
 * @param {object|null} cumulativeScores - { playerName: totalScore }
 * @param {Function} onRestart - 退出到大堂
 * @param {Function} onPlayAgain - 再来一局（单机模式可用）
 */
export default function Result({ summary, humanRankings, roundScores, cumulativeScores, onRestart, onPlayAgain }) {
  // 获取所有需要展示的玩家（联网模式传 humanRankings，单机用 summary）
  const allPlayers = humanRankings || (
    summary?.players
      ? [...summary.players].sort((a, b) => (a.rank || 99) - (b.rank || 99))
      : []
  )

  // 如果 roundScores 不存在（旧数据降级），回退到计算
  const scores = roundScores || {}
  const totals = cumulativeScores || {}

  // 格式化得分显示
  const formatScore = (score) => {
    if (score == null) return '—'
    return score > 0 ? `+${score}` : `${score}`
  }

  return (
    <div className="result-overlay">
      <div className="result-card">
        <h1 className="result-title">🏆 游戏结束</h1>
        <h2 className="result-subtitle">本局结算</h2>

        {/* 积分表头 */}
        <div className="score-table-header">
          <span className="st-rank">排名</span>
          <span className="st-name">玩家</span>
          <span className="st-round">本局</span>
          <span className="st-total">总积分</span>
        </div>

        {/* 玩家列表 */}
        <div className="score-table">
          {allPlayers.length === 0 && <p className="result-empty">无排名数据</p>}
          {allPlayers.map((p, i) => {
            const roundScore = scores[p.name]
            const totalScore = totals[p.name] ?? 0
            return (
              <div key={p.id} className={`score-row ${p.id === 0 ? 'me' : ''}`}>
                <span className="st-rank">
                  <span className="rank-medal">{MEDALS[i]}</span>
                  <span className="rank-num">{i + 1}</span>
                </span>
                <span className="st-name">{p.name}</span>
                <span className={`st-round ${(roundScore || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatScore(roundScore)}
                </span>
                <span className={`st-total ${totalScore >= 0 ? 'positive' : 'negative'}`}>
                  {formatScore(totalScore)}
                </span>
              </div>
            )
          })}
        </div>

        {/* 操作按钮 */}
        <div className="result-actions">
          {onPlayAgain && (
            <button className="btn btn-primary result-btn" onClick={onPlayAgain}>
              🔄 再来一局
            </button>
          )}
          <button className="btn btn-secondary result-btn" onClick={onRestart}>
            🏠 退出房间
          </button>
        </div>
      </div>
    </div>
  )
}
