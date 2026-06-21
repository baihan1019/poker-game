/**
 * 扑克游戏 WebSocket 服务器
 * 用 HTTP 包装以便 Render 做健康检查
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { RoomManager } from './room/RoomManager.js';

const PORT = process.env.PORT || 4050;
const manager = new RoomManager();

// HTTP 服务器 — Render 需要 /health 端点
const httpServer = http.createServer((req, res) => {
  // CORS 头（让 Vercel 前端能连）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      players: manager.rooms.size,
    }));
    return;
  }

  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server — use ws://');
});

// WebSocket 挂载在 HTTP 服务器上
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'create_room':
        manager.createRoom(msg.playerName || '玩家', ws, msg.maxPlayers || 4);
        break;
      case 'join_room':
        manager.joinRoom(msg.roomId, msg.playerName || '玩家', ws);
        break;
      case 'play_cards':
        if (msg.roomId && msg.cardIds) {
          const room = manager.rooms.get(msg.roomId);
          const player = room?.players.find(p => p.ws === ws);
          if (player) manager.handlePlayCards(room, player.id, msg.cardIds);
        }
        break;
      case 'pass':
        if (msg.roomId) {
          const room = manager.rooms.get(msg.roomId);
          const player = room?.players.find(p => p.ws === ws);
          if (player) manager.handlePass(room, player.id);
        }
        break;
    }
  });

  ws.on('close', () => manager.handleDisconnect(ws));
  ws.on('error', () => manager.handleDisconnect(ws));
});

httpServer.listen(PORT, () => {
  console.log(`🃏 扑克游戏服务器启动，端口: ${PORT}`);
  console.log(`   HTTP:  http://localhost:${PORT}/health`);
  console.log(`   WS:    ws://localhost:${PORT}`);
});
