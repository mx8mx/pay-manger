import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const PRIMARY_ADMIN_EMAIL = '1996firebase1@gmail.com';

// Mandatory connection validation on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Converts any Arabic-Indic or Eastern Arabic numerals to strictly Latin numerals (0-9)
 * as mandated in Section 4.2.
 */
export function toLatinDigits(input: string | number): string {
  const str = String(input ?? '');
  return str
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/**
 * Formats numbers using Latin digits (en-US locale) with Iraqi Dinar (د.ع) label always.
 */
export function formatPrice(amount: number, _currency: 'IQD' | 'USD' = 'IQD'): string {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount || 0);

  return `${formattedNumber} د.ع`;
}

/**
 * Normalizes Iraqi phone numbers automatically:
 * 07XXXXXXXXX -> 9647XXXXXXXXX
 * +9647XXXXXXXXX -> 9647XXXXXXXXX
 * 009647XXXXXXXXX -> 9647XXXXXXXXX
 */
export function normalizeIraqiPhone(rawPhone: string): string {
  const latin = toLatinDigits(rawPhone).replace(/[^\d]/g, '');
  if (!latin) return '';
  if (latin.startsWith('00964')) {
    return '964' + latin.slice(5);
  }
  if (latin.startsWith('964')) {
    return latin;
  }
  if (latin.startsWith('07') && latin.length === 11) {
    return '964' + latin.slice(1);
  }
  if (latin.startsWith('7') && latin.length === 10) {
    return '964' + latin;
  }
  return latin;
}

/**
 * Formats CTA WhatsApp message template replacing {title}, {refNumber}, {price}, {province}, {url}
 */
export function formatCtaMessage(
  template: string,
  vars: {
    title: string;
    refNumber: string;
    price: string;
    province: string;
    url: string;
  }
): string {
  return template
    .replace(/\{title\}/g, vars.title)
    .replace(/\{refNumber\}/g, vars.refNumber)
    .replace(/\{price\}/g, vars.price)
    .replace(/\{province\}/g, vars.province)
    .replace(/\{url\}/g, vars.url);
}
