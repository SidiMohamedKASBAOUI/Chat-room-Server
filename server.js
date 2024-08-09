'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const URI = process.env.MONGO_URI;

const store = MongoStore.create({ mongoUrl: URI }); // Update to latest syntax

app.set('view engine', 'pug');
app.set('views', './views/pug');

app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }, // Set to true if using HTTPS
  key: 'express.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); // For fCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//auth(app, myDataBase);


io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store: store,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}));

myDB(async client => {
  try {
    const myDataBase = await client.db('advancednode').collection('node');
    console.log('Successfully connected to database');

    /*const testQuery = await myDataBase.find({}).toArray();
    console.log('Test query result:', testQuery);*/

    routes(app, myDataBase);
    auth(app, myDataBase);
  } catch (e) {
    console.error('Failed to connect to the database:', e);
    app.route('/').get((req, res) => {
      res.render('index', { title: 'Error', message: 'Unable to connect to database' });
    });
  }

  let currentUsers = 0;

  io.on('connection', socket => {
    const user = socket.request.user;
    console.log('Connected user:', user ? user.username : 'Anonymous'); // Log user info

    console.log('A user has connected' );
    ++currentUsers;
    io.emit('user', {
      username: user ? user.username : 'Anonymous',
      currentUsers,
      connected: true
    });

    socket.on('chat message', message => {
      io.emit('chat message', { username: user ? user.username : 'Anonymous', message });
    });

    socket.on('disconnect', () => {
      --currentUsers;
      io.emit('user', {
        username: user ? user.name : 'Anonymous',
        currentUsers,
        connected: false
      });
    });
  });
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('Successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  console.error('Socket authorization failed:', message, error);
  if (error) {
    accept(new Error(message));
  } else {
    accept(null, false);
  }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
