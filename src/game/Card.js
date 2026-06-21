/**
 * 牌定义与比较逻辑
 * 牌面大小：4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < 3 < 小王 < 大王
 * 花色大小：♦ < ♣ < ♥ < ♠
 */

export const RANKS = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3', 'SJ', 'BJ'];
export const SUITS = ['♦', '♣', '♥', '♠'];

export const RANK_DISPLAY = {
  '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A', '2': '2', '3': '3',
  'SJ': '小王', 'BJ': '大王'
};

export const SUIT_DISPLAY = {
  '♦': '♦', '♣': '♣', '♥': '♥', '♠': '♠'
};

export const SUIT_COLORS = {
  '♦': 'red', '♣': 'black', '♥': 'red', '♠': 'black'
};

/**
 * 创建一张牌
 */
export function createCard(rank, suit) {
  return {
    id: suit ? `${rank}_${suit}` : rank,
    rank,
    suit,
    display: suit ? `${RANK_DISPLAY[rank]}${SUIT_DISPLAY[suit]}` : RANK_DISPLAY[rank],
    color: suit ? SUIT_COLORS[suit] : 'black',
  };
}

/**
 * 创建完整 54 张牌
 */
export function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS.slice(0, 13)) {
      cards.push(createCard(rank, suit));
    }
  }
  cards.push(createCard('SJ', null));  // 小王
  cards.push(createCard('BJ', null));  // 大王
  return cards;
}

/**
 * Fisher-Yates 洗牌
 */
export function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 发牌：4 人各 13 张，剩余 2 张
 */
export function deal(cards) {
  const shuffled = shuffle(cards);
  const hands = [];
  for (let i = 0; i < 4; i++) {
    hands.push(shuffled.slice(i * 13, (i + 1) * 13));
  }
  const remaining = shuffled.slice(52);
  return { hands, remaining };
}

/**
 * 获取牌的 rank 索引（0=最小）
 */
export function getRankIndex(rank) {
  return RANKS.indexOf(rank);
}

/**
 * 获取花色的索引（0=最小）
 */
export function getSuitIndex(suit) {
  if (!suit) return -1;
  return SUITS.indexOf(suit);
}

/**
 * 比较两张牌
 * 返回：>0 表示 a > b, <0 表示 a < b, 0 表示相等
 */
export function compareCards(a, b) {
  const rankDiff = getRankIndex(a.rank) - getRankIndex(b.rank);
  if (rankDiff !== 0) return rankDiff;
  return getSuitIndex(a.suit) - getSuitIndex(b.suit);
}

/**
 * 牌排序（从小到大）
 */
export function sortCards(cards) {
  return [...cards].sort(compareCards);
}

/**
 * 牌排序（从大到小）
 */
export function sortCardsDesc(cards) {
  return [...cards].sort((a, b) => -compareCards(a, b));
}

/**
 * 从 id 字符串数组还原牌对象
 */
export function cardsFromIds(ids, allCards) {
  const idMap = {};
  for (const c of allCards) {
    idMap[c.id] = c;
  }
  return ids.map(id => idMap[id]).filter(Boolean);
}
