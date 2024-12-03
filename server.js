import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new socketIo(server, {
  cors: {
    origin: '*',
    methods: ['POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const clients = {};

app.post('/sendmsg', (req, res) => {
  const { tel, ext, grp, company } = req.body;
  const socketId = clients[`${company}${ext}`];

  if (socketId) {
    console.log(req.body);
    io.to(socketId).emit('message', tel);
    res.status(200).send({ status: 'Message sent' });
  } else {
    res.status(404).send({ status: 'User not connected' });
  }
});

io.on('connection', (socket) => {
  socket.on('register', (userid) => {
    if (clients[userid]) {
      clients[userid].push(socket.id);
    } else {
      clients[userid] = [socket.id];
    }
    console.log(`User ${userid} registered with socket ID ${socket.id}`);
  });

  socket.on('disconnect', () => {
    for (let userid in clients) {
      const index = clients[userid].indexOf(socket.id);
      if (index !== -1) {
        clients[userid].splice(index, 1);
        if (clients[userid].length === 0) {
          delete clients[userid];
        }
        break;
      }
    }
    console.log(`A client disconnected: ${socket.id}`);
  });
});

function notifyUser(userid, message) {
  if (clients[userid]) {
    clients[userid].forEach(socketId => {
      io.to(socketId).emit('notification', message);
    });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
