const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 2 * 1024 * 1024 });

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

let iphone = null;
const ipads = new Set();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    // 先尝试解析文字消息
    try {
      msg = JSON.parse(raw);
    } catch {
      // 二进制帧（视频帧）直接转发给所有iPad
      for (const c of ipads) {
        try { if (c.readyState === 1) c.send(raw); } catch {}
      }
      return;
    }

    if (msg.type === 'iphone-hello') {
      iphone = ws; ws.role = 'iphone';
      console.log('iPhone connected');
      broadcast(ipads, { type: 'iphone-online' });
    }
    else if (msg.type === 'ipad-hello') {
      ipads.add(ws); ws.role = 'ipad';
      console.log('iPad connected:', ipads.size);
      if (iphone) ws.send(JSON.stringify({ type: 'iphone-online' }));
    }
    else if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
    else if (msg.type === 'sensors') {
      broadcast(ipads, msg);
    }
    else if (msg.type === 'frame') {
      // base64视频帧转发
      broadcast(ipads, msg);
    }
  });

  ws.on('close', () => {
    if (ws.role === 'iphone') {
      iphone = null;
      broadcast(ipads, { type: 'iphone-offline' });
      console.log('iPhone disconnected');
    } else if (ws.role === 'ipad') {
      ipads.delete(ws);
    }
  });

  ws.on('error', () => {});
});

function broadcast(set, obj) {
  const d = JSON.stringify(obj);
  for (const c of set) {
    try { if (c.readyState === 1) c.send(d); } catch {}
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
