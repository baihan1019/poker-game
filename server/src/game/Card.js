/**
 * 牌定义与比较逻辑（服务端副本）
 */

export const RANKS = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3', 'SJ', 'BJ'];
export const SUITS = ['♦', '♣', '♥', '♠'];

export function createCard(rank, suit) {
  return {
    id: suit ? `${rank}_${suit}` : rank,
    rank, suit,
    display: suit ? `${rank}${suit}` : (rank === 'SJ' ? '小王' : '大王'),
    color: suit ? (suit === '♦' || suit === '♥' ? 'red' : 'black') : 'black',
  };
}

export function createDeck() {
  const cards = [];
  for (const suit of SUITS)
    for (const rank of RANKS.slice(0, 13))
      cards.push(createCard(rank, suit));
  cards.push(createCard('SJ', null), createCard('BJ', null));
  return cards;
}

export function shuffle(cards) {
  const s = [...cards];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

export function deal(cards) {
  const shuffled = shuffle(cards);
  const hands = [];
  for (let i = 0; i < 4; i++) hands.push(shuffled.slice(i * 13, (i + 1) * 13));
  return { hands, remaining: shuffled.slice(52) };
}

export function getRankIndex(rank) { return RANKS.indexOf(rank); }
export function getSuitIndex(suit) { return suit ? SUITS.indexOf(suit) : -1; }

export function compareCards(a, b) {
  const d = getRankIndex(a.rank) - getRankIndex(b.rank);
  return d !== 0 ? d : getSuitIndex(a.suit) - getSuitIndex(b.suit);
}

export function sortCards(cards) { return [...cards].sort(compareCards); }

export function cardsFromIds(ids, allCards) {
  const map = {};
  for (const c of allCards) map[c.id] = c;
  return ids.map(id => map[id]).filter(Boolean);
}
