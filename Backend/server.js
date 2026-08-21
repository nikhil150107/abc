require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const connectTOdb      = require('./database/db');
const seedPolicies     = require('./database/seedPolicies');
const authRouter       = require('./routes/auth-route');
const homeRouter       = require('./routes/home-route');
const violationRouter  = require('./routes/violation-route');
const eventRouter      = require('./routes/event-route');
const policyRouter     = require('./routes/policy-route');

connectTOdb().then(seedPolicies);

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

app.use('/api/auth',       authRouter);
app.use('/api/dashboard',  homeRouter);
app.use('/api/violations', violationRouter);
app.use('/api/events',     eventRouter);
app.use('/api/policies',   policyRouter);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => {
  console.log(`Server is Running on Port ${PORT}`);
});
