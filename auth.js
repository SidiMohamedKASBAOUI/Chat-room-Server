const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const GitHubStrategy = require('passport-github').Strategy;
require('dotenv').config();

module.exports = function (app, myDataBase) {
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await myDataBase.findOne({ _id: new ObjectId(id) });

      if (!user) {
        console.error('No user found with ID:', id);
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      console.error('Error in deserializeUser:', err);
      return done(err);
    }
  });

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await myDataBase.findOne({ username: username });
      console.log(`User ${username} attempted to log in.`);

      if (!user) {
        console.log('User not found');
        return done(null, false);
      }

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        console.log('Password does not match');
        return done(null, false);
      }

      return done(null, user);
    } catch (err) {
      console.error('Error in LocalStrategy:', err);
      return done(err);
    }
  }));

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback'
  },
  async function (accessToken, refreshToken, profile, cb) {
    try {
      const doc = await myDataBase.findOneAndUpdate(
        { id: profile.id },
        {
          $setOnInsert: {
            id: profile.id,
            username: profile.username,
            name: profile.displayName || 'John Doe',
            photo: profile.photos[0].value || '',
            email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
            created_on: new Date(),
            provider: profile.provider || ''
          },
          $set: {
            last_login: new Date()
          },
          $inc: {
            login_count: 1
          }
        },
        { upsert: true, new: true }
      );

      return cb(null, doc.value);
    } catch (err) {
      console.error('Error in findOneAndUpdate:', err);
      return cb(err);
    }
  }));
};
