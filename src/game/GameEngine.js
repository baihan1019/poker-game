/**
 * 游戏状态机
 * 管理整个游戏流程：发牌 → 出牌 → 结算
 */

import { createDeck, deal, sortCards, cardsFromIds } from './Card.js';
import { getPlayType, canBeat } from './Rules.js';

export const GAME_STATE = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

/**
 * 创建初始游戏状态
 */
export function createGame(playerNames = ['你', 'AI 1', 'AI 2', 'AI 3']) {
  return {
    state: GAME_STATE.WAITING,
    players: playerNames.map((name, i) => ({
      id: i,
      name,
      handCards: [],
      isFinished: false,
      rank: null,
    })),
    currentPlayer: 0,
    lastPlay: null,
    passCount: 0,
    finishedCount: 0,
    turnHistory: [],
    isFirstRound: true,
  };
}

/**
 * 开始游戏：发牌、找先手
 */
export function startGame(game) {
  const allCards = createDeck();
  const result = deal(allCards);

  for (let i = 0; i < 4; i++) {
    game.players[i].handCards = sortCards(result.hands[i]);
  }

  for (let i = 0; i < 4; i++) {
    if (game.players[i].handCards.some(c => c.rank === '4' && c.suit === '♦')) {
      game.currentPlayer = i;
      break;
    }
  }

  game.state = GAME_STATE.PLAYING;
  game.isFirstRound = true;
  return game;
}

/**
 * 玩家出牌
 */
export function playCards(game, playerId, cardIds) {
  if (game.state !== GAME_STATE.PLAYING) {
    return { success: false, error: '游戏未在进行中' };
  }

  if (playerId !== game.currentPlayer) {
    return { success: false, error: '还没轮到你' };
  }

  const player = game.players[playerId];
  if (player.isFinished) {
    return { success: false, error: '已出完牌' };
  }

  const cards = cardsFromIds(cardIds, player.handCards);
  if (cards.length !== cardIds.length) {
    return { success: false, error: '无效的牌' };
  }

  const typeInfo = getPlayType(cards);
  if (typeInfo.type === 'invalid') {
    return { success: false, error: '无效牌型' };
  }

  if (game.isFirstRound && !cards.some(c => c.rank === '4' && c.suit === '♦')) {
    return { success: false, error: '首轮必须包含 ♦4' };
  }

  if (!canBeat(cards, game.lastPlay)) {
    return { success: false, error: '打不过上家的牌' };
  }

  const cardIdSet = new Set(cardIds);
  player.handCards = player.handCards.filter(c => !cardIdSet.has(c.id));

  game.lastPlay = { playerId, cards, typeInfo };
  game.passCount = 0;
  game.isFirstRound = false;

  let finished = false;
  if (player.handCards.length === 0) {
    game.finishedCount++;
    player.isFinished = true;
    player.rank = game.finishedCount;
    finished = true;
  }

  advanceToNextPlayer(game);
  return { success: true, typeInfo, finished, rank: player.rank };
}

/**
 * 玩家过牌
 */
export function pass(game, playerId) {
  if (game.state !== GAME_STATE.PLAYING) {
    return { success: false, error: '游戏未在进行中' };
  }
  if (playerId !== game.currentPlayer) {
    return { success: false, error: '还没轮到你' };
  }
  if (game.isFirstRound) {
    return { success: false, error: '首轮必须出牌' };
  }
  if (!game.lastPlay) {
    return { success: false, error: '请先出牌' };
  }
  if (game.lastPlay.playerId === playerId) {
    return { success: false, error: '不能过自己的牌' };
  }

  game.passCount++;

  if (game.passCount >= 3) {
    game.lastPlay = null;
    game.passCount = 0;
  }

  advanceToNextPlayer(game);
  return { success: true };
}

function advanceToNextPlayer(game) {
  let next = game.currentPlayer;
  let attempts = 0;
  do {
    next = (next + 1) % 4;
    attempts++;
  } while (game.players[next].isFinished && attempts < 4);

  game.currentPlayer = next;

  const active = game.players.filter(p => !p.isFinished);
  if (active.length <= 1) {
    game.state = GAME_STATE.FINISHED;
    if (active.length === 1) {
      active[0].rank = 4;
    }
  }
}

/**
 * 获取游戏状态摘要（用于 UI 渲染）
 */
export function getGameSummary(game) {
  const typeNameMap = { single: '单张', pair: '对子', triple: '三条' };
  const fiveTypeNames = ['顺子', '葫芦', '四带一', '同花', '同花顺'];
  const fiveTypes = ['straight', 'full_house', 'four_one', 'flush', 'straight_flush'];

  return {
    state: game.state,
    currentPlayer: game.currentPlayer,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.handCards.length,
      isFinished: p.isFinished,
      rank: p.rank,
      isCurrentPlayer: p.id === game.currentPlayer,
    })),
    lastPlay: game.lastPlay ? {
      playerId: game.lastPlay.playerId,
      cards: game.lastPlay.cards,
      typeName: game.lastPlay.typeInfo.fiveType
        ? fiveTypeNames[fiveTypes.indexOf(game.lastPlay.typeInfo.fiveType)]
        : typeNameMap[game.lastPlay.typeInfo.type] || '',
    } : null,
    isFirstRound: game.isFirstRound,
    finishedCount: game.finishedCount,
  };
}
