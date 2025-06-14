const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors"); // Add cors

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Use cors middleware
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/budget-balance",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Routes (will be added later)
app.use("/api/auth", require("./routes/auth"));

app.use("/api/expenses", require("./routes/expenses"));

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Export the Express app for Vercel
module.exports = app;
