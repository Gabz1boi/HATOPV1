# HATOP MVP — Hub Antar Toko & Ojek Pickup

MVP web responsif untuk menghubungkan petani, toko sarana pertanian, dan mitra pickup di wilayah Balige–Laguboti–Silaen, Kabupaten Toba.

## Menjalankan lokal

Persyaratan: Node.js 20 atau lebih baru.

```bash
npm run dev
```

Buka `  `.

## Build dan test

```bash
npm test
npm run build
npm run preview
```

Hasil build statis berada di folder `dist/`.

## Deploy ke Vercel

1. Ekstrak ZIP ini.
2. Push isi folder `hatop-mvp` ke repository GitHub.
3. Import repository tersebut di Vercel.
4. Pilih Framework Preset **Other**.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Install Command dapat dibiarkan kosong; project tidak memiliki dependency npm runtime.
8. Klik Deploy.

`vercel.json` sudah disertakan. Deploy melalui CLI juga dapat dilakukan dengan `npx vercel` dari folder project.

## Akun demo

Pilih menu Masuk dan gunakan role demo. Tidak ada password karena ini hanya simulasi:
- Petani: Budi Santoso
- Mitra Toko: Toko Tani Sejahtera (akun demo, bukan mitra terverifikasi)
- Mitra Pickup: Andi Simanjuntak (akun demo)
- Administrator: Admin HATOP

Data tersimpan pada `localStorage` browser dengan key `hatop_demo_v1`. Untuk mengulang demo, hapus key tersebut dari penyimpanan situs browser.

## Fitur MVP

- Landing page, katalog, pencarian, kategori, detail produk.
- Keranjang dan checkout.
- Pilihan Reguler/Express, pooling, jadwal, dan simulasi DP/COD.
- Daftar pesanan, tracking status, pemeriksaan barang, dan ulasan.
- Dashboard petani, toko, pickup, dan admin.
- Farming Package, Member Tani Setia, referral, profil, dan pusat bantuan.
- PWA manifest dan service worker.

## Status katalog dan sumber data

Katalog demo memisahkan tiga status:
- **Harga referensi nasional**: data listing marketplace/toko online nasional; bukan harga Balige.
- **Estimasi demo**: angka simulasi UI/checkout, bukan penawaran toko.
- **Hubungi toko untuk harga**: belum ada harga lokal terverifikasi; produk tidak dapat langsung di-checkout.

Seluruh penjual dan stok lokal ditandai **belum terverifikasi di Balige**. Foto produk adalah ilustrasi kategori. Lihat `CATALOG_SOURCES.md` untuk URL dan batasan sumber, serta `RESEARCH_NOTES.md` untuk keputusan riset dan struktur data.

## Batasan sebelum produksi

Ini adalah front-end MVP/demo, bukan marketplace produksi. Data hanya tersimpan di browser lokal dan tidak tersinkron antar pengguna/perangkat. Login role bukan autentikasi. Pembayaran QRIS/transfer, upload bukti, tracking, dan jadwal adalah simulasi. Jangan menerima transaksi atau mengumpulkan data pribadi pelanggan nyata pada versi ini.

Sebelum produksi, implementasikan backend/database, autentikasi dan otorisasi berbasis peran, RLS, penyimpanan bukti transaksi privat, validasi harga di server, payment gateway resmi, audit log, kebijakan privasi, dan SOP operasional. Jangan pernah menaruh Supabase `service_role` key di kode browser.

## Struktur data

Data katalog statis berada di `src/data.mjs` dan dirancang agar mudah dipindahkan ke database. `supabase/schema.sql` merupakan rancangan awal skema backend yang disertakan dari MVP sumber.
