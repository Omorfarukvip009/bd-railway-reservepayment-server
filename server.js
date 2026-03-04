const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public folder
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const SettingsSchema = new mongoose.Schema({
  bkashNumber: String,
  amount: String,
  blocked: { type: Boolean, default: false }
});

const Settings = mongoose.model("Settings", SettingsSchema);

// Default settings if empty
app.get("/api/settings", async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      bkashNumber: "017XXXXXXXX",
      amount: "500",
      blocked: false
    });
  }
  res.json(settings);
});

app.post("/api/update", async (req, res) => {
  const { bkashNumber, amount } = req.body;
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }
  settings.bkashNumber = bkashNumber;
  settings.amount = amount;
  await settings.save();
  res.json({ message: "Updated" });
});

app.post("/api/block", async (req, res) => {
  const { status } = req.body;
  let settings = await Settings.findOne();
  settings.blocked = status;
  await settings.save();
  res.json({ message: "Block status changed" });
});

app.listen(process.env.PORT, () =>
  console.log("Server running on port " + process.env.PORT)
);
