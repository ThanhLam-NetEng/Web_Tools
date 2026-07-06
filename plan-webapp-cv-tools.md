# PLAN: Web App Đa Người Dùng (CV Builder + Tools cá nhân) trên Cloudflare

## 1. Tổng quan
- Web app riêng tư, share cho bạn bè (~<10 người, có thể tăng sau).
- Có login, phân quyền **admin** / **user**.
- Vào trong có nhiều "tool" nhỏ, làm dần từng cái. Tool đầu tiên: **CV Builder** (chọn template đẹp → điền thông tin → xuất PDF).
- Deploy 100% trên Cloudflare (free tier là đủ ở quy mô này).

## 2. Tech stack

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| Frontend + Backend | **Cloudflare Pages + Pages Functions** (API viết trong `functions/api/*`, dùng Hono làm router bên trong) | Gộp chung 1 domain duy nhất — tránh lỗi cookie/CORS khi frontend và API ở 2 domain khác nhau (`*.pages.dev` vs `*.workers.dev`). Không tách Worker riêng nữa. |
| Database | **Cloudflare D1** (SQLite) | Free, đủ cho <10 user, dễ query. Tách 2 database: `lamweb-dev` (local/test) và `lamweb-prod` (thật) — khai báo riêng trong `wrangler.toml`, KHÔNG test thẳng lên prod. |
| Session/Cache | **Cloudflare KV** | Lưu session token |
| File (ảnh đại diện CV) | **Cloudflare R2** | Lưu ảnh user upload cho CV, free egress |
| Auth | Tự viết: email + password, hash bằng **Web Crypto PBKDF2** (built-in runtime, KHÔNG cần cài `bcryptjs`) | Cloudflare Workers/Pages Functions giới hạn CPU time khá chặt — bcrypt cost cao dễ vượt giới hạn, PBKDF2 qua Web Crypto native thì không lo vấn đề này |
| PDF export | **Client-side**: `@react-pdf/renderer` hoặc `html2pdf.js` (html2canvas + jsPDF) | Pages Functions không chạy được Puppeteer/Chromium → phải render PDF ngay trên trình duyệt người dùng |

> Ghi chú quan trọng: KHÔNG dùng Puppeteer/Playwright — sẽ không chạy được trên Cloudflare. Nếu sau này cần PDF chất lượng in ấn cao hơn, có thể cân nhắc gọi API ngoài (Browserless.io) nhưng tốn phí — bỏ qua ở giai đoạn này.

> Domain: dùng tạm `*.pages.dev` mặc định của Cloudflare Pages, chưa gắn domain riêng. Gắn domain riêng là việc làm sau, không ảnh hưởng code.

## 3. Cấu trúc dữ liệu (D1 schema — bản chuẩn duy nhất, dùng xuyên suốt)

```sql
-- users
CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- uuid
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- PBKDF2 hash (Web Crypto), lưu kèm salt trong cùng chuỗi
  role TEXT NOT NULL DEFAULT 'user',       -- 'admin' | 'user'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'active' | 'suspended' | 'rejected'
  created_at INTEGER NOT NULL
);

-- sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,          -- session token (random, lưu dạng cookie httpOnly)
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL   -- 30 ngày kể từ lúc tạo, gia hạn (sliding) mỗi lần user active
);

-- cv_documents (dữ liệu CV người dùng lưu để sửa lại sau)
CREATE TABLE cv_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  template_id TEXT NOT NULL,
  data_json TEXT NOT NULL,      -- toàn bộ nội dung CV dạng JSON, bao gồm cả link ảnh đại diện (R2 URL) nếu có
  updated_at INTEGER NOT NULL
);
```

> Đây là schema DUY NHẤT dùng cho toàn bộ project — không định nghĩa lại bảng `users` ở đâu khác trong file này nữa (bản cũ ở mục 4 đã bị gộp vào đây, tránh mâu thuẫn).

Sau này thêm tool khác (journal, v.v.) → thêm bảng riêng, không đụng vào bảng cũ.

## 4. Phân quyền & luồng đăng ký (đăng ký được, nhưng phải admin duyệt)

- **User tự đăng ký** (email + password) → tài khoản tạo ra với `status = 'pending'` — **chưa login được**, chỉ thấy màn hình "Đã gửi yêu cầu, chờ admin duyệt".
- **Admin** vào trang `/admin/requests` thấy danh sách tài khoản đang `pending`, bấm **Duyệt** (→ `status = 'active'`) hoặc **Từ chối** (→ xoá hoặc `status = 'rejected'`).
- Duyệt xong, user login bình thường bằng email/password đã đăng ký từ đầu (không cần tạo lại).
- Admin vẫn có thể: xem toàn bộ user, đổi role, khoá (`status = 'suspended'`) bất kỳ lúc nào.
- Middleware ở Pages Functions: mọi route `/api/*` check session token (đọc từ cookie httpOnly) → lấy `role` + `status` → chỉ `status = 'active'` mới gọi được API tool; route `/api/admin/*` chỉ cho `role = 'admin'`.

### Trang `/admin/users` — thao tác cụ thể

Bảng danh sách user, mỗi dòng theo trạng thái có action tương ứng:

| Trạng thái | Badge hiển thị | Action admin làm được |
|---|---|---|
| `pending` | "Chờ duyệt" | **Duyệt** → `active` / **Từ chối** → xoá record |
| `active` | "Đang hoạt động" | **Khoá** → `suspended` / **Đổi role** (user ↔ admin) / **Xoá** |
| `suspended` | "Đã khoá" | **Mở khoá** → `active` / **Xoá** |

Luật an toàn BẮT BUỘC phải code (tránh admin tự bắn vào chân mình):
- **Không cho tự đổi role hoặc tự khoá chính mình** (so sánh `user_id` trong session với `id` bị thao tác, chặn nếu trùng).
- **Không cho hạ role admin cuối cùng xuống user** — trước khi đổi, query đếm số `role = 'admin'`, nếu = 1 thì chặn thao tác.
- **Đổi role user → admin cần bước xác nhận** (dialog confirm ở frontend, "Bạn chắc chắn cấp quyền admin cho [email]?") vì đây là quyền cao nhất hệ thống.
- **Admin KHÔNG mặc định xem được nội dung CV của user khác** — trang admin chỉ hiện tên/email/ngày tạo/số lượng CV đã lưu, không hiện `data_json`. Nếu sau này cần tính năng "xem hộ để hỗ trợ debug", làm thành 1 quyền riêng (`can_view_others_data`), không bật mặc định cho mọi admin.

## 5. Lưu trữ CV & PDF (làm rõ)

- **Dữ liệu CV** (tên, học vấn, kinh nghiệm...) luôn lưu ở D1 (bảng `cv_documents`) — sửa lại bao nhiêu lần cũng được, không mất.
- **File PDF** chỉ là bản xuất cuối, render ngay trên trình duyệt (client-side) rồi tải thẳng về máy — mặc định KHÔNG lưu bản PDF trên server (vì xuất lại từ data + template là ra y hệt, khỏi tốn R2).
- Nếu sau này muốn có "lịch sử các bản PDF đã xuất" (xem lại đúng file cũ, không phải data cũ), có thể bật thêm: upload bản PDF vừa xuất lên R2, lưu link trong `cv_documents`. Để dành làm sau nếu thấy cần, không làm ngay ở Phase 2.

## 6. Roadmap triển khai (làm theo thứ tự, từng bước nhỏ)

### Phase 0 — Setup
1. Khởi tạo repo React + Vite, thêm Cloudflare Pages Functions (thư mục `functions/`).
2. Tạo **2 D1 database** riêng: `lamweb-dev` (dùng khi code/test local) và `lamweb-prod` (dữ liệu thật) — khai báo cả 2 binding trong `wrangler.toml`, phân biệt bằng flag môi trường (`--env production`).
3. Chạy schema ở mục 3 trên cả 2 database.
4. Setup Cloudflare Pages project trỏ vào repo (dùng domain mặc định `*.pages.dev`).
5. **Seed tài khoản admin đầu tiên**: viết 1 file `seed-admin.sql` với `INSERT INTO users (...)` — password hash tính sẵn bằng 1 script Node chạy local (không qua UI, không qua API, không có endpoint public nào tạo được admin). Chạy 1 lần duy nhất bằng `wrangler d1 execute lamweb-prod --file=seed-admin.sql`. Sau khi seed xong, xoá thông tin password thô khỏi mọi file/log.

### Phase 1 — Auth & phân quyền (làm trước tiên, nền tảng cho mọi thứ)
1. API (trong `functions/api/`): `POST /api/auth/register` (tạo user `status=pending`), `POST /api/auth/login` (trả cookie httpOnly session, hạn 30 ngày), `POST /api/auth/logout`.
2. Admin-only: `GET /api/admin/users`, `POST /api/admin/users/:id/approve`, `POST /api/admin/users/:id/reject`, `POST /api/admin/users/:id/suspend`, `POST /api/admin/users/:id/role`.
3. Middleware xác thực session (đọc cookie) + check `role`/`status`, áp dụng luật an toàn ở mục 4 (không tự sửa mình, không hạ admin cuối cùng, confirm khi cấp quyền admin).
4. Frontend: trang Đăng ký, Đăng nhập, layout có 2 khu: `/admin` (quản lý user, chỉ admin) và `/app` (các tool, chỉ user `status=active`).

### Phase 2 — CV Builder (tool đầu tiên)
1. Thiết kế **2 template CV** (React component riêng, style cố định, chừa chỗ điền field):
   - **"Classic Professional"**: bố cục 1 cột, **ảnh đại diện** góc trên (upload được, xem mục Upload ảnh bên dưới) → Tên + chức danh → Tóm tắt → Kinh nghiệm → Học vấn → Kỹ năng → Chứng chỉ. An toàn cho mọi ngành (kể cả công ty truyền thống, logistics, nhà máy).
   - **"Modern Two-Column"**: cột trái (~30%) chứa ảnh đại diện + thông tin liên hệ + kỹ năng + ngôn ngữ, cột phải (~70%) chứa kinh nghiệm/học vấn. Hợp ứng tuyển ngành IT/tech.
   - Mỗi template cho chọn **1 màu accent** trong 4-5 màu trung tính an toàn (navy, xám than, xanh rêu, đỏ đô...) — KHÔNG dùng bảng màu "Velvet Vault" của web vào CV, vì CV là để nhà tuyển dụng đọc, không phải để flex.
   - Font trong CV dùng font in ấn chuẩn, dễ đọc và thân thiện với máy quét ATS (VD: Inter hoặc Source Sans) — khác hoàn toàn font trang trí của web.
   - Cấu trúc component nên tách riêng để sau này thêm template 3, 4... không đụng code cũ (VD: `templates/ClassicProfessional.tsx`, `templates/ModernTwoColumn.tsx`, dùng chung 1 interface data).
2. **Upload ảnh đại diện**: giới hạn 2MB, chỉ nhận JPG/PNG, resize/crop vuông ở client trước khi upload (dùng canvas hoặc thư viện crop nhẹ) → upload lên **R2** qua 1 API route riêng (`POST /api/cv/upload-avatar`, chỉ user đã `active` mới gọi được) → lưu URL ảnh vào `data_json` của CV. Ảnh là tùy chọn, không bắt buộc điền.
3. Form nhập liệu nhiều bước (thông tin cá nhân, học vấn, kinh nghiệm, kỹ năng...) — lưu tạm vào state.
4. Preview real-time template khi điền.
5. Nút "Lưu" → gọi API lưu `data_json` vào bảng `cv_documents` (để sửa lại sau, khỏi gõ lại từ đầu).
6. Nút "Xuất PDF" → render client-side bằng `@react-pdf/renderer` (ảnh đại diện load trực tiếp từ URL R2 vào PDF).
7. Trang "CV của tôi" → list các CV đã lưu, mở lại để sửa hoặc xuất lại.

### Phase 3 — Tool thứ 2 trở đi
- Làm từng cái một, theo cùng pattern: 1 bảng D1 riêng, 1 route `/app/<tool-name>`, tự quản lý data theo `user_id`.
- Ứng viên tiếp theo tuỳ bro chọn (nhật ký, tracker gì đó...).

## 7. Việc cần bro chuẩn bị trước khi Claude Code bắt tay vào
- Tài khoản Cloudflare (đã có sẵn từ ý định deploy).
- Chạy `wrangler login` để authenticate CLI.
- Quyết định 1 email/password cho tài khoản admin đầu tiên (để seed).
- (Tùy chọn) domain riêng nếu muốn gắn vào Cloudflare Pages thay vì domain mặc định `*.pages.dev`.

## 8. Định hướng giao diện — "sang trọng, hoa mỹ, chất chơi để flex"

Web riêng tư, vào được là nhờ được duyệt — nên cảm giác phải như bước vào **1 câu lạc bộ/atelier hạng sang**: lộng lẫy, có chiều sâu, có hiệu ứng làm người xem phải dừng lại ngắm, không phải app tiện ích khô khan.

**Tránh 3 vibe AI-generated đang bị lạm dụng khắp nơi** (nhìn phát biết ngay "làm bằng AI"):
- Nền be/cream + serif to đùng + accent cam đất.
- Nền đen tuyền + 1 màu neon xanh lá/đỏ chói.
- Layout báo giấy, viền chỉ mảnh, bo góc = 0.

**Hướng đi riêng — "Velvet Vault"**: cảm giác một két sắt bọc nhung, nơi cất hồ sơ quý giá của riêng bro — màu đá quý sâu, ánh kim vàng, chuyển động mượt như mở một cánh cửa quý tộc.

- **Bảng màu** (6 màu):
  - `--obsidian` `#0A0E12` — nền chính, đen ánh xanh sâu
  - `--emerald` `#0D2B26` — nền panel/section, xanh ngọc lục bảo tối, tạo chiều sâu so với nền chính
  - `--gold` `#D4AF37` — accent chính, ánh kim vàng thật (dùng gradient gold chứ không phải màu phẳng) — viền, nút chính, hiệu ứng glow
  - `--ivory` `#F3ECDD` — chữ chính trên nền tối
  - `--burgundy` `#5C1A2B` — màu nhấn phụ, dùng cho highlight/badge đặc biệt
  - `--mist` `#8A93A0` — chữ phụ, mờ

- **Typography**:
  - Display (tiêu đề lớn): **Fraunces** hoặc **Playfair Display** — serif tương phản nét cao, sang trọng kiểu tạp chí thời trang, size lớn, letter-spacing rộng ở tiêu đề
  - Accent/điểm nhấn (chữ ký, quote, số nổi bật): **Cormorant** hoặc **Italiana** — serif mảnh, italic, dùng ít nhưng đắt giá (VD: tên người dùng trên thẻ hồ sơ)
  - Body: **Inter** hoặc **Manrope** — sans-serif sạch, không tranh spotlight

- **Hiệu ứng chuyển động (đầu tư mạnh vào đây theo đúng yêu cầu "hoa mỹ")**:
  - **Page load**: khi vào trang chủ/dashboard, có hiệu ứng ánh sáng vàng quét nhẹ qua (gold shimmer sweep) rồi nội dung fade + slide lên nhẹ nhàng, như màn kéo rèm.
  - **Hover trên card/nút**: viền phát sáng gradient vàng (glow border), scale nhẹ 1.02, chuyển động mượt (300ms ease).
  - **Nền động (ambient)**: particle/hạt sáng li ti trôi chậm phía sau, hoặc gradient mesh chuyển động rất chậm — tạo chiều sâu mà không gây rối mắt.
  - **Đăng nhập thành công**: hiệu ứng "**cánh cửa két sắt mở ra**" — 2 panel tách ra 2 bên kèm ánh sáng vàng loé giữa, rồi vào dashboard.
  - **Admin duyệt tài khoản**: con dấu vàng ánh kim đóng xuống + hiệu ứng lấp lánh (sparkle) toả ra quanh, rồi thẻ hồ sơ chuyển từ mờ (pending) sang sáng rõ (active).
  - **Xuất CV thành công**: hiệu ứng confetti ánh kim (gold confetti) bung nhẹ quanh nút, kèm âm thanh "tách" nhỏ (tùy chọn) — cảm giác "thành tựu", đúng chất flex.

- **Layout signature**: mỗi CV/hồ sơ nằm trong 1 **khung thẻ viền vàng ánh kim**, có hiệu ứng ánh sáng chạy dọc viền khi hover (giống thẻ VIP/thẻ đen ngân hàng). Dashboard chính giữa nổi bật 1 khối lớn (hero) giới thiệu tool đang có, xung quanh là các thẻ tool khác mờ nhẹ hơn.

- **CV export PDF**: bản thân PDF vẫn phải **sạch, chuyên nghiệp, dễ đọc** cho nhà tuyển dụng — không nhồi hiệu ứng lấp lánh vào file in. Chất "phông bạt" dồn hết vào **trải nghiệm web** (lúc điền, lúc bấm xuất), còn file cuối cùng ra là phải nghiêm túc, gọn gàng.

> Note cho Claude Code: hiệu ứng nhiều nhưng phải mượt (60fps), tôn trọng `prefers-reduced-motion`, và đừng lặp lại hiệu ứng ở mọi chỗ — mỗi khoảnh khắc quan trọng (login, duyệt tài khoản, xuất CV) có 1 hiệu ứng riêng, còn lại (list, form nhập liệu bình thường) giữ mượt mà không rối mắt, không thì sẽ ngược lại thành chậm và rối.

## 9. Việc KHÔNG làm ở giai đoạn này (tránh over-engineer)
- Không cần OAuth (Google login...) — email/password nội bộ là đủ cho <10 người.
- Không cần payment/subscription (đây không phải web public kiếm tiền nữa).
- Không cần multi-tenant phức tạp, chỉ cần 2 role đơn giản.
