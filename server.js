const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/orders", require("./routes/orders"));
app.use("/api/summary", require("./routes/summary")); 
app.use("/api/stock", require("./routes/stock"));
app.use("/api/batches", require("./routes/batches"));

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/summary", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "summary.html"));
});

app.get("/stock", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "stock.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});