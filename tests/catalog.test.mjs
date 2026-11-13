import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, products } from '../src/data.mjs';

test('catalog has the seven HATOP product categories', () => {
  assert.deepEqual(categories.map((category) => category.id), [
    'benih', 'pupuk', 'perlindungan', 'alat', 'irigasi', 'pakan', 'paket'
  ]);
});

test('every catalog item discloses price and local seller verification status', () => {
  assert.ok(products.length >= 20);
  for (const product of products) {
    assert.ok(product.name, `missing name for ${product.id}`);
    assert.ok(product.unit, `missing unit for ${product.id}`);
    assert.ok(['reference-national', 'demo-estimate', 'contact-local'].includes(product.priceStatus));
    assert.equal(product.sellerStatus, 'Belum terverifikasi di Balige');
    if (product.priceStatus === 'reference-national') {
      assert.ok(product.price > 0);
      assert.ok(product.priceSource.startsWith('https://'));
    }
    if (product.priceStatus === 'contact-local') assert.equal(product.price, null);
  }
});
