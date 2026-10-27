/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  Phone,
  X,
  PlusCircle,
} from 'lucide-react';
import {
  auth,
  db,
  PRIMARY_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  toLatinDigits,
  normalizeIraqiPhone,
} from './lib/firebase';
import {
  INITIAL_BROKER_LISTINGS,
  INITIAL_CATEGORIES,
  INITIAL_PROVINCES,
  INITIAL_TAGS,
  INITIAL_LEADS,
  INITIAL_ACTIVITY_LOGS,
  DEFAULT_PUBLIC_SETTINGS,
  DEFAULT_PRIVATE_SETTINGS,
  mapBrokerListingToDemo,
} from './lib/demoAssets';
import {
  BrokerListing,
  BrokerListingPrivate,
  CategoryItem,
  ProvinceItem,
  TagItem,
  BuyerLead,
  ActivityLogEntry,
  PublicSettingsConfig,
  PrivateSettingsConfig,
} from './types/broker';
import {
  ListingStatus,
  SoldCalculationModal,
  ConfirmDeleteModal,
  Button,
} from './components/DesignSystemPrimitives';
import { Phase1DesignLab } from './components/Phase1DesignLab';
import { PublicStorefrontPreview } from './components/PublicStorefrontPreview';
import { Phase2AuthAndSecurity } from './components/Phase2AuthAndSecurity';
import { ListingFormModal } from './components/ListingFormModal';

type ActiveView = 'public-storefront' | 'phase2-admin' | 'phase1-lab';

function formatFirestoreDate(val: unknown, includeTime = false): string {
  const now = new Date();
  let dateObj: Date = now;

  if (val instanceof Timestamp) {
    dateObj = val.toDate();
  } else if (
    val &&
    typeof val === 'object' &&
    'seconds' in val &&
    typeof (val as { seconds: unknown }).seconds === 'number'
  ) {
    dateObj = new Date((val as { seconds: number }).seconds * 1000);
  } else if (typeof val === 'string' && val.trim().length > 0) {
    return val;
  }

  const ymd = dateObj.toISOString().slice(0, 10);
  if (!includeTime) return ymd;
  const hm = dateObj.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${ymd} ${hm}`;
}

function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 120) || `doc_${Date.now()}`;
}

const EMPTY_PRIVATE_DATA: BrokerListingPrivate = {
  sellerName: 'غير محدد',
  sellerPhone: '0000000000',
  sellerProfileUrl: '',
  sellerAskingPrice: 0,
  commissionType: 'fixed',
  commissionValue: 0,
  commissionAmount: 0,
  commissionPaid: 'no',
  notes: '',
};

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('public-storefront');

  // Raw Firestore Maps for combining public listings + private seller data + click stats
  const [publicListingsMap, setPublicListingsMap] = useState<
    Record<string, Omit<BrokerListing, 'privateData' | 'clicks' | 'secondaryClicks'>>
  >({});
  const [privateListingsMap, setPrivateListingsMap] = useState<
    Record<string, BrokerListingPrivate>
  >({});
  const [statsMap, setStatsMap] = useState<
    Record<string, { clicks: number; secondaryClicks: number }>
  >({});
  const [hasLoadedFirestoreListings, setHasLoadedFirestoreListings] =
    useState(false);

  // Core Application State
  const [fallbackListings, setFallbackListings] = useState<BrokerListing[]>(
    INITIAL_BROKER_LISTINGS
  );
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [provinces, setProvinces] = useState<ProvinceItem[]>(INITIAL_PROVINCES);
  const [tags, setTags] = useState<TagItem[]>(INITIAL_TAGS);
  const [leads, setLeads] = useState<BuyerLead[]>(INITIAL_LEADS);
  const [activityLogs, setActivityLogs] =
    useState<ActivityLogEntry[]>(INITIAL_ACTIVITY_LOGS);
  const [publicSettings, setPublicSettings] =
    useState<PublicSettingsConfig>(DEFAULT_PUBLIC_SETTINGS);
  const [privateSettings, setPrivateSettings] =
    useState<PrivateSettingsConfig>(DEFAULT_PRIVATE_SETTINGS);

  // Track existing document IDs in Firestore to distinguish create vs update
  const syncedListingIdsRef = useRef<Set<string>>(new Set());
  const syncedPrivateIdsRef = useRef<Set<string>>(new Set());
  const syncedCategoryIdsRef = useRef<Set<string>>(new Set());
  const syncedTagIdsRef = useRef<Set<string>>(new Set());
  const syncedProvinceIdsRef = useRef<Set<string>>(new Set());
  const syncedLeadIdsRef = useRef<Set<string>>(new Set());
  const syncedSellerIdsRef = useRef<Set<string>>(new Set());
  const syncedCategoryTagIdsRef = useRef<Set<string>>(new Set());
  const hasPublicSettingsDocRef = useRef<boolean>(false);
  const hasPrivateSettingsDocRef = useRef<boolean>(false);
  const autoSeedTriggeredRef = useRef<boolean>(false);

  const [selectedListingId, setSelectedListingId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('listing');
    }
    return null;
  });

  // Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modals & Toasts
  const [isListingFormOpen, setIsListingFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<BrokerListing | null>(null);
  const [soldModalListing, setSoldModalListing] = useState<BrokerListing | null>(null);
  const [deletingListing, setDeletingListing] = useState<BrokerListing | null>(null);
  const [deleteModalTitle, setDeleteModalTitle] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdminSignedIn =
    Boolean(user) &&
    user?.emailVerified === true &&
    user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  // Combine public listings + private data + stats from Firestore when available,
  // or fall back to initial listings only if Firestore has not been seeded yet.
  const listings: BrokerListing[] = useMemo(() => {
    const pubEntries = Object.values(publicListingsMap);
    if (pubEntries.length === 0 && !hasLoadedFirestoreListings) {
      return fallbackListings;
    }
    if (pubEntries.length === 0 && syncedListingIdsRef.current.size === 0) {
      return fallbackListings;
    }

    return pubEntries
      .map((pub) => {
        const priv =
          privateListingsMap[pub.id] ||
          fallbackListings.find((f) => f.id === pub.id)?.privateData ||
          EMPTY_PRIVATE_DATA;
        const st = statsMap[pub.id] || { clicks: 0, secondaryClicks: 0 };
        return {
          ...pub,
          clicks: st.clicks,
          secondaryClicks: st.secondaryClicks,
          privateData: priv,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [
    publicListingsMap,
    privateListingsMap,
    statsMap,
    hasLoadedFirestoreListings,
    fallbackListings,
  ]);

  // 1. Public & Admin Real-time Listeners for Categories, Tags, Provinces, Public Settings, and Public Listings
  useEffect(() => {
    if (authLoading) return;

    // A. Public Settings
    const unsubPubSettings = onSnapshot(
      doc(db, 'settings', 'public'),
      (snap) => {
        hasPublicSettingsDocRef.current = snap.exists();
        if (snap.exists()) {
          const data = snap.data();
          setPublicSettings({
            siteName: String(data.siteName || DEFAULT_PUBLIC_SETTINGS.siteName),
            brokerPhone: String(
              data.brokerPhone || DEFAULT_PUBLIC_SETTINGS.brokerPhone
            ),
            defaultCurrency: 'IQD',
            hideSoldListings: Boolean(data.hideSoldListings),
            defaultCtaType:
              data.defaultCtaType || DEFAULT_PUBLIC_SETTINGS.defaultCtaType,
            defaultCtaLabel: String(
              data.defaultCtaLabel || DEFAULT_PUBLIC_SETTINGS.defaultCtaLabel
            ),
            defaultCtaMessage: String(
              data.defaultCtaMessage || DEFAULT_PUBLIC_SETTINGS.defaultCtaMessage
            ),
            defaultCtaColor: String(
              data.defaultCtaColor || DEFAULT_PUBLIC_SETTINGS.defaultCtaColor
            ),
          });
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'settings/public');
        } catch {
          // Handled
        }
      }
    );

    // B. Categories (Public queries visible==true, Admin queries all)
    const categoriesRef = isAdminSignedIn
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('visible', '==', true));

    const unsubCategories = onSnapshot(
      categoriesRef,
      (snap) => {
        syncedCategoryIdsRef.current = new Set(snap.docs.map((d) => d.id));
        if (!snap.empty) {
          const loadedCats: CategoryItem[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data.name || ''),
                slug: String(data.slug || d.id),
                icon: String(data.icon || 'Package'),
                order: Number(data.order ?? 1),
                visible: data.visible !== false,
                allowedTagIds: Array.isArray(data.allowedTagIds)
                  ? data.allowedTagIds.map(String)
                  : [],
                customFieldDefs: [],
              };
            })
            .sort((a, b) => a.order - b.order);
          setCategories(loadedCats);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'categories');
        } catch {
          // Handled
        }
      }
    );

    // C. Tags
    const tagsQuery = isAdminSignedIn
      ? collection(db, 'tags')
      : query(collection(db, 'tags'), where('slug', '>=', ''));

    const unsubTags = onSnapshot(
      tagsQuery,
      (snap) => {
        syncedTagIdsRef.current = new Set(snap.docs.map((d) => d.id));
        if (!snap.empty) {
          const loadedTags: TagItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              slug: String(data.slug || d.id),
            };
          });
          setTags(loadedTags);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'tags');
        } catch {
          // Handled
        }
      }
    );

    // D. Provinces
    const provincesQuery = isAdminSignedIn
      ? collection(db, 'provinces')
      : query(collection(db, 'provinces'), where('order', '>=', 0));

    const unsubProvinces = onSnapshot(
      provincesQuery,
      (snap) => {
        syncedProvinceIdsRef.current = new Set(snap.docs.map((d) => d.id));
        if (!snap.empty) {
          const loadedProvs: ProvinceItem[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data.name || ''),
                order: Number(data.order ?? 1),
              };
            })
            .sort((a, b) => a.order - b.order);
          setProvinces(loadedProvs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'provinces');
        } catch {
          // Handled
        }
      }
    );

    // E. Public Listings
    const listingsQuery = isAdminSignedIn
      ? collection(db, 'listings')
      : query(
          collection(db, 'listings'),
          where('status', 'in', ['available', 'reserved', 'sold'])
        );

    const unsubListings = onSnapshot(
      listingsQuery,
      (snap) => {
        syncedListingIdsRef.current = new Set(snap.docs.map((d) => d.id));
        if (!snap.empty) {
          setHasLoadedFirestoreListings(true);
          const nextMap: Record<
            string,
            Omit<BrokerListing, 'privateData' | 'clicks' | 'secondaryClicks'>
          > = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            nextMap[d.id] = {
              id: d.id,
              refNumber: String(data.refNumber || d.id),
              title: String(data.title || ''),
              description: String(data.description || ''),
              specs: String(data.specs || ''),
              images: Array.isArray(data.images)
                ? data.images.map(String)
                : [],
              displayPrice: Number(data.displayPrice || 0),
              currency: 'IQD',
              provinceId: String(data.provinceId || 'baghdad'),
              categoryId: String(data.categoryId || 'general'),
              tagIds: Array.isArray(data.tagIds)
                ? data.tagIds.map(String)
                : [],
              customFields: {},
              status: (data.status as ListingStatus) || 'available',
              cta: data.cta
                ? {
                    type: data.cta.type || 'whatsapp',
                    label: String(data.cta.label || 'تواصل عبر واتساب'),
                    target: String(data.cta.target || ''),
                    message: String(data.cta.message || ''),
                    color: String(data.cta.color || '#25D366'),
                  }
                : {
                    type: 'whatsapp',
                    label: DEFAULT_PUBLIC_SETTINGS.defaultCtaLabel,
                    target: DEFAULT_PUBLIC_SETTINGS.brokerPhone,
                    message: DEFAULT_PUBLIC_SETTINGS.defaultCtaMessage,
                    color: '#25D366',
                  },
              createdAt: formatFirestoreDate(data.createdAt),
              updatedAt: formatFirestoreDate(data.updatedAt),
              ...(data.soldAt
                ? { soldAt: formatFirestoreDate(data.soldAt) }
                : {}),
            };
          });
          setPublicListingsMap(nextMap);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'listings');
        } catch {
          // Handled
        }
      }
    );

    return () => {
      unsubPubSettings();
      unsubCategories();
      unsubTags();
      unsubProvinces();
      unsubListings();
    };
  }, [authLoading, isAdminSignedIn]);

  // 2. Protected Admin Real-Time Listeners (listings_private, listing_stats, leads, activity_log, settings/private, sellers, category_tags)
  useEffect(() => {
    if (authLoading || !isAdminSignedIn || !user) {
      setPrivateListingsMap({});
      return;
    }

    const unsubPrivateListings = onSnapshot(
      collection(db, 'listings_private'),
      (snap) => {
        syncedPrivateIdsRef.current = new Set(snap.docs.map((d) => d.id));
        const nextPriv: Record<string, BrokerListingPrivate> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          nextPriv[d.id] = {
            sellerName: String(data.sellerName || 'غير محدد'),
            sellerPhone: String(data.sellerPhone || ''),
            sellerProfileUrl: String(data.sellerProfileUrl || ''),
            sellerAskingPrice: Number(data.sellerAskingPrice || 0),
            ...(data.finalSalePrice !== undefined
              ? { finalSalePrice: Number(data.finalSalePrice) }
              : {}),
            commissionType: 'fixed',
            commissionValue: Number(data.commissionValue || 0),
            commissionAmount: Number(data.commissionAmount || 0),
            commissionPaid:
              (data.commissionPaid as 'yes' | 'no' | 'partial') || 'no',
            ...(data.commissionPaidAt
              ? { commissionPaidAt: String(data.commissionPaidAt) }
              : {}),
            notes: String(data.notes || ''),
            ...(data.lastContactAt
              ? { lastContactAt: String(data.lastContactAt) }
              : {}),
          };
        });
        setPrivateListingsMap(nextPriv);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'listings_private');
        } catch {
          // Handled
        }
      }
    );

    const unsubStats = onSnapshot(
      collection(db, 'listing_stats'),
      (snap) => {
        const nextStats: Record<
          string,
          { clicks: number; secondaryClicks: number }
        > = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          nextStats[d.id] = {
            clicks: Number(data.clicks || 0),
            secondaryClicks: Number(data.secondaryClicks || 0),
          };
        });
        setStatsMap(nextStats);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'listing_stats');
        } catch {
          // Handled
        }
      }
    );

    const unsubLeads = onSnapshot(
      collection(db, 'leads'),
      (snap) => {
        syncedLeadIdsRef.current = new Set(snap.docs.map((d) => d.id));
        if (!snap.empty) {
          const loadedLeads: BuyerLead[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data.name || ''),
                phone: String(data.phone || ''),
                listingId: String(data.listingId || ''),
                status: (data.status as BuyerLead['status']) || 'new',
                notes: String(data.notes || ''),
                ...(data.referredToSellerAt
                  ? { referredToSellerAt: String(data.referredToSellerAt) }
                  : {}),
                createdAt: formatFirestoreDate(data.createdAt),
                updatedAt: formatFirestoreDate(data.updatedAt),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setLeads(loadedLeads);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'leads');
        } catch {
          // Handled
        }
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, 'activity_log'),
      (snap) => {
        if (!snap.empty) {
          const loadedLogs: ActivityLogEntry[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                action: String(data.action || ''),
                targetId: String(data.targetId || ''),
                details: String(data.details || ''),
                actorEmail: String(data.actorEmail || PRIMARY_ADMIN_EMAIL),
                createdAt: formatFirestoreDate(data.createdAt, true),
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setActivityLogs(loadedLogs);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'activity_log');
        } catch {
          // Handled
        }
      }
    );

    const unsubPrivSettings = onSnapshot(
      doc(db, 'settings', 'private'),
      (snap) => {
        hasPrivateSettingsDocRef.current = snap.exists();
        if (snap.exists()) {
          const data = snap.data();
          setPrivateSettings({
            fbPostTemplate: String(
              data.fbPostTemplate || DEFAULT_PRIVATE_SETTINGS.fbPostTemplate
            ),
            staleListingDays: Number(
              data.staleListingDays ?? DEFAULT_PRIVATE_SETTINGS.staleListingDays
            ),
          });
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'settings/private');
        } catch {
          // Handled
        }
      }
    );

    const unsubSellers = onSnapshot(
      collection(db, 'sellers'),
      (snap) => {
        syncedSellerIdsRef.current = new Set(snap.docs.map((d) => d.id));
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'sellers');
        } catch {
          // Handled
        }
      }
    );

    const unsubCatTags = onSnapshot(
      collection(db, 'category_tags'),
      (snap) => {
        syncedCategoryTagIdsRef.current = new Set(snap.docs.map((d) => d.id));
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'category_tags');
        } catch {
          // Handled
        }
      }
    );

    return () => {
      unsubPrivateListings();
      unsubStats();
      unsubLeads();
      unsubLogs();
      unsubPrivSettings();
      unsubSellers();
      unsubCatTags();
    };
  }, [authLoading, isAdminSignedIn, user]);

  // Sync URL query param for shareable listing URLs
  const handleSelectListingId = (id: string | null) => {
    setSelectedListingId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('listing', id);
      } else {
        url.searchParams.delete('listing');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const appendActivityLog = (action: string, targetId: string, details: string) => {
    const nowStr = `${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString(
      'en-US',
      { hour12: false, hour: '2-digit', minute: '2-digit' }
    )}`;
    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newEntry: ActivityLogEntry = {
      id: logId,
      action,
      targetId,
      details,
      actorEmail: user?.email || PRIMARY_ADMIN_EMAIL,
      createdAt: nowStr,
    };
    setActivityLogs((prev) => [newEntry, ...prev]);

    if (isAdminSignedIn && user) {
      void setDoc(doc(db, 'activity_log', logId), {
        action: action.slice(0, 120),
        targetId: (targetId || 'system').slice(0, 128),
        details: (details || '').slice(0, 1000),
        actorUid: user.uid,
        actorEmail: (user.email || PRIMARY_ADMIN_EMAIL).slice(0, 160),
        createdAt: serverTimestamp(),
      }).catch((error) => {
        try {
          handleFirestoreError(error, OperationType.CREATE, `activity_log/${logId}`);
        } catch {
          // Handled
        }
      });
    }
  };

  // Atomic Firestore Write for Public + Private Listing Documents + Seller Directory Record
  const syncListingToFirestore = async (item: BrokerListing) => {
    if (!isAdminSignedIn || !user) return;
    const cleanId = sanitizeDocId(item.id);
    const isExistingPub = syncedListingIdsRef.current.has(cleanId);
    const isExistingPriv = syncedPrivateIdsRef.current.has(cleanId);

    try {
      const batch = writeBatch(db);
      const pubRef = doc(db, 'listings', cleanId);
      const privRef = doc(db, 'listings_private', cleanId);

      const safeTitle = (item.title || 'منشور بدون عنوان').slice(0, 160);
      const safeDesc = (item.description || safeTitle).slice(0, 4000);
      const safeSpecs = (item.specs || '').slice(0, 2000);
      const safeProvinceId = sanitizeDocId(item.provinceId || 'baghdad');
      const safeCategoryId = sanitizeDocId(item.categoryId || 'general');
      const safeRefNumber = (item.refNumber || cleanId).slice(0, 20);
      const safeTagIds = (item.tagIds || [])
        .map((t) => sanitizeDocId(t).slice(0, 64))
        .slice(0, 10);

      const pubPayloadBase = {
        title: safeTitle,
        description: safeDesc,
        specs: safeSpecs,
        images: (item.images || []).slice(0, 10),
        displayPrice: Math.max(0, Number(item.displayPrice || 0)),
        currency: 'IQD',
        provinceId: safeProvinceId,
        categoryId: safeCategoryId,
        tagIds: safeTagIds,
        customFields: {},
        status: item.status,
        refNumber: safeRefNumber,
        cta: {
          type: item.cta.type,
          label: (item.cta.label || 'تواصل عبر واتساب').slice(0, 80),
          target: (item.cta.target || publicSettings.brokerPhone).slice(0, 120),
          message: (item.cta.message || '').slice(0, 500),
          color: (item.cta.color || '#25D366').slice(0, 20),
        },
        updatedAt: serverTimestamp(),
        ...(item.status === 'sold' ? { soldAt: serverTimestamp() } : {}),
      };

      if (isExistingPub) {
        batch.set(pubRef, pubPayloadBase, { merge: true });
      } else {
        batch.set(pubRef, {
          ...pubPayloadBase,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      const safeSellerName = (
        item.privateData.sellerName?.trim() || 'غير محدد'
      ).slice(0, 120);
      const safeSellerPhone = (
        item.privateData.sellerPhone?.trim() || '0000000000'
      ).slice(0, 30);

      const privPayloadBase = {
        sellerName: safeSellerName,
        sellerPhone: safeSellerPhone,
        sellerProfileUrl: (item.privateData.sellerProfileUrl || '').slice(0, 500),
        sellerAskingPrice: Math.max(
          0,
          Number(item.privateData.sellerAskingPrice ?? item.displayPrice ?? 0)
        ),
        ...(item.privateData.finalSalePrice !== undefined
          ? {
              finalSalePrice: Math.max(
                0,
                Number(item.privateData.finalSalePrice || 0)
              ),
            }
          : {}),
        commissionType: 'fixed',
        commissionValue: Math.max(
          0,
          Number(item.privateData.commissionValue || 0)
        ),
        commissionAmount: Math.max(
          0,
          Number(item.privateData.commissionAmount || 0)
        ),
        commissionPaid: item.privateData.commissionPaid || 'no',
        ...(item.privateData.commissionPaidAt
          ? {
              commissionPaidAt: String(item.privateData.commissionPaidAt).slice(
                0,
                64
              ),
            }
          : {}),
        notes: (item.privateData.notes || '').slice(0, 4000),
        lastContactAt: (item.privateData.lastContactAt || '').slice(0, 64),
        updatedAt: serverTimestamp(),
      };

      if (isExistingPriv) {
        batch.set(privRef, privPayloadBase, { merge: true });
      } else {
        batch.set(privRef, {
          ...privPayloadBase,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      // Automatically upsert Seller into `sellers/{sellerId}` collection
      const normalizedPhone = normalizeIraqiPhone(safeSellerPhone);
      const sellerDocId = sanitizeDocId(
        `seller_${normalizedPhone || safeSellerName}`
      );
      const sellerRef = doc(db, 'sellers', sellerDocId);
      const isExistingSeller = syncedSellerIdsRef.current.has(sellerDocId);
      const sellerPayloadBase = {
        name: safeSellerName,
        phone: safeSellerPhone,
        profileUrl: (item.privateData.sellerProfileUrl || '').slice(0, 500),
        notes: (item.privateData.notes || '').slice(0, 2000),
        updatedAt: serverTimestamp(),
      };

      if (isExistingSeller) {
        batch.set(sellerRef, sellerPayloadBase, { merge: true });
      } else {
        batch.set(sellerRef, {
          ...sellerPayloadBase,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      syncedListingIdsRef.current.add(cleanId);
      syncedPrivateIdsRef.current.add(cleanId);
      syncedSellerIdsRef.current.add(sellerDocId);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, `listings/${cleanId}`);
      } catch {
        triggerToast('error', 'تعذر حفظ المنشور في قاعدة البيانات Firestore');
      }
    }
  };

  // Save (Add or Edit) Listing
  const handleSaveListing = async (listingObj: BrokerListing, isEdit: boolean) => {
    if (isEdit) {
      setFallbackListings((prev) =>
        prev.map((item) => (item.id === listingObj.id ? listingObj : item))
      );
      appendActivityLog(
        'تعديل منشور',
        listingObj.refNumber,
        `تم تحديث بيانات المنشور (${listingObj.title})`
      );
      triggerToast('success', `تم حفظ تعديلات الإعلان ${listingObj.refNumber} بنجاح!`);
    } else {
      setFallbackListings((prev) => [listingObj, ...prev]);
      appendActivityLog(
        'إضافة منشور جديد',
        listingObj.refNumber,
        `تم نشر (${listingObj.title}) بسعر ${listingObj.displayPrice} د.ع`
      );
      triggerToast('success', `تم نشر المنتج الجديد (${listingObj.refNumber}) بنجاح!`);
    }

    await syncListingToFirestore(listingObj);
  };

  // Handle quick status change; if 'sold', open the commission modal
  const handleStatusChangeRequest = (listingId: string, newStatus: ListingStatus) => {
    const target = listings.find((l) => l.id === listingId);
    if (!target) return;

    if (newStatus === 'sold') {
      setSoldModalListing(target);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatedItem: BrokerListing = {
      ...target,
      status: newStatus,
      updatedAt: today,
    };

    setFallbackListings((prev) =>
      prev.map((item) => (item.id === listingId ? updatedItem : item))
    );

    const statusLabel =
      newStatus === 'available'
        ? 'متاح'
        : newStatus === 'reserved'
        ? 'محجوز'
        : 'مؤرشف';

    appendActivityLog(
      `تغيير حالة إلى ${statusLabel}`,
      target.refNumber,
      target.title
    );
    triggerToast(
      'success',
      `تم تحديث حالة الإعلان ${target.refNumber} إلى "${statusLabel}"`
    );
    void syncListingToFirestore(updatedItem);
  };

  // Atomic update when marking item as 'sold'
  const handleConfirmSold = (
    listingId: string,
    finalPrice: number,
    saleDate: string,
    calculatedCommission: number,
    commissionPaid: 'yes' | 'no' | 'partial'
  ) => {
    const target = listings.find((l) => l.id === listingId);
    if (!target) return;

    const updatedItem: BrokerListing = {
      ...target,
      status: 'sold',
      displayPrice: finalPrice,
      updatedAt: saleDate,
      soldAt: saleDate,
      privateData: {
        ...target.privateData,
        finalSalePrice: finalPrice,
        commissionType: 'fixed',
        commissionValue: calculatedCommission,
        commissionAmount: calculatedCommission,
        commissionPaid,
        commissionPaidAt: commissionPaid !== 'no' ? saleDate : undefined,
        lastContactAt: saleDate,
      },
    };

    setFallbackListings((prev) =>
      prev.map((item) => (item.id === listingId ? updatedItem : item))
    );

    appendActivityLog(
      'إتمام بيع وحساب عمولة',
      target.refNumber,
      `${target.title} — مبلغ البيع: ${new Intl.NumberFormat('en-US').format(finalPrice)} د.ع — العمولة: ${new Intl.NumberFormat('en-US').format(calculatedCommission)} د.ع`
    );

    triggerToast(
      'success',
      `تم تسجيل البيع بمبلغ ${new Intl.NumberFormat('en-US').format(
        finalPrice
      )} د.ع والعمولة (${new Intl.NumberFormat('en-US').format(
        calculatedCommission
      )} د.ع) بنجاح!`
    );

    void syncListingToFirestore(updatedItem);
  };

  const handleMarkCommissionPaid = (listingId: string) => {
    const target = listings.find((l) => l.id === listingId);
    if (!target) return;
    const today = new Date().toISOString().slice(0, 10);
    const updatedItem: BrokerListing = {
      ...target,
      privateData: {
        ...target.privateData,
        commissionPaid: 'yes',
        commissionPaidAt: today,
      },
    };
    setFallbackListings((prev) =>
      prev.map((item) => (item.id === listingId ? updatedItem : item))
    );
    appendActivityLog(
      'استلام عمولة معلقة',
      target.refNumber,
      `تم تحصيل عمولة البائع (${target.privateData.sellerName}) بالكامل`
    );
    triggerToast('success', `تم تأكيد استلام عمولة الإعلان ${target.refNumber}!`);
    void syncListingToFirestore(updatedItem);
  };

  const handleTouchSellerContact = (listingId: string) => {
    const target = listings.find((l) => l.id === listingId);
    if (!target) return;
    const today = new Date().toISOString().slice(0, 10);
    const updatedItem: BrokerListing = {
      ...target,
      updatedAt: today,
      privateData: { ...target.privateData, lastContactAt: today },
    };
    setFallbackListings((prev) =>
      prev.map((item) => (item.id === listingId ? updatedItem : item))
    );
    triggerToast('success', 'تم تحديث تاريخ آخر تواصل مع البائع لليوم!');
    void syncListingToFirestore(updatedItem);
  };

  // Track CTA Clicks (increments listing_stats/{id})
  const handleTrackCtaClick = async (id: string, isSecondary = false) => {
    setFallbackListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              clicks: isSecondary ? item.clicks : item.clicks + 1,
              secondaryClicks: isSecondary
                ? item.secondaryClicks + 1
                : item.secondaryClicks,
            }
          : item
      )
    );

    const cleanId = sanitizeDocId(id);
    if (!syncedListingIdsRef.current.has(cleanId)) return;

    const statsRef = doc(db, 'listing_stats', cleanId);
    try {
      await updateDoc(
        statsRef,
        isSecondary
          ? {
              secondaryClicks: increment(1),
              updatedAt: serverTimestamp(),
            }
          : {
              clicks: increment(1),
              updatedAt: serverTimestamp(),
            }
      );
    } catch {
      try {
        await setDoc(statsRef, {
          clicks: isSecondary ? 0 : 1,
          secondaryClicks: isSecondary ? 1 : 0,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore if unseeded
      }
    }
  };

  // Persist Categories & Relational category_tags to Firestore
  const handleSaveCategories = async (newCats: CategoryItem[]) => {
    setCategories(newCats);
    appendActivityLog('تحديث الأقسام', 'categories', `عدد الأقسام: ${newCats.length}`);

    if (!isAdminSignedIn) return;
    try {
      const batch = writeBatch(db);
      const nextIds = new Set<string>();
      const nextRelIds = new Set<string>();

      newCats.forEach((cat) => {
        const cleanCatId = sanitizeDocId(cat.id);
        nextIds.add(cleanCatId);
        const catRef = doc(db, 'categories', cleanCatId);
        const isExisting = syncedCategoryIdsRef.current.has(cleanCatId);
        const safeTagIds = (cat.allowedTagIds || [])
          .map((t) => sanitizeDocId(t).slice(0, 64))
          .slice(0, 50);

        const payloadBase = {
          name: (cat.name || 'قسم').slice(0, 80),
          slug: sanitizeDocId(cat.slug || cleanCatId).slice(0, 80),
          icon: (cat.icon || 'Package').slice(0, 50),
          order: Number(cat.order || 1),
          visible: Boolean(cat.visible),
          allowedTagIds: safeTagIds,
          customFieldDefs: [],
          updatedAt: serverTimestamp(),
        };

        if (isExisting) {
          batch.set(catRef, payloadBase, { merge: true });
        } else {
          batch.set(catRef, {
            ...payloadBase,
            createdAt: serverTimestamp(),
          });
        }

        // Sync relational category_tags rows for tags that exist
        safeTagIds.forEach((tagId) => {
          if (syncedTagIdsRef.current.has(tagId)) {
            const relId = sanitizeDocId(`${cleanCatId}_${tagId}`);
            nextRelIds.add(relId);
            if (!syncedCategoryTagIdsRef.current.has(relId)) {
              batch.set(doc(db, 'category_tags', relId), {
                categoryId: cleanCatId,
                tagId,
                createdAt: serverTimestamp(),
              });
            }
          }
        });
      });

      // Delete removed categories
      syncedCategoryIdsRef.current.forEach((oldId) => {
        if (!nextIds.has(oldId)) {
          batch.delete(doc(db, 'categories', oldId));
        }
      });

      // Delete removed category_tags relations
      syncedCategoryTagIdsRef.current.forEach((oldRelId) => {
        if (!nextRelIds.has(oldRelId)) {
          batch.delete(doc(db, 'category_tags', oldRelId));
        }
      });

      await batch.commit();
      syncedCategoryIdsRef.current = nextIds;
      syncedCategoryTagIdsRef.current = nextRelIds;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'categories');
      } catch {
        triggerToast('error', 'حدث خطأ أثناء حفظ الأقسام في قاعدة البيانات');
      }
    }
  };

  // Persist Tags to Firestore
  const handleSaveTags = async (newTags: TagItem[]) => {
    setTags(newTags);
    appendActivityLog('تحديث التاغات', 'tags', `عدد التاغات: ${newTags.length}`);

    if (!isAdminSignedIn) return;
    try {
      const batch = writeBatch(db);
      const nextIds = new Set<string>();

      newTags.forEach((t) => {
        const cleanTagId = sanitizeDocId(t.id).slice(0, 60);
        nextIds.add(cleanTagId);
        const tagRef = doc(db, 'tags', cleanTagId);
        const isExisting = syncedTagIdsRef.current.has(cleanTagId);
        const payloadBase = {
          name: (t.name || 'تاغ').slice(0, 60),
          slug: sanitizeDocId(t.slug || cleanTagId).slice(0, 60),
          updatedAt: serverTimestamp(),
        };

        if (isExisting) {
          batch.set(tagRef, payloadBase, { merge: true });
        } else {
          batch.set(tagRef, {
            ...payloadBase,
            createdAt: serverTimestamp(),
          });
        }
      });

      syncedTagIdsRef.current.forEach((oldId) => {
        if (!nextIds.has(oldId)) {
          batch.delete(doc(db, 'tags', oldId));
        }
      });

      await batch.commit();
      syncedTagIdsRef.current = nextIds;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'tags');
      } catch {
        triggerToast('error', 'حدث خطأ أثناء حفظ التاغات في قاعدة البيانات');
      }
    }
  };

  // Persist Provinces to Firestore
  const handleSaveProvinces = async (newProvs: ProvinceItem[]) => {
    setProvinces(newProvs);
    appendActivityLog(
      'تحديث المحافظات',
      'provinces',
      `عدد المحافظات: ${newProvs.length}`
    );

    if (!isAdminSignedIn) return;
    try {
      const batch = writeBatch(db);
      const nextIds = new Set<string>();

      newProvs.forEach((p) => {
        const cleanProvId = sanitizeDocId(p.id).slice(0, 60);
        nextIds.add(cleanProvId);
        const provRef = doc(db, 'provinces', cleanProvId);
        const isExisting = syncedProvinceIdsRef.current.has(cleanProvId);
        const payloadBase = {
          name: (p.name || 'محافظة').slice(0, 60),
          order: Number(p.order ?? 1),
          updatedAt: serverTimestamp(),
        };

        if (isExisting) {
          batch.set(provRef, payloadBase, { merge: true });
        } else {
          batch.set(provRef, {
            ...payloadBase,
            createdAt: serverTimestamp(),
          });
        }
      });

      syncedProvinceIdsRef.current.forEach((oldId) => {
        if (!nextIds.has(oldId)) {
          batch.delete(doc(db, 'provinces', oldId));
        }
      });

      await batch.commit();
      syncedProvinceIdsRef.current = nextIds;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'provinces');
      } catch {
        triggerToast('error', 'حدث خطأ أثناء حفظ المحافظات في قاعدة البيانات');
      }
    }
  };

  // Persist Leads to Firestore
  const handleSaveLeads = async (newLeads: BuyerLead[], logText?: string) => {
    setLeads(newLeads);
    if (logText) appendActivityLog('تحديث المشترين', 'leads', logText);

    if (!isAdminSignedIn || !user) return;
    try {
      const batch = writeBatch(db);
      const nextIds = new Set<string>();

      newLeads.forEach((lead) => {
        const cleanLeadId = sanitizeDocId(lead.id);
        const cleanListingId = sanitizeDocId(lead.listingId);
        if (!syncedListingIdsRef.current.has(cleanListingId)) return;

        nextIds.add(cleanLeadId);
        const leadRef = doc(db, 'leads', cleanLeadId);
        const isExisting = syncedLeadIdsRef.current.has(cleanLeadId);

        const payloadBase = {
          name: (lead.name || 'مشتري').slice(0, 120),
          phone: (lead.phone || '0000000000').slice(0, 30),
          listingId: cleanListingId,
          status: lead.status,
          notes: (lead.notes || '').slice(0, 2000),
          ...(lead.referredToSellerAt
            ? { referredToSellerAt: String(lead.referredToSellerAt).slice(0, 64) }
            : {}),
          updatedAt: serverTimestamp(),
        };

        if (isExisting) {
          batch.set(leadRef, payloadBase, { merge: true });
        } else {
          batch.set(leadRef, {
            ...payloadBase,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      });

      syncedLeadIdsRef.current.forEach((oldId) => {
        if (!nextIds.has(oldId)) {
          batch.delete(doc(db, 'leads', oldId));
        }
      });

      await batch.commit();
      syncedLeadIdsRef.current = nextIds;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'leads');
      } catch {
        triggerToast('error', 'حدث خطأ أثناء حفظ سجل المشترين في قاعدة البيانات');
      }
    }
  };

  // Seed or Sync All Data (Categories, Tags, category_tags, Provinces, Settings, Listings, Sellers, Leads) to Firestore
  const handleSeedAllToFirestore = async (silent = false) => {
    if (!isAdminSignedIn || !user) {
      if (!silent) {
        triggerToast(
          'error',
          'يرجى تسجيل الدخول بحساب المدير أولاً لمزامنة البيانات مع Firestore'
        );
      }
      return;
    }

    try {
      const batch = writeBatch(db);

      // 1. Tags first
      tags.forEach((t) => {
        const cleanTagId = sanitizeDocId(t.id).slice(0, 60);
        const isExisting = syncedTagIdsRef.current.has(cleanTagId);
        const tagPayload = {
          name: (t.name || 'تاغ').slice(0, 60),
          slug: sanitizeDocId(t.slug || cleanTagId).slice(0, 60),
          updatedAt: serverTimestamp(),
        };
        if (isExisting) {
          batch.set(doc(db, 'tags', cleanTagId), tagPayload, { merge: true });
        } else {
          batch.set(doc(db, 'tags', cleanTagId), {
            ...tagPayload,
            createdAt: serverTimestamp(),
          });
        }
        syncedTagIdsRef.current.add(cleanTagId);
      });

      // 2. Categories & Relational category_tags
      categories.forEach((cat) => {
        const cleanCatId = sanitizeDocId(cat.id);
        const isExisting = syncedCategoryIdsRef.current.has(cleanCatId);
        const safeTagIds = (cat.allowedTagIds || [])
          .map((t) => sanitizeDocId(t).slice(0, 64))
          .slice(0, 50);

        const catPayload = {
          name: (cat.name || 'قسم').slice(0, 80),
          slug: sanitizeDocId(cat.slug || cleanCatId).slice(0, 80),
          icon: (cat.icon || 'Package').slice(0, 50),
          order: Number(cat.order || 1),
          visible: Boolean(cat.visible),
          allowedTagIds: safeTagIds,
          customFieldDefs: [],
          updatedAt: serverTimestamp(),
        };

        if (isExisting) {
          batch.set(doc(db, 'categories', cleanCatId), catPayload, {
            merge: true,
          });
        } else {
          batch.set(doc(db, 'categories', cleanCatId), {
            ...catPayload,
            createdAt: serverTimestamp(),
          });
        }
        syncedCategoryIdsRef.current.add(cleanCatId);

        safeTagIds.forEach((tagId) => {
          const relId = sanitizeDocId(`${cleanCatId}_${tagId}`);
          if (!syncedCategoryTagIdsRef.current.has(relId)) {
            batch.set(doc(db, 'category_tags', relId), {
              categoryId: cleanCatId,
              tagId,
              createdAt: serverTimestamp(),
            });
            syncedCategoryTagIdsRef.current.add(relId);
          }
        });
      });

      // 3. Provinces
      provinces.forEach((p) => {
        const cleanProvId = sanitizeDocId(p.id).slice(0, 60);
        const isExisting = syncedProvinceIdsRef.current.has(cleanProvId);
        const provPayload = {
          name: (p.name || 'محافظة').slice(0, 60),
          order: Number(p.order ?? 1),
          updatedAt: serverTimestamp(),
        };
        if (isExisting) {
          batch.set(doc(db, 'provinces', cleanProvId), provPayload, {
            merge: true,
          });
        } else {
          batch.set(doc(db, 'provinces', cleanProvId), {
            ...provPayload,
            createdAt: serverTimestamp(),
          });
        }
        syncedProvinceIdsRef.current.add(cleanProvId);
      });

      // 4. Public & Private Settings
      batch.set(
        doc(db, 'settings', 'public'),
        {
          siteName: publicSettings.siteName.slice(0, 100),
          brokerPhone: publicSettings.brokerPhone.slice(0, 30),
          defaultCurrency: 'IQD',
          hideSoldListings: Boolean(publicSettings.hideSoldListings),
          defaultCtaType: publicSettings.defaultCtaType,
          defaultCtaLabel: publicSettings.defaultCtaLabel.slice(0, 80),
          defaultCtaMessage: (publicSettings.defaultCtaMessage || '').slice(
            0,
            500
          ),
          defaultCtaColor: (publicSettings.defaultCtaColor || '#25D366').slice(
            0,
            20
          ),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      batch.set(
        doc(db, 'settings', 'private'),
        {
          fbPostTemplate: privateSettings.fbPostTemplate.slice(0, 2000),
          staleListingDays: Number(privateSettings.staleListingDays || 30),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 5. Listings, Private Seller Data, and Sellers Directory
      listings.forEach((item) => {
        const cleanId = sanitizeDocId(item.id);
        const isExistingPub = syncedListingIdsRef.current.has(cleanId);
        const isExistingPriv = syncedPrivateIdsRef.current.has(cleanId);

        const pubPayloadBase = {
          title: (item.title || 'منشور').slice(0, 160),
          description: (item.description || item.title || 'تفاصيل').slice(
            0,
            4000
          ),
          specs: (item.specs || '').slice(0, 2000),
          images: (item.images || []).slice(0, 10),
          displayPrice: Math.max(0, Number(item.displayPrice || 0)),
          currency: 'IQD',
          provinceId: sanitizeDocId(item.provinceId || 'baghdad'),
          categoryId: sanitizeDocId(item.categoryId || 'general'),
          tagIds: (item.tagIds || [])
            .map((t) => sanitizeDocId(t).slice(0, 64))
            .slice(0, 10),
          customFields: {},
          status: item.status,
          refNumber: (item.refNumber || cleanId).slice(0, 20),
          cta: {
            type: item.cta.type,
            label: (item.cta.label || 'تواصل عبر واتساب').slice(0, 80),
            target: (item.cta.target || publicSettings.brokerPhone).slice(
              0,
              120
            ),
            message: (item.cta.message || '').slice(0, 500),
            color: (item.cta.color || '#25D366').slice(0, 20),
          },
          updatedAt: serverTimestamp(),
          ...(item.status === 'sold' ? { soldAt: serverTimestamp() } : {}),
        };

        if (isExistingPub) {
          batch.set(doc(db, 'listings', cleanId), pubPayloadBase, {
            merge: true,
          });
        } else {
          batch.set(doc(db, 'listings', cleanId), {
            ...pubPayloadBase,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        syncedListingIdsRef.current.add(cleanId);

        const safeSellerName = (
          item.privateData.sellerName?.trim() || 'غير محدد'
        ).slice(0, 120);
        const safeSellerPhone = (
          item.privateData.sellerPhone?.trim() || '0000000000'
        ).slice(0, 30);

        const privPayloadBase = {
          sellerName: safeSellerName,
          sellerPhone: safeSellerPhone,
          sellerProfileUrl: (item.privateData.sellerProfileUrl || '').slice(
            0,
            500
          ),
          sellerAskingPrice: Math.max(
            0,
            Number(item.privateData.sellerAskingPrice ?? item.displayPrice ?? 0)
          ),
          ...(item.privateData.finalSalePrice !== undefined
            ? {
                finalSalePrice: Math.max(
                  0,
                  Number(item.privateData.finalSalePrice || 0)
                ),
              }
            : {}),
          commissionType: 'fixed',
          commissionValue: Math.max(
            0,
            Number(item.privateData.commissionValue || 0)
          ),
          commissionAmount: Math.max(
            0,
            Number(item.privateData.commissionAmount || 0)
          ),
          commissionPaid: item.privateData.commissionPaid || 'no',
          ...(item.privateData.commissionPaidAt
            ? {
                commissionPaidAt: String(
                  item.privateData.commissionPaidAt
                ).slice(0, 64),
              }
            : {}),
          notes: (item.privateData.notes || '').slice(0, 4000),
          lastContactAt: (item.privateData.lastContactAt || '').slice(0, 64),
          updatedAt: serverTimestamp(),
        };

        if (isExistingPriv) {
          batch.set(doc(db, 'listings_private', cleanId), privPayloadBase, {
            merge: true,
          });
        } else {
          batch.set(doc(db, 'listings_private', cleanId), {
            ...privPayloadBase,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        syncedPrivateIdsRef.current.add(cleanId);

        const normalizedPhone = normalizeIraqiPhone(safeSellerPhone);
        const sellerDocId = sanitizeDocId(
          `seller_${normalizedPhone || safeSellerName}`
        );
        const isExistingSeller = syncedSellerIdsRef.current.has(sellerDocId);
        const sellerPayloadBase = {
          name: safeSellerName,
          phone: safeSellerPhone,
          profileUrl: (item.privateData.sellerProfileUrl || '').slice(0, 500),
          notes: (item.privateData.notes || '').slice(0, 2000),
          updatedAt: serverTimestamp(),
        };
        if (isExistingSeller) {
          batch.set(doc(db, 'sellers', sellerDocId), sellerPayloadBase, {
            merge: true,
          });
        } else {
          batch.set(doc(db, 'sellers', sellerDocId), {
            ...sellerPayloadBase,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        syncedSellerIdsRef.current.add(sellerDocId);
      });

      // 6. Leads
      leads.forEach((lead) => {
        const cleanLeadId = sanitizeDocId(lead.id);
        const cleanListingId = sanitizeDocId(lead.listingId);
        if (!syncedListingIdsRef.current.has(cleanListingId)) return;

        const isExistingLead = syncedLeadIdsRef.current.has(cleanLeadId);
        const leadPayloadBase = {
          name: (lead.name || 'مشتري').slice(0, 120),
          phone: (lead.phone || '0000000000').slice(0, 30),
          listingId: cleanListingId,
          status: lead.status,
          notes: (lead.notes || '').slice(0, 2000),
          ...(lead.referredToSellerAt
            ? {
                referredToSellerAt: String(lead.referredToSellerAt).slice(
                  0,
                  64
                ),
              }
            : {}),
          updatedAt: serverTimestamp(),
        };
        if (isExistingLead) {
          batch.set(doc(db, 'leads', cleanLeadId), leadPayloadBase, {
            merge: true,
          });
        } else {
          batch.set(doc(db, 'leads', cleanLeadId), {
            ...leadPayloadBase,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        syncedLeadIdsRef.current.add(cleanLeadId);
      });

      await batch.commit();
      if (!silent) {
        triggerToast(
          'success',
          'تمت مزامنة جميع الجداول والمنشورات والبائعين مع قاعدة بيانات Firestore بنجاح!'
        );
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'full_database_sync');
      } catch {
        if (!silent) {
          triggerToast('error', 'حدث خطأ أثناء المزامنة مع Firestore');
        }
      }
    }
  };

  // Auto-initialize Firestore once when Admin logs in and the database is empty
  useEffect(() => {
    if (authLoading || !isAdminSignedIn || !user || autoSeedTriggeredRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (
        !autoSeedTriggeredRef.current &&
        syncedCategoryIdsRef.current.size === 0 &&
        syncedListingIdsRef.current.size === 0
      ) {
        autoSeedTriggeredRef.current = true;
        void handleSeedAllToFirestore(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [authLoading, isAdminSignedIn, user]);

  const handleSaveSettings = async (
    pub: PublicSettingsConfig,
    priv: PrivateSettingsConfig
  ) => {
    setPublicSettings(pub);
    setPrivateSettings(priv);
    appendActivityLog('تحديث الإعدادات', 'settings', 'تم تحديث إعدادات الموقع والقوالب');
    triggerToast('success', 'تم حفظ إعدادات الموقع والقوالب بنجاح!');

    if (isAdminSignedIn) {
      try {
        await setDoc(
          doc(db, 'settings', 'public'),
          {
            siteName: pub.siteName.slice(0, 100),
            brokerPhone: pub.brokerPhone.slice(0, 30),
            defaultCurrency: 'IQD',
            hideSoldListings: Boolean(pub.hideSoldListings),
            defaultCtaType: pub.defaultCtaType,
            defaultCtaLabel: pub.defaultCtaLabel.slice(0, 80),
            defaultCtaMessage: (pub.defaultCtaMessage || '').slice(0, 500),
            defaultCtaColor: (pub.defaultCtaColor || '#25D366').slice(0, 20),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'settings', 'private'),
          {
            fbPostTemplate: priv.fbPostTemplate.slice(0, 2000),
            staleListingDays: Number(priv.staleListingDays || 30),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.WRITE, 'settings');
        } catch {
          // Handled
        }
      }
    }
  };

  const demoListingsForLab = listings.map((l) =>
    mapBrokerListingToDemo(l, categories, provinces, tags)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C1917]">
      {/* Top Toast Notification per Section 4.6 */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div
            className={`rounded-xl px-4 py-3 shadow-lg border flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-[#DCFCE7] border-[#166534]/25 text-[#166534]'
                : 'bg-[#FEE2E2] border-[#DC2626]/30 text-[#DC2626]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-[14px] font-semibold">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={2} />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" strokeWidth={2} />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Header per Section 4.5 & 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E7E1D8]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-[68px] flex items-center justify-between gap-8">
          {/* Zone 1: Single text brand wordmark */}
          <button
            type="button"
            onClick={() => {
              handleSelectListingId(null);
              setActiveView('public-storefront');
            }}
            className="text-[22px] font-bold text-[#0F766E] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {publicSettings.siteName}
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav
            aria-label="التنقل الرئيسي"
            className="flex items-center gap-4 md:gap-7 overflow-x-auto no-scrollbar text-[14px] font-semibold"
          >
            <button
              type="button"
              onClick={() => {
                handleSelectListingId(null);
                setActiveView('public-storefront');
              }}
              className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'public-storefront'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-[#6B645B] hover:text-[#1C1917]'
              }`}
            >
              الواجهة العامة للمشترين
            </button>

            <button
              type="button"
              onClick={() => {
                handleSelectListingId(null);
                setActiveView('phase2-admin');
              }}
              className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'phase2-admin'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-[#6B645B] hover:text-[#1C1917]'
              }`}
            >
              لوحة تحكم الوسيط
            </button>

            <button
              type="button"
              onClick={() => {
                handleSelectListingId(null);
                setActiveView('phase1-lab');
              }}
              className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'phase1-lab'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-[#6B645B] hover:text-[#1C1917]'
              }`}
            >
              مختبر التصميم والمكونات
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="hidden sm:flex items-center shrink-0">
            {activeView === 'phase2-admin' ? (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingListing(null);
                  setIsListingFormOpen(true);
                }}
                icon={<PlusCircle className="w-4 h-4" strokeWidth={1.75} />}
              >
                إضافة منشور
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  handleSelectListingId(null);
                  setActiveView('phase2-admin');
                }}
                icon={<Shield className="w-4 h-4" strokeWidth={1.75} />}
              >
                {user ? 'لوحة الوسيط' : 'دخول الوسيط'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {activeView === 'public-storefront' && (
          <PublicStorefrontPreview
            listings={listings}
            categories={categories}
            provinces={provinces}
            tags={tags}
            publicSettings={publicSettings}
            selectedListingId={selectedListingId}
            onSelectListingId={handleSelectListingId}
            onTrackCtaClick={handleTrackCtaClick}
            onTriggerToast={triggerToast}
          />
        )}

        {activeView === 'phase2-admin' && (
          <Phase2AuthAndSecurity
            user={user}
            authLoading={authLoading}
            listings={listings}
            categories={categories}
            provinces={provinces}
            tags={tags}
            leads={leads}
            activityLogs={activityLogs}
            publicSettings={publicSettings}
            privateSettings={privateSettings}
            onOpenAddListingModal={() => {
              setEditingListing(null);
              setIsListingFormOpen(true);
            }}
            onOpenEditListingModal={(item) => {
              setEditingListing(item);
              setIsListingFormOpen(true);
            }}
            onRequestDeleteListing={(item) => {
              setDeletingListing(item);
              setDeleteModalTitle(`${item.refNumber} — ${item.title}`);
            }}
            onStatusChangeRequest={handleStatusChangeRequest}
            onMarkCommissionPaid={handleMarkCommissionPaid}
            onTouchSellerContact={handleTouchSellerContact}
            onSaveCategories={handleSaveCategories}
            onSaveTags={handleSaveTags}
            onSaveProvinces={handleSaveProvinces}
            onSaveLeads={handleSaveLeads}
            onSaveSettings={handleSaveSettings}
            onSeedToFirestore={() => handleSeedAllToFirestore(false)}
            onTriggerToast={triggerToast}
          />
        )}

        {activeView === 'phase1-lab' && (
          <Phase1DesignLab
            listings={demoListingsForLab}
            onSelectListing={(listing) => {
              handleSelectListingId(listing.id);
              setActiveView('public-storefront');
            }}
            onStatusChangeRequest={handleStatusChangeRequest}
            onTriggerToast={triggerToast}
            onTriggerDeleteModal={(title) => {
              setDeletingListing(null);
              setDeleteModalTitle(title);
            }}
          />
        )}
      </main>

      {/* Simple Clean Footer per Section 4.5 */}
      <footer className="bg-white border-t border-[#E7E1D8] mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[14px] text-[#6B645B]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#0F766E] text-[16px]">
              {publicSettings.siteName}
            </span>
            <span aria-hidden="true">·</span>
            <span>منصة وساطة عقارية وتجارية موثوقة</span>
          </div>

          <div className="flex items-center gap-5 font-medium flex-wrap justify-center">
            {categories
              .filter((c) => c.visible)
              .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    handleSelectListingId(null);
                    setActiveView('public-storefront');
                  }}
                  className="hover:text-[#0F766E] cursor-pointer"
                >
                  {cat.name}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2 text-[#1C1917] font-semibold tabular-nums">
            <Phone className="w-4 h-4 text-[#0F766E]" strokeWidth={1.75} />
            <span dir="ltr">{toLatinDigits(publicSettings.brokerPhone)}</span>
            <span className="text-[#6B645B] font-normal mr-2">
              © {toLatinDigits('2026')} جميع الحقوق محفوظة
            </span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Listing Modal (Phase 4) */}
      <ListingFormModal
        isOpen={isListingFormOpen}
        editingListing={editingListing}
        allListings={listings}
        categories={categories}
        provinces={provinces}
        tags={tags}
        publicSettings={publicSettings}
        onClose={() => {
          setIsListingFormOpen(false);
          setEditingListing(null);
        }}
        onSaveListing={handleSaveListing}
        onTriggerToast={triggerToast}
      />

      {/* Sold Commission Modal */}
      <SoldCalculationModal
        listing={
          soldModalListing
            ? mapBrokerListingToDemo(
                soldModalListing,
                categories,
                provinces,
                tags
              )
            : null
        }
        isOpen={Boolean(soldModalListing)}
        onClose={() => setSoldModalListing(null)}
        onConfirmSold={handleConfirmSold}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteModalTitle)}
        title={deleteModalTitle || ''}
        onClose={() => {
          setDeleteModalTitle(null);
          setDeletingListing(null);
        }}
        onConfirm={async () => {
          if (deletingListing) {
            const cleanId = sanitizeDocId(deletingListing.id);
            setFallbackListings((prev) =>
              prev.filter((item) => item.id !== deletingListing.id)
            );
            appendActivityLog(
              'حذف منشور نهائي',
              deletingListing.refNumber,
              deletingListing.title
            );
            if (isAdminSignedIn) {
              try {
                await deleteDoc(doc(db, 'listings', cleanId));
                await deleteDoc(doc(db, 'listings_private', cleanId));
                syncedListingIdsRef.current.delete(cleanId);
                syncedPrivateIdsRef.current.delete(cleanId);
              } catch (error) {
                try {
                  handleFirestoreError(
                    error,
                    OperationType.DELETE,
                    `listings/${cleanId}`
                  );
                } catch {
                  // Handled
                }
              }
            }
          }
          triggerToast('success', `تم حذف "${deleteModalTitle}" بنجاح`);
          setDeletingListing(null);
        }}
      />
    </div>
  );
}
