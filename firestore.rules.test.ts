/**
 * Verification suite for Firestore Security Rules ("Dirty Dozen" Payloads)
 */
export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Private Seller Read',
    operation: 'get',
    path: 'listings_private/listing-1024',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Spoofed Unverified Admin Email',
    operation: 'create',
    path: 'listings/listing-1024',
    auth: { uid: 'attacker-1', email: '1996firebase1@gmail.com', email_verified: false },
    payload: { title: 'Spoofed Listing' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Listing',
    operation: 'create',
    path: 'listings/listing-1024',
    auth: { uid: 'admin-1', email: '1996firebase1@gmail.com', email_verified: true },
    payload: {
      title: 'Valid Title',
      description: 'Valid Desc',
      displayPrice: 1000,
      currency: 'USD',
      provinceId: 'baghdad',
      categoryId: 'cars',
      status: 'available',
      refNumber: '#1024',
      authorUid: 'admin-1',
      sellerSecretPhone: '07701234567',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Public Write to Listings',
    operation: 'update',
    path: 'listings/listing-1024',
    auth: null,
    payload: { status: 'sold' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Stats Counter Arbitrary Jump Attack',
    operation: 'update',
    path: 'listing_stats/listing-1024',
    auth: null,
    payload: { clicks: 999999, secondaryClicks: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Public Read of Stats Collection',
    operation: 'get',
    path: 'listing_stats/listing-1024',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Stats Creation',
    operation: 'create',
    path: 'listing_stats/non-existent-listing',
    auth: null,
    payload: { clicks: 1, secondaryClicks: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Self-Assigned Admin Privilege Escalation',
    operation: 'create',
    path: 'admins/user-99',
    auth: { uid: 'user-99', email: 'visitor@example.com', email_verified: true },
    payload: {
      email: 'visitor@example.com',
      name: 'Hacker',
      role: 'admin',
      canViewFinancials: true,
      canDelete: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning Attack with Special Characters',
    operation: 'create',
    path: 'listings/invalid$id!@#',
    auth: { uid: 'admin-1', email: '1996firebase1@gmail.com', email_verified: true },
    payload: { title: 'Test' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Denial-of-Wallet String Overflow',
    operation: 'create',
    path: 'tags/tag-1',
    auth: { uid: 'admin-1', email: '1996firebase1@gmail.com', email_verified: true },
    payload: { name: 'A'.repeat(500), slug: 'valid-slug' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Immutable Field Tampering on Update',
    operation: 'update',
    path: 'listings/listing-1024',
    auth: { uid: 'admin-1', email: '1996firebase1@gmail.com', email_verified: true },
    payload: { authorUid: 'different-uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Lead List Query',
    operation: 'list',
    path: 'leads',
    auth: { uid: 'visitor-1', email: 'visitor@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
