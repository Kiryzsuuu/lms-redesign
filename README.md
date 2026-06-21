# LMS2 (MERN) — LMS + Quiz Interaktif

Aplikasi LMS sederhana (inspirasi Coursera) dengan fitur quiz interaktif (inspirasi Quizizz/Kahoot).

## Fitur

- Landing page dengan **Hero Carousel (slide)** yang bisa dikelola oleh **teacher/admin**
- Auth JWT + role: `admin`, `teacher`, `student`
- Teacher/Admin:
  - Buat & publish course
  - Tambah materi (lesson) berbasis markdown
  - Buat quiz + soal pilihan ganda + publish
- Student:
  - Lihat course publik
  - Baca materi
  - Kerjakan quiz dan dapat skor setelah submit

## Prasyarat

- Node.js LTS
- MongoDB (local) **atau** Mongo via Docker

## Setup Backend

1. Masuk ke folder backend:

   `cd server`

2. Buat file env:

   - Copy `server/.env.example` menjadi `server/.env`
   - Pastikan `MONGO_URI` dan `JWT_SECRET` terisi
   - (Opsional) Isi SMTP_* kalau mau fitur email di masa depan

3. (Opsional) Jalankan MongoDB via Docker:

   `docker run --name lms2-mongo -p 27017:27017 -d mongo:7`

4. Seed data (admin + teacher + contoh course/quiz/hero):

   `npm run seed`

5. Jalankan backend:

   `npm run dev`

Backend jalan di `http://localhost:4000`.

## Setup Frontend

1. Masuk ke folder frontend:

   `cd client`

2. Buat env:

   - Copy `client/.env.example` menjadi `client/.env`

   Untuk local dev, set:

   - `VITE_API_BASE_URL=http://localhost:4000/api`

3. Jalankan frontend:

   `npm run dev`

Frontend jalan di `http://localhost:5173`.

## Deploy ke Azure App Service (Frontend + Backend terpisah)

Target: 2 App Service (Linux) terpisah:

- **Backend**: Express API (port dari `PORT` App Service)
- **Frontend**: Node static server yang menyajikan `client/dist` (SPA fallback)

### 1) Backend App Service

- Root folder: `server/`
- Start command (default dari `package.json`): `npm start`
- App Settings (Environment Variables) minimal:
   - `MONGO_URI` = Mongo connection string
   - `JWT_SECRET` = secret panjang
   - `CLIENT_ORIGIN` = `https://<frontend-app>.azurewebsites.net`
   - (opsional) `MIDTRANS_*`, `SMTP_*`

Endpoint health check:

- `GET /api/health` harus return `{ ok: true }`

### 2) Frontend App Service

- Root folder: `client/`
- Build command: `npm run build`
- Start command: `npm start` (menjalankan `client/start.js`)
- App Settings:
   - `VITE_API_BASE_URL` = `https://<backend-app>.azurewebsites.net/api`

Catatan:

- Pastikan `VITE_API_BASE_URL` di-set saat build (App Service build pipeline).
- Kalau kamu deploy via GitHub Actions, set env var itu di workflow step build.

### 3) Checklist “langsung live”

- Buka frontend URL, login, dan pastikan request ke API tidak kena CORS.
- Cek backend URL `.../api/health`.
- Jika ada CORS error: pastikan `CLIENT_ORIGIN` di backend tepat sama dengan origin frontend (tanpa trailing slash).

## Menjalankan Keduanya Sekaligus

Dari root repo:

`npm run dev`

## Akun Demo (setelah seed)

- Admin: `admin@lms.local` / `admin123`
- Teacher: `teacher@lms.local` / `teacher123`
- Student: daftar lewat halaman Register

## Endpoint Singkat

- `GET /api/heroes` (public)
- `GET /api/heroes/all` (teacher/admin)
- `POST /api/heroes` (teacher/admin)
- `GET /api/courses` (public)
- `GET /api/courses/:id` (public, published only)
- `GET /api/courses/_manage/mine` (teacher/admin)
- `POST /api/courses` (teacher/admin)
- `POST /api/courses/:courseId/lessons` (teacher/admin)
- `POST /api/quizzes/course/:courseId` (teacher/admin)
- `POST /api/quizzes/:quizId/questions` (teacher/admin)
- `GET /api/quizzes/play/:quizId` (student/auth)
- `POST /api/quizzes/play/:quizId/submit` (student/auth)

## Catatan

- Upload gambar belum dibuat; `imageUrl` pada hero/course masih berupa URL string.
- Markdown renderer di course detail dibuat minimal agar dependensi kecil.
