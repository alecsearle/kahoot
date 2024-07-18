const express = require("express");
const model = require("./model");
const session = require("express-session");

const app = express();
app.use(express.json());

app.use(express.static("public"));

app.use(
  session({
    secret: "kadsflj;sjk;rwiopuwr939io09dsfapiorw3j3j2kt40as",
    saveUninitialized: true,
    resave: false,
  })
);

// the purpose of this middleware is to check if a request
// has a session and that the session has a userID field
// that connects to a user in our database
async function AuthMiddleware(request, response, next) {
  // STEP 1 check if they have a session
  if (request.session && request.session.userID) {
    // STEP 2 check if that session.userID connects to a user in our databse
    let user = await model.User.findOne({ _id: request.session.userID });
    if (!user) {
      return response.status(401).send("unauthenticated");
    }
    // if they are authenticated, pass them to the endpoint
    request.user = user;
    next();
  } else {
    return response.status(401).send("unauthenticated");
  }
}

app.get("/users", async function (req, res) {
  try {
    let users = await model.User.find();
    res.send(users);
  } catch (error) {
    res.status(404).send("Users not found.");
  }
});

app.get("/quizzes", async function (req, res) {
  try {
    let quizzes = await model.Quiz.find();
    if (!quizzes) {
      res.status(404).send("Quizzes Not Found");
      return;
    }
    res.json(quizzes);
  } catch (error) {
    console.log(error);
    res.status(404).send("Quizzes Not Found");
  }
});

app.get("/quizzes/:quizID", async function (req, res) {
  try {
    console.log(req.params.quizID);
    let quiz = await model.Quiz.find({ _id: req.params.quizID });
    console.log(quiz);
    if (!quiz) {
      console.log("Quiz not found.");
      res.status(404).send("Quiz not found.");
      return;
    }

    res.json(quiz);
  } catch (error) {
    console.log(error);
    console.log("Bad request (GET quiz).");
    res.status(400).send("Quiz not found.");
  }
});

app.post("/users", async (req, res) => {
  try {
    let newUser = await new model.User({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
    });
    await newUser.setPassword(req.body.password);
    const error = await newUser.validateSync();

    if (error) {
      res.status(422).send(error);
      return;
    }

    await newUser.save();
    res.status(201).send("good work");
  } catch (error) {
    res.status(500).send("server error");
  }
});

// logging in
app.post("/session", async (request, response) => {
  try {
    // STEP 1 find the user via their email
    let user = await model.User.findOne({ email: request.body.email });
    // STEP 2 if the user sends an email not in database
    if (!user) {
      return response.status(401).send("authentication failure");
    }

    // STEP 3 check if they gave us the right password
    let isGoodPassword = await user.verifyPassword(request.body.password);
    if (!isGoodPassword) {
      return response.status(401).send("authentication failure");
    }

    // Now we need to set the cookie
    request.session.userID = user._id;
    request.session.name = user.name;
    response.status(201).send(request.session);
  } catch (error) {
    response.status(500);
    console.log(error);
  }
});

app.get("/session", AuthMiddleware, (request, response) => {
  response.send(request.session);
});

app.delete("/session", function (request, response) {
  request.session.userID = undefined;
  response.status(204).send();
});

app.post("/quizzes", async (request, response) => {
  try {
    let newQuiz = await new model.Quiz({
      owner: request.session.userID,
      title: request.body.title,
      description: request.body.description,
      questions: request.body.questions,
    });
    const error = await newQuiz.validateSync();
    if (error) {
      response.status(422).send(error);
      console.log(error);
      return;
    }
    await newQuiz.save();
    response.status(201).send("you're ok");
  } catch (error) {
    response.status(500).send("error");
  }
});

// Make PUT and DELETE for single quiz
// use middleware
// quiz.owner._id.toString() === request.session.userID.toString()
app.put("/quizzes/:quizID", AuthMiddleware, async (request, response) => {
  try {
    const updatedQuiz = {
      title: request.body.title,
      description: request.body.description,
      questions: request.body.questions,
    };
    let putQuiz = await model.Quiz.findByIdAndUpdate(
      { _id: request.params.quizID },
      updatedQuiz,
      {
        new: true,
      }
    );
    if (!putQuiz) {
      response.status(404).send("could not update quiz");
      return;
    }
    response.status(204).json(putQuiz);
  } catch (error) {
    response.status(400).send("generic error");
    console.log(error);
  }
});

app.delete("/quizzes/:quizID", AuthMiddleware, async (request, response) => {
  try {
    console.log("delete single quiz");
    console.log(request.params.quizID);
    let isDeleted = await model.Quiz.findOneAndDelete({
      _id: request.params.quizID,
    });
    if (!isDeleted) {
      response.status(404).send("could not find quiz");
      return;
    }
    response.status(200).send("quiz deleted");
  } catch (error) {
    response.status(400).send("generic error");
  }
});

app.listen(8080, function () {
  console.log("server is running on http://localhost:8080");
});
