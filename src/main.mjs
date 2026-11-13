import { categories, products, demoUsers, initialOrders } from './data.mjs';
import { calculateCheckout, transitionOrder, getOrderTimeline, formatRupiah } from './domain.mjs';

const STORAGE_KEY = 'hatop_demo_v1';
const DEFAULT_STATE = {
  cart: [],
  orders: initialOrders,
  role: null,
  user: null,
  search: '',
  category: 'all',
  adminTab: 'overview',
  checkout: { deliveryType: 'regular', pooled: true, dpPercent: 50, address: 'Desa Silaen, Kecamatan Silaen, Kabupaten Toba', schedule: 'Selasa, 17 November 2026', paymentMethod: 'Transfer Bank', notes: '' },
  config: { pickupCost: 400000, serviceFee: 20000, expressFee: 25000, dpPercent: 50 },
  pendingProof: '',
  extraProducts: [],
  productOverrides: {},
  partners: [
    { name: 'Toko Tani Sejahtera', type: 'Toko Pertanian', location: 'Balige', status: 'Perlu verifikasi' },
    { name: 'Agro Makmur Balige', type: 'Toko Pertanian', location: 'Balige', status: 'Perlu verifikasi' },
    { name: 'Sahabat Tani Laguboti', type: 'Toko Pertanian', location: 'Laguboti', status: 'Perlu verifikasi' },
    { name: 'Andi Simanjuntak', type: 'Pickup L300', location: 'Silaen', status: 'Perlu verifikasi' }
  ],
  driverAvailable: true,
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return { ...structuredClone(DEFAULT_STATE), ...saved, checkout: { ...DEFAULT_STATE.checkout, ...(saved.checkout || {}) }, config: { ...DEFAULT_STATE.config, ...(saved.config || {}) } };
  } catch (error) {
    console.warn('HATOP demo state reset:', error);
  }
  return structuredClone(DEFAULT_STATE);
}
let state = loadState();
for (const product of state.extraProducts || []) { if (!products.some((item) => item.id === product.id)) products.push(product); }
for (const [id, changes] of Object.entries(state.productOverrides || {})) { const product = products.find((item) => item.id === id); if (product) Object.assign(product, changes); }
let toastTimer;
let lastRenderedHash = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function icon(name, size = 20) {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    cart: '<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    leaf: '<path d="M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 11-6 9-16Z"/><path d="M4 21c3-5 7-8 12-11"/>',
    truck: '<path d="M3 6h11v12H3zM14 10h4l3 3v5h-7z"/><circle cx="7.5" cy="19" r="1.8"/><circle cx="17.5" cy="19" r="1.8"/>',
    package: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    filter: '<path d="M4 6h16M7 12h10m-7 6h4"/>',
    wallet: '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 9h20m-5 4h2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1 1.1-2 1.4-2 3M12 17h.01"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.9L6.1 12l1.4-2.4 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9Z"/>',
    chart: '<path d="M3 3v18h18M8 15l4-4 3 3 6-7"/>',
    store: '<path d="M3 10v10h18V10M2 4h20l-2 6H4L2 4Z"/><path d="M8 20v-6h8v6"/>',
    box: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3m9-9h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
    menuDots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    zap: '<path d="m13 2-3 8h7l-6 12 1-9H5l8-11Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    'message-circle': '<path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 21l2.1-5.3A8.5 8.5 0 1 1 21 11.5Z"/>',
    sprout: '<path d="M12 22v-9m0 0c-5 0-8-3-8-8 5 0 8 3 8 8Zm0-3c0-5 3-8 8-8 0 5-3 8-8 8Z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.package}</svg>`;
}

function money(value) { return formatRupiah(Number(value || 0)); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function currentRoute() { return (location.hash.replace(/^#/, '') || '/').split('?')[0]; }
function navigate(path) { location.hash = path; }
function showToast(message, type = 'success') {
  const root = document.getElementById('toast-root');
  root.innerHTML = `<div class="toast ${type}">${icon(type === 'error' ? 'close' : 'check', 17)}<span>${escapeHtml(message)}</span></div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, 3200);
}
function cartCount() { return state.cart.reduce((sum, item) => sum + item.qty, 0); }
function cartSubtotal() { return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0); }
function getProduct(id) { return products.find((product) => product.id === id); }
function getOrder(id) { return state.orders.find((order) => order.id === id); }
function roleHome(role = state.role) { return ({ farmer: '/farmer', store: '/store', driver: '/driver', admin: '/admin' })[role] || '/'; }
function statusLabel(status) {
  return ({ waiting_payment: 'Menunggu DP', waiting_stock: 'Konfirmasi stok', pooling: 'Dalam pooling', assigned: 'Pickup ditugaskan', in_transit: 'Dalam perjalanan', inspection: 'Pemeriksaan barang', cod_due: 'Menunggu COD', completed: 'Selesai', needs_attention: 'Perlu tindak lanjut', cancelled: 'Dibatalkan' })[status] || status;
}
function statusClass(status) {
  if (['completed'].includes(status)) return 'success';
  if (['in_transit', 'assigned', 'pooling'].includes(status)) return 'info';
  if (['waiting_payment', 'waiting_stock', 'inspection', 'cod_due'].includes(status)) return 'warning';
  if (['needs_attention', 'cancelled'].includes(status)) return 'danger';
  return 'neutral';
}
function statusBadge(status) { return `<span class="status-badge ${statusClass(status)}"><i></i>${statusLabel(status)}</span>`; }
function avatar(name, initials) { return `<span class="avatar">${escapeHtml(initials || (name || 'H').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase())}</span>`; }
function productImage(product, className = '') { return `<div class="product-image ${className}"><img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')"><span class="fallback-leaf">${icon('leaf', 32)}</span>${product.badge ? `<span class="image-badge">${escapeHtml(product.badge)}</span>` : ''}</div>`; }
function productPrice(product) {
  if (product.priceStatus === 'contact-local' || product.price == null) return `<span class="contact-price">Hubungi toko untuk harga</span><small>Harga lokal belum terverifikasi</small>`;
  const status = product.priceStatus === 'reference-national' ? 'Harga referensi nasional' : 'Estimasi demo · bukan penawaran';
  return `${money(product.price)}<small>${status}</small>`;
}
function productCard(product) {
  const canOrder = product.price != null && product.priceStatus !== 'contact-local';
  return `<article class="product-card">
    <a href="#/product/${product.id}" class="product-card-link">${productImage(product)}
      <div class="product-info"><div class="product-store">${icon('store', 13)} ${escapeHtml(product.store)}</div><h3>${escapeHtml(product.name)}</h3><div class="product-price">${productPrice(product)}</div><div class="product-meta"><span>${escapeHtml(product.categoryLabel || categories.find((c) => c.id === product.category)?.name || 'Produk pertanian')}</span><span>${escapeHtml(product.unit)}</span></div><div class="product-stock">${escapeHtml(product.sellerStatus || 'Penjual belum diverifikasi di Balige')}</div></div>
    </a><button class="add-mini" data-action="add-cart" data-id="${product.id}" aria-label="Tambah ${escapeHtml(product.name)} ke keranjang" ${canOrder ? '' : 'disabled title="Harga perlu dikonfirmasi"'}>${icon('plus', 17)}</button>
  </article>`;
}
function header() {
  const roleName = state.role ? demoUsers[state.role].role : '';
  return `<div class="top-strip"><div class="container top-strip-inner"><span>${icon('pin', 14)} Area layanan: Balige · Laguboti · Silaen</span><span>Pengiriman Reguler setiap Selasa & Jumat <b>•</b> Bantuan WhatsApp</span></div></div>
  <header class="site-header"><div class="container header-main">
    <a class="brand" href="#/"><img class="brand-logo" src="/hatop-logo.jpeg" alt="Logo HATOP"><span class="brand-copy"><b>HATOP</b><small>Hub Antar Toko & Ojek Pickup</small></span></a>
    <form class="search-bar" data-form="search"><input name="q" type="search" placeholder="Cari benih, pupuk, pakan ternak..." value="${escapeHtml(state.search)}"><button aria-label="Cari">${icon('search', 19)}</button></form>
    <div class="header-actions"><a href="#/cart" class="header-icon cart-link" aria-label="Keranjang">${icon('cart', 22)}<span class="cart-count">${cartCount()}</span></a><a href="#/orders" class="header-text-link">Pesanan</a>${state.role ? `<a href="${roleHome()}" class="account-pill">${avatar(state.user?.name, state.user?.initials)}<span><b>${escapeHtml(state.user?.name || 'Akun')}</b><small>${escapeHtml(roleName)}</small></span></a><button class="icon-button" data-action="logout" title="Keluar">${icon('logout', 19)}</button>` : `<a href="#/login" class="btn btn-outline btn-sm">Masuk</a><a href="#/register" class="btn btn-primary btn-sm">Daftar</a>`}</div>
  </div><nav class="main-nav"><div class="container nav-inner"><a href="#/catalog" class="nav-categories">${icon('menu', 17)} Semua Kategori</a><a href="#/catalog?category=benih">Benih</a><a href="#/catalog?category=pupuk">Pupuk</a><a href="#/catalog?category=perlindungan">Pengendalian Hama</a><a href="#/catalog?category=alat">Alat</a><a href="#/catalog?category=irigasi">Irigasi</a><a href="#/catalog?category=pakan">Pakan Ternak</a><a href="#/farming-package">Farming Package</a><a href="#/cara-kerja">Cara Kerja</a><span class="nav-spacer"></span><span class="nav-trust">${icon('info', 15)} Katalog transparan</span></div></nav></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="container footer-grid"><div><a class="brand footer-brand" href="#/"><img class="brand-logo" src="/hatop-logo.jpeg" alt="Logo HATOP"><span class="brand-copy"><b>HATOP</b><small>Hub Antar Toko & Ojek Pickup</small></span></a><p>Menghubungkan kebutuhan pertanian, toko lokal, dan mitra pickup untuk distribusi yang lebih terjangkau di Kabupaten Toba.</p></div><div><h4>Jelajahi</h4><a href="#/catalog">Katalog Produk</a><a href="#/farming-package">Farming Package</a><a href="#/cara-kerja">Cara Kerja</a></div><div><h4>Layanan</h4><a href="#/help">Pusat Bantuan</a><a href="#/orders">Pesanan Saya</a><a href="#/login">Gabung Mitra</a></div><div><h4>Wilayah Operasional</h4><p>Balige · Laguboti · Silaen<br>Kabupaten Toba, Sumatera Utara</p><span class="footer-note">Prototype MVP · Data demonstrasi</span></div></div><div class="container footer-bottom"><span>© 2026 HATOP. Prototype MVP.</span><span>Data dan transaksi pada versi ini merupakan simulasi lokal.</span></div></footer>`;
}
function shell(content, options = {}) {
  return `${header()}${content}${options.noFooter ? '' : footer()}`;
}
function pageHeading(eyebrow, title, subtitle, action = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
function homePage() {
  const featured = products.slice(0, 4);
  return shell(`<main>
    <section class="hero-section"><div class="container hero-grid"><div class="hero-copy"><span class="hero-kicker">${icon('leaf', 15)} Solusi distribusi sarana pertanian</span><h1>Kebutuhan tani sampai desa, <em>ongkir lebih bersahabat.</em></h1><p>Pesan kebutuhan pertanian dari toko mitra, gabungkan pesanan dengan petani lain, dan nikmati pengiriman pickup terjadwal langsung ke wilayah Anda.</p><div class="hero-actions"><a class="btn btn-primary btn-lg" href="#/catalog">Mulai Belanja ${icon('arrow', 18)}</a><a class="btn btn-light btn-lg" href="#/cara-kerja">Pelajari cara kerja</a></div><div class="hero-trust"><span>${icon('shield', 16)} Penjual dikonfirmasi sebelum order</span><span>${icon('calendar', 16)} Jadwal tetap</span><span>${icon('wallet', 16)} Ongkir transparan</span></div></div><div class="hero-visual"><div class="hero-image-main"><img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=90" alt="Hamparan lahan pertanian"/><div class="hero-image-overlay"></div><div class="floating-delivery"><span class="float-icon">${icon('truck', 22)}</span><span><b>Pengiriman terjadwal</b><small>Balige → Silaen</small></span><span class="live-dot"></span></div><div class="floating-savings"><small>Simulasi hemat ongkir</small><b>45%</b><span>dengan pooling order</span></div></div><div class="hero-leaf leaf-one">${icon('leaf', 48)}</div><div class="hero-leaf leaf-two">${icon('leaf', 32)}</div></div></div></section>
    <section class="container quick-benefits"><div class="benefit"><span class="benefit-icon green">${icon('truck', 22)}</span><div><b>Pickup terjadwal</b><small>Selasa & Jumat</small></div></div><div class="benefit"><span class="benefit-icon gold">${icon('wallet', 22)}</span><div><b>Ongkir dibagi</b><small>Lebih ringan lewat pooling</small></div></div><div class="benefit"><span class="benefit-icon blue">${icon('shield', 22)}</span><div><b>Data transparan</b><small>Harga dan stok diberi status</small></div></div><div class="benefit"><span class="benefit-icon peach">${icon('package', 22)}</span><div><b>Cek sebelum lunas</b><small>Pelunasan setelah cek visual</small></div></div></section>
    <section class="container section-block"><div class="section-head"><div><span class="eyebrow">Belanja lebih mudah</span><h2>Temukan kebutuhan pertanian</h2><p>Pilih kategori kebutuhan tani; status harga dan penjual ditampilkan pada tiap produk.</p></div><a href="#/catalog" class="text-link">Lihat semua produk ${icon('arrow', 16)}</a></div><div class="category-grid">${categories.map((cat) => `<a href="#/catalog?category=${cat.id}" class="category-tile"><span class="category-icon ${cat.color}">${icon(cat.icon, 25)}</span><b>${cat.name}</b><small>Jelajahi produk</small></a>`).join('')}</div></section>
    <section class="pooling-promo"><div class="container pooling-inner"><div class="pooling-art"><div class="pooling-road"></div><div class="pooling-truck">${icon('truck', 64)}</div><div class="pooling-pin pin-a">${icon('pin', 18)}</div><div class="pooling-pin pin-b">${icon('pin', 18)}</div></div><div class="pooling-copy"><span class="eyebrow light">Keunggulan HATOP</span><h2>Pesanan searah, ongkir jadi lebih ringan.</h2><p>Pesanan dari beberapa petani dengan tujuan yang sama digabung dalam satu perjalanan pickup. Biaya transportasi dibagi secara transparan.</p><div class="pooling-math"><div><small>Pickup mandiri</small><b>${money(400000)}</b></div><span class="math-arrow">→</span><div><small>2 pesanan pooling</small><b>${money(200000)} <small>/ pesanan</small></b></div><span class="saving-tag">Hemat 50% ongkir</span></div><small class="assumption-note">Ilustrasi menggunakan asumsi sewa pickup Rp400.000/trip dan 2 pesanan. Belum termasuk biaya layanan.</small><a href="#/cara-kerja" class="btn btn-white">Lihat cara pooling ${icon('arrow', 17)}</a></div></div></section>
    <section class="container section-block"><div class="section-head"><div><span class="eyebrow">Katalog pilihan</span><h2>Produk pilihan untuk kebutuhan tani</h2><p>Produk referensi dan estimasi untuk koridor Balige–Laguboti.</p></div><a href="#/catalog" class="text-link">Jelajahi katalog ${icon('arrow', 16)}</a></div><div class="product-grid">${featured.map(productCard).join('')}</div></section>
    <section class="container section-block services-section"><div class="section-head"><div><span class="eyebrow">Pilih layanan</span><h2>Pengiriman sesuai kebutuhan</h2><p>Atur kebutuhan berdasarkan jadwal dan urgensi.</p></div></div><div class="service-grid"><article class="service-card"><span class="service-icon green">${icon('calendar', 26)}</span><span class="service-tag">Paling hemat</span><h3>Pengiriman Reguler</h3><p>Pengiriman terjadwal setiap Selasa dan Jumat dengan penggabungan pesanan.</p><div class="service-detail">${icon('clock', 16)} Jadwal tetap · Pooling order</div><a href="#/catalog" class="text-link">Pilih Reguler ${icon('arrow', 15)}</a></article><article class="service-card"><span class="service-icon gold">${icon('zap', 26)}</span><span class="service-tag express">Lebih cepat</span><h3>Pengiriman Express</h3><p>Untuk kebutuhan mendesak dengan biaya tambahan yang ditampilkan sebelum checkout.</p><div class="service-detail">${icon('wallet', 16)} Tambahan Rp25.000</div><a href="#/catalog" class="text-link">Pilih Express ${icon('arrow', 15)}</a></article><article class="service-card"><span class="service-icon blue">${icon('package', 26)}</span><span class="service-tag package-tag">Paket kebutuhan</span><h3>Farming Package</h3><p>Paket sarana tanam yang dapat disesuaikan dengan komoditas dan musim.</p><div class="service-detail">${icon('leaf', 16)} Paket siap tanam jagung</div><a href="#/farming-package" class="text-link">Lihat paket ${icon('arrow', 15)}</a></article></div></section>
    <section class="container how-section" id="cara-kerja"><div class="section-head center"><div><span class="eyebrow">Mudah dalam 5 langkah</span><h2>Bagaimana HATOP bekerja?</h2><p>Dari memilih kebutuhan sampai barang tiba di desa.</p></div></div><div class="steps-grid">${[['01','Pilih kebutuhan','Temukan produk pada katalog HATOP.'],['02','Buat pesanan','Tentukan alamat dan layanan.'],['03','Gabung pooling','Pesanan searah berbagi ongkir.'],['04','Pickup mengantar','Mitra mengambil dan mengirim barang.'],['05','Cek lalu lunasi','Periksa barang sebelum pelunasan COD.']].map((step, i) => `<div class="step-card"><span class="step-number">${step[0]}</span><div class="step-connector">${i < 4 ? '················' : ''}</div><h3>${step[1]}</h3><p>${step[2]}</p></div>`).join('')}</div></section>
    <section class="container cta-banner"><div><span class="eyebrow light">Mulai dari kebutuhan hari ini</span><h2>Belanja sarana tani tanpa repot mengatur pickup sendiri.</h2><p>Jelajahi produk dan lihat jadwal pengiriman yang tersedia.</p></div><a class="btn btn-white btn-lg" href="#/catalog">Mulai pesan ${icon('arrow', 18)}</a></section>
  </main>${footer()}`);
}

function catalogPage() {
  const list = products.filter((product) => (state.category === 'all' || product.category === state.category) && `${product.name} ${product.store} ${product.brand || ''}`.toLowerCase().includes(state.search.toLowerCase()));
  return shell(`<main class="container content-page">${pageHeading('KATALOG HATOP', 'Temukan kebutuhan pertanian', 'Jelajahi katalog kebutuhan tani. Harga, stok, dan penjual lokal akan dikonfirmasi sebelum transaksi.', `<a href="#/cart" class="btn btn-primary">${icon('cart', 17)} Keranjang (${cartCount()})</a>`)}<div class="catalog-layout"><aside class="filter-panel"><div class="filter-title">${icon('filter', 18)} <b>Filter produk</b></div><div class="filter-group"><h4>Kategori</h4><button class="filter-option ${state.category === 'all' ? 'active' : ''}" data-action="category" data-category="all">Semua produk <span>${products.length}</span></button>${categories.map((cat) => `<button class="filter-option ${state.category === cat.id ? 'active' : ''}" data-action="category" data-category="${cat.id}">${cat.name}<span>${products.filter((p) => p.category === cat.id).length}</span></button>`).join('')}</div><div class="filter-group"><h4>Status data</h4><p class="catalog-trust-note">Katalog ini menggabungkan referensi nasional dan estimasi demo. Penjual, stok, serta harga Balige belum dianggap terverifikasi.</p></div><div class="filter-help"><b>Butuh bantuan?</b><p>Admin HATOP siap membantu pemesanan melalui WhatsApp.</p><a href="#/help" class="text-link">Pusat bantuan ${icon('arrow', 14)}</a></div></aside><section class="catalog-results"><div class="catalog-toolbar"><div><b>${list.length} produk</b><span> · Area layanan Kabupaten Toba</span></div><select id="sort-products" class="select-control"><option value="popular">Urutkan: Terpopuler</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select></div><div class="product-grid">${list.length ? list.map(productCard).join('') : `<div class="empty-state span-all">${icon('search', 32)}<h3>Produk belum ditemukan</h3><p>Coba kata kunci atau kategori lainnya.</p><button class="btn btn-outline" data-action="reset-filter">Reset filter</button></div>`}</div></section></div></main>${footer()}`);
}

function productPage(id) {
  const product = getProduct(id);
  if (!product) return shell(`<main class="container content-page">${emptyState('Produk tidak ditemukan', 'Produk mungkin sudah tidak tersedia.', '/catalog', 'Kembali ke katalog')}</main>${footer()}`);
  return shell(`<main class="container content-page"><div class="breadcrumbs"><a href="#/">Beranda</a> / <a href="#/catalog">Katalog</a> / <span>${escapeHtml(product.name)}</span></div><div class="product-detail-layout"><div class="product-detail-image">${productImage(product, 'detail-image')}</div><div class="product-detail-copy"><span class="eyebrow">DETAIL KATALOG HATOP</span><h1>${escapeHtml(product.name)}</h1><div class="detail-rating"><span>${escapeHtml(product.brand || 'Merek mengikuti toko')}</span> · <span>${escapeHtml(product.store)}</span> <span class="verified-mini">${icon('info', 13)} Perlu konfirmasi</span></div><div class="detail-price">${productPrice(product)} <small>/ ${escapeHtml(product.unit)}</small></div><div class="catalog-source-note">${escapeHtml(product.priceNote || 'Harga perlu dikonfirmasi.')} ${product.priceSource ? `<a href="${escapeHtml(product.priceSource)}" target="_blank" rel="noopener noreferrer">Lihat sumber</a>` : ''}</div><p class="detail-description">${escapeHtml(product.description)}</p><div class="detail-specs"><div><small>Status penjual</small><b>${escapeHtml(product.sellerStatus || 'Belum terverifikasi')}</b></div><div><small>Berat per unit</small><b>${product.weight} kg</b></div><div><small>Sumber data</small><b>${product.priceStatus === 'reference-national' ? 'Referensi nasional' : product.priceStatus === 'demo-estimate' ? 'Estimasi demo' : 'Belum tersedia'}</b></div></div><div class="qty-select"><span>Jumlah</span><div class="qty-control"><button data-action="detail-qty" data-delta="-1">−</button><b id="detail-qty">1</b><button data-action="detail-qty" data-delta="1">+</button></div><span class="muted">Stok perlu dikonfirmasi ke penjual</span></div><div class="detail-actions">${product.price == null || product.priceStatus === 'contact-local' ? `<a class="btn btn-outline btn-lg" href="#/help">${icon('message-circle',18)} Konfirmasi ke HATOP</a>` : `<button class="btn btn-outline btn-lg" data-action="add-cart" data-id="${product.id}">${icon('cart', 18)} Tambah ke Keranjang</button><button class="btn btn-primary btn-lg" data-action="buy-now" data-id="${product.id}">Beli Sekarang ${icon('arrow', 17)}</button>`}</div><div class="detail-assurance"><span>${icon('info', 17)} Verifikasi penjual</span><span>${icon('truck', 17)} Pengiriman terjadwal</span><span>${icon('check', 17)} Cek sebelum lunas</span></div></div></div><section class="section-block"><div class="section-head"><div><span class="eyebrow">MUNGKIN ANDA BUTUHKAN</span><h2>Produk lainnya</h2></div></div><div class="product-grid">${products.filter((p) => p.id !== product.id).slice(0, 4).map(productCard).join('')}</div></section></main>${footer()}`);
}

function emptyState(title, description, href = '/', cta = 'Kembali') {
  return `<div class="empty-state">${icon('package', 34)}<h3>${title}</h3><p>${description}</p><a class="btn btn-primary" href="#${href}">${cta}</a></div>`;
}
function cartPage() {
  if (!state.cart.length) return shell(`<main class="container content-page">${pageHeading('KERANJANG', 'Keranjang belanja', 'Produk yang Anda pilih akan tersimpan di sini.')}<div class="cart-empty">${emptyState('Keranjang masih kosong', 'Yuk, temukan kebutuhan pertanian dari katalog HATOP.', '/catalog', 'Jelajahi produk')}</div></main>${footer()}`);
  return shell(`<main class="container content-page">${pageHeading('KERANJANG', 'Keranjang belanja', `${cartCount()} item dari katalog HATOP.`)}<div class="cart-layout"><section class="cart-list"><div class="cart-list-head"><span>Produk</span><span>Harga</span><span>Jumlah</span><span>Subtotal</span></div>${state.cart.map((item) => { const product = getProduct(item.id); return `<div class="cart-row"><div class="cart-product">${productImage(product, 'cart-thumb')}<div><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.store)} · ${product.weight} kg/unit</small><button class="remove-link" data-action="remove-cart" data-id="${item.id}">Hapus</button></div></div><div class="cart-price">${money(item.price)}</div><div class="qty-control"><button data-action="cart-qty" data-id="${item.id}" data-delta="-1">−</button><b>${item.qty}</b><button data-action="cart-qty" data-id="${item.id}" data-delta="1">+</button></div><div class="cart-line-total">${money(item.price * item.qty)}</div></div>`; }).join('')}<div class="cart-footer-actions"><a class="text-link" href="#/catalog">${icon('arrow', 15)} Lanjut belanja</a><button class="text-link danger-link" data-action="clear-cart">Kosongkan keranjang</button></div></section><aside class="summary-card"><h3>Ringkasan belanja</h3><div class="summary-line"><span>Total produk (${cartCount()} item)</span><b>${money(cartSubtotal())}</b></div><div class="summary-line"><span>Ongkir</span><span class="muted">Dihitung saat checkout</span></div><div class="summary-line"><span>Biaya layanan</span><span class="muted">Rp20.000</span></div><div class="summary-divider"></div><div class="summary-total"><span>Subtotal produk</span><b>${money(cartSubtotal())}</b></div><button class="btn btn-primary btn-block btn-lg" data-link="/checkout">Lanjut ke Checkout ${icon('arrow', 17)}</button><div class="summary-trust">${icon('shield', 15)} Pembayaran DP ongkir, pelunasan setelah cek barang.</div></aside></div></main>${footer()}`);
}

function checkoutPage() {
  if (!state.cart.length) return shell(`<main class="container content-page">${emptyState('Belum ada produk untuk checkout', 'Tambahkan produk ke keranjang terlebih dahulu.', '/catalog', 'Pilih produk')}</main>${footer()}`);
  const calc = calculateCheckout({ subtotal: cartSubtotal(), deliveryType: state.checkout.deliveryType, pooled: state.checkout.pooled, participants: 2, pickupCost: state.config.pickupCost, serviceFee: state.config.serviceFee, expressFee: state.config.expressFee, dpPercent: state.checkout.dpPercent });
  return shell(`<main class="container content-page">${pageHeading('CHECKOUT', 'Konfirmasi pesanan', 'Periksa produk, alamat, jadwal, dan rincian pembayaran sebelum membuat pesanan.')}<div class="checkout-steps"><span class="done">1 <b>Keranjang</b></span><i></i><span class="active">2 <b>Checkout</b></span><i></i><span>3 <b>Pembayaran</b></span></div><div class="checkout-layout"><div class="checkout-main"><section class="checkout-card"><div class="checkout-card-title"><span class="checkout-step-icon">${icon('pin', 18)}</span><div><h3>Alamat pengiriman</h3><p>Pastikan alamat tujuan sudah benar.</p></div><button class="text-link" data-action="edit-address">Ubah</button></div><div class="address-box"><b>${escapeHtml(state.user?.name || 'Budi Santoso')}</b><span>${escapeHtml(state.checkout.address)}</span><small>Nomor kontak: 08xx-xxxx-xxxx (data demo)</small></div></section><section class="checkout-card"><div class="checkout-card-title"><span class="checkout-step-icon">${icon('package', 18)}</span><div><h3>Produk yang dipesan</h3><p>${cartCount()} item dari katalog demo.</p></div></div>${state.cart.map((item) => { const p = getProduct(item.id); return `<div class="checkout-product-row">${productImage(p, 'checkout-thumb')}<div><b>${escapeHtml(p.name)}</b><small>${p.qty} × ${money(p.price)} · ${p.weight * p.qty} kg</small></div><strong>${money(p.price * p.qty)}</strong></div>`; }).join('')}</section><section class="checkout-card"><div class="checkout-card-title"><span class="checkout-step-icon">${icon('truck', 18)}</span><div><h3>Pilih layanan pengiriman</h3><p>Pilih layanan sesuai kebutuhan Anda.</p></div></div><div class="delivery-options"><label class="delivery-option ${state.checkout.deliveryType === 'regular' ? 'selected' : ''}"><input type="radio" name="deliveryType" value="regular" ${state.checkout.deliveryType === 'regular' ? 'checked' : ''}><span class="radio-custom"></span><span class="delivery-option-icon">${icon('calendar', 22)}</span><span class="delivery-option-copy"><b>Pengiriman Reguler</b><small>Selasa & Jumat · Bisa gabung pooling</small></span><span class="delivery-option-price">${money(200000)}<small>/pesanan*</small></span></label><label class="delivery-option ${state.checkout.deliveryType === 'express' ? 'selected' : ''}"><input type="radio" name="deliveryType" value="express" ${state.checkout.deliveryType === 'express' ? 'checked' : ''}><span class="radio-custom"></span><span class="delivery-option-icon express-icon">${icon('clock', 22)}</span><span class="delivery-option-copy"><b>Pengiriman Express</b><small>Untuk kebutuhan mendesak · Tidak pooling</small></span><span class="delivery-option-price">+${money(state.config.expressFee)}<small> biaya express</small></span></label></div><div class="pooling-toggle ${state.checkout.deliveryType === 'express' ? 'disabled' : ''}"><div><b>${icon('users', 17)} Gabung Pooling Order</b><small>Berbagi ongkir dengan satu pesanan lain yang searah.</small></div><label class="switch"><input type="checkbox" name="pooled" ${state.checkout.pooled && state.checkout.deliveryType === 'regular' ? 'checked' : ''} ${state.checkout.deliveryType === 'express' ? 'disabled' : ''}><span></span></label></div><div class="schedule-select"><label for="schedule">Jadwal pengiriman</label><select id="schedule" name="schedule" class="select-control"><option ${state.checkout.schedule.includes('17 November') ? 'selected' : ''}>Selasa, 17 November 2026</option><option>Jumat, 20 November 2026</option><option>Selasa, 24 November 2026</option><option>Jumat, 27 November 2026</option></select><small>Jadwal merupakan data simulasi untuk prototype.</small></div></section><section class="checkout-card"><div class="checkout-card-title"><span class="checkout-step-icon">${icon('wallet', 18)}</span><div><h3>Metode pembayaran</h3><p>DP ongkir dibayarkan di awal, pelunasan setelah pemeriksaan barang.</p></div></div><div class="payment-methods"><label class="payment-method ${state.checkout.paymentMethod === 'Transfer Bank' ? 'selected' : ''}"><input type="radio" name="paymentMethod" value="Transfer Bank" ${state.checkout.paymentMethod === 'Transfer Bank' ? 'checked' : ''}><span class="radio-custom"></span><span class="payment-logo bank-logo">BANK</span><span><b>Transfer Bank</b><small>Upload bukti transfer untuk diverifikasi admin.</small></span></label><label class="payment-method ${state.checkout.paymentMethod === 'QRIS' ? 'selected' : ''}"><input type="radio" name="paymentMethod" value="QRIS" ${state.checkout.paymentMethod === 'QRIS' ? 'checked' : ''}><span class="radio-custom"></span><span class="payment-logo qris-logo">QRIS</span><span><b>QRIS</b><small>Simulasi pembayaran QRIS, bukan gateway aktif.</small></span></label></div></section><section class="checkout-card"><div class="checkout-card-title"><span class="checkout-step-icon">${icon('file-text', 18)}</span><div><h3>Catatan pesanan</h3><p>Opsional, misalnya patokan lokasi pengiriman.</p></div></div><textarea class="textarea-control" name="notes" id="checkout-notes" placeholder="Tulis catatan untuk toko atau pengemudi...">${escapeHtml(state.checkout.notes)}</textarea></section></div><aside class="summary-card checkout-summary"><h3>Rincian pembayaran</h3><div class="summary-line"><span>Subtotal produk</span><b>${money(calc.subtotal)}</b></div><div class="summary-line"><span>Ongkir ${calc.pooled ? '(pooling ÷ 2)' : ''}</span><b>${money(calc.shipping)}</b></div>${calc.expressFee ? `<div class="summary-line"><span>Biaya Express</span><b>${money(calc.expressFee)}</b></div>` : ''}<div class="summary-line"><span>Biaya layanan HATOP</span><b>${money(calc.serviceFee)}</b></div><div class="summary-divider"></div><div class="summary-total"><span>Total transaksi</span><b>${money(calc.total)}</b></div><div class="dp-box"><div><small>DP ongkir (${calc.dpPercent}%) dibayar sekarang</small><b>${money(calc.dpAmount)}</b></div><span class="dp-label">BAYAR SEKARANG</span></div><div class="cod-box"><small>Pelunasan saat barang diterima & diperiksa</small><b>${money(calc.codAmount)}</b><span>Termasuk produk, sisa ongkir, biaya layanan, dan biaya Express bila ada.</span></div><button class="btn btn-primary btn-block btn-lg" data-action="create-order">Buat Pesanan & Bayar DP ${icon('arrow', 17)}</button><div class="summary-secure">${icon('shield', 15)} Data pesanan dilindungi. Pembayaran DP perlu verifikasi admin.</div><small class="assumption-note">*Ongkir pooling Rp200.000/pesanan berdasarkan asumsi pickup Rp400.000/trip dan 2 pesanan. DP 50% adalah konfigurasi demo, dapat diubah admin. Nilai final mengikuti hasil konfirmasi operasional.</small></aside></div></main>${footer()}`);
}

function paymentPage(id) {
  const order = getOrder(id);
  if (!order) return shell(`<main class="container content-page">${emptyState('Pesanan tidak ditemukan', 'Periksa kembali nomor pesanan.', '/orders', 'Lihat pesanan')}</main>${footer()}`);
  return shell(`<main class="container content-page payment-page">${pageHeading('PEMBAYARAN', 'Selesaikan pembayaran DP', 'Ikuti instruksi berikut agar pesanan dapat diproses oleh toko mitra.')}<div class="payment-layout"><div class="payment-main"><div class="payment-order-head"><div><small>Nomor pesanan</small><b>${order.id}</b></div>${statusBadge(order.status)}</div><div class="payment-amount-card"><span>DP ongkir yang harus dibayar</span><strong>${money(order.dpAmount)}</strong><small>Batas pembayaran: 2 jam setelah pesanan dibuat (simulasi)</small></div><section class="checkout-card"><div class="checkout-card-title"><span class="checkout-step-icon">${icon('wallet', 18)}</span><div><h3>Instruksi pembayaran</h3><p>Metode: ${escapeHtml(order.paymentMethod)}</p></div></div>${order.paymentMethod === 'QRIS' ? `<div class="qris-demo"><div class="qris-placeholder"><div class="qr-pattern">${Array.from({ length: 49 }, (_, i) => `<i class="${[0,1,2,7,8,9,14,15,16,4,5,6,11,12,13,28,29,30,35,36,37,42,43,44].includes(i) ? 'dark' : ''}"></i>`).join('')}</div><b>HATOP DEMO QR</b></div><div><b>QRIS Demo</b><p>Ini hanya visual simulasi. Tidak dapat dipindai dan tidak memproses uang sungguhan.</p><small>Untuk transaksi nyata, hubungkan PJP/penyedia QRIS berizin.</small></div></div>` : `<div class="bank-instruction"><div class="bank-mark">BANK</div><div><small>Bank tujuan (simulasi)</small><b>Bank BRI · 0000 0000 0000</b><small>a.n. HATOP Demo</small></div><button class="btn btn-outline btn-sm" data-action="copy-account">Salin rekening</button></div>`}<div class="instruction-steps"><b>Langkah pembayaran</b><ol><li>Transfer sesuai nominal DP yang tertera.</li><li>Simpan bukti pembayaran.</li><li>Unggah bukti pembayaran pada form di bawah.</li><li>Admin HATOP akan memeriksa dan mengonfirmasi DP.</li></ol></div><div class="upload-proof"><label for="proof-file" class="upload-drop">${icon('upload', 25)}<b>Pilih bukti pembayaran</b><small>PNG, JPG, atau PDF · Maksimal 5 MB</small><input id="proof-file" type="file" accept="image/png,image/jpeg,application/pdf" hidden></label><div id="proof-name" class="proof-name">${order.paymentProof ? `${icon('check', 15)} Bukti tersimpan: ${escapeHtml(order.paymentProof)}` : state.pendingProof ? `${icon('check', 15)} ${escapeHtml(state.pendingProof)}` : 'Belum ada file dipilih'}</div><button class="btn btn-primary btn-block" data-action="save-proof" ${order.paymentProof ? 'disabled' : ''}>${order.paymentProof ? 'Bukti sudah diunggah' : 'Unggah Bukti Pembayaran'}</button></div></section><div class="payment-note">${icon('info', 17)} <span>Versi MVP ini menyimpan nama file bukti di browser untuk simulasi. File belum dikirim ke server atau admin sungguhan.</span></div></div><aside class="summary-card"><h3>Ringkasan transaksi</h3>${order.items.map((item) => `<div class="summary-line"><span>${escapeHtml(item.name)} × ${item.qty}</span><b>${money(item.price * item.qty)}</b></div>`).join('')}<div class="summary-divider"></div><div class="summary-line"><span>Subtotal produk</span><b>${money(order.subtotal)}</b></div><div class="summary-line"><span>Ongkir</span><b>${money(order.shipping)}</b></div><div class="summary-line"><span>Biaya layanan</span><b>${money(order.serviceFee)}</b></div><div class="summary-line"><span>DP dibayar sekarang</span><b class="text-green">${money(order.dpAmount)}</b></div><div class="summary-total"><span>Sisa COD</span><b>${money(order.codAmount)}</b></div><a href="#/orders/${order.id}" class="btn btn-outline btn-block">Lihat detail pesanan</a></aside></div></main>${footer()}`);
}

function orderTimeline(order) {
  const timeline = getOrderTimeline(order.status);
  return `<div class="timeline">${timeline.map((step) => `<div class="timeline-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''} ${step.pending ? 'pending' : ''}"><span class="timeline-dot">${step.completed ? icon('check', 13) : ''}</span><div><b>${step.label}</b>${step.current ? `<small>Status saat ini</small>` : ''}</div></div>`).join('')}</div>`;
}
function ordersPage() {
  const orders = state.orders.filter((order) => !state.role || state.role !== 'farmer' || order.farmer === state.user?.name || order.farmer === 'Budi Santoso');
  return shell(`<main class="container content-page">${pageHeading('PESANAN SAYA', 'Pantau pesanan Anda', 'Lihat status pembayaran, pooling, dan proses pengiriman.')}<div class="orders-filter"><button class="active">Semua</button><button data-action="order-filter" data-filter="active">Berlangsung</button><button data-action="order-filter" data-filter="completed">Selesai</button></div><div class="orders-list">${orders.map((order) => `<article class="order-card"><div class="order-card-head"><div><small>Nomor pesanan</small><b>${order.id}</b><small>${order.createdAt}</small></div>${statusBadge(order.status)}</div><div class="order-card-items">${order.items.slice(0, 2).map((item) => `<div>${escapeHtml(item.name)} <small>× ${item.qty}</small></div>`).join('')}${order.items.length > 2 ? `<small>+${order.items.length - 2} produk lainnya</small>` : ''}</div><div class="order-card-foot"><div><small>Total transaksi</small><b>${money(order.total)}</b></div><a class="btn btn-outline btn-sm" href="#/orders/${order.id}">Detail Pesanan ${icon('arrow', 14)}</a></div></article>`).join('') || emptyState('Belum ada pesanan', 'Pesanan yang Anda buat akan muncul di sini.', '/catalog', 'Mulai belanja')}</div></main>${footer()}`);
}
function orderDetailPage(id) {
  const order = getOrder(id);
  if (!order) return shell(`<main class="container content-page">${emptyState('Pesanan tidak ditemukan', 'Nomor pesanan tidak tersedia.', '/orders', 'Kembali')}</main>${footer()}`);
  let actionPanel = '';
  if (order.status === 'waiting_payment') actionPanel = `<div class="action-panel"><b>Menunggu pembayaran DP</b><p>Unggah bukti pembayaran agar admin dapat memverifikasi pesanan.</p><a class="btn btn-primary" href="#/payment/${order.id}">Lanjut pembayaran ${icon('arrow', 16)}</a></div>`;
  if (order.status === 'inspection') actionPanel = `<div class="action-panel"><b>Periksa barang sebelum pelunasan</b><p>Pastikan jumlah dan kondisi barang sesuai dengan pesanan Anda.</p><button class="btn btn-primary" data-action="confirm-goods" data-id="${order.id}">Barang sesuai, lanjut COD ${icon('check', 16)}</button><button class="btn btn-outline" data-action="report-issue" data-id="${order.id}">Laporkan ketidaksesuaian</button></div>`;
  if (order.status === 'cod_due') actionPanel = `<div class="action-panel cod-action"><b>Pelunasan COD</b><p>Setelah pemeriksaan visual selesai, lakukan pelunasan kepada mitra sesuai prosedur operasional.</p><div class="cod-due-amount">${money(order.codAmount)}</div><label class="cod-method-label">Metode pelunasan<select id="cod-method" class="select-control"><option>Tunai kepada mitra pickup</option><option>Transfer ke rekening resmi HATOP</option></select></label><button class="btn btn-primary" data-action="settle-cod" data-id="${order.id}">Konfirmasi pelunasan COD</button><small>Simulasi konfirmasi, tidak memproses pembayaran nyata.</small></div>`;
  if (order.status === 'completed') actionPanel = `<div class="action-panel"><b>Pesanan selesai. Terima kasih!</b><p>Bagikan pengalaman Anda untuk membantu petani lain.</p><div class="rating-stars" id="rating-stars">${[1,2,3,4,5].map((n) => `<button data-action="rate" data-rating="${n}">${icon('star', 24)}</button>`).join('')}</div><button class="btn btn-primary" data-action="submit-review" data-id="${order.id}">Kirim ulasan</button></div>`;
  if (order.status === 'needs_attention') actionPanel = `<div class="action-panel warning-panel"><b>Pesanan memerlukan tindak lanjut</b><p>${escapeHtml(order.notes || 'Admin HATOP akan meninjau laporan Anda.')}</p><a href="#/help" class="btn btn-outline">Hubungi bantuan</a></div>`;
  return shell(`<main class="container content-page">${pageHeading('DETAIL PESANAN', order.id, `Dibuat ${order.createdAt}`, `<a href="#/orders" class="btn btn-outline">Kembali ke pesanan</a>`)}<div class="order-detail-grid"><div class="order-detail-main"><section class="checkout-card"><div class="checkout-card-title"><div><h3>Status pengiriman</h3><p>Jadwal: ${escapeHtml(order.schedule)}</p></div>${statusBadge(order.status)}</div>${orderTimeline(order)}${order.status === 'in_transit' ? `<div class="route-demo"><div class="route-line"><span class="route-pin">${icon('store', 15)}</span><div><b>Pickup: ${escapeHtml(order.store)}</b><small>Balige / Laguboti</small></div></div><div class="route-line"><span class="route-pin destination">${icon('pin', 15)}</span><div><b>Tujuan: ${escapeHtml(order.destination)}</b><small>Area pengiriman</small></div></div><div class="map-placeholder"><div class="map-road road-a"></div><div class="map-road road-b"></div><span class="map-label">PETA DEMO · BUKAN GPS LIVE</span></div></div>` : ''}</section><section class="checkout-card"><div class="checkout-card-title"><div><h3>Produk pesanan</h3><p>Periksa jumlah barang saat diterima.</p></div></div>${order.items.map((item) => `<div class="checkout-product-row">${productImage(getProduct(item.productId) || products[0], 'checkout-thumb')}<div><b>${escapeHtml(item.name)}</b><small>${item.qty} × ${money(item.price)}</small></div><strong>${money(item.qty * item.price)}</strong></div>`).join('')}</section>${actionPanel}</div><aside class="summary-card"><h3>Rincian pembayaran</h3><div class="summary-line"><span>Subtotal produk</span><b>${money(order.subtotal)}</b></div><div class="summary-line"><span>Ongkir</span><b>${money(order.shipping)}</b></div><div class="summary-line"><span>Biaya layanan</span><b>${money(order.serviceFee)}</b></div>${order.expressFee ? `<div class="summary-line"><span>Biaya Express</span><b>${money(order.expressFee)}</b></div>` : ''}<div class="summary-divider"></div><div class="summary-line"><span>DP ongkir</span><b class="text-green">${money(order.dpAmount)}</b></div><div class="summary-total"><span>Sisa COD</span><b>${money(order.codAmount)}</b></div><div class="order-meta"><small>Metode pembayaran</small><b>${escapeHtml(order.paymentMethod)}</b><small>Alamat pengiriman</small><b>${escapeHtml(order.destination)}</b><small>Pickup mitra</small><b>${escapeHtml(order.driver || 'Menunggu penugasan')}</b></div></aside></div></main>${footer()}`);
}

function loginPage() {
  const roles = [['farmer','Petani','Pesan kebutuhan pertanian'],['store','Mitra Toko','Kelola produk dan pesanan'],['driver','Mitra Pickup','Terima dan antar pesanan'],['admin','Administrator','Kelola operasional HATOP']];
  return shell(`<main class="auth-page"><div class="auth-card"><a href="#/" class="brand auth-brand"><img class="brand-logo" src="/hatop-logo.jpeg" alt="Logo HATOP"><span class="brand-copy"><b>HATOP</b><small>Hub Antar Toko & Ojek Pickup</small></span></a><span class="eyebrow">SELAMAT DATANG KEMBALI</span><h1>Masuk ke HATOP</h1><p>Pilih peran demo untuk menjelajahi pengalaman masing-masing pengguna.</p><div class="role-options">${roles.map(([role,name,desc]) => `<button class="role-option ${state.role === role ? 'selected' : ''}" data-action="choose-role" data-role="${role}"><span class="role-option-icon">${icon(role === 'farmer' ? 'leaf' : role === 'store' ? 'store' : role === 'driver' ? 'truck' : 'settings', 22)}</span><span><b>${name}</b><small>${desc}</small></span><span class="role-check">${icon('check', 16)}</span></button>`).join('')}</div><button class="btn btn-primary btn-block btn-lg" data-action="demo-login" ${!state.role ? 'disabled' : ''}>Masuk sebagai ${state.role ? demoUsers[state.role].role : '...' } ${icon('arrow', 17)}</button><div class="auth-divider"><span>atau</span></div><a class="btn btn-outline btn-block" href="#/">Kembali ke halaman utama</a><div class="demo-warning">Mode demo: tidak membutuhkan password. Jangan gunakan data pribadi atau transaksi sungguhan.</div></div></main>${footer()}`);
}
function registerPage() {
  return shell(`<main class="auth-page"><div class="auth-card"><a href="#/" class="brand auth-brand"><img class="brand-logo" src="/hatop-logo.jpeg" alt="Logo HATOP"><span class="brand-copy"><b>HATOP</b><small>Hub Antar Toko & Ojek Pickup</small></span></a><span class="eyebrow">GABUNG KOMUNITAS HATOP</span><h1>Buat akun baru</h1><p>Pendaftaran pada prototype ini hanya simulasi untuk memilih jenis akun.</p><div class="form-field"><label>Nama lengkap</label><input id="register-name" class="input-control" placeholder="Masukkan nama Anda"></div><div class="form-field"><label>Nomor WhatsApp</label><input class="input-control" placeholder="08xxxxxxxxxx" inputmode="tel"></div><div class="form-field"><label>Jenis akun</label><select id="register-role" class="select-control"><option value="farmer">Petani / Kelompok Tani</option><option value="store">Toko Sarana Pertanian</option><option value="driver">Pemilik Pickup</option></select></div><div class="form-field"><label>Lokasi</label><select class="select-control"><option>Silaen</option><option>Balige</option><option>Laguboti</option></select></div><label class="check-row consent-row"><input type="checkbox" id="register-consent"> Saya menyetujui pemrosesan data sesuai kebijakan privasi HATOP.</label><button class="btn btn-primary btn-block btn-lg" data-action="register">Buat akun demo</button><p class="auth-switch">Sudah punya akun? <a href="#/login">Masuk</a></p><div class="demo-warning">Pendaftaran belum tersambung ke server. Data tidak dikirim atau disimpan sebagai akun produksi.</div></div></main>${footer()}`);
}

function sidebarLink(path, label, ico, active) { return `<a href="#${path}" class="side-link ${active ? 'active' : ''}">${icon(ico, 18)}<span>${label}</span></a>`; }
function dashboardShell(role, title, subtitle, content, active = '') {
  const user = demoUsers[role];
  const links = role === 'farmer'
    ? [['/farmer','Ringkasan','chart'],['/catalog','Katalog Produk','package'],['/orders','Pesanan Saya','truck'],['/farming-package','Farming Package','leaf'],['/loyalty','Member Tani Setia','star'],['/profile','Profil Saya','user'],['/help','Pusat Bantuan','help']]
    : role === 'store'
    ? [['/store','Dashboard','chart'],['/store/orders','Pesanan Masuk','package'],['/store/products','Kelola Produk','box'],['/store/reports','Laporan','chart'],['/profile','Profil Toko','store']]
    : role === 'driver'
    ? [['/driver','Dashboard','chart'],['/driver/tasks','Tugas Pengiriman','truck'],['/driver/history','Riwayat Trip','clock'],['/profile','Profil Mitra','user']]
    : [['/admin','Overview','chart'],['/admin/orders','Pesanan','package'],['/admin/pooling','Pooling Order','users'],['/admin/payments','Verifikasi DP','wallet'],['/admin/partners','Mitra','shield'],['/admin/finance','Keuangan','chart'],['/admin/settings','Pengaturan','settings']];
  const current = active || currentRoute();
  return shell(`<main class="app-layout container"><aside class="app-sidebar"><div class="sidebar-user">${avatar(user.name,user.initials)}<div><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.role)}</small></div></div><div class="sidebar-label">MENU UTAMA</div><nav class="sidebar-nav">${links.map(([path,label,ico]) => sidebarLink(path,label,ico,current === path || (path !== '/farmer' && path !== '/store' && path !== '/driver' && path !== '/admin' && current.startsWith(path + '/')))).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-help"><span>${icon('help', 18)}</span><b>Butuh bantuan?</b><small>Hubungi tim HATOP.</small><a href="#/help">Pusat bantuan ${icon('arrow', 13)}</a></div><button class="side-link logout-link" data-action="logout">${icon('logout',18)}<span>Keluar</span></button></div></aside><section class="app-content"><div class="app-topline"><div><span class="eyebrow">${role === 'admin' ? 'PUSAT OPERASIONAL' : role === 'store' ? 'PORTAL TOKO MITRA' : role === 'driver' ? 'PORTAL MITRA PICKUP' : 'AREA PETANI'}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="app-top-actions"><button class="icon-button notification-button" data-action="notifications">${icon('bell',19)}<i></i></button><span class="date-chip">${icon('calendar',14)} 12 November 2026</span></div></div>${content}</section></main>${footer()}`);
}
function metricCard(label, value, change, ico, tone = 'green') { return `<div class="metric-card"><span class="metric-icon ${tone}">${icon(ico,20)}</span><div><small>${label}</small><b>${value}</b><span>${change}</span></div></div>`; }
function farmerDashboard() {
  const ownOrders = state.orders.filter((o) => o.farmer === (state.user?.name || 'Budi Santoso'));
  const latest = ownOrders[0];
  const loyaltyPoints = Math.max(0, ownOrders.filter((o) => o.status === 'completed').length - (state.loyaltyRedemptions || 0) * 5);
  const content = `<div class="farmer-welcome"><div><span class="eyebrow light">SELAMAT DATANG DI HATOP</span><h2>Halo, ${escapeHtml((state.user?.name || 'Budi Santoso').split(' ')[0])}!</h2><p>Ada kebutuhan pertanian yang ingin disiapkan hari ini?</p><a href="#/catalog" class="btn btn-white">Mulai belanja ${icon('arrow',16)}</a></div><div class="welcome-illustration">${icon('leaf',68)}<span>${icon('truck',54)}</span></div></div><div class="metric-grid three">${metricCard('Total pesanan', ownOrders.length, 'Riwayat di akun demo', 'package','green')}${metricCard('Pesanan aktif', ownOrders.filter((o) => o.status !== 'completed').length, 'Perlu dipantau', 'truck','blue')}${metricCard('Poin Member Tani', `${loyaltyPoints} poin`, '1 poin per pesanan selesai', 'star','gold')}</div><div class="dashboard-two-col"><section class="dashboard-panel"><div class="panel-heading"><div><h3>Pesanan terbaru</h3><p>Pantau perjalanan kebutuhan tani Anda.</p></div><a href="#/orders" class="text-link">Lihat semua ${icon('arrow',14)}</a></div>${latest ? `<div class="latest-order"><div><small>${latest.id}</small><b>${latest.items[0].name}${latest.items.length > 1 ? ` + ${latest.items.length - 1} produk` : ''}</b><span>${latest.schedule}</span></div>${statusBadge(latest.status)}<a class="btn btn-outline btn-sm" href="#/orders/${latest.id}">Detail</a></div>` : emptyState('Belum ada pesanan','Pesanan akan tampil di sini.','/catalog','Cari produk')}</section><section class="dashboard-panel pooling-widget"><div class="panel-heading"><div><h3>Pooling tersedia</h3><p>Gabungkan pesanan searah.</p></div><span class="widget-icon">${icon('truck',22)}</span></div><div class="pooling-progress-head"><b>2 dari 3 pesanan</b><span>Tujuan Silaen</span></div><div class="progress-track"><span style="width:66%"></span></div><div class="pooling-widget-foot"><span>Jadwal Selasa, 17 Nov</span><b>${money(200000)} / pesanan</b></div><a href="#/catalog" class="text-link">Belanja dan gabung pooling ${icon('arrow',14)}</a></section></div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Akses cepat</h3><p>Fitur yang sering digunakan.</p></div></div><div class="quick-actions"><a href="#/catalog"><span>${icon('search',22)}</span><b>Cari Produk</b><small>Jelajahi katalog</small></a><a href="#/orders"><span>${icon('package',22)}</span><b>Pesanan Saya</b><small>Status dan riwayat</small></a><a href="#/farming-package"><span>${icon('leaf',22)}</span><b>Farming Package</b><small>Paket kebutuhan tanam</small></a><a href="#/loyalty"><span>${icon('star',22)}</span><b>Member Tani Setia</b><small>Poin dan reward</small></a></div></section>`;
  return dashboardShell('farmer','Dashboard Petani','Ringkasan kebutuhan dan aktivitas pesanan Anda.',content,'/farmer');
}
function storeDashboard() {
  const orders = state.orders;
  const newOrders = orders.filter((o) => o.status === 'waiting_stock');
  const content = `<div class="metric-grid four">${metricCard('Pesanan masuk', newOrders.length, 'Menunggu konfirmasi', 'package','green')}${metricCard('Perlu disiapkan', orders.filter((o) => o.storeStatus === 'new').length, 'Tindakan toko', 'clock','gold')}${metricCard('Siap dijemput', orders.filter((o) => o.storeStatus === 'ready').length, 'Menunggu pickup', 'truck','blue')}${metricCard('Produk aktif', products.length, 'Katalog demo', 'box','purple')}</div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Pesanan terbaru</h3><p>Konfirmasi stok sebelum pesanan masuk ke pooling.</p></div><a href="#/store/orders" class="text-link">Semua pesanan ${icon('arrow',14)}</a></div>${orders.map((o) => `<div class="table-row-card"><div><b>${o.id}</b><small>${escapeHtml(o.farmer)} · ${o.items.map((i) => i.name).join(', ')}</small></div><div>${statusBadge(o.status)}</div><div><b>${money(o.subtotal)}</b><small>${o.schedule}</small></div><a href="#/store/orders" class="btn btn-outline btn-sm">Kelola</a></div>`).join('')}</section><div class="dashboard-two-col"><section class="dashboard-panel"><div class="panel-heading"><div><h3>Stok perlu diperhatikan</h3><p>Contoh monitoring persediaan.</p></div></div>${products.filter((p) => p.stock < 12).map((p) => `<div class="stock-alert"><span class="stock-dot"></span><div><b>${p.name}</b><small>Stok tersisa ${p.stock} unit</small></div><span class="status-badge warning">Stok rendah</span></div>`).join('') || '<p class="muted">Tidak ada stok rendah.</p>'}</section><section class="dashboard-panel subscription-card"><span class="eyebrow">LANGGANAN MITRA</span><h3>Etalase HATOP</h3><b class="subscription-price">Rp50.000 <small>/ bulan</small></b><p>Bulan pertama onboarding gratis. Kelola langganan dan jangkau petani di area layanan.</p><span class="status-badge success">Demo · Aktif</span></section></div>`;
  return dashboardShell('store','Dashboard Toko','Kelola pesanan, katalog, dan kesiapan barang untuk pickup.',content,'/store');
}
function storeOrdersPage() {
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Daftar pesanan toko</h3><p>Konfirmasi ketersediaan dan siapkan barang untuk dijemput.</p></div><span class="status-badge info">${state.orders.length} pesanan demo</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Produk</th><th>Nilai produk</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${state.orders.map((o) => `<tr><td><b>${o.id}</b><small>${o.createdAt}</small></td><td>${escapeHtml(o.farmer)}<small>${escapeHtml(o.destination)}</small></td><td>${o.items.map((i) => `${escapeHtml(i.name)} × ${i.qty}`).join('<br>')}</td><td>${money(o.subtotal)}</td><td>${statusBadge(o.status)}<small>${o.storeStatus === 'ready' ? 'Barang siap pickup' : o.storeStatus === 'picked_up' ? 'Sudah dijemput' : 'Status toko: ' + o.storeStatus}</small></td><td>${o.status === 'waiting_stock' ? `<button class="btn btn-primary btn-sm" data-action="store-confirm" data-id="${o.id}">Konfirmasi stok</button>` : o.status === 'pooling' && o.storeStatus !== 'ready' ? `<button class="btn btn-outline btn-sm" data-action="store-ready" data-id="${o.id}">Siap dijemput</button>` : '<span class="muted">Tidak ada aksi</span>'}</td></tr>`).join('')}</tbody></table></div></section>`;
  return dashboardShell('store','Pesanan Masuk','Periksa pesanan dan perbarui kesiapan barang.',content,'/store/orders');
}
function storeProductsPage() {
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Katalog produk toko</h3><p>Kelola harga dan stok produk. Data ini merupakan katalog demonstrasi.</p></div><button class="btn btn-primary btn-sm" data-action="add-product-demo">${icon('plus',15)} Tambah produk</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${products.map((p) => `<tr><td><div class="table-product">${productImage(p,'table-thumb')}<b>${escapeHtml(p.name)}</b></div></td><td>${categories.find((c) => c.id === p.category)?.name}</td><td>${money(p.price)}<small>/${p.unit}</small></td><td>${p.stock}</td><td><span class="status-badge ${p.stock > 10 ? 'success' : 'warning'}">${p.stock > 10 ? 'Tersedia' : 'Stok rendah'}</span></td><td><button class="btn btn-outline btn-sm" data-action="edit-product" data-id="${p.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></section>`;
  return dashboardShell('store','Kelola Produk','Atur etalase dan ketersediaan barang.',content,'/store/products');
}
function driverDashboard() {
  const tasks = state.orders.filter((o) => ['assigned','in_transit','inspection'].includes(o.status));
  const content = `<div class="driver-status-banner"><div><span class="live-dot" style="background:${state.driverAvailable ? '#42a66a' : '#bd5350'}"></span><b>Status mitra: ${state.driverAvailable ? 'Siap menerima tugas' : 'Tidak tersedia'}</b><small>Jam operasional dan ketersediaan perlu dikonfirmasi kepada admin.</small></div><button class="btn btn-white btn-sm" data-action="driver-availability">Ubah status</button></div><div class="metric-grid three">${metricCard('Tugas aktif', tasks.length, 'Perlu diselesaikan', 'truck','green')}${metricCard('Trip selesai', state.orders.filter((o) => o.status === 'completed').length, 'Pada data demo', 'check','blue')}${metricCard('Kendaraan', 'L300', 'Kapasitas sesuai verifikasi', 'package','gold')}</div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Tugas pengiriman</h3><p>Ikuti status tugas dan konfirmasi setiap tahapan.</p></div><span class="status-badge info">${tasks.length} aktif</span></div>${state.orders.map((o) => `<div class="driver-task"><div class="driver-task-icon">${icon('truck',22)}</div><div class="driver-task-main"><b>${o.id}</b><small>${escapeHtml(o.store)} → ${escapeHtml(o.destination)}</small><small>${o.schedule} · ${o.items.reduce((s,i)=>s+i.weight*i.qty,0)} kg</small></div><div>${statusBadge(o.status)}</div><div class="driver-task-actions">${o.status === 'assigned' ? `<button class="btn btn-primary btn-sm" data-action="driver-pickup" data-id="${o.id}">Konfirmasi dijemput</button>` : o.status === 'in_transit' ? `<button class="btn btn-primary btn-sm" data-action="driver-arrive" data-id="${o.id}">Tiba di tujuan</button>` : o.status === 'inspection' ? `<a class="btn btn-outline btn-sm" href="#/orders/${o.id}">Lihat serah terima</a>` : '<span class="muted">Menunggu penugasan</span>'}</div></div>`).join('')}</section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Checklist sebelum berangkat</h3><p>Pastikan seluruh barang dan dokumen sesuai.</p></div></div><div class="checklist-grid"><label><input type="checkbox"> Cocokkan barang dengan surat jalan</label><label><input type="checkbox"> Pastikan jumlah dan kondisi kemasan</label><label><input type="checkbox"> Pastikan kapasitas kendaraan sesuai</label><label><input type="checkbox"> Konfirmasi titik tujuan</label></div></section>`;
  return dashboardShell('driver','Dashboard Mitra Pickup','Lihat tugas pengiriman dan perbarui status perjalanan.',content,'/driver');
}
function adminDashboard() {
  const orders = state.orders;
  const content = `<div class="admin-alert"><span>${icon('info',18)}</span><div><b>Mode demonstrasi</b><small>Angka di bawah berasal dari data contoh dan aktivitas yang disimpan di browser ini, bukan transaksi riil HATOP.</small></div></div><div class="metric-grid four">${metricCard('Total pesanan', orders.length, 'Data demo', 'package','green')}${metricCard('Perlu verifikasi DP', orders.filter((o) => o.status === 'waiting_payment' && o.paymentProof).length, 'Bukti menunggu', 'wallet','gold')}${metricCard('Pooling aktif', orders.filter((o) => o.status === 'pooling').length, 'Perlu penjadwalan', 'users','blue')}${metricCard('Pengiriman berjalan', orders.filter((o) => o.status === 'in_transit').length, 'Dalam perjalanan', 'truck','purple')}</div><div class="dashboard-two-col"><section class="dashboard-panel"><div class="panel-heading"><div><h3>Aktivitas pesanan</h3><p>Ringkasan status operasional.</p></div><a href="#/admin/orders" class="text-link">Kelola pesanan ${icon('arrow',14)}</a></div><div class="status-breakdown">${[['Menunggu DP','waiting_payment'],['Konfirmasi stok','waiting_stock'],['Pooling','pooling'],['Dalam perjalanan','in_transit'],['Selesai','completed']].map(([label,key]) => `<div class="status-breakdown-row"><span>${label}</span><div class="mini-bar"><i style="width:${Math.max(4,orders.filter(o=>o.status===key).length/Math.max(orders.length,1)*100)}%"></i></div><b>${orders.filter(o=>o.status===key).length}</b></div>`).join('')}</div></section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Target kemitraan</h3><p>Target proposal PKM-K, bukan capaian aktual.</p></div></div><div class="target-row"><div><b>4 toko mitra</b><small>Target minimum</small></div><div class="target-number">0/4</div></div><div class="progress-track"><span style="width:12%"></span></div><div class="target-row"><div><b>10 pickup mitra</b><small>Target minimum</small></div><div class="target-number">0/10</div></div><div class="progress-track"><span style="width:10%"></span></div><a href="#/admin/partners" class="text-link">Kelola mitra ${icon('arrow',14)}</a></section></div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Pesanan terbaru</h3><p>Perlu perhatian dari tim operasional.</p></div><a href="#/admin/orders" class="text-link">Lihat semua ${icon('arrow',14)}</a></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Pesanan</th><th>Petani</th><th>Jadwal</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${orders.map((o) => `<tr><td><b>${o.id}</b><small>${o.createdAt}</small></td><td>${escapeHtml(o.farmer)}</td><td>${o.schedule}</td><td>${money(o.total)}</td><td>${statusBadge(o.status)}</td><td><a class="text-link" href="#/admin/orders">Kelola</a></td></tr>`).join('')}</tbody></table></div></section><div class="dashboard-two-col"><section class="dashboard-panel"><div class="panel-heading"><div><h3>Proyeksi arus kas</h3><p>Angka proposal, bukan realisasi transaksi.</p></div></div><div class="projection-number"><small>Kas bersih tahun 1</small><b>${money(1840000)}</b><span>Setelah insentif maksimum</span></div><div class="projection-row"><span>Kas bersih tahun 2</span><b>${money(9100000)}</b></div><a href="#/admin/finance" class="text-link">Lihat rincian keuangan ${icon('arrow',14)}</a></section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Jadwal reguler</h3><p>Koridor Balige–Laguboti–Silaen.</p></div></div><div class="schedule-tile"><span>${icon('calendar',22)}</span><div><b>Selasa</b><small>17 November 2026 · Reguler</small></div><span class="status-badge info">Demo</span></div><div class="schedule-tile"><span>${icon('calendar',22)}</span><div><b>Jumat</b><small>20 November 2026 · Reguler</small></div><span class="status-badge info">Demo</span></div></section></div>`;
  return dashboardShell('admin','Overview Operasional','Pantau pesanan, pooling, mitra, dan kesehatan operasional HATOP.',content,'/admin');
}
function adminOrdersPage() {
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Semua pesanan</h3><p>Kelola status order dan proses operasional.</p></div><span class="status-badge info">${state.orders.length} data</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Order ID</th><th>Petani & Tujuan</th><th>Jadwal</th><th>Nilai</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>${state.orders.map((o) => `<tr><td><b>${o.id}</b><small>${o.createdAt}</small></td><td>${escapeHtml(o.farmer)}<small>${escapeHtml(o.destination)}</small></td><td>${o.schedule}</td><td>${money(o.total)}</td><td>${statusBadge(o.status)}</td><td>${o.status === 'pooling' ? `<a class="btn btn-outline btn-sm" href="#/admin/pooling">Atur di pooling</a>` : o.status === 'waiting_payment' && o.paymentProof ? `<button class="btn btn-primary btn-sm" data-action="verify-payment" data-id="${o.id}">Verifikasi DP</button>` : `<a href="#/orders/${o.id}" class="text-link">Detail</a>`}</td></tr>`).join('')}</tbody></table></div></section>`;
  return dashboardShell('admin','Manajemen Pesanan','Tinjau pesanan dari awal hingga selesai.',content,'/admin/orders');
}
function adminPoolingPage() {
  const poolOrders = state.orders.filter((o) => o.pooled && o.status === 'pooling');
  const poolWeight = poolOrders.reduce((sum, order) => sum + order.items.reduce((subtotal, item) => subtotal + item.weight * item.qty, 0), 0);
  const poolShare = poolOrders.length ? Math.ceil(state.config.pickupCost / poolOrders.length) : state.config.pickupCost;
  const content = `<div class="metric-grid three">${metricCard('Pesanan dalam pool', poolOrders.length, 'Koridor Silaen', 'users','green')}${metricCard('Estimasi muatan', `${poolWeight} kg`, 'Dari item yang terdaftar', 'package','blue')}${metricCard('Ongkir / pesanan', money(poolShare), 'Berdasarkan jumlah order aktif', 'wallet','gold')}</div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Pooling order · Koridor Silaen</h3><p>Kelompokkan pesanan dengan tujuan dan jadwal yang sama. Pastikan kapasitas kendaraan diverifikasi.</p></div><span class="status-badge info">Selasa, 17 Nov 2026</span></div><div class="pool-board"><div class="pool-board-head"><div><span class="eyebrow">POOLING GROUP</span><h2>POOL-SIL-171126</h2><p>Balige / Laguboti → Silaen</p></div><span class="pool-board-icon">${icon('truck',32)}</span></div><div class="pool-stats"><div><small>Pesanan</small><b>${poolOrders.length} / 3</b></div><div><small>Estimasi muatan demo</small><b>${poolWeight} kg</b></div><div><small>Biaya pickup</small><b>${money(state.config.pickupCost)}</b></div><div><small>Per pesanan</small><b>${money(poolShare)}</b></div></div><div class="progress-track"><span style="width:66%"></span></div><div class="pool-members">${poolOrders.map((o) => `<div class="pool-member">${avatar(o.farmer)}<div><b>${escapeHtml(o.farmer)}</b><small>${o.id} · ${o.items.reduce((s,i)=>s+i.weight*i.qty,0)} kg</small></div>${statusBadge(o.status)}</div>`).join('')}</div><div class="pool-actions"><button class="btn btn-primary" data-action="assign-first-pool">Tugaskan pickup mitra ${icon('arrow',16)}</button><span class="muted">Penugasan mengubah status pesanan yang sudah masuk pooling.</span></div></div></section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Aturan penggabungan</h3><p>Validasi sebelum satu perjalanan dikunci.</p></div></div><div class="checklist-grid"><label><input type="checkbox" checked disabled> Tujuan pengiriman searah</label><label><input type="checkbox" checked disabled> Jadwal pengiriman sama</label><label><input type="checkbox" id="pool-capacity-check"> Saya sudah memeriksa kapasitas kendaraan</label><label><input type="checkbox" checked disabled> Stok toko telah dikonfirmasi dan barang siap pickup</label></div></section>`;
  return dashboardShell('admin','Pooling Order','Satukan pesanan searah dan atur pembagian ongkir.',content,'/admin/pooling');
}
function adminPaymentsPage() {
  const pending = state.orders.filter((o) => o.status === 'waiting_payment');
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Verifikasi pembayaran DP</h3><p>Periksa bukti pembayaran sebelum pesanan diteruskan ke toko.</p></div><span class="status-badge warning">${pending.filter(o=>o.paymentProof).length} menunggu bukti</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Pesanan</th><th>Petani</th><th>Metode</th><th>DP</th><th>Bukti</th><th>Aksi</th></tr></thead><tbody>${pending.map((o) => `<tr><td><b>${o.id}</b><small>${o.createdAt}</small></td><td>${escapeHtml(o.farmer)}</td><td>${escapeHtml(o.paymentMethod)}</td><td><b>${money(o.dpAmount)}</b></td><td>${o.paymentProof ? `<span class="status-badge success">${icon('check',12)} ${escapeHtml(o.paymentProof)}</span>` : '<span class="muted">Belum diunggah</span>'}</td><td>${o.paymentProof ? `<button class="btn btn-primary btn-sm" data-action="verify-payment" data-id="${o.id}">Verifikasi</button>` : '<span class="muted">Menunggu bukti</span>'}</td></tr>`).join('') || '<tr><td colspan="6">Tidak ada pembayaran menunggu.</td></tr>'}</tbody></table></div></section><div class="payment-policy-note">${icon('info',17)} <span>Verifikasi pada prototype hanya mengubah status lokal. Pada produksi, admin perlu memeriksa transaksi melalui mutasi atau payment gateway yang sah.</span></div>`;
  return dashboardShell('admin','Verifikasi Pembayaran','Kelola bukti transfer dan status DP ongkir.',content,'/admin/payments');
}
function adminPartnersPage() {
  const partners = state.partners || [];
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Direktori mitra</h3><p>Contoh data mitra. Status verifikasi belum dianggap aktual.</p></div><button class="btn btn-primary btn-sm" data-action="add-partner">${icon('plus',15)} Tambah mitra</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama mitra</th><th>Jenis</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${partners.map((p, index) => `<tr><td><b>${p.name}</b></td><td>${p.type}</td><td>${p.location}</td><td><span class="status-badge ${p.status.includes('Terverifikasi') ? 'success' : 'warning'}">${p.status}</span></td><td><button class="btn btn-outline btn-sm" data-action="partner-review" data-index="${index}">${p.status.includes('Terverifikasi') ? 'Batalkan' : 'Verifikasi demo'}</button></td></tr>`).join('')}</tbody></table></div></section>`;
  return dashboardShell('admin','Manajemen Mitra','Kelola toko pertanian dan mitra pickup.',content,'/admin/partners');
}
function adminFinancePage() {
  const content = `<div class="admin-alert"><span>${icon('info',18)}</span><div><b>Angka proyeksi proposal</b><small>Seluruh nilai merupakan proyeksi minimum dua tahun pada proposal, bukan pendapatan aktual.</small></div></div><div class="metric-grid three">${metricCard('Kas masuk Tahun 1',money(7800000),'Proyeksi proposal','wallet','green')}${metricCard('Kas bersih Tahun 1',money(1840000),'Setelah insentif maksimum','chart','blue')}${metricCard('Kas bersih Tahun 2',money(9100000),'Proyeksi proposal','chart','gold')}</div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Proyeksi arus kas</h3><p>Angka dalam rupiah.</p></div><span class="status-badge neutral">Sumber: proposal HATOP</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Komponen</th><th>Tahun 1</th><th>Tahun 2</th></tr></thead><tbody>${[['Trip', '96','192'],['Biaya layanan pooling',money(3840000),money(7680000)],['Biaya Express',money(960000),money(1920000)],['Langganan toko',money(2400000),money(4800000)],['Fee Farming Package',money(600000),money(1800000)],['Total kas masuk',money(7800000),money(16200000)],['Total kas keluar',money(5160000),money(7100000)],['Kas bersih',money(2640000),money(9100000)],['Kas bersih Tahun 1 setelah insentif maksimum',money(1840000),'—']].map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div></section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Konfigurasi tarif demo</h3><p>Nilai ini dipakai kalkulator checkout lokal.</p></div></div><div class="settings-grid"><label>Biaya pickup per trip<input id="config-pickup" type="number" value="${state.config.pickupCost}" class="input-control"></label><label>Biaya layanan / order<input id="config-service" type="number" value="${state.config.serviceFee}" class="input-control"></label><label>Biaya tambahan Express<input id="config-express" type="number" value="${state.config.expressFee}" class="input-control"></label><label>DP ongkir (%)<input id="config-dp" type="number" min="0" max="100" value="${state.config.dpPercent}" class="input-control"></label></div><button class="btn btn-primary" data-action="save-config">Simpan konfigurasi demo</button></section>`;
  return dashboardShell('admin','Keuangan & Konfigurasi','Pantau proyeksi dan sesuaikan asumsi tarif prototype.',content,'/admin/finance');
}

function storeReportsPage() {
  const completed = state.orders.filter((o) => o.status === 'completed');
  const total = state.orders.reduce((sum, o) => sum + o.subtotal, 0);
  const content = `<div class="metric-grid three">${metricCard('Total pesanan', state.orders.length, 'Data demo lintas toko', 'package','green')}${metricCard('Nilai produk', money(total), 'Nilai item pesanan', 'wallet','blue')}${metricCard('Pesanan selesai', completed.length, 'Pada data demo', 'check','gold')}</div><section class="dashboard-panel"><div class="panel-heading"><div><h3>Ringkasan aktivitas mingguan</h3><p>Visualisasi contoh, bukan laporan transaksi aktual.</p></div><button class="btn btn-outline btn-sm" data-action="export-demo">${icon('upload',14)} Ekspor ringkasan</button></div><div class="report-bars">${[['Senin',28],['Selasa',75],['Rabu',42],['Kamis',34],['Jumat',88],['Sabtu',22],['Minggu',12]].map(([day,height])=>`<div><span style="height:${height}%"></span><small>${day}</small></div>`).join('')}</div><div class="report-legend"><span><i></i> Aktivitas pesanan simulasi</span><small>Angka indeks visual</small></div></section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Rincian pesanan</h3><p>Rekap pesanan yang terkait dengan portal toko.</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Order ID</th><th>Petani</th><th>Nilai produk</th><th>Status</th><th>Jadwal</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td><b>${o.id}</b></td><td>${escapeHtml(o.farmer)}</td><td>${money(o.subtotal)}</td><td>${statusBadge(o.status)}</td><td>${o.schedule}</td></tr>`).join('')}</tbody></table></div></section>`;
  return dashboardShell('store','Laporan Toko','Lihat ringkasan aktivitas pesanan dan nilai produk.',content,'/store/reports');
}
function driverHistoryPage() {
  const history = state.orders.filter((o) => ['completed','in_transit','inspection','cod_due'].includes(o.status));
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Riwayat trip</h3><p>Catatan pengiriman pada data demonstrasi.</p></div></div>${history.map(o=>`<div class="driver-task"><div class="driver-task-icon">${icon('truck',22)}</div><div class="driver-task-main"><b>${o.id}</b><small>${escapeHtml(o.store)} → ${escapeHtml(o.destination)}</small><small>${o.schedule}</small></div>${statusBadge(o.status)}<a href="#/orders/${o.id}" class="btn btn-outline btn-sm">Detail</a></div>`).join('') || emptyState('Belum ada riwayat','Trip selesai akan tampil di sini.','/driver','Kembali')}</section>`;
  return dashboardShell('driver','Riwayat Trip','Perjalanan pickup dan serah terima.',content,'/driver/history');
}
function adminSettingsPage() {
  const content = `<section class="dashboard-panel"><div class="panel-heading"><div><h3>Pengaturan operasional</h3><p>Nilai ini hanya mengubah simulasi pada browser saat ini.</p></div><span class="status-badge warning">Konfigurasi demo</span></div><div class="settings-grid"><label>Biaya pickup per trip (Rp)<input id="config-pickup" type="number" value="${state.config.pickupCost}" class="input-control"></label><label>Biaya layanan per order (Rp)<input id="config-service" type="number" value="${state.config.serviceFee}" class="input-control"></label><label>Tambahan Express (Rp)<input id="config-express" type="number" value="${state.config.expressFee}" class="input-control"></label><label>DP ongkir (%)<input id="config-dp" type="number" min="0" max="100" value="${state.config.dpPercent}" class="input-control"></label></div><button class="btn btn-primary" data-action="save-config">Simpan pengaturan</button></section><section class="dashboard-panel"><h3>Jadwal layanan reguler</h3><div class="schedule-tile"><span>${icon('calendar',22)}</span><div><b>Setiap Selasa</b><small>Koridor Balige–Laguboti–Silaen</small></div><span class="status-badge success">Aktif (demo)</span></div><div class="schedule-tile"><span>${icon('calendar',22)}</span><div><b>Setiap Jumat</b><small>Koridor Balige–Laguboti–Silaen</small></div><span class="status-badge success">Aktif (demo)</span></div></section><section class="dashboard-panel"><h3>Wilayah operasional</h3><div class="checklist-grid"><label><input type="checkbox" checked disabled> Balige</label><label><input type="checkbox" checked disabled> Laguboti</label><label><input type="checkbox" checked disabled> Silaen</label><label><input type="checkbox" disabled> Porsea (rencana ekspansi)</label><label><input type="checkbox" disabled> Uluan (rencana ekspansi)</label><label><input type="checkbox" disabled> Habinsaran (rencana ekspansi)</label></div></section><div class="payment-policy-note">${icon('info',17)} <span>Proposal menetapkan jadwal Selasa/Jumat, biaya layanan Rp20.000/order, tambahan Express Rp25.000, dan asumsi pickup Rp400.000/trip. Persentase DP tidak ditetapkan dalam proposal; nilai 50% di sini hanya asumsi prototype.</span></div>`;
  return dashboardShell('admin','Pengaturan Platform','Atur asumsi tarif dan cakupan operasional HATOP.',content,'/admin/settings');
}

function farmingPackagePage() {
  const product = products.find((p) => p.id === 'prd-007');
  return shell(`<main class="container content-page">${pageHeading('FARMING PACKAGE', 'Paket kebutuhan tanam', 'Paket sarana pertanian yang disusun toko mitra sesuai komoditas dan musim.')}<div class="package-hero"><div><span class="eyebrow light">CONTOH PAKET</span><h2>Paket Siap Tanam Jagung</h2><p>Gabungkan kebutuhan benih dan sarana pendukung dalam satu pemesanan. Komposisi final dikonfirmasi oleh toko mitra sebelum checkout.</p><div class="package-price">${money(product.price)} <small>/ paket demo</small></div><button class="btn btn-white btn-lg" data-action="add-cart" data-id="prd-007">${icon('cart',17)} Tambahkan paket</button></div>${productImage(product,'package-image')}</div><div class="package-content-grid"><section class="checkout-card"><h3>Komponen paket (contoh)</h3><div class="package-component"><span>${icon('sprout',20)}</span><div><b>Benih jagung</b><small>Varietas dan berat mengikuti pilihan toko.</small></div></div><div class="package-component"><span>${icon('leaf',20)}</span><div><b>Pupuk</b><small>Jenis dan jumlah dikonfirmasi oleh mitra.</small></div></div><div class="package-component"><span>${icon('shield',20)}</span><div><b>Produk pendukung budidaya</b><small>Penggunaan mengikuti label dan rekomendasi penyuluh.</small></div></div></section><section class="checkout-card"><h3>Bagaimana paket bekerja?</h3><p class="muted">Pilih paket, konfirmasi komposisi dengan toko mitra, lalu gunakan layanan pengiriman Reguler atau Express. HATOP mengenakan fee Farming Package sebesar 5% sesuai asumsi model bisnis proposal.</p><a href="#/catalog" class="text-link">Lihat produk satuan ${icon('arrow',14)}</a></section></div></main>${footer()}`);
}
function loyaltyPage() {
  const completedOrders = state.orders.filter((o) => o.farmer === (state.user?.name || 'Budi Santoso') && o.status === 'completed').length;
  const points = Math.max(0, completedOrders - (state.loyaltyRedemptions || 0) * 5);
  const membershipActive = completedOrders > 0;
  return dashboardShell('farmer','Member Tani Setia','Program loyalitas untuk pelanggan HATOP.',`<div class="loyalty-hero"><div><span class="eyebrow light">MEMBER TANI SETIA</span><h2>Belanja rutin, kumpulkan poin.</h2><p>Gratis bergabung setelah pesanan pertama selesai dan dibayar.</p></div><div class="loyalty-points"><small>POIN ANDA</small><b>${points}</b><span>${membershipActive ? 'Member aktif (demo)' : 'Aktif setelah order pertama selesai'}</span></div></div><div class="dashboard-two-col"><section class="dashboard-panel"><h3>Cara mengumpulkan poin</h3><div class="loyalty-rule"><span>1</span><div><b>1 pesanan selesai = 1 poin</b><small>Poin diberikan setelah pesanan selesai dan dibayar.</small></div></div><div class="loyalty-rule"><span>5</span><div><b>5 poin = voucher Rp20.000</b><small>Voucher mengurangi biaya layanan pesanan berikutnya.</small></div></div><div class="loyalty-rule"><span>12</span><div><b>Poin berlaku 12 bulan</b><small>Voucher berlaku 60 hari sejak diterbitkan.</small></div></div><button class="btn btn-primary btn-sm" data-action="redeem-voucher" ${points < 5 ? 'disabled' : ''}>Tukar 5 poin menjadi voucher Rp20.000</button><small class="muted">${points < 5 ? `Butuh ${5-points} poin lagi untuk menukar voucher.` : 'Voucher tersedia untuk biaya layanan pesanan berikutnya.'}</small></section><section class="dashboard-panel"><h3>Program referral</h3><p class="muted">Ajak petani lain bergabung. Setelah pesanan pertama pengguna baru selesai dan dibayar, kedua pihak memperoleh potongan biaya layanan Rp10.000.</p><div class="referral-code">HATOP-BUDI-2026 <button data-action="copy-referral">Salin</button></div><small class="muted">Batas 10 referral berhasil sesuai anggaran program.</small></section></div>`,`/loyalty`);
}
function profilePage() {
  const role = state.role || 'farmer'; const user = demoUsers[role];
  return dashboardShell(role,'Profil Akun','Informasi akun demo dan preferensi layanan.',`<section class="dashboard-panel profile-panel">${avatar(user.name,user.initials)}<div><h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.role)} · ${escapeHtml(user.location)}</p><span class="status-badge warning">Akun demonstrasi</span></div></section><section class="dashboard-panel"><h3>Informasi akun</h3><div class="settings-grid"><label>Nama<input class="input-control" value="${escapeHtml(user.name)}" readonly></label><label>Peran<input class="input-control" value="${escapeHtml(user.role)}" readonly></label><label>Wilayah<input class="input-control" value="${escapeHtml(user.location)}" readonly></label><label>Nomor kontak<input class="input-control" value="08xx-xxxx-xxxx (demo)" readonly></label></div><div class="payment-note">${icon('info',17)} Data profil ini hanya contoh. Fitur ubah profil dan verifikasi identitas membutuhkan backend.</div></section>`,'/profile');
}
function helpPage() {
  return shell(`<main class="container content-page">${pageHeading('PUSAT BANTUAN','Ada yang bisa kami bantu?','Temukan jawaban tentang pemesanan, pooling, pembayaran, dan pengiriman.')}<div class="help-grid"><div class="help-card"><span>${icon('package',24)}</span><h3>Pesanan & katalog</h3><p>Cara memilih produk, menambah keranjang, dan membuat pesanan.</p><a href="#/catalog" class="text-link">Buka katalog ${icon('arrow',14)}</a></div><div class="help-card"><span>${icon('truck',24)}</span><h3>Pooling & pengiriman</h3><p>Pelajari cara berbagi ongkir dan jadwal pickup.</p><a href="#/cara-kerja" class="text-link">Cara kerja HATOP ${icon('arrow',14)}</a></div><div class="help-card"><span>${icon('wallet',24)}</span><h3>Pembayaran</h3><p>DP ongkir, bukti transfer, dan pelunasan COD.</p><a href="#/orders" class="text-link">Lihat pesanan ${icon('arrow',14)}</a></div><div class="help-card"><span>${icon('message-circle',24)}</span><h3>Bantuan admin</h3><p>Hubungi admin untuk pertanyaan atau kendala pesanan.</p><a href="https://wa.me/6280000000000?text=Halo%20Admin%20HATOP" target="_blank" rel="noreferrer" class="text-link">WhatsApp demo ${icon('arrow',14)}</a></div></div><section class="dashboard-panel faq-panel"><h3>Pertanyaan umum</h3>${[['Apa itu pooling order?','Pooling order adalah penggabungan beberapa pesanan petani dengan tujuan searah dalam satu perjalanan pickup agar biaya transportasi dapat dibagi.'],['Kapan jadwal pengiriman reguler?','Jadwal reguler pada rancangan HATOP adalah setiap Selasa dan Jumat. Jadwal aktual dikonfirmasi admin.'],['Kapan pelunasan dilakukan?','Petani melakukan pemeriksaan visual barang saat tiba. Setelah barang dinyatakan sesuai, sisa pembayaran diselesaikan melalui COD sesuai prosedur operasional.'],['Apakah QRIS sudah aktif?','Belum. QRIS pada prototype merupakan tampilan simulasi. Integrasi produksi membutuhkan penyedia jasa pembayaran berizin.']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section></main>${footer()}`);
}

function notFoundPage() { return shell(`<main class="container content-page">${emptyState('Halaman belum tersedia','Gunakan menu untuk kembali ke bagian HATOP.','/','Kembali ke beranda')}</main>${footer()}`); }

function render() {
  const rawHash = location.hash || '#/';
  if (rawHash !== lastRenderedHash) {
    const routePart = rawHash.replace(/^#/, '').split('?')[0] || '/';
    const params = new URLSearchParams(rawHash.split('?')[1] || '');
    if (routePart === '/catalog' && params.has('category')) state.category = params.get('category');
    lastRenderedHash = rawHash;
  }
  const route = currentRoute();
  let html;
  if (route === '/') html = homePage();
  else if (route === '/catalog') html = catalogPage();
  else if (route.startsWith('/product/')) html = productPage(route.split('/')[2]);
  else if (route === '/cart') html = cartPage();
  else if (route === '/checkout') html = checkoutPage();
  else if (route.startsWith('/payment/')) html = paymentPage(route.split('/')[2]);
  else if (route === '/orders') html = ordersPage();
  else if (route.startsWith('/orders/')) html = orderDetailPage(route.split('/')[2]);
  else if (route === '/login') html = loginPage();
  else if (route === '/register') html = registerPage();
  else if (route === '/farmer') html = farmerDashboard();
  else if (route === '/store') html = storeDashboard();
  else if (route === '/store/orders') html = storeOrdersPage();
  else if (route === '/store/products') html = storeProductsPage();
  else if (route === '/store/reports') html = storeReportsPage();
  else if (route === '/driver' || route === '/driver/tasks') html = driverDashboard();
  else if (route === '/driver/history') html = driverHistoryPage();
  else if (route === '/admin') html = adminDashboard();
  else if (route === '/admin/orders') html = adminOrdersPage();
  else if (route === '/admin/pooling') html = adminPoolingPage();
  else if (route === '/admin/payments') html = adminPaymentsPage();
  else if (route === '/admin/partners') html = adminPartnersPage();
  else if (route === '/admin/finance') html = adminFinancePage();
  else if (route === '/admin/settings') html = adminSettingsPage();
  else if (route === '/farming-package') html = farmingPackagePage();
  else if (route === '/loyalty') html = state.role === 'farmer' ? loyaltyPage() : loginPage();
  else if (route === '/profile') html = state.role ? profilePage() : loginPage();
  else if (route === '/help') html = helpPage();
  else if (route === '/cara-kerja') html = homePage();
  else html = notFoundPage();
  document.getElementById('app').innerHTML = html;
  if (route === '/cara-kerja') document.getElementById('cara-kerja')?.scrollIntoView?.();
  document.title = `${route === '/' ? 'Beranda' : route.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') || 'HATOP'} | HATOP`;
}

function addToCart(id, qty = 1, goCart = false) {
  const product = getProduct(id);
  if (!product) return showToast('Produk tidak ditemukan.', 'error');
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.qty = Math.min(product.stock, existing.qty + qty);
  else state.cart.push({ id, qty: Math.min(product.stock, qty), price: product.price });
  saveState(); render(); showToast(`${product.name} ditambahkan ke keranjang.`);
  if (goCart) navigate('/cart');
}
function updateOrder(order, status) {
  order.status = status;
  order.updatedAt = new Date().toLocaleString('id-ID');
  saveState(); render();
}
function handleClick(event) {
  const link = event.target.closest('[data-link]');
  if (link) { navigate(link.dataset.link); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'add-cart') { const qty = document.getElementById('detail-qty') ? Number(document.getElementById('detail-qty').textContent) : 1; addToCart(id, qty); }
  else if (action === 'buy-now') { addToCart(id, 1); navigate('/cart'); }
  else if (action === 'cart-qty') {
    const item = state.cart.find((x) => x.id === id); if (!item) return;
    item.qty = Math.max(1, Math.min(getProduct(id).stock, item.qty + Number(button.dataset.delta)));
    saveState(); render();
  } else if (action === 'detail-qty') {
    const qty = document.getElementById('detail-qty'); const next = Math.max(1, Number(qty.textContent) + Number(button.dataset.delta)); qty.textContent = next;
  } else if (action === 'remove-cart') { state.cart = state.cart.filter((x) => x.id !== id); saveState(); render(); showToast('Produk dihapus dari keranjang.'); }
  else if (action === 'clear-cart') { state.cart = []; saveState(); render(); showToast('Keranjang dikosongkan.'); }
  else if (action === 'category') { state.category = button.dataset.category; saveState(); if (location.hash.includes('?')) navigate('/catalog'); else render(); }
  else if (action === 'reset-filter') { state.category = 'all'; state.search = ''; saveState(); render(); }
  else if (action === 'choose-role') { state.role = button.dataset.role; render(); }
  else if (action === 'demo-login') { if (!state.role) return; state.user = structuredClone(demoUsers[state.role]); saveState(); navigate(roleHome()); }
  else if (action === 'register') { const name = document.getElementById('register-name')?.value.trim(); const role = document.getElementById('register-role')?.value || 'farmer'; const consent = document.getElementById('register-consent')?.checked; if (!name) return showToast('Nama lengkap wajib diisi.', 'error'); if (!consent) return showToast('Persetujuan pemrosesan data wajib dicentang.', 'error'); state.role = role; state.user = { ...demoUsers[role], name, initials: name.split(' ').map((x) => x[0]).slice(0,2).join('').toUpperCase() }; saveState(); navigate(roleHome()); showToast('Akun demo berhasil dibuat.'); }
  else if (action === 'logout') { state.role = null; state.user = null; saveState(); navigate('/'); showToast('Anda keluar dari akun demo.'); }
  else if (action === 'create-order') createOrder();
  else if (action === 'save-proof') savePaymentProof(id);
  else if (action === 'verify-payment') {
    const order = getOrder(id); if (!order) return;
    try { updateOrder(order, transitionOrder(order.status, 'verify_dp')); showToast('DP terverifikasi. Pesanan diteruskan ke toko.'); }
    catch { showToast('Status pesanan tidak dapat diverifikasi.', 'error'); }
  } else if (action === 'store-confirm') {
    const order = getOrder(id); if (!order) return;
    try { updateOrder(order, transitionOrder(order.status, 'confirm_stock')); order.storeStatus = 'confirmed'; saveState(); render(); showToast('Stok dikonfirmasi dan masuk pooling.'); }
    catch { showToast('Pesanan belum dapat dikonfirmasi.', 'error'); }
  } else if (action === 'store-ready') { const order = getOrder(id); if (order) { order.storeStatus = 'ready'; saveState(); render(); showToast('Barang ditandai siap dijemput.'); } }
  else if (action === 'assign-driver') {
    const order = getOrder(id); if (!order) return;
    try { order.driver = demoUsers.driver.name; updateOrder(order, transitionOrder(order.status, 'assign_driver')); showToast('Mitra pickup ditugaskan.'); }
    catch { showToast('Pesanan belum siap ditugaskan.', 'error'); }
  } else if (action === 'assign-first-pool') {
    const anchor = state.orders.find((item) => item.status === 'pooling' && item.pooled);
    const group = anchor ? state.orders.filter((o) => o.status === 'pooling' && o.pooled && o.destination === anchor.destination && o.schedule === anchor.schedule) : [];
    if (group.length < 2) return showToast('Pooling membutuhkan minimal dua pesanan searah.', 'error');
    if (!document.getElementById('pool-capacity-check')?.checked) return showToast('Konfirmasi pemeriksaan kapasitas kendaraan sebelum penugasan.', 'error');
    if (group.some((order) => order.storeStatus !== 'ready')) return showToast('Pastikan semua toko dalam grup menandai barang siap dijemput.', 'error');
    group.forEach((order) => { order.driver = demoUsers.driver.name; order.status = transitionOrder(order.status, 'assign_driver'); order.updatedAt = new Date().toLocaleString('id-ID'); });
    saveState(); render(); showToast(`${group.length} pesanan dalam grup ditugaskan ke mitra pickup.`);
  } else if (action === 'driver-pickup') {
    const order = getOrder(id); if (!order) return;
    try { order.storeStatus = 'picked_up'; updateOrder(order, transitionOrder(order.status, 'pickup')); showToast('Pickup dikonfirmasi.'); }
    catch { showToast('Pesanan belum dapat dijemput.', 'error'); }
  } else if (action === 'driver-arrive') {
    const order = getOrder(id); if (!order) return;
    try { updateOrder(order, transitionOrder(order.status, 'arrive')); showToast('Kedatangan dicatat. Menunggu pemeriksaan petani.'); }
    catch { showToast('Status perjalanan tidak dapat diperbarui.', 'error'); }
  } else if (action === 'confirm-goods') {
    const order = getOrder(id); if (!order) return;
    try { updateOrder(order, transitionOrder(order.status, 'goods_ok')); showToast('Barang dinyatakan sesuai. Pelunasan COD tersedia.'); }
    catch { showToast('Pemeriksaan belum dapat diselesaikan.', 'error'); }
  } else if (action === 'settle-cod') {
    const order = getOrder(id); if (!order) return;
    try { order.codMethod = document.getElementById('cod-method')?.value || 'Tunai kepada mitra pickup'; updateOrder(order, transitionOrder(order.status, 'settle_cod')); showToast('Pelunasan COD dikonfirmasi. Pesanan selesai.'); }
    catch { showToast('Pelunasan tidak dapat dikonfirmasi.', 'error'); }
  } else if (action === 'report-issue') {
    const order = getOrder(id); if (!order) return;
    order.notes = 'Laporan ketidaksesuaian barang dikirim dari prototype demo.';
    updateOrder(order, 'needs_attention'); showToast('Laporan dicatat untuk ditinjau admin.');
  } else if (action === 'edit-address') {
    const value = prompt('Masukkan alamat pengiriman:', state.checkout.address);
    if (value?.trim()) { state.checkout.address = value.trim(); saveState(); render(); }
  } else if (action === 'copy-account') { navigator.clipboard?.writeText('000000000000').then(() => showToast('Nomor rekening demo disalin.')).catch(() => showToast('Nomor rekening: 0000 0000 0000')); }
  else if (action === 'rate') { state.rating = Number(button.dataset.rating); document.querySelectorAll('#rating-stars button').forEach((el) => el.classList.toggle('selected', Number(el.dataset.rating) <= state.rating)); }
  else if (action === 'submit-review') { const order = getOrder(id); if (order) { order.reviewRating = state.rating || 5; saveState(); } showToast(`Terima kasih atas ulasan ${state.rating || 5} bintang (demo).`); }
  else if (action === 'copy-referral') { navigator.clipboard?.writeText('HATOP-BUDI-2026').then(() => showToast('Kode referral disalin.')).catch(() => showToast('Kode: HATOP-BUDI-2026')); }
  else if (action === 'redeem-voucher') { const completed = state.orders.filter((o) => o.farmer === (state.user?.name || 'Budi Santoso') && o.status === 'completed').length; const points = Math.max(0, completed - (state.loyaltyRedemptions || 0) * 5); if (points < 5) return showToast('Poin belum cukup untuk ditukar.', 'error'); state.loyaltyRedemptions = (state.loyaltyRedemptions || 0) + 1; state.vouchers = [...(state.vouchers || []), { code: `TANI-${Date.now().toString().slice(-5)}`, amount: 20000, status: 'available' }]; saveState(); render(); showToast('Voucher Rp20.000 berhasil dibuat pada simulasi.'); }
  else if (action === 'save-config') saveConfig();
  else if (action === 'add-product-demo') addDemoProduct();
  else if (action === 'edit-product') editDemoProduct(id);
  else if (action === 'add-partner') addDemoPartner();
  else if (action === 'partner-review') reviewDemoPartner(button.dataset.index);
  else if (action === 'driver-availability') { state.driverAvailable = !state.driverAvailable; saveState(); render(); showToast(`Status mitra: ${state.driverAvailable ? 'tersedia' : 'tidak tersedia'}.`); }
  else if (action === 'notifications') showToast('Belum ada notifikasi baru.');
  else if (action === 'export-demo') exportDemoOrders();
  else if (action === 'order-filter') {
    const filter = button.dataset.filter;
    document.querySelectorAll('.order-card').forEach((card) => { const text = card.textContent; const completed = text.includes('Selesai'); card.style.display = filter === 'active' ? (completed ? 'none' : '') : (completed ? '' : 'none'); });
    document.querySelectorAll('.orders-filter button').forEach((b) => b.classList.toggle('active', b === button));
  }
}



function exportDemoOrders() {
  const rows = [['Order ID','Petani','Tujuan','Jadwal','Status','Subtotal Produk','Ongkir','DP','COD','Total'], ...state.orders.map(o => [o.id,o.farmer,o.destination,o.schedule,statusLabel(o.status),o.subtotal,o.shipping,o.dpAmount,o.codAmount,o.total])];
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'hatop-demo-orders.csv'; anchor.click(); URL.revokeObjectURL(url);
  showToast('Rekap pesanan CSV berhasil diunduh.');
}

function addDemoProduct() {
  const name = prompt('Nama produk baru:');
  if (!name?.trim()) return;
  const price = Number(prompt('Harga produk (Rp):', '100000'));
  if (!Number.isFinite(price) || price <= 0) return showToast('Harga produk tidak valid.', 'error');
  const stock = Number(prompt('Jumlah stok:', '10'));
  if (!Number.isInteger(stock) || stock < 0) return showToast('Jumlah stok tidak valid.', 'error');
  const category = prompt('Kategori: benih / pupuk / perlindungan / pakan / paket', 'pupuk') || 'pupuk';
  if (!['benih','pupuk','perlindungan','pakan','paket'].includes(category)) return showToast('Kategori tidak dikenal.', 'error');
  const product = { id: `prd-demo-${Date.now()}`, name: name.trim(), category, store: state.user?.name || demoUsers.store.name, price, unit: '1 unit', stock, rating: 0, reviews: 0, weight: 1, image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=85', badge: 'Produk baru', description: 'Produk demonstrasi yang ditambahkan melalui portal toko.' };
  state.extraProducts.push(product); products.push(product); saveState(); render(); showToast('Produk demo berhasil ditambahkan ke katalog.');
}
function editDemoProduct(id) {
  const product = getProduct(id); if (!product) return;
  const price = Number(prompt(`Harga baru untuk ${product.name} (Rp):`, String(product.price)));
  if (!Number.isFinite(price) || price <= 0) return showToast('Harga tidak valid.', 'error');
  const stock = Number(prompt('Stok baru:', String(product.stock)));
  if (!Number.isInteger(stock) || stock < 0) return showToast('Stok tidak valid.', 'error');
  const changes = { price, stock };
  Object.assign(product, changes);
  state.productOverrides[id] = changes;
  saveState(); render(); showToast('Harga dan stok demo diperbarui.');
}
function addDemoPartner() {
  const name = prompt('Nama mitra:'); if (!name?.trim()) return;
  const type = prompt('Jenis mitra: Toko Pertanian atau Pickup L300/Carry', 'Toko Pertanian') || 'Toko Pertanian';
  const location = prompt('Lokasi mitra: Balige / Laguboti / Silaen', 'Balige') || 'Balige';
  state.partners.push({ name: name.trim(), type, location, status: 'Perlu verifikasi' });
  saveState(); render(); showToast('Mitra demo ditambahkan dan menunggu verifikasi.');
}
function reviewDemoPartner(index) {
  const partner = state.partners?.[Number(index)]; if (!partner) return;
  partner.status = partner.status.includes('Terverifikasi') ? 'Perlu verifikasi' : 'Terverifikasi (demo)';
  saveState(); render(); showToast(`Status mitra diperbarui: ${partner.status}.`);
}

function createOrder() {
  if (!state.cart.length) return showToast('Keranjang masih kosong.', 'error');
  const checkout = state.checkout;
  const calc = calculateCheckout({ subtotal: cartSubtotal(), deliveryType: checkout.deliveryType, pooled: checkout.pooled, participants: 2, pickupCost: state.config.pickupCost, serviceFee: state.config.serviceFee, expressFee: state.config.expressFee, dpPercent: state.config.dpPercent });
  const orderId = `HATOP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const items = state.cart.map((item) => { const product = getProduct(item.id); return { productId: product.id, name: product.name, qty: item.qty, price: item.price, weight: product.weight }; });
  const order = { id: orderId, farmer: state.user?.name || 'Budi Santoso', destination: checkout.address, store: [...new Set(items.map((item) => getProduct(item.productId).store))].join(', '), driver: '', items, subtotal: calc.subtotal, shipping: calc.shipping, serviceFee: calc.serviceFee, expressFee: calc.expressFee, dpPercent: calc.dpPercent, dpAmount: calc.dpAmount, codAmount: calc.codAmount, total: calc.total, deliveryType: checkout.deliveryType, pooled: calc.pooled, participants: calc.participants, schedule: checkout.deliveryType === 'express' ? 'Menunggu konfirmasi admin' : checkout.schedule, status: 'waiting_payment', paymentMethod: checkout.paymentMethod, paymentProof: '', storeStatus: 'new', createdAt: new Date().toLocaleString('id-ID'), notes: checkout.notes };
  state.orders.unshift(order); state.cart = []; state.pendingProof = ''; saveState(); navigate(`/payment/${orderId}`); showToast('Pesanan berhasil dibuat. Lanjutkan pembayaran DP.');
}
function savePaymentProof() {
  const orderId = currentRoute().split('/')[2]; const order = getOrder(orderId);
  if (!order) return;
  if (!state.pendingProof) return showToast('Pilih file bukti pembayaran terlebih dahulu.', 'error');
  order.paymentProof = state.pendingProof;
  saveState(); render(); showToast('Bukti pembayaran tersimpan pada simulasi. Menunggu verifikasi admin.');
}
function saveConfig() {
  const pickup = Number(document.getElementById('config-pickup')?.value);
  const service = Number(document.getElementById('config-service')?.value);
  const express = Number(document.getElementById('config-express')?.value);
  const dp = Number(document.getElementById('config-dp')?.value);
  if ([pickup,service,express,dp].some((v) => !Number.isFinite(v) || v < 0) || dp > 100) return showToast('Periksa kembali nilai konfigurasi.', 'error');
  state.config = { pickupCost: pickup, serviceFee: service, expressFee: express, dpPercent: dp }; state.checkout.dpPercent = dp; saveState(); render(); showToast('Konfigurasi demo berhasil disimpan.');
}

function handleSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === 'search') {
    state.search = form.querySelector('input[name="q"]').value.trim(); state.category = 'all'; saveState(); navigate('/catalog');
  }
}
function handleChange(event) {
  const target = event.target;
  if (target.name === 'deliveryType') { state.checkout.deliveryType = target.value; if (target.value === 'express') state.checkout.pooled = false; saveState(); render(); }
  if (target.name === 'pooled') { state.checkout.pooled = target.checked; saveState(); render(); }
  if (target.name === 'schedule') { state.checkout.schedule = target.value; saveState(); }
  if (target.name === 'paymentMethod') { state.checkout.paymentMethod = target.value; saveState(); render(); }
  if (target.name === 'notes') { state.checkout.notes = target.value; saveState(); }
  if (target.id === 'proof-file' && target.files?.[0]) {
    const file = target.files[0];
    if (file.size > 5 * 1024 * 1024) { showToast('Ukuran file maksimal 5 MB.', 'error'); target.value = ''; return; }
    state.pendingProof = file.name; const proofName = document.getElementById('proof-name'); if (proofName) proofName.innerHTML = `${icon('check',15)} ${escapeHtml(file.name)}`;
  }
  if (target.id === 'sort-products') {
    if (target.value === 'price-low') products.sort((a,b)=>a.price-b.price);
    if (target.value === 'price-high') products.sort((a,b)=>b.price-a.price);
    if (target.value === 'popular') products.sort((a,b)=>b.rating-a.rating);
    render();
  }
}

document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('change', handleChange);
window.addEventListener('hashchange', render);
if (!location.hash) location.hash = '/';
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
