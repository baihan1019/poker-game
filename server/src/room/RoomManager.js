/**
 * 房间管理
 * 支持 2/3/4 人局，自动用 AI 补齐到 4 人
 */

import { createGame, startGame, playCards, pass, getGameSummary, GAME_STATE } from '../game/GameEngine.js';
import { aiChoosePlay } from '../game/AI.js';

function generateCode() {
  // 6位数字房间码，方便微信分享
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class RoomManager {
  constructor() { this.rooms = new Map(); }

  createRoom(name, ws, maxPlayers = 4) {
    const id = generateCode();
    this.rooms.set(id, {
      id, maxPlayers,
      players: [{ id: 0, name, ws, isAI: false }],
      game: null, started: false,
    });
    this.sendTo(ws, { type: 'room_created', roomId: id, playerId: 0, maxPlayers });
    this.broadcastRoom(this.rooms.get(id));
    return id;
  }

  joinRoom(roomId, name, ws) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: '房间不存在' };
    if (room.started) return { success: false, error: '游戏已开始' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: '房间已满' };

    const pid = room.players.length;
    room.players.push({ id: pid, name, ws, isAI: false });
    this.sendTo(ws, { type: 'room_joined', roomId, playerId: pid, maxPlayers: room.maxPlayers });
    this.broadcastRoom(room);

    // 真人满员后自动开始（填充AI并启动游戏）
    const humans = room.players.filter(p => !p.isAI).length;
    if (humans >= room.maxPlayers) {
      this.startGame(room);
    }
    return { success: true };
  }

  startGame(room) {
    const humans = room.players.filter(p => !p.isAI);
    const needAI = 4 - humans.length; // 始终补齐到4人

    // 清除非真人玩家
    room.players = room.players.filter(p => !p.isAI);

    // 添加AI玩家
    for (let i = 0; i < needAI; i++) {
      const pid = room.players.length;
      room.players.push({ id: pid, name: `AI ${i + 1}`, ws: null, isAI: true });
    }

    const game = createGame(room.players.map(p => p.name));
    game.players.forEach((p, i) => { p.isAI = room.players[i].isAI; });
    startGame(game);
    room.game = game;
    room.started = true;

    // 发牌给真人玩家
    room.players.forEach((p, i) => {
      if (!p.isAI && p.ws) {
        this.sendTo(p.ws, {
          type: 'game_start',
          handCards: game.players[i].handCards,
          currentPlayer: game.currentPlayer,
          isFirstRound: game.isFirstRound,
          totalPlayers: 4,
        });
      }
    });

    this.broadcastGameState(room);
    this.broadcastTurn(room);

    // 如果先手是AI，立即调度
    this.scheduleAITurn(room);
  }

  handlePlayCards(room, pid, cardIds) {
    if (!room.game || room.game.state !== GAME_STATE.PLAYING) return;
    const r = playCards(room.game, pid, cardIds);
    if (!r.success) {
      const p = room.players.find(x => x.id === pid);
      if (p && p.ws) this.sendTo(p.ws, { type: 'error', message: r.error });
      return;
    }
    this.broadcastPlayResult(room, pid, cardIds.length, r);

    const p = room.players[pid];
    if (p && !p.isAI && p.ws) {
      this.sendTo(p.ws, { type: 'hand_update', handCards: room.game.players[pid].handCards });
    }

    this.afterMove(room);
  }

  handlePass(room, pid) {
    if (!room.game || room.game.state !== GAME_STATE.PLAYING) return;
    const r = pass(room.game, pid);
    if (!r.success) {
      const p = room.players.find(x => x.id === pid);
      if (p && p.ws) this.sendTo(p.ws, { type: 'error', message: r.error });
      return;
    }
    this.broadcast(room, { type: 'pass_result', playerId: pid });
    this.afterMove(room);
  }

  /** 每次出牌/过牌后的公共处理 */
  afterMove(room) {
    this.broadcastGameState(room);

    if (room.game.state === GAME_STATE.FINISHED) {
      this.broadcast(room, {
        type: 'game_over',
        rankings: room.game.players.map(p => ({
          id: p.id, name: p.name, rank: p.rank || room.game.players.length, isAI: p.isAI,
        })),
      });
    } else {
      this.broadcastTurn(room);
      // 如果轮到 AI，调度 AI 出牌
      this.scheduleAITurn(room);
    }
  }

  /** 如果轮到 AI，调度自动出牌 */
  scheduleAITurn(room) {
    if (!room.game || room.game.state !== GAME_STATE.PLAYING) return;

    const pid = room.game.currentPlayer;
    const player = room.players[pid];
    if (!player || !player.isAI) return;

    // 延迟模拟 AI 思考
    setTimeout(() => {
      if (!room.game || room.game.state !== GAME_STATE.PLAYING) return;
      // 确认还是这个AI的回合
      if (room.game.currentPlayer !== pid) return;

      const hand = room.game.players[pid].handCards;
      const choice = aiChoosePlay(hand, room.game.lastPlay, room.game.isFirstRound);
      if (choice) {
        this.handlePlayCards(room, pid, choice);
      } else {
        this.handlePass(room, pid);
      }
    }, 600 + Math.random() * 400);
  }

  /** 广播出牌结果（包含AI的） */
  broadcastPlayResult(room, pid, count, r) {
    const tn = getTypeName(r.typeInfo);
    this.broadcast(room, {
      type: 'play_result', playerId: pid, cardCount: count,
      typeName: tn, finished: r.finished, rank: r.rank,
    });
  }

  handleDisconnect(ws) {
    for (const [, room] of this.rooms) {
      const p = room.players.find(x => x.ws === ws);
      if (p) { p.ws = null; this.broadcast(room, { type: 'player_left', playerId: p.id }); return; }
    }
  }

  broadcastRoom(room) {
    this.broadcast(room, {
      type: 'room_update', roomId: room.id,
      maxPlayers: room.maxPlayers,
      players: room.players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI })),
    });
  }

  broadcastGameState(room) {
    if (room.game) this.broadcast(room, { type: 'game_state', summary: getGameSummary(room.game) });
  }

  broadcastTurn(room) {
    if (!room.game) return;
    const pid = room.game.currentPlayer;
    room.players.forEach(p => {
      if (p.ws) this.sendTo(p.ws, { type: 'your_turn', playerId: pid, isMe: p.id === pid });
    });
  }

  sendTo(ws, data) { if (ws?.readyState === 1) ws.send(JSON.stringify(data)); }

  broadcast(room, data) {
    const m = JSON.stringify(data);
    for (const p of room.players) { if (p.ws?.readyState === 1) p.ws.send(m); }
  }
}

function getTypeName(ti) {
  if (!ti) return '';
  if (ti.type === 'single') return '单张';
  if (ti.type === 'pair') return '对子';
  if (ti.type === 'triple') return '三条';
  const names = ['顺子', '同花', '葫芦', '四带一', '同花顺'];
  const keys = ['straight', 'full_house', 'four_one', 'flush', 'straight_flush'];
  const idx = keys.indexOf(ti.fiveType);
  return idx >= 0 ? names[idx] : '五张';
}
