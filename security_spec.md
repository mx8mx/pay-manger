# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Split-Collection PII Isolation**:
   - `/listings/{listingId}` contains strictly public fields (`title`, `description`, `specs`, `images`, `displayPrice`, `currency`, `provinceId`, `categoryId`, `tagIds`, `customFields`, `status`, `refNumber`, `cta`, `authorUid`, `createdAt`, `updatedAt`, `soldAt`).
   - `/listings_private/{listingId}` contains strictly private seller PII and commission fields (`sellerName`, `sellerPhone`, `sellerProfileUrl`, `sellerAskingPrice`, `finalSalePrice`, `commissionType`, `commissionValue`, `commissionAmount`, `commissionPaid`, `commissionPaidAt`, `notes`, `lastContactAt`, `authorUid`, `createdAt`, `updatedAt`). Read and write access is strictly restricted to verified admins (`isAdmin()`).
2. **Admin Identity & Email Verification Invariant**:
   - Admin privileges require `request.auth != null && request.auth.token.email_verified == true` AND either the bootstrapped owner email (`1996firebase1@gmail.com`) or an existing document in `/admins/$(request.auth.uid)`.
3. **Public CTA Counter Isolation**:
   - `/listing_stats/{listingId}` allows public increments (`+1`) on `clicks` or `secondaryClicks` only when the parent `/listings/{listingId}` exists, while `get` and `list` are restricted strictly to `isAdmin()`.
4. **Temporal & Identity Integrity**:
   - All `create` operations must set `createdAt == request.time` and `authorUid == request.auth.uid` (where applicable).
   - All `update` operations must set `updatedAt == request.time` and preserve immutable fields (`createdAt`, `authorUid`).
5. **Path & Payload Boundary Hardening**:
   - All single-document target operations validate `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, `size() <= 128`).
   - Every string and list is strictly bounded by `.size()` checks.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Private Seller Read**: Anonymous user attempts `get(/listings_private/item-1)` to steal `sellerPhone`.
2. **Spoofed Unverified Admin Email**: Authenticated user with `email: "1996firebase1@gmail.com"` and `email_verified: false` attempts to write to `/listings/item-1`.
3. **Shadow Field Injection on Listing**: Admin attempts to create `/listings/item-1` with an undeclared field `sellerSecretPhone: "07700000000"`.
4. **Public Write to Listings**: Anonymous visitor attempts to update `/listings/item-1` status to `"sold"`.
5. **Stats Counter Reset Attack**: Anonymous visitor attempts to set `clicks: 0` or `clicks: 999999` on `/listing_stats/item-1` instead of incrementing by `+1`.
6. **Public Read of Stats Collection**: Visitor attempts `get(/listing_stats/item-1)` to spy on broker performance metrics.
7. **Orphaned Stats Creation**: Visitor attempts to create `/listing_stats/non-existent-id` where `/listings/non-existent-id` does not exist.
8. **Self-Assigned Admin Privilege Escalation**: Regular signed-in user attempts `create(/admins/their-uid, { role: "admin", ... })`.
9. **ID Poisoning Attack**: Attacker sends a 500-character document ID containing special characters to `/listings/{listingId}`.
10. **Denial-of-Wallet String Overflow**: Attacker sends a 50,000-character `description` string to `/listings/item-1`.
11. **Immutable Field Tampering**: Admin attempts to modify `createdAt` or `authorUid` during an update on `/listings/item-1`.
12. **Unauthorized Lead Read**: Signed-in non-admin user attempts `list(/leads)` to scrape interested buyers' phone numbers.
