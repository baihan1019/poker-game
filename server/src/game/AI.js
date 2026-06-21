/**
 * 服务端 AI 出牌引擎
 */

import { sortCards, getRankIndex, compareCards } from './Card.js';
import { getPlayType, canBeat } from './Rules.js';

export function aiChoosePlay(hand, lastPlay, isFirstRound) {
  const sorted = sortCards(hand);
  if (isFirstRound) return firstRound(sorted);
  if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return freePlay(sorted);
  return followPlay(sorted, lastPlay);
}

function firstRound(hand) {
  const d4 = hand.find(c => c.rank === '4' && c.suit === '♦');
  if (!d4) return null;
  const o4 = hand.filter(c => c.rank === '4' && c.id !== d4.id);
  return o4.length >= 1 ? [d4.id, o4[0].id] : [d4.id];
}

function freePlay(hand) {
  const cnt = {};
  for (const c of hand) cnt[c.rank] = (cnt[c.rank] || 0) + 1;
  for (const c of hand) { if (cnt[c.rank] === 1) return [c.id]; }
  for (const c of hand) { if (cnt[c.rank] >= 2) return hand.filter(h => h.rank === c.rank).slice(0,2).map(p => p.id); }
  return [hand[0].id];
}

function followPlay(hand, lastPlay) {
  const len = lastPlay.cards.length;
  if (len === 1) { for (const c of hand) { if (compareCards(c, lastPlay.cards[0]) > 0) return [c.id]; } return null; }
  if (len === 2) {
    for (const pair of findPairs(hand)) {
      const mc = pair.reduce((m,c) => compareCards(c,m)>0?c:m);
      const ml = lastPlay.cards.reduce((m,c) => compareCards(c,m)>0?c:m);
      if (compareCards(mc, ml) > 0) return pair.map(c=>c.id);
    }
    return null;
  }
  if (len === 3) {
    for (const t of findTriples(hand)) { if (getRankIndex(t[0].rank) > getRankIndex(lastPlay.cards[0].rank)) return t.map(c=>c.id); }
    return null;
  }
  if (len === 5) {
    for (const combo of getCombinations(hand, 5)) { if (canBeat(combo, lastPlay)) return combo.map(c=>c.id); }
    return null;
  }
  return null;
}

function findPairs(hand) {
  const m={}; for(const c of hand){if(!m[c.rank])m[c.rank]=[];m[c.rank].push(c);}
  const r=[]; for(const k of Object.keys(m)){if(m[k].length>=2)r.push(m[k].slice(0,2));}
  return r.sort((a,b)=>getRankIndex(a[0].rank)-getRankIndex(b[0].rank));
}
function findTriples(hand) {
  const m={}; for(const c of hand){if(!m[c.rank])m[c.rank]=[];m[c.rank].push(c);}
  const r=[]; for(const k of Object.keys(m)){if(m[k].length>=3)r.push(m[k].slice(0,3));}
  return r.sort((a,b)=>getRankIndex(a[0].rank)-getRankIndex(b[0].rank));
}
function getCombinations(arr,k){if(k===0)return[[]];if(!arr.length)return[];const[f,...rest]=arr;return[...getCombinations(rest,k-1).map(c=>[f,...c]),...getCombinations(rest,k)];}
