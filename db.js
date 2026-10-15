// ============================================================
// db.js — قاعدة البيانات المصغرة (SQLite حقيقية عبر sql.js)
// ملف واحد على القرص: server/data/academy.sqlite
// ============================================================
const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'academy.sqlite')
const WASM_DIR = path.join(__dirname, 'node_modules', 'sql.js', 'dist')

let db = null
let timer = null

const SCHEMA = `
PRAGMA foreign_keys = ON;

-- جدول الأرقام المسموح لها بالدخول (بيتحكم فيه الأدمن)
CREATE TABLE IF NOT EXISTS whitelist (
  phone      TEXT PRIMARY KEY,
  label      TEXT,
  added_by   TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT UNIQUE NOT NULL,
  username   TEXT UNIQUE NOT NULL,
  pass_hash  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'student',   -- student | admin
  score      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login TEXT
);

-- جلسات الدخول (توكن عشوائي بدل JWT — أبسط وأأمن)
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- تقدم المستخدم في كل درس
CREATE TABLE IF NOT EXISTS progress (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);

-- سجل محاولات الاختبارات القصيرة
CREATE TABLE IF NOT EXISTS attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  TEXT NOT NULL,
  correct    INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  points     INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`

async function init() {
  if (db) return db
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const SQL = await initSqlJs({ locateFile: (f) => path.join(WASM_DIR, f) })
  db = fs.existsSync(DB_FILE)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(DB_FILE)))
    : new SQL.Database()
  db.run(SCHEMA)
  save()
  return db
}

function save() {
  if (!db) return
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()))
}

// حفظ مؤجّل — عشان ما نكتبش الملف مع كل استعلام
function persist() {
  clearTimeout(timer)
  timer = setTimeout(save, 250)
}

function run(sql, params = []) {
  db.run(sql, params)
  persist()
}

function all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function get(sql, params = []) {
  return all(sql, params)[0] || null
}

module.exports = { init, run, all, get, save, DB_FILE, DATA_DIR }
