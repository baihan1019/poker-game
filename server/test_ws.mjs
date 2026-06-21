import WebSocket from 'ws';

const PORT = 4000;

async function testNetworkGame() {
  return new Promise((resolve) => {
    const players = [];
    let roomId = null;
    let turnCount = 0;

    function createPlayer(name) {
      return new Promise((res) => {
        const ws = new WebSocket(`ws://localhost:${PORT}`);
        const msgs = [];
        ws.on('open', () => {
          if (players.length === 0) {
            ws.send(JSON.stringify({ type: 'create_room', playerName: name }));
          } else {
            ws.send(JSON.stringify({ type: 'join_room', roomId, playerName: name }));
          }
        });
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          msgs.push(msg);
          if (msg.type === 'room_created') { roomId = msg.roomId; console.log(`创建房间: ${roomId}`); }
          if (msg.type === 'room_joined') console.log(`[${name}] 加入房间成功`);
          if (msg.type === 'room_update') console.log(`[${name}] 房间: ${msg.players.length}/4人`);
          if (msg.type === 'game_start') console.log(`[${name}] 🎮 游戏开始! 手牌${msg.handCards.length}张`);
          if (msg.type === 'your_turn' && msg.isMe) {
            turnCount++;
            const gs = msgs.find(m => m.type === 'game_start');
            if (gs && turnCount <= 1) {
              const c = gs.handCards[0];
              ws.send(JSON.stringify({ type: 'play_cards', roomId, cardIds: [c.id] }));
              console.log(`[${name}] 出牌: ${c.display || c.id}`);
            } else {
              ws.send(JSON.stringify({ type: 'pass', roomId }));
              console.log(`[${name}] 过`);
            }
          }
          if (msg.type === 'play_result') console.log(`[${name}] 出牌结果: ${msg.playerId}出了${msg.cardCount}张`);
          if (msg.type === 'game_over') {
            console.log(`\n🏆 游戏结束!`);
            msg.rankings.forEach(r => console.log(`   ${r.name}: 第${r.rank}名`));
            resolve(msgs);
          }
        });
        players.push({ ws, name, msgs });
      });
    }

    Promise.all(['P1','P2','P3','P4'].map(createPlayer))
      .then(() => { console.log('\n✅ 测试完成!'); process.exit(0); })
      .catch(e => { console.error(e); process.exit(1); });
  });
}

testNetworkGame();
setTimeout(() => { console.log('⏰ 超时'); process.exit(0); }, 15000);
