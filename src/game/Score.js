/**
 * 积分系统
 * 底分 100。固定结算：第1+200 / 第2 0 / 第3 -100 / 第4 -200
 * 通过 localStorage 持久化
 */

const KEY = 'zsy_scores'
const RS = { 1: 200, 2: 0, 3: -100, 4: -200 }

export function loadAllScores() {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}

export function saveAllScores(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export function getPlayerScore(name) {
  return loadAllScores()[name] ?? 0
}

export function getRoundScore(rank) {
  return RS[rank] ?? -200
}

/**
 * 计算并更新所有玩家的积分
 * @param {Array} players - [{ name, rank }]
 * @returns {{ roundScores: {}, cumulative: {} }}
 */
export function updateScores(players) {
  const all = loadAllScores()
  const roundScores = {}, cumulative = {}
  for (const p of players) {
    const rs = getRoundScore(p.rank)
    roundScores[p.name] = rs
    all[p.name] = (all[p.name] ?? 0) + rs
    cumulative[p.name] = all[p.name]
  }
  saveAllScores(all)
  return { roundScores, cumulative }
}

export function resetAllScores() {
  localStorage.removeItem(KEY)
}
