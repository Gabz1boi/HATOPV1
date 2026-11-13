import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCheckout, transitionOrder, getOrderTimeline, formatRupiah } from '../src/domain.mjs';

test('pooling checkout splits pickup cost and calculates DP only on shipping', () => {
  const result = calculateCheckout({
    subtotal: 160000,
    deliveryType: 'regular',
    pooled: true,
    participants: 2,
    serviceFee: 20000,
    dpPercent: 50,
  });
  assert.equal(result.shipping, 200000);
  assert.equal(result.serviceFee, 20000);
  assert.equal(result.dpAmount, 100000);
  assert.equal(result.payNow, 100000);
  assert.equal(result.codAmount, 280000);
  assert.equal(result.total, 380000);
});

test('express checkout adds surcharge and does not use pooling', () => {
  const result = calculateCheckout({
    subtotal: 100000,
    deliveryType: 'express',
    pooled: true,
    participants: 2,
    serviceFee: 20000,
    expressFee: 25000,
    dpPercent: 50,
  });
  assert.equal(result.shipping, 400000);
  assert.equal(result.expressFee, 25000);
  assert.equal(result.dpAmount, 200000);
  assert.equal(result.codAmount, 345000);
});

test('checkout rejects invalid DP percentage', () => {
  assert.throws(() => calculateCheckout({ subtotal: 1000, dpPercent: 120 }), /DP percentage/);
});

test('order status transitions follow the defined delivery lifecycle', () => {
  assert.equal(transitionOrder('waiting_payment', 'verify_dp'), 'waiting_stock');
  assert.equal(transitionOrder('inspection', 'goods_ok'), 'cod_due');
  assert.equal(transitionOrder('cod_due', 'settle_cod'), 'completed');
  assert.throws(() => transitionOrder('completed', 'verify_dp'), /not allowed/);
});

test('timeline returns the lifecycle labels and current marker', () => {
  const timeline = getOrderTimeline('in_transit');
  assert.equal(timeline.find((step) => step.key === 'in_transit').current, true);
  assert.equal(timeline.length, 8);
});

test('rupiah formatter uses Indonesian currency formatting', () => {
  assert.equal(formatRupiah(220000), 'Rp220.000');
});

test('complete order journey can progress from DP to COD completion', () => {
  let status = 'waiting_payment';
  status = transitionOrder(status, 'verify_dp');
  status = transitionOrder(status, 'confirm_stock');
  status = transitionOrder(status, 'assign_driver');
  status = transitionOrder(status, 'pickup');
  status = transitionOrder(status, 'arrive');
  status = transitionOrder(status, 'goods_ok');
  status = transitionOrder(status, 'settle_cod');
  assert.equal(status, 'completed');
});

test('regular delivery without pooling charges the full pickup trip', () => {
  const result = calculateCheckout({ subtotal: 100000, deliveryType: 'regular', pooled: false, participants: 2, dpPercent: 50 });
  assert.equal(result.shipping, 400000);
  assert.equal(result.pooled, false);
  assert.equal(result.dpAmount, 200000);
});
