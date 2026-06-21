/**
 * 扑克规则引擎
 * 包含所有牌型识别、比较、出牌合法性校验
 * 争上游变体规则
 */

import { RANKS, getRankIndex, compareCards, sortCards } from './Card.js';

// ===== 牌型常量 =====
export const PLAY_TYPES = {
  SINGLE: 'single',
  PAIR: 'pair',
  TRIPLE: 'triple',
  FIVE_TYPE: 'five_type',
  INVALID: 'invalid',
};

export const FIVE_TYPES = {
  STRAIGHT: 'straight',
  FULL_HOUSE: 'full_house',
  FOUR_ONE: 'four_one',
  FLUSH: 'flush',
  STRAIGHT_FLUSH: 'straight_flush',
};

// 五张牌型大小顺序（索引越大越大）
const FIVE_TYPE_ORDER = ['straight', 'full_house', 'four_one', 'flush', 'straight_flush'];

/**
 * 判断 5 张牌是否为顺子
 * 按 RANKS 序列判定连续性：4→5→6→7→8→9→10→J→Q→K→A→2→3
 */
function isStraight(cards) {
  if (cards.length !== 5) return false;

  const rankIndices = cards.map(c => getRankIndex(c.rank));
  const unique = [...new Set(rankIndices)];
  if (unique.length !== 5) return false;

  unique.sort((a, b) => a - b);

  // 正常连续：最大-最小 === 4
  // 如 4-5-6-7-8 (0-4), 10-J-Q-K-A (7-11), Q-K-A-2-3 (9-13)
  return unique[4] - unique[0] === 4;
}

/**
 * 判断 5 张牌是否为同花
 */
function isFlush(cards) {
  if (cards.length !== 5) return false;
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

/**
 * 识别五张牌的具体牌型
 */
function identifyFiveType(cards) {
  if (cards.length !== 5) return { fiveType: null, key: null };

  const sorted = sortCards(cards);
  const rankCount = {};
  for (const c of sorted) {
    rankCount[c.rank] = (rankCount[c.rank] || 0) + 1;
  }
  const counts = Object.values(rankCount).sort((a, b) => b - a);
  const ranks = Object.keys(rankCount);
  const flush = isFlush(sorted);
  const straight = isStraight(sorted);

  // 同花顺（最大）
  if (flush && straight) {
    return { fiveType: FIVE_TYPES.STRAIGHT_FLUSH, key: getRankIndex(sorted[4].rank) };
  }

  // 同花
  if (flush) {
    return { fiveType: FIVE_TYPES.FLUSH, key: getRankIndex(sorted[4].rank) };
  }

  // 四带一
  if (counts[0] === 4 && counts[1] === 1) {
    const fourRank = ranks.find(r => rankCount[r] === 4);
    return { fiveType: FIVE_TYPES.FOUR_ONE, key: getRankIndex(fourRank) };
  }

  // 葫芦
  if (counts[0] === 3 && counts[1] === 2) {
    const tripleRank = ranks.find(r => rankCount[r] === 3);
    return { fiveType: FIVE_TYPES.FULL_HOUSE, key: getRankIndex(tripleRank) };
  }

  // 顺子（最小）
  if (straight) {
    return { fiveType: FIVE_TYPES.STRAIGHT, key: getRankIndex(sorted[4].rank) };
  }

  return { fiveType: null, key: null };
}

/**
 * 获取一手牌的牌型
 */
export function getPlayType(cards) {
  if (!cards || cards.length === 0) return { type: PLAY_TYPES.INVALID };

  const len = cards.length;

  if (len === 1) {
    return { type: PLAY_TYPES.SINGLE };
  }

  if (len === 2) {
    if (cards[0].rank === cards[1].rank) {
      return { type: PLAY_TYPES.PAIR };
    }
    return { type: PLAY_TYPES.INVALID };
  }

  if (len === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      return { type: PLAY_TYPES.TRIPLE };
    }
    return { type: PLAY_TYPES.INVALID };
  }

  if (len === 5) {
    const result = identifyFiveType(cards);
    if (result.fiveType) {
      return { type: PLAY_TYPES.FIVE_TYPE, fiveType: result.fiveType, key: result.key };
    }
    return { type: PLAY_TYPES.INVALID };
  }

  return { type: PLAY_TYPES.INVALID };
}

/**
 * 检查新出的牌能否压过上家的牌
 */
export function canBeat(newCards, lastPlay) {
  if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
    return true;
  }

  const newType = getPlayType(newCards);
  const lastType = getPlayType(lastPlay.cards);

  if (newType.type === PLAY_TYPES.INVALID) return false;
  if (newType.type !== lastType.type) return false;
  if (newCards.length !== lastPlay.cards.length) return false;

  const newSorted = sortCards(newCards);
  const lastSorted = sortCards(lastPlay.cards);

  switch (newType.type) {
    case PLAY_TYPES.SINGLE:
      return compareCards(newSorted[0], lastSorted[0]) > 0;

    case PLAY_TYPES.PAIR: {
      if (newSorted[0].rank !== newSorted[1].rank) return false;
      const newMax = newSorted.reduce((max, c) => compareCards(c, max) > 0 ? c : max);
      const lastMax = lastSorted.reduce((max, c) => compareCards(c, max) > 0 ? c : max);
      return compareCards(newMax, lastMax) > 0;
    }

    case PLAY_TYPES.TRIPLE:
      return getRankIndex(newSorted[0].rank) > getRankIndex(lastSorted[0].rank);

    case PLAY_TYPES.FIVE_TYPE: {
      const newFiveOrder = FIVE_TYPE_ORDER.indexOf(newType.fiveType);
      const lastFiveOrder = FIVE_TYPE_ORDER.indexOf(lastType.fiveType);
      if (newFiveOrder !== lastFiveOrder) return newFiveOrder > lastFiveOrder;
      return (newType.key || 0) > (lastType.key || 0);
    }

    default:
      return false;
  }
}

/**
 * 验证一手牌是否合法
 * @param {Array} cards - 要出的牌
 * @param {boolean} isFirstRound - 是否为首轮
 */
export function isValidPlay(cards, isFirstRound) {
  const typeInfo = getPlayType(cards);
  if (typeInfo.type === PLAY_TYPES.INVALID) return false;

  if (isFirstRound) {
    const hasDiamond4 = cards.some(c => c.rank === '4' && c.suit === '♦');
    if (!hasDiamond4) return false;
  }

  return true;
}

/**
 * 获取牌型中文名称
 */
export function getPlayTypeName(typeInfo) {
  if (!typeInfo || typeInfo.type === PLAY_TYPES.INVALID) return '无效牌型';
  switch (typeInfo.type) {
    case PLAY_TYPES.SINGLE: return '单张';
    case PLAY_TYPES.PAIR: return '对子';
    case PLAY_TYPES.TRIPLE: return '三条';
    case PLAY_TYPES.FIVE_TYPE: {
      switch (typeInfo.fiveType) {
        case FIVE_TYPES.STRAIGHT: return '顺子';
        case FIVE_TYPES.FULL_HOUSE: return '葫芦';
        case FIVE_TYPES.FOUR_ONE: return '四带一';
        case FIVE_TYPES.FLUSH: return '同花';
        case FIVE_TYPES.STRAIGHT_FLUSH: return '同花顺';
        default: return '五张';
      }
    }
    default: return '';
  }
}
