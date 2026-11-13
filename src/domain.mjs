export function calculateCheckout({
  subtotal = 0,
  deliveryType = 'regular',
  pooled = true,
  participants = 2,
  pickupCost = 400000,
  serviceFee = 20000,
  expressFee = 25000,
  dpPercent = 50,
} = {}) {
  if (!Number.isFinite(subtotal) || subtotal < 0) throw new Error('Subtotal must be a non-negative number');
  if (!Number.isFinite(dpPercent) || dpPercent < 0 || dpPercent > 100) throw new Error('DP percentage must be between 0 and 100');
  if (!Number.isFinite(participants) || participants < 1) throw new Error('Participants must be at least one');
  const isExpress = deliveryType === 'express';
  const canPool = deliveryType === 'regular' && pooled && participants > 1;
  const shipping = canPool ? Math.ceil(pickupCost / participants) : pickupCost;
  const appliedExpressFee = isExpress ? expressFee : 0;
  const dpAmount = Math.round(shipping * dpPercent / 100);
  const total = subtotal + shipping + serviceFee + appliedExpressFee;
  const codAmount = total - dpAmount;
  return {
    subtotal,
    shipping,
    serviceFee,
    expressFee: appliedExpressFee,
    dpPercent,
    dpAmount,
    payNow: dpAmount,
    codAmount,
    total,
    pooled: canPool,
    participants: canPool ? participants : 1,
  };
}

const transitions = {
  waiting_payment: { verify_dp: 'waiting_stock' },
  waiting_stock: { confirm_stock: 'pooling', stock_issue: 'needs_attention' },
  pooling: { assign_driver: 'assigned', close_pooling: 'assigned' },
  assigned: { pickup: 'in_transit', cancel: 'cancelled' },
  in_transit: { arrive: 'inspection', delivery_issue: 'needs_attention' },
  inspection: { goods_ok: 'cod_due', report_issue: 'needs_attention' },
  cod_due: { settle_cod: 'completed', report_issue: 'needs_attention' },
  needs_attention: { resolve: 'waiting_stock', cancel: 'cancelled' },
};

export function transitionOrder(status, action) {
  const next = transitions[status]?.[action];
  if (!next) throw new Error(`Transition ${action} is not allowed from ${status}`);
  return next;
}

const lifecycle = [
  ['waiting_payment', 'Menunggu DP'],
  ['waiting_stock', 'Konfirmasi stok toko'],
  ['pooling', 'Penggabungan pesanan'],
  ['assigned', 'Pickup ditugaskan'],
  ['in_transit', 'Dalam perjalanan'],
  ['inspection', 'Pemeriksaan barang'],
  ['cod_due', 'Pelunasan COD'],
  ['completed', 'Pesanan selesai'],
];

export function getOrderTimeline(status) {
  const currentIndex = lifecycle.findIndex(([key]) => key === status);
  const attentionIndex = status === 'needs_attention' ? 1 : -1;
  return lifecycle.map(([key, label], index) => ({
    key,
    label,
    completed: currentIndex >= 0 && index < currentIndex,
    current: key === status || (attentionIndex === index),
    pending: currentIndex >= 0 && index > currentIndex,
  }));
}

export function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace(/\s/g, '');
}
