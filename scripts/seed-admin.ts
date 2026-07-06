// Tạo tài khoản admin đầu tiên — chạy 1 lần, cục bộ, không qua UI/API.
//
// Cách chạy (từ thư mục gốc repo):
//   node --experimental-strip-types scripts/seed-admin.ts <email> <password>
//
// Script chỉ IN RA lệnh `wrangler d1 execute` sẵn sàng chạy (chứa hash, KHÔNG chứa
// password thô). Tự bro copy lệnh đó chạy trong terminal của bro, hoặc paste lại
// đây để chạy hộ — hash không dùng để đăng nhập được nên an toàn để chia sẻ.
//
// Sau khi seed xong: xoá dòng lệnh (có hash) khỏi terminal history/scrollback nếu muốn,
// và KHÔNG commit file nào chứa hash này vào git.

import { hashPassword } from '../server/lib/password.ts';

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Cách dùng: node --experimental-strip-types scripts/seed-admin.ts <email> <password>');
  process.exit(1);
}

const id = crypto.randomUUID();
const passwordHash = await hashPassword(password);
const createdAt = Date.now();
const escapedEmail = email.replace(/'/g, "''");

const sql =
  `INSERT INTO users (id, email, password_hash, role, status, created_at) ` +
  `VALUES ('${id}', '${escapedEmail}', '${passwordHash}', 'admin', 'active', ${createdAt});`;

console.log('\nChạy lệnh sau để tạo admin trên lamweb-prod:\n');
console.log(`npx wrangler d1 execute lamweb-prod --remote --command="${sql}"`);
console.log('');
