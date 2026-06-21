/**
 * AI 出牌策略
 */

import { sortCards, getRankIndex, compareCards } from './Card.js';
import { getPlayType, canBeat } from './Rules.js';

/**
 * AI 选择要出的牌
 * @param {Array} hand - 手牌
 * @param {object|null} lastPlay - 上家出的牌
 * @param {boolean} isFirstRound - 是否首轮
 * @returns {Array|null} - 牌 ID 数组，null 表示过
 */
export function aiChoosePlay(hand, lastPlay, isFirstRound) {
  const sorted = sortCards(hand);

  if (isFirstRound) {
    return aiFirstRound(sorted);
  }

  if (!lastPlay || lastPlay.cards.length === 0) {
    return aiFreePlay(sorted);
  }

  return aiFollowPlay(sorted, lastPlay);
}

function aiFirstRound(hand) {
  const d4 = hand.find(c => c.rank === '4' && c.suit === '♦');
  if (!d4) return null;

  const other4 = hand.filter(c => c.rank === '4' && c.id !== d4.id);
  if (other4.length >= 1) {
    return [d4.id, other4[0].id];
  }

  return [d4.id];
}

function aiFreePlay(hand) {
  const counts = {};
  for (const c of hand) counts[c.rank] = (counts[c.rank] || 0) + 1;

  // 出单张（从最小开始）
  for (const c of hand) {
    if (counts[c.rank] === 1) return [c.id];
  }

  // 最小对子
  for (const c of hand) {
    if (counts[c.rank] >= 2) {
      const pair = hand.filter(h => h.rank === c.rank).slice(0, 2);
      return pair.map(p => p.id);
    }
  }

  // 出最小牌
  return [hand[0].id];
}

function aiFollowPlay(hand, lastPlay) {
  const len = lastPlay.cards.length;

  if (len === 1) {
    for (const c of hand) {
      if (compareCards(c, lastPlay.cards[0]) > 0) return [c.id];
    }
    return null;
  }

  if (len === 2) {
    const pairs = findPairs(hand);
    for (const pair of pairs) {
      const maxC = pair.reduce((m, c) => compareCards(c, m) > 0 ? c : m);
      const maxL = lastPlay.cards.reduce((m, c) => compareCards(c, m) > 0 ? c : m);
      if (compareCards(maxC, maxL) > 0) return pair.map(c => c.id);
    }
    return null;
  }

  if (len === 3) {
    const triples = findTriples(hand);
    for (const triple of triples) {
      if (getRankIndex(triple[0].rank) > getRankIndex(lastPlay.cards[0].rank)) {
        return triple.map(c => c.id);
      }
    }
    return null;
  }

  if (len === 5) {
    const combos = getCombinations(hand, 5);
    for (const combo of combos) {
      if (canBeat(combo, lastPlay)) return combo.map(c => c.id);
    }
    return null;
  }

  return null;
}

function findPairs(hand) {
  const map = {};
  for (const c of hand) {
    if (!map[c.rank]) map[c.rank] = [];
    map[c.rank].push(c);
  }
  const pairs = [];
  for (const r of Object.keys(map)) {
    if (map[r].length >= 2) pairs.push(map[r].slice(0, 2));
  }
  pairs.sort((a, b) => getRankIndex(a[0].rank) - getRankIndex(b[0].rank));
  return pairs;
}

function findTriples(hand) {
  const map = {};
  for (const c of hand) {
    if (!map[c.rank]) map[c.rank] = [];
    map[c.rank].push(c);
  }
  const triples = [];
  for (const r of Object.keys(map)) {
    if (map[r].length >= 3) triples.push(map[r].slice(0, 3));
  }
  triples.sort((a, b) => getRankIndex(a[0].rank) - getRankIndex(b[0].rank));
  return triples;
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}
