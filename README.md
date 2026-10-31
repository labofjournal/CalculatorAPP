# CalculatorAPP

Aplikasi kalkulator responsif dengan tiga mode: **Basic**, **Scientific**, dan **Unit Converter**. Dibangun menggunakan HTML, CSS, JavaScript ES Modules, serta Firebase Authentication dan Cloud Firestore.

## Fitur

- Kalkulator basic: tambah, kurang, kali, bagi, persen, tanda negatif, dan desimal.
- Kalkulator scientific: sin, cos, tan, invers trigonometri, log, ln, akar, pangkat, konstanta π/e, faktorial, serta pilihan DEG/RAD.
- Konversi panjang, massa, suhu, volume, kecepatan, dan waktu.
- Riwayat tamu disimpan pada `localStorage` browser.
- Riwayat pengguna yang masuk disimpan di Firestore pada `users/{uid}/history` dan dipisahkan per akun.
- Pendaftaran dan login email/kata sandi memakai Firebase Authentication.
- Profil pengguna disimpan ke `users/{uid}` di Cloud Firestore.
- Email verifikasi dan reset kata sandi.

## 1. Siapkan Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/) lalu buat project.
2. Tambahkan aplikasi **Web** pada project dan salin konfigurasi Firebase.
3. Masuk ke **Authentication → Sign-in method** lalu aktifkan provider **Email/Password**.
4. Buat database pada **Firestore Database**.
5. Buka **Firestore Database → Rules**, lalu salin isi file `firestore.rules` dari folder ini dan terbitkan (Publish).
6. Buka `data/config.json`, lalu ganti nilai placeholder di bagian `firebase` dengan konfigurasi aplikasi web Anda.

Contoh bagian konfigurasi:

```json
"firebase": {
  "apiKey": "API_KEY_DARI_FIREBASE",
  "authDomain": "PROJECT_ID.firebaseapp.com",
  "projectId": "PROJECT_ID",
  "storageBucket": "PROJECT_ID.firebasestorage.app",
  "messagingSenderId": "SENDER_ID",
  "appId": "APP_ID"
}
```

Gunakan nilai persis dari Firebase Console → Project settings → Your apps. Konfigurasi web Firebase (termasuk `apiKey`) memang berada di sisi browser; keamanan data harus ditegakkan melalui Authentication dan Firestore Security Rules. Jangan pernah memasukkan Firebase Admin SDK private key atau service-account JSON ke folder publik aplikasi.

## 2. Jalankan aplikasi

Jangan membuka `index.html` langsung dengan `file://`, karena aplikasi memuat partial HTML dan konfigurasi melalui `fetch()`.

**Pilihan A — VS Code Live Server**

- Buka folder `CalculatorAPP` di VS Code.
- Jalankan `index.html` menggunakan ekstensi Live Server.

**Pilihan B — PHP built-in server**

Buka terminal di dalam folder `CalculatorAPP`, kemudian jalankan:

```bash
php -S localhost:8000
```

Buka `http://localhost:8000` di browser.

## 3. Alur penyimpanan akun dan data

Saat seseorang mendaftar melalui aplikasi:

1. Firebase Authentication membuat akun dengan email dan kata sandi.
2. Firebase memberikan UID unik untuk akun tersebut.
3. Aplikasi membuat/memperbarui dokumen profil di `users/{uid}`.
4. Riwayat kalkulasi milik pengguna tersebut disimpan di `users/{uid}/history`.

**Kata sandi tidak disimpan dalam dokumen Firestore atau `history.json`.** Firebase Authentication yang mengelola kredensial. Setiap pengguna hanya dapat mengakses dokumen profil dan riwayat dengan UID miliknya sendiri, sesuai aturan `firestore.rules`.

Akun yang dibuat melalui aplikasi ini masuk ke project Firebase yang Anda konfigurasi. Aplikasi tidak dapat otomatis mengambil akun orang yang tidak mendaftar atau masuk ke CalculatorAPP.

## 4. File dan penyimpanan

```text
CalculatorAPP/
├── index.html
├── partials/
│   ├── navbar.html
│   ├── hero.html
│   ├── tabs.html
│   ├── tab-basic.html
│   ├── tab-scientific.html
│   ├── tab-units.html
│   ├── history.html
│   ├── toast.html
│   └── footer.html
├── css/style.css
├── js/
│   ├── include.js
│   ├── calculator.js
│   ├── scientific.js
│   ├── units.js
│   ├── history.js
│   └── app.js
├── data/config.json
├── api/
│   ├── history.php
│   └── history.json
├── assets/logo.svg
├── firestore.rules
└── README.md
```

`api/history.php` merupakan endpoint status/seed untuk lingkungan PHP lokal. Data riwayat pengguna yang sudah login disimpan langsung ke Firestore, bukan ke file JSON publik bersama. Riwayat pengunjung tanpa akun tetap berada di browser masing-masing.

## 5. Catatan sebelum dipublikasikan

- Pastikan Firestore Rules telah diterbitkan. Tanpa rules yang sesuai, profil atau riwayat cloud akan gagal disimpan.
- Tambahkan domain hosting Anda ke **Authentication → Settings → Authorized domains**.
- Gunakan HTTPS untuk deployment publik.
- Untuk aplikasi publik berskala besar, pertimbangkan Firebase App Check, kebijakan password, pembatasan pendaftaran, dan pemantauan penggunaan.
- Firebase SDK browser dimuat dari CDN versi `13.1.0`; browser membutuhkan koneksi internet.

## Lisensi

Kode proyek ini disediakan sebagai starter project yang dapat Anda ubah dan kembangkan.
