# Coaching Dashboard (Mobile-first)

## Struktur
- `index.html`
- `assets/css/style.css`
- `assets/js/app.js`
- `data/coaching.json` (file data Anda, diletakkan di sini)

## Cara pasang di repository
Salin `index.html` dan folder `assets/` ke root repository. Pastikan JSON tersedia di:
`data/coaching.json`

## Menjalankan lokal
Jangan membuka `index.html` langsung dengan `file://`, karena browser dapat memblokir `fetch()`.
Jalankan server lokal dari root repository, misalnya:
`python -m http.server 8000`
Lalu buka `http://localhost:8000`.

## Catatan perhitungan
Indikator yang saat ini dihitung: Active, Ada, All, Confirm, Dips, HO, Hub Baik, POP, Promo, SL<2 menit, Scan, Vs Target.
Untuk setiap indikator, aplikasi menghitung rata-rata nilai numerik pada seluruh kunjungan yang terfilter, lalu menjumlahkan seluruh rata-rata indikator sebagai Total Skor.
Grade: A jika skor >= 16; B jika skor >= 12 dan < 16; C jika skor < 12.

Tanggal: memakai `Tanggal`; jika kosong/null, menggunakan `Stop Selling` sebagai tanggal fallback.
Catatan: aplikasi mencari kolom `Catatan`, `Catatan Coaching`, `Keterangan`, `Hasil Coaching`, atau `Notes`. Tambahkan kolom `Catatan` pada Excel dan masukkan ke payload Power Automate agar catatan tampil.
