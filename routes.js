const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please log in',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });


  // app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
  //   res.redirect('/profile');
  // });

  app.route('/login').post(async (req, res, next) => {
    console.log('Login attempt: { ' +req.body.username+', password : ***** }');
    
    passport.authenticate('local', async (err, user, info) => {
      if (err) { console.log('Error:', err); return next(err); }
      if (!user) { console.log('Authentication failed:', info); return res.redirect('/'); }
      
      try {
        req.logIn(user, (err) => {
          if (err) {
            console.log('Error during login:', err);
            return next(err);
          }
          console.log('Login successful');
          return res.redirect('/profile');
        });
      } catch (err) {
        console.log('Error during login:', err);
        return next(err);
      }
    })(req, res, next);
  });
  

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  });

  app.route('/logout').get((req, res) => {
    let temp = req.user.username;
    req.logout((err) => {
      if (err) { return next(err); }
      console.log(temp, 'has logged out');
      res.redirect('/');
    });
  });

  /*app.route('/register').post( (req, res, next) => {
    //try {
    console.log('Registration attempt:', req.body);
    console.log('Starting registration process');
    
    const hash = bcrypt.hashSync(req.body.password, 12);
    
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      console.log('Executing findOne query');
      if (err) {
        console.log('Error during findOne:', err);
        return next(err);
      } else if (user) {
        console.log('User already exists:', user);
        return res.redirect('/');
      } else {
        console.log('User does not exist, proceeding with registration');
        myDataBase.insertOne({
          username: req.body.username,
          password: hash
        }, (err, doc) => {
          if (err) {
            console.log('Error during insertOne:', err);
            return res.redirect('/');
          } else {
            console.log('User registered:', doc);
            return next(null, doc.insertedId || doc);
          }
        });
      }
    });
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    });*/

    app.route('/register').post(async (req, res, next) => {
      try {
        console.log('Registration attempt:', req.body);
        console.log('Starting registration process');
        
        const hash = bcrypt.hashSync(req.body.password, 12);
        
        // Check if user already exists
        const user = await myDataBase.findOne({ username: req.body.username });
        console.log('Executing findOne query');
        
        if (user) {
          console.log('User already exists:', user);
          return res.redirect('/');
        }
        
        // Insert new user
        const result = await myDataBase.insertOne({
          username: req.body.username,
          password: hash
        });
        
        console.log('User registered:', result);
        
        // Use req.login to authenticate the user and redirect
        req.login(result.insertedId || result, (err) => {
          if (err) {
            console.log('Error during login:', err);
            return next(err);
          }
          return res.redirect('/profile');
        });
      } catch (err) {
        console.log('Error during registration:', err);
        return next(err);
      }
    });
    

  app.route('/auth/github').get(passport.authenticate('github'));
  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    req.session.user_id = req.user.id;
    res.redirect('/chat');
  })

  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.render('chat', { user: req.user })
  })

  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};