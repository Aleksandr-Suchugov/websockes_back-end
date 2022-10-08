const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const { v4: uuidv4 } = require('uuid');
const Router = require("koa-router");
const cors = require('@koa/cors');
const WS = require('ws');
const { cli } = require('forever');

const app = new Koa();

const clients = new Set();
const users = [];
const messages = [];

app.use(koaBody({
  urlencoded: true,
  multipart: true,
  json: true,
}));

app.use(cors({
  origin: '*',
  credentials: true,
  'Access-Control-Allow-Origin': true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

const router = new Router();

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback())
server.listen( port , () => console.log('server started'));
const wsServer = new WS.Server({
  server
});

wsServer.on('connection', (ws) => {
  const errCallback = (err) => {
    if (err) {
      console.log(err);
    }
  }

  ws.on('message', msg => {
    console.log('команда: ', JSON.parse(msg).type);
    const request = JSON.parse(msg);
    if (request.type === 'addUser') {
      if (users.find(user => user.name === request.name)) {
        ws.send('Никнейм занят', errCallback('Никнейм занят'));
      } else {
        clients.add(ws)
        console.log(clients.size);
        users.push({
          name: request.name,
          id: uuidv4()
        });
        // const eventData = JSON.stringify({ users: [messages] });
        Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => {
          // client.send(eventData);
          client.send(JSON.stringify(users));
          client.send(JSON.stringify(messages));
        });
      }
      return;
    }
  
    if (request.type === 'sendMessage') {
      messages.push({
        name: request.name,
        text: request.text
      });
      Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => client.send(JSON.stringify(messages)));
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log(clients.size);
  });
});
