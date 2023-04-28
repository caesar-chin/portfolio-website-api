exports.auth_github = (passport) => {
  return (req, res, next) => {
    passport.authenticate("github")(req, res, next);
  };
};

exports.auth_github_callback = (passport) => {
  return (req, res, next) => {
    passport.authenticate(
      "github",
      { failureRedirect: "https://caesarchin.com/dashboard" },
      (err, user) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.redirect("https://caesarchin.com/dashboard");
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
            res.redirect("https://caesarchin.com/dashboard/edit");
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
  res.json({ message: "You are authenticated!" });
};
