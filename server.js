const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 静态文件（iphone.html、ipad.html、index.html）
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket 信令
let iphone = null;
const ipads = new Set();

wss.on('connection', (ws) => {

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'iphone-hello') {
      iphone = ws;
      ws.role = 'iphone';
      console.log('iPhone connected');
      broadcast(ipads, { type: 'iphone-online' });
    }

    else if (msg.type === 'ipad-hello') {
      ipads.add(ws);
      ws.role = 'ipad';
      console.log('iPad connected, total:', ipads.size);
      if (iphone) ws.send(JSON.stringify({ type: 'iphone-online' }));
    }

    else if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }

    else if (msg.type === 'offer')             broadcast(ipads, msg);
    else if (msg.type === 'ice-phone')         broadcast(ipads, msg);
    else if (msg.type === 'ipad-request-offer') safe(iphone, msg);
    else if (msg.type === 'answer')            safe(iphone, msg);
    else if (msg.type === 'ice-pad')           safe(iphone, msg);
    else if (msg.type === 'sensors')           broadcast(ipads, msg);
  });

  ws.on('close', () => {
    if (ws.role === 'iphone') {
      iphone = null;
      console.log('iPhone disconnected');
      broadcast(ipads, { type: 'iphone-offline' });
    } else if (ws.role === 'ipad') {
      ipads.delete(ws);
      console.log('iPad disconnected');
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

function safe(ws, obj) {
  try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {}
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
