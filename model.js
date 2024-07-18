const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;

mongoose.connect(process.env.DBPASSWORD);

const UserSchema = Schema({
  email: {
    type: String,
    required: [true, "user must have an email"],
  },
  password: {
    type: String,
    required: [true, "user must have a password"],
  },
  name: {
    type: String,
  },
});

const QuizSchema = Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "quiz must have owner"],
  },
  title: { type: String, required: [true, "quiz must have title"] },
  description: { type: String },
  questions: [
    {
      questionText: {
        type: String,
      },
      possibleChoices: [
        {
          answerText: {
            type: String,
          },
          isCorrect: {
            type: Boolean,
          },
        },
      ],
    },
  ],
});

const ServerSchema = {
  name: {
    type: String,
    required: [true, "server must have a name"],
  },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
};

UserSchema.methods.setPassword = async function (password) {
  try {
    let hashedPassword = await bcrypt.hash(password, 12);
    this.password = hashedPassword;
  } catch (error) {}
};

UserSchema.methods.verifyPassword = async function (password) {
  let isGood = await bcrypt.compare(password, this.password);
  return isGood;
};

const User = mongoose.model("User", UserSchema);
const Server = mongoose.model("Server", ServerSchema);
const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = {
  User,
  Server,
  Quiz,
};
