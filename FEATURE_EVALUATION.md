# HATOP MVP — Feature Evaluation & Product Decisions

This document records how the proposal's ideas were translated into the deployable prototype and what must be completed before real operations.

## 1. Product structure

| Proposal concept | MVP decision | Reason / implementation |
|---|---|---|
| Dedicated responsive website | **Include (P0)** | The website is the primary transaction channel. The UI is responsive and includes a PWA manifest. |
| Farmer, store, and pickup accounts | **Include (P0)** | Separate role dashboards and journeys are provided. |
| Central HATOP admin | **Include (P0)** | Admin controls payment verification, pooling, driver assignment, partners, and proposal financial assumptions. |
| Public landing page | **Include (P0)** | Explains the service, value proposition, delivery model, and operating area. |
| Agricultural catalog | **Include (P0)** | Product cards, category filters, search, detail pages, stock labels, and cart. |
| Pooling order | **Include (P0)** | Central differentiator. Checkout estimates shared cost and admin can assign a ready group. |
| Automatic shipping estimate | **Include as deterministic demo logic (P0)** | Calculates regular pooling, solo regular, and Express. The production price must be confirmed with pickup partners. |
| Tuesday / Friday schedule | **Include (P0)** | Configured as selectable demo schedules. Admin must confirm actual cut-off times and dispatch windows. |
| Express delivery | **Include (P0)** | Separate from pooling, with the proposal's Rp25,000 additional fee shown transparently. |
| Farming Package | **Include (P1)** | Product/package detail and cart entry are provided. Package contents remain configurable by the store and must be reviewed for agronomic suitability. |
| DP shipping + COD after visual check | **Include (P0)** | Payment page, proof filename upload, admin verification, inspection step, COD method selection, and settlement status. |
| Store stock confirmation | **Include (P0)** | Store confirms stock and marks goods ready before admin can assign a pickup group. |
| Driver assignment and delivery status | **Include (P0)** | Driver can confirm pickup and arrival. Capacity verification remains a human/admin step in this prototype. |
| Delivery evidence | **Partially include** | UI/flow is prepared conceptually, but evidence upload is not persisted to server storage. |
| Verified partners / Trusted Partner | **Include as admin workflow concept (P1)** | Partner directory and demo verification state. Real identity and vehicle document checks are not connected. |
| Ratings and reviews | **Include as local demo interaction (P1)** | Rating interaction is provided; production moderation and review persistence are still needed. |
| Member Tani Setia | **Include as demo logic (P1)** | One point per completed order; five points can create a Rp20,000 service-fee voucher. Production expiry and voucher application need server-side enforcement. |
| Referral program | **Include as concept (P1)** | Referral code can be copied; referral qualification and reward settlement require backend logic. |
| Store subscription | **Include as informational module (P1)** | Rp50,000/month and first-month onboarding are shown; billing is not automated. |
| Weekly store report | **Include as demo report (P1)** | Summary table and CSV export are available from local demo records. |
| Financial logbook and projections | **Include (P1)** | Proposal-based cashflow projection is shown separately from demo orders. |
| WhatsApp notifications | **Prepare as support entry point only** | No WhatsApp Business API is connected. Replace the placeholder number and integrate an approved gateway before launch. |
| Live GPS tracking | **Postpone** | The proposal only requires status tracking in the initial system. Live GPS needs driver consent, device permissions, mapping, and network handling. |
| AI route optimization | **Postpone** | The proposal places this after enough operational data exists. It is not needed to validate pooling. |
| Advanced agricultural recommendations | **Postpone** | Product/package composition must first be validated with local stores and agricultural extension personnel. |
| App-store distribution | **Do not prioritize** | The proposal selects a dedicated website. PWA installation is enough for the first release. |
| Third-party marketplace / flash sale | **Do not prioritize** | Would distract from HATOP's own transaction and shared-logistics mechanism. |

## 2. Checkout and payment decisions

The proposal supports a down payment on shipping and COD settlement after visual inspection, but it does not define a DP percentage. The prototype therefore uses **50% of the shipping amount as an editable demonstration assumption**. The admin can change the assumption in the settings page.

For a regular pooled trip with two orders:

| Component | Amount |
|---|---:|
| Pickup cost assumption per trip | Rp400,000 |
| Shared shipping per order | Rp200,000 |
| HATOP service fee per order | Rp20,000 |
| Demo DP (50% of shipping) | Rp100,000 |
| COD balance | Product subtotal + Rp100,000 remaining shipping + Rp20,000 service fee |

The checkout displays the full breakdown before the user creates the order. Express is not pooled in this prototype and adds Rp25,000 as stated in the proposal.

**Production decision required:** confirm whether the service fee is collected in the DP or COD stage, define the exact DP policy, set payment cut-off times, and document who receives the COD cash. The prototype keeps the service fee in the COD balance for transparency and because the proposal only explicitly describes DP on shipping.

QRIS and bank transfer screens are placeholders. No real QR code, bank account, payment processor, or payment webhook is connected.

## 3. Pooling rules

The first MVP uses a simple pooling rule:

1. Delivery type must be Regular.
2. Orders must share the destination text and selected schedule.
3. Store stock must be confirmed.
4. Store must mark goods ready for pickup.
5. Admin checks combined cargo weight against the verified vehicle capacity.
6. Admin assigns the driver.

The proposal does not specify a complete capacity algorithm, dispatch cut-off, or how a partial pool is handled. Those must be confirmed operationally. Do not treat the illustrative 430 kg group as a universal vehicle load limit.

## 4. Demo data versus proposal data

### Proposal-derived business assumptions

- Operating corridor: Balige–Laguboti–Silaen, Kabupaten Toba.
- Regular schedule: Tuesday and Friday.
- Pickup cost estimate: Rp400,000/trip.
- Service fee: Rp20,000/order.
- Express surcharge: Rp25,000.
- Store subscription: Rp50,000/month.
- Farming Package fee: 5%.
- Initial pooling illustration: two orders per trip.
- Financial projection for years 1 and 2 as documented in the proposal.

### Prototype-only assumptions and records

- DP: 50% of shipping.
- Product prices, product stock, partner names, order IDs, user identities, timestamps, and order progress.
- Illustrative schedule dates in November 2026.
- QRIS/bank instructions and account details.
- Illustrative map/route presentation.

These are clearly marked as demo data in the UI or README. They must be replaced with verified information before public commercial use.

## 5. Security and compliance required before launch

1. Real authentication and role-based authorization.
2. Database persistence shared across devices and users.
3. Row Level Security (RLS) policies for farmers, stores, drivers, and admins.
4. Private evidence storage with signed URLs.
5. Server-side pricing, pooling, stock reservation, and order-state validation.
6. Payment-provider integration and verified payment webhooks.
7. Audit logs for payment verification, order changes, and partner approval.
8. Privacy consent, retention rules, and data access controls aligned with UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.
9. Partner identity, vehicle, and applicable transport compliance review before activation.
10. Official support WhatsApp number, customer complaint SOP, cancellation/refund policy, and delivery evidence SOP.

## 6. Acceptance criteria for the prototype

- A farmer can search products, add to cart, choose Regular or Express, calculate a transparent checkout, create an order, and submit a demo DP proof filename.
- An admin can verify a submitted DP.
- A store can confirm stock and mark goods ready.
- An admin can assign a ready pooling group to a pickup partner.
- A driver can confirm pickup and arrival.
- A farmer can confirm visual inspection, confirm COD settlement, and complete the order.
- The order status and financial breakdown remain consistent across role dashboards in the same browser.
- All primary screens render at desktop and mobile widths.
- Automated business-logic tests pass.

## 7. Current technical boundary

The ZIP is a deployable static frontend. Browser `localStorage` makes the demo state persistent only in the same browser profile. It is suitable for demonstrating UI, navigation, business flow, and pricing assumptions. It is not yet suitable for real multi-user transactions or live customer payments.


## Pembaruan katalog untuk versi riset

Katalog telah diperluas menjadi tujuh kategori. Penjual dan stok lokal belum diverifikasi. Harga dibedakan menjadi referensi nasional, estimasi demo, dan perlu konfirmasi lokal. Lihat `CATALOG_SOURCES.md` dan `RESEARCH_NOTES.md`.
