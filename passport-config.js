require("dotenv").config();

const GitHubStrategy = require("passport-github").Strategy;

const githubUsername = process.env.GITHUB_USERNAME;

function initialize(passport) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
      },
      (accessToken, refreshToken, profile, done) => {
        // You can either store the profile in your database or keep it in memory
        // For simplicity, we'll return the profile directly

        if (profile.username === githubUsername) {
          // Set the accessToken on the user object
          profile.accessToken = accessToken;

          return done(null, profile);
        } else {
          return done(null, false, {
            message: "Only a specific GitHub user can log in",
          });
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    done(null, { id: id });
  });
}

module.exports = initialize;
