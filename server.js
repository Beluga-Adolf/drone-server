const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get('/', (req, res) => res.send('DRONE OK'));

let iphone = null;
const ipads = new Set();

wss.on('connection', (ws) => {

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'iphone-hello') {
      iphone = ws;
      ws.role = 'iphone';
      broadcast(ipads, { type: 'iphone-online' });
    }

    else if (msg.type === 'ipad-hello') {
      ipads.add(ws);
      ws.role = 'ipad';
      if (iphone) ws.send(JSON.stringify({ type: 'iphone-online' }));
    }

    else if (msg.type === 'offer')      broadcast(ipads, msg);
    else if (msg.type === 'ice-phone')  broadcast(ipads, msg);
    else if (msg.type === 'answer')     safe(iphone, msg);
    else if (msg.type === 'ice-pad')    safe(iphone, msg);
    else if (msg.type === 'sensors')    broadcast(ipads, msg);
    else if (msg.type === 'ipad-request-offer') safe(iphone, msg);
  });

  ws.on('close', () => {
    if (ws.role === 'iphone') {
      iphone = null;
      broadcast(ipads, { type: 'iphone-offline' });
    } else {
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

function safe(ws, obj) {
  try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {}
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('running on', PORT));
