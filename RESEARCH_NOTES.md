# Catatan Riset dan Keputusan Implementasi HATOP

## Dasar produk
HATOP (Hub Antar Toko & Ojek Pickup) adalah MVP marketplace dan logistik bersama untuk petani, toko sarana pertanian, mitra pickup, dan admin di koridor Balige–Laguboti–Silaen, Kabupaten Toba. MVP mempertahankan alur inti dari source yang diberikan: katalog, pencarian/filter, keranjang, checkout, pooling, DP/COD simulatif, tracking, Farming Package, membership, referral, dan dashboard per peran.

## Keputusan katalog
- Kategori diperluas menjadi Benih & Bibit, Pupuk & Pembenah Tanah, Pengendalian Hama, Alat Pertanian, Irigasi, Pakan & Ternak, dan Farming Package.
- Katalog adalah data statis demo di `src/data.mjs`; tidak memerlukan database atau API key.
- Harga `reference-national` adalah listing nasional dan bukan harga Balige.
- Harga `demo-estimate` hanya untuk simulasi antarmuka/checkout, bukan penawaran komersial.
- Harga `contact-local` belum tersedia; produk tidak dapat langsung dimasukkan ke keranjang.
- Semua penjual dan stok lokal berstatus belum diverifikasi di Balige. Nama toko demo pada akun/riwayat lama bukan bukti mitra aktif.
- Gambar produk bersifat ilustrasi kategori, bukan foto SKU sebenarnya.

## Batasan teknis yang harus diketahui
- Data transaksi dan akun demo tersimpan di `localStorage` browser masing-masing.
- Login hanya pemilihan peran demo, belum ada autentikasi server.
- QRIS/transfer, upload bukti, GPS, dan notifikasi merupakan simulasi.
- Jangan gunakan untuk menerima pembayaran atau menyimpan data pelanggan nyata sebelum autentikasi, backend, RLS, penyimpanan privat, payment gateway, dan SOP keamanan diimplementasikan.

## Arsitektur migrasi database
Field produk yang disiapkan: `id`, `name`, `category`, `brand`, `store`, `price`, `unit`, `weight`, `image`, `description`, `priceStatus`, `priceSource`, `priceNote`, `sellerStatus`. Struktur ini dapat dipindahkan ke tabel `products` dan `stores` pada tahap integrasi backend. Tambahkan `price_updated_at`, `stock_updated_at`, `verified_at`, dan `verification_evidence` untuk produksi.
