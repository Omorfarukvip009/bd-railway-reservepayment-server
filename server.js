const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

// ===== MongoDB =====
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function start() {
  await client.connect();
  db = client.db("railway");
  console.log("MongoDB Connected");
}
start();

// ===== Token =====
function sign(data) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET)
    .update(JSON.stringify(data))
    .digest("hex");
}

function verify(token, data) {
  return token === sign(data);
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  raw.split(";").forEach(p => {
    const [k, v] = p.trim().split("=");
    out[k] = v;
  });
  return out;
}

// ================= USER LOGIN =================
app.post("/api/user/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await db.collection("users").findOne({ username, password });

  if (!user) return res.status(401).json({ ok: false });

  if (user.blocked)
    return res.status(404).send("404 Not Found");

  res.json({
    ok: true,
    bkashNumber: user.bkashNumber,
    amount: user.amount
  });
});

// ================= ADMIN LOGIN =================
app.post("/api/admin/login", (req, res) => {
  if (
    req.body.username !== process.env.ADMIN_USER ||
    req.body.password !== process.env.ADMIN_PASS
  ) {
    return res.status(401).json({ ok: false });
  }

  const token = sign({ admin: true });

  res.setHeader(
    "Set-Cookie",
    `admin_token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`
  );

  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  const token = parseCookies(req).admin_token;
  if (!verify(token, { admin: true }))
    return res.status(401).json({ ok: false });
  next();
}

// ================= CREATE / UPDATE USER =================
app.post("/api/admin/user", requireAdmin, async (req, res) => {
  const { username, password, bkashNumber, amount, blocked } = req.body;

  await db.collection("users").updateOne(
    { username },
    {
      $set: {
        username,
        password,
        bkashNumber,
        amount,
        blocked: blocked || false
      }
    },
    { upsert: true }
  );

  res.json({ ok: true });
});

// ================= BLOCK USER =================
app.post("/api/admin/block", requireAdmin, async (req, res) => {
  const { username, blocked } = req.body;

  await db.collection("users").updateOne(
    { username },
    { $set: { blocked } }
  );

  res.json({ ok: true });
});

// ===== Static =====
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log("Server Running on Port " + PORT));
