require("dotenv").config();


exports.auth_github = (passport) => {
  return (req, res, next) => {
    passport.authenticate("github")(req, res, next);
  };
};

exports.auth_github_callback = (passport) => {
  return (req, res, next) => {
    passport.authenticate(
      "github",
      { failureRedirect: `${process.env.REDIRECT_URL}/dashboard` },
      (err, user) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.redirect(`${process.env.REDIRECT_URL}/dashboard`);
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          console.log("Access token from user object:", req.user.accessToken); // Log the accessToken
          req.session.accessToken = req.user.accessToken;
          console.log("User successfully logged in");

          // Explicitly save the session after setting the accessToken
          req.session.save((err) => {
            if (err) {
              return next(err);
            }
            console.log(
              "Access token from session object:",
              req.session.accessToken
            ); // Log the accessToken from session object
            res.redirect(`${process.env.REDIRECT_URL}/dashboard/edit`);
          });
        });
      }
    )(req, res, next);
  };
};

exports.github_logout = (req, res) => {
  req.logout();
  res.redirect("/");
};

exports.test_cookies = (req, res) => {
  res.json({ code: 200, message: "You are authenticated!" });
};
