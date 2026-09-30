# ANES OSCE LAB · Tiara Bunda

Simulator OSCE interaktif untuk **D4 Keperawatan Anestesiologi, Politeknik Tiara Bunda, Cinere, Depok**.
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Supabase (opsional).

> **Educational simulation only.** Not intended to replace faculty instruction, institutional protocols, or clinical supervision.
> Skor adalah skor simulasi belajar, bukan penilaian klinis.

## Menjalankan lokal

```bash
npm install
npm run dev          # http://localhost:3000
```

Tanpa konfigurasi apa pun aplikasi langsung bisa dimainkan. Progres disimpan di `localStorage` browser (mode guest).

## Isi project

| Fitur | Keterangan |
|---|---|
| 6 station siap main | Pre-Anesthesia, Airway, Before Induction Safety Check, Perioperative Monitoring, PACU, Emergency (anafilaksis) |
| 5 tipe challenge | Multiple choice, Sequence (drag & drop + tombol panah), Equipment selection, Find the error, Branching decision |
| Branching nyata | Pilihan salah dapat menyisipkan *follow-up step* dan mengubah vital sign / riwayat pasien |
| Mode Latihan vs Mode Ujian | Latihan: feedback langsung, timer berhenti saat membaca feedback. Ujian: timer jalan terus, tanpa feedback, berhenti otomatis saat waktu habis |
| Skor, XP, level, badge | Lihat "Aturan skor" di bawah |
| Dashboard, Stations, Performance, Profile, Result + Review Mistakes | Semua terhubung ke data nyata |
| Sound | Klik/benar/salah/hitung mundur 10 detik, bisa dimatikan (tombol speaker) |
| Responsif | Desktop, tablet, mobile (bottom nav, timer selalu terlihat, tombol ≥ 48 px) |

## Aturan skor (0–100)

`Final = (Accuracy×35 + Critical×25 + Sequence×10 + Time×15 + Mistakes×15) / 100`

- **Accuracy**: rata-rata nilai semua step (sequence & multi-select mendapat nilai parsial).
- **Critical Steps**: rata-rata nilai step bertanda `critical`. Jika ada critical step bernilai < 50, skor akhir dibatasi maksimal 79.
- **Sequence**: rata-rata nilai step urutan (jika station tidak punya step urutan, bobotnya dibagi ke faktor lain).
- **Time**: 100 sampai 60% waktu, turun ke 60 di 100% waktu, 0 di 150%.
- **Mistakes**: 100 dikurangi 15 per step yang tidak benar sempurna.
- Bobot bisa diganti per case lewat `scoring.weights`.
- Grade: 90–100 Excellent · 80–89 Very Good · 70–79 Good · 60–69 Needs Practice · <60 Retry Recommended.
- **XP**: +100 per jawaban benar, +250 selesai station, +500 station tanpa kesalahan. Level n butuh `300 + (n-1)×100` XP.
- **OSCE Readiness** = rata-rata skor terbaik semua station (station yang belum dicoba dihitung 0).

## Menambah case baru (tanpa mengubah UI)

1. Salin salah satu file di `src/data/cases/*.json`, ubah `id`, `number`, isi, dan langkah-langkahnya.
2. Daftarkan di `src/data/index.ts` (satu `import` + satu entri array).
3. Jalankan `npm test` — validator memeriksa struktur (jawaban benar ada di opsi, remedial step valid, dll).
4. Kategori baru cukup dipakai di field `category`; UI otomatis menampilkannya.

Bentuk step (semua field ada di `src/lib/types.ts`):

```jsonc
{ "id":"s1", "type":"mcq|sequence|equipment|find-error|branching",
  "tag":"Patient Assessment",          // dipakai untuk "Strongest / Needs practice"
  "critical": true, "situation":"...", "prompt":"...",
  "vitals": { "spo2": 88 },            // opsional: vital berubah saat step ini muncul
  "revealHistory": ["..."],            // opsional: riwayat baru muncul
  "explanation":"...", "takeaway":"..." }
```
- `mcq`: `options[]`, `correct`
- `sequence`: `items[]` ditulis dalam urutan **benar** (UI mengacaknya)
- `equipment` / `find-error`: `items[]` dengan `correct: true/false` dan `why`
- `branching`: `options[]` dengan `score` (100/40/0), `consequence`, dan `remedial` (id step follow-up, yang harus punya `"remedial": true`)

Setiap case punya field `references` (sumber) yang tampil di layar briefing.

## Supabase (opsional: login + sinkron antar perangkat + case dari database)

1. Buat project di supabase.com.
2. SQL Editor → jalankan `supabase/schema.sql` (tabel + Row Level Security), lalu `supabase/seed.sql`.
3. `cp .env.example .env.local` dan isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Restart `npm run dev`. Muncul tombol **Sign in** di header.
5. Jadikan diri sendiri admin: `update public.profiles set role='admin' where id=(select id from auth.users where email='email@anda');`
6. Regenerasi seed setelah mengubah JSON: `npm run seed`.

Perilaku: guest tetap bisa main. Saat pertama login ke akun kosong, progres guest diunggah. Jika Supabase punya case terbit, aplikasi memakai case dari database; jika gagal/kosong, otomatis kembali ke case lokal.

Tabel: `profiles` (+ `auth.users` bawaan Supabase sebagai "users"), `categories`, `cases`, `case_steps`, `questions`, `attempts`, `attempt_answers`, `progress`, `achievements`. Admin (role `admin`) dapat menambah/ubah case, step, pertanyaan, penjelasan, kategori, dan difficulty lewat Table Editor Supabase; UI admin khusus belum dibuat (sesuai MVP).

## Deploy

**Vercel**: push ke GitHub → Import Project → framework Next.js terdeteksi otomatis → (opsional) isi 2 environment variable Supabase → Deploy.

**Netlify**: push ke GitHub → Add new site → build command `npm run build` (sudah ada di `netlify.toml`, plugin `@netlify/plugin-nextjs` dipakai otomatis) → isi environment variable Supabase bila perlu → Deploy.

## Struktur

```
src/app          halaman: /, /dashboard, /stations, /simulate/[id], /result/[id], /performance, /profile, /auth
src/components   UI (ui.tsx, cards.tsx, AppShell) dan sim/ (SimulationRunner, PatientCard, inputs, Feedback)
src/lib          engine.ts (state machine), scoring.ts, analytics.ts, achievements.ts, xp.ts, store.tsx, remote.ts (Supabase)
src/data         registry + cases/*.json
supabase         schema.sql, seed.sql (dibuat oleh scripts/generate-seed.mjs)
scripts          selftest.ts (logika), generate-seed.mjs
tests            ui.test.tsx (jsdom)
```

## Pengujian

```bash
npm test           # 157 pemeriksaan logika: validasi data, scoring, engine, timeout, streak, badge, XP
npm run test:ui    # 25 tes UI: memainkan SEMUA station lewat DOM (practice benar, exam salah), result, review, reset, timeout
npm run typecheck
npm run build
```

## Batasan yang perlu diketahui

- **Konten klinis harus ditinjau dosen/penguji** sebelum dipakai untuk penilaian. Konten disusun konservatif (tanpa dosis obat, tanpa rekomendasi individual) dan merujuk sumber umum (ASA, WHO, dsb.), tetapi bukan pengganti kurikulum dan SOP institusi.
- Jalur Supabase (login, sync, case dari database) sudah ditulis dan lolos typecheck, tetapi **belum diuji terhadap project Supabase sungguhan**. Uji dulu dengan project percobaan.
- Tes UI berjalan di jsdom; tampilan visual di HP/tablet nyata perlu dicek manual sebelum dirilis.
- Jika sudah login dan akun cloud berisi data, progres guest lokal tidak digabung (akun cloud yang dipakai).
- Kategori INTRAOPERATIVE belum punya case; kartunya tampil "Coming soon".
