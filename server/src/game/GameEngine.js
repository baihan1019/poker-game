/**
 * 游戏状态机（服务端）
 * 支持 2/3/4 人局，自动移除多余牌保证手牌数相等
 */

import { createDeck, shuffle, sortCards, cardsFromIds } from './Card.js';
import { getPlayType, canBeat } from './Rules.js';

export const GAME_STATE = { WAITING: 'waiting', PLAYING: 'playing', FINISHED: 'finished' };

// 每人发牌数：玩家数 → 每人牌数
const CARDS_PER_PLAYER = { 2: 17, 3: 13, 4: 13 };

export function createGame(playerNames) {
  return {
    state: GAME_STATE.WAITING,
    players: playerNames.map((n, i) => ({ id: i, name: n, handCards: [], isFinished: false, rank: null, isAI: false })),
    currentPlayer: 0, lastPlay: null, passCount: 0,
    finishedCount: 0, isFirstRound: true, humanCount: 0,
  };
}

export function startGame(game) {
  const deck = createDeck();
  const shuffled = shuffle(deck);
  const count = game.players.length;
  const perPlayer = CARDS_PER_PLAYER[count] || 13;
  const totalUsed = perPlayer * count;

  // 从洗好的牌中取前 totalUsed 张
  let idx = 0;
  game.players.forEach(p => {
    p.handCards = sortCards(shuffled.slice(idx, idx + perPlayer));
    idx += perPlayer;
  });

  // 找先手
  const starter = game.players.findIndex(p => p.handCards.some(c => c.rank === '4' && c.suit === '♦'));
  game.currentPlayer = starter >= 0 ? starter : 0;
  game.state = GAME_STATE.PLAYING;
  game.isFirstRound = true;

  // 计算真人玩家数量
  game.humanCount = game.players.filter(p => !p.isAI).length;
  return game;
}

export function playCards(game, playerId, cardIds) {
  if (game.state !== GAME_STATE.PLAYING) return { success: false, error: '游戏未开始' };
  if (playerId !== game.currentPlayer) return { success: false, error: '未轮到你' };
  const p = game.players[playerId];
  if (p.isFinished) return { success: false, error: '已出完' };

  const cards = cardsFromIds(cardIds, p.handCards);
  if (cards.length !== cardIds.length) return { success: false, error: '牌无效' };

  const ti = getPlayType(cards);
  if (ti.type === 'invalid') return { success: false, error: '无效牌型' };
  if (game.isFirstRound && !cards.some(c => c.rank === '4' && c.suit === '♦')) return { success: false, error: '首轮需带♦4' };
  if (!canBeat(cards, game.lastPlay)) return { success: false, error: '打不过上家' };

  const idSet = new Set(cardIds);
  p.handCards = p.handCards.filter(c => !idSet.has(c.id));
  game.lastPlay = { playerId, cards, typeInfo: ti };
  game.passCount = 0;
  game.isFirstRound = false;

  let finished = false;
  if (p.handCards.length === 0) {
    game.finishedCount++;
    p.isFinished = true;
    p.rank = game.finishedCount;
    finished = true;
  }

  advanceTurn(game);
  return { success: true, typeInfo: ti, finished, rank: p.rank };
}

export function pass(game, playerId) {
  if (game.state !== GAME_STATE.PLAYING) return { success: false, error: '游戏未开始' };
  if (playerId !== game.currentPlayer) return { success: false, error: '未轮到你' };
  if (game.isFirstRound) return { success: false, error: '首轮必须出牌' };
  if (!game.lastPlay) return { success: false, error: '请先出牌' };
  if (game.lastPlay.playerId === playerId) return { success: false, error: '不能过自己的牌' };

  game.passCount++;
  if (game.passCount >= 3) { game.lastPlay = null; game.passCount = 0; }
  advanceTurn(game);
  return { success: true };
}

function advanceTurn(game) {
  const n = game.players.length;
  let next = game.currentPlayer;
  let attempts = 0;
  do { next = (next + 1) % n; attempts++; } while (game.players[next].isFinished && attempts < n);
  game.currentPlayer = next;

  const active = game.players.filter(p => !p.isFinished);
  if (active.length <= 1) {
    game.state = GAME_STATE.FINISHED;
    if (active.length === 1) active[0].rank = n;
  }
}

export function getGameSummary(game) {
  const tn = { single: '单张', pair: '对子', triple: '三条' };
  const fn = ['顺子', '葫芦', '四带一', '同花', '同花顺'];
  const ft = ['straight', 'full_house', 'four_one', 'flush', 'straight_flush'];

  return {
    state: game.state,
    currentPlayer: game.currentPlayer,
    players: game.players.map(p => ({
      id: p.id, name: p.name, cardCount: p.handCards.length,
      isFinished: p.isFinished, rank: p.rank, isCurrentPlayer: p.id === game.currentPlayer,
      isAI: p.isAI,
    })),
    lastPlay: game.lastPlay ? {
      playerId: game.lastPlay.playerId,
      cards: game.lastPlay.cards,
      typeName: game.lastPlay.typeInfo.fiveType ? fn[ft.indexOf(game.lastPlay.typeInfo.fiveType)] : tn[game.lastPlay.typeInfo.type] || '',
    } : null,
    isFirstRound: game.isFirstRound,
    finishedCount: game.finishedCount,
  };
}
