/**
 * 扑克规则引擎（服务端副本）
 */

import { RANKS, getRankIndex, compareCards, sortCards } from './Card.js';

const FIVE_TYPE_ORDER = ['straight', 'full_house', 'four_one', 'flush', 'straight_flush'];

function isStraight(cards) {
  if (cards.length !== 5) return false;
  const indices = cards.map(c => getRankIndex(c.rank));
  const unique = [...new Set(indices)].sort((a, b) => a - b);
  return unique.length === 5 && unique[4] - unique[0] === 4;
}

function isFlush(cards) { return cards.length === 5 && cards.every(c => c.suit === cards[0].suit); }

function identifyFiveType(cards) {
  const sorted = sortCards(cards);
  const rankCount = {};
  for (const c of sorted) rankCount[c.rank] = (rankCount[c.rank] || 0) + 1;
  const counts = Object.values(rankCount).sort((a, b) => b - a);
  const ranks = Object.keys(rankCount);
  const flush = isFlush(sorted);
  const straight = isStraight(sorted);

  if (flush && straight) return { fiveType: 'straight_flush', key: getRankIndex(sorted[4].rank) };
  if (flush) return { fiveType: 'flush', key: getRankIndex(sorted[4].rank) };
  if (counts[0] === 4 && counts[1] === 1) return { fiveType: 'four_one', key: getRankIndex(ranks.find(r => rankCount[r] === 4)) };
  if (counts[0] === 3 && counts[1] === 2) return { fiveType: 'full_house', key: getRankIndex(ranks.find(r => rankCount[r] === 3)) };
  if (straight) return { fiveType: 'straight', key: getRankIndex(sorted[4].rank) };
  return { fiveType: null, key: null };
}

export function getPlayType(cards) {
  if (!cards?.length) return { type: 'invalid' };
  const len = cards.length;
  if (len === 1) return { type: 'single' };
  if (len === 2) return cards[0].rank === cards[1].rank ? { type: 'pair' } : { type: 'invalid' };
  if (len === 3) return (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) ? { type: 'triple' } : { type: 'invalid' };
  if (len === 5) {
    const r = identifyFiveType(cards);
    return r.fiveType ? { type: 'five_type', fiveType: r.fiveType, key: r.key } : { type: 'invalid' };
  }
  return { type: 'invalid' };
}

export function canBeat(newCards, lastPlay) {
  if (!lastPlay?.cards?.length) return true;
  const nt = getPlayType(newCards);
  const lt = getPlayType(lastPlay.cards);
  if (nt.type === 'invalid' || nt.type !== lt.type || newCards.length !== lastPlay.cards.length) return false;

  const ns = sortCards(newCards);
  const ls = sortCards(lastPlay.cards);

  if (nt.type === 'single') return compareCards(ns[0], ls[0]) > 0;
  if (nt.type === 'pair') {
    if (ns[0].rank !== ns[1].rank) return false;
    const nm = ns.reduce((m, c) => compareCards(c, m) > 0 ? c : m);
    const lm = ls.reduce((m, c) => compareCards(c, m) > 0 ? c : m);
    return compareCards(nm, lm) > 0;
  }
  if (nt.type === 'triple') return getRankIndex(ns[0].rank) > getRankIndex(ls[0].rank);
  if (nt.type === 'five_type') {
    const no = FIVE_TYPE_ORDER.indexOf(nt.fiveType);
    const lo = FIVE_TYPE_ORDER.indexOf(lt.fiveType);
    return no !== lo ? no > lo : (nt.key || 0) > (lt.key || 0);
  }
  return false;
}

export function isValidPlay(cards, isFirstRound) {
  const t = getPlayType(cards);
  if (t.type === 'invalid') return false;
  if (isFirstRound && !cards.some(c => c.rank === '4' && c.suit === '♦')) return false;
  return true;
}
