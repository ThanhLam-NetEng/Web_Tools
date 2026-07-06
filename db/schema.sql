-- Schema chuẩn duy nhất — xem plan-webapp-cv-tools.md mục 3.
-- Chạy trên CẢ HAI database:
--   wrangler d1 execute lamweb-dev  --file=db/schema.sql
--   wrangler d1 execute lamweb-prod --file=db/schema.sql --remote

CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- uuid
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- PBKDF2 hash (Web Crypto), lưu kèm salt trong cùng chuỗi
  role TEXT NOT NULL DEFAULT 'user',       -- 'admin' | 'user'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'active' | 'suspended' | 'rejected'
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,          -- session token (random, lưu dạng cookie httpOnly)
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL   -- 30 ngày kể từ lúc tạo, gia hạn (sliding) mỗi lần user active
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE cv_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  template_id TEXT NOT NULL,
  data_json TEXT NOT NULL,      -- toàn bộ nội dung CV dạng JSON, bao gồm cả link ảnh đại diện (R2 URL) nếu có
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_cv_documents_user_id ON cv_documents(user_id);
