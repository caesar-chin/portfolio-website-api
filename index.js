require("dotenv").config();

const express = require("express");
const passport = require("passport");
const session = require("express-session");
const initializePassport = require("./passport-config");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

initializePassport(passport);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000 * 7, // 1 week
      httpOnly: false,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

//parse requests of application/json
app.use(express.json());

//parse request of application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

require("./routes/routes.js")(app, passport);

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.json({ message: "Hello!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
