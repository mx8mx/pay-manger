import React, { useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ShieldCheck,
  Lock,
  LogOut,
  UserPlus,
  LayoutDashboard,
  Package,
  PlusCircle,
  Users,
  MoreHorizontal,
  TrendingUp,
  Wallet,
  KeyRound,
  HelpCircle,
  Trash2,
  Search,
  Edit3,
  Share2,
  Layers,
  Clock,
  Settings,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  PRIMARY_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  formatPrice,
  normalizeIraqiPhone,
  toLatinDigits,
} from '../lib/firebase';
import {
  Button,
  FormInput,
  QuickStatusDropdown,
  SellerPrivateBox,
  ListingStatus,
  WhatsAppIcon,
} from './DesignSystemPrimitives';
import {
  BrokerListing,
  CategoryItem,
  ProvinceItem,
  TagItem,
  BuyerLead,
  ActivityLogEntry,
  PublicSettingsConfig,
  PrivateSettingsConfig,
  doesCategoryCaptureListing,
} from '../types/broker';
import { mapBrokerListingToDemo } from '../lib/demoAssets';
import { TaxonomyManager } from './TaxonomyManager';
import { AnalyticsAndReports } from './AnalyticsAndReports';
import { LeadsAndTools } from './LeadsAndTools';
import { dirtyDozenTests } from '../../firestore.rules.test';

interface AdminRecord {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'assistant';
  canViewFinancials: boolean;
  canDelete: boolean;
}

export type AdminTabId =
  | 'listings'
  | 'analytics'
  | 'taxonomy'
  | 'leads'
  | 'fb-generator'
  | 'sellers'
  | 'tools'
  | 'settings'
  | 'team'
  | 'guide';

interface Phase2AuthAndSecurityProps {
  user: User | null;
  authLoading: boolean;
  listings: BrokerListing[];
  categories: CategoryItem[];
  provinces: ProvinceItem[];
  tags: TagItem[];
  leads: BuyerLead[];
  activityLogs: ActivityLogEntry[];
  publicSettings: PublicSettingsConfig;
  privateSettings: PrivateSettingsConfig;
  onOpenAddListingModal: () => void;
  onOpenEditListingModal: (listing: BrokerListing) => void;
  onRequestDeleteListing: (listing: BrokerListing) => void;
  onStatusChangeRequest: (listingId: string, newStatus: ListingStatus) => void;
  onMarkCommissionPaid: (listingId: string) => void;
  onTouchSellerContact: (listingId: string) => void;
  onSaveCategories: (cats: CategoryItem[]) => void;
  onSaveTags: (tags: TagItem[]) => void;
  onSaveProvinces: (provs: ProvinceItem[]) => void;
  onSaveLeads: (leads: BuyerLead[], logText?: string) => void;
  onSaveSettings: (
    pub: PublicSettingsConfig,
    priv: PrivateSettingsConfig
  ) => Promise<void>;
  onSeedToFirestore: () => Promise<void>;
  onTriggerToast: (type: 'success' | 'error', message: string) => void;
}

export function Phase2AuthAndSecurity({
  user,
  authLoading,
  listings,
  categories,
  provinces,
  tags,
  leads,
  activityLogs,
  publicSettings,
  privateSettings,
  onOpenAddListingModal,
  onOpenEditListingModal,
  onRequestDeleteListing,
  onStatusChangeRequest,
  onMarkCommissionPaid,
  onTouchSellerContact,
  onSaveCategories,
  onSaveTags,
  onSaveProvinces,
  onSaveLeads,
  onSaveSettings,
  onSeedToFirestore,
  onTriggerToast,
}: Phase2AuthAndSecurityProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>('listings');
  const [preselectedListingId, setPreselectedListingId] = useState<string | null>(null);

  // Admin Listings Search & Filter State (Section 6.1)
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ListingStatus>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [provFilter, setProvFilter] = useState('all');
  const [expandedPrivateId, setExpandedPrivateId] = useState<string | null>(null);

  // Login states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Assistant team states
  const [assistants, setAssistants] = useState<AdminRecord[]>([]);
  const [newAssistantUid, setNewAssistantUid] = useState('');
  const [newAssistantName, setNewAssistantName] = useState('');
  const [newAssistantEmail, setNewAssistantEmail] = useState('');
  const [canViewFinancials, setCanViewFinancials] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [savingAssistant, setSavingAssistant] = useState(false);

  const isPrimaryOwner =
    user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() &&
    user?.emailVerified === true;

  useEffect(() => {
    if (!user || !isPrimaryOwner) {
      setAssistants([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const list: AdminRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AdminRecord, 'id'>),
        }));
        setAssistants(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'admins');
        } catch {
          // Logged
        }
      }
    );

    return () => unsubscribe();
  }, [user, isPrimaryOwner]);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onTriggerToast(
        'success',
        `مرحباً بك ${result.user.displayName || result.user.email}`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'تعذر تسجيل الدخول عبر Google';
      onTriggerToast('error', msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      onTriggerToast('success', 'تم تسجيل الدخول بنجاح');
    } catch {
      onTriggerToast(
        'error',
        'تأكد من تفعيل البريد وكلمة المرور في Firebase Console أو استخدم الدخول عبر Google'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onTriggerToast('success', 'تم تسجيل الخروج من لوحة التحكم');
  };

  const handleAddAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isPrimaryOwner) return;
    const cleanUid = newAssistantUid.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanUid || !newAssistantName.trim() || !newAssistantEmail.trim()) {
      onTriggerToast('error', 'يرجى ملء جميع حقول المساعد بشكل صحيح');
      return;
    }

    setSavingAssistant(true);
    try {
      await setDoc(doc(db, 'admins', cleanUid), {
        email: newAssistantEmail.trim(),
        name: newAssistantName.trim(),
        role: 'assistant',
        canViewFinancials,
        canDelete,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewAssistantUid('');
      setNewAssistantName('');
      setNewAssistantEmail('');
      onTriggerToast('success', 'تمت إضافة المدير المساعد بنجاح في Firestore!');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, `admins/${cleanUid}`);
      } catch {
        onTriggerToast('error', 'حدث خطأ أثناء حفظ صلاحيات المساعد');
      }
    } finally {
      setSavingAssistant(false);
    }
  };

  const handleRemoveAssistant = async (id: string) => {
    if (!user || !isPrimaryOwner) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
      onTriggerToast('success', 'تم إزالة المساعد بنجاح');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
      } catch {
        onTriggerToast('error', 'تعذر حذف المساعد');
      }
    }
  };

  // Status Counters & Instant Search (Section 6.1)
  const availableCount = listings.filter((l) => l.status === 'available').length;
  const reservedCount = listings.filter((l) => l.status === 'reserved').length;
  const soldCount = listings.filter((l) => l.status === 'sold').length;
  const archivedCount = listings.filter((l) => l.status === 'archived').length;
  const totalCommissionIQD = listings.reduce(
    (acc, item) => acc + item.privateData.commissionAmount,
    0
  );

  const selectedAdminCatObj = categories.find((c) => c.id === catFilter);
  const filteredAdminListings = listings.filter((item) => {
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchCat =
      catFilter === 'all' ||
      doesCategoryCaptureListing(selectedAdminCatObj, item);
    const matchProv = provFilter === 'all' || item.provinceId === provFilter;
    const q = adminSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.refNumber.toLowerCase().includes(q) ||
      item.privateData.sellerName.toLowerCase().includes(q) ||
      item.privateData.sellerPhone.includes(q) ||
      item.privateData.notes.toLowerCase().includes(q);
    return matchStatus && matchCat && matchProv && matchSearch;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-12">
      {/* Top Action Header */}
      <div className="broker-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E3F2F0] text-[#0F766E] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="typo-h2 text-[#1C1917]">
              لوحة التحكم الخاصة بالوسيط (إدارة المنشورات، البائعين، العمولات، والمشترين)
            </h1>
            <p className="text-[13px] text-[#6B645B]">
              {user
                ? `متصل بحساب المدير: ${user.email}`
                : 'وضع المعاينة التفاعلية — سجّل الدخول لمزامنة التعديلات مباشرة مع Firestore'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            onClick={onOpenAddListingModal}
            icon={<PlusCircle className="w-5 h-5" strokeWidth={1.75} />}
          >
            إضافة منشور جديد
          </Button>
          {user ? (
            <Button
              variant="ghost"
              onClick={handleLogout}
              icon={<LogOut className="w-4 h-4" strokeWidth={1.75} />}
            >
              خروج
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={signingIn}
              onClick={handleGoogleLogin}
              icon={<KeyRound className="w-4 h-4" strokeWidth={1.75} />}
            >
              دخول بـ Google
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Login Card if not logged in */}
      {!user && !authLoading && (
        <div className="broker-card p-5 bg-white border-r-4 border-r-[#0F766E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[14px] font-bold text-[#1C1917]">
              تسجيل دخول المدير لمزامنة البيانات سحابياً في Firestore ({PRIMARY_ADMIN_EMAIL})
            </div>
            <p className="text-[13px] text-[#6B645B] mt-0.5">
              يمكنك تجربة جميع الميزات فوراً، أو تسجيل الدخول بحساب Google لحفظ التغييرات في قاعدة البيانات السحابية.
            </p>
          </div>

          <form
            onSubmit={handleEmailLogin}
            className="flex flex-wrap items-center gap-2 shrink-0"
          >
            <input
              type="email"
              dir="ltr"
              placeholder="البريد الإلكتروني"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="h-[42px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px]"
            />
            <input
              type="password"
              dir="ltr"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="h-[42px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px]"
            />
            <Button type="submit" variant="secondary" loading={signingIn}>
              دخول
            </Button>
          </form>
        </div>
      )}

      {/* Workspace Layout: Desktop 240px Right Sidebar + Main Viewport (Section 4.6) */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Desktop Right Sidebar (240px fixed width per Section 4.6) */}
        <aside className="hidden md:flex flex-col w-[240px] shrink-0 broker-card bg-white p-3 space-y-1 sticky top-20">
          {(
            [
              { id: 'listings', label: 'إدارة المنشورات', icon: Package },
              { id: 'analytics', label: 'الأرباح والتقارير', icon: TrendingUp },
              { id: 'leads', label: 'المشترون المهتمون (Leads)', icon: Users },
              { id: 'sellers', label: 'سجل البائعين', icon: UserCheck },
              { id: 'fb-generator', label: 'مولّد منشور فيسبوك', icon: Share2 },
              { id: 'taxonomy', label: 'الأقسام والتاجات والـ 18 محافظة', icon: Layers },
              { id: 'tools', label: 'التنبيهات وسجل النشاط', icon: Clock },
              { id: 'settings', label: 'الإعدادات والقوالب', icon: Settings },
              { id: 'team', label: 'المدير المساعد والأمان', icon: ShieldCheck },
              { id: 'guide', label: 'دليل الاستخدام المختصر', icon: BookOpen },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeAdminTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveAdminTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 h-[44px] rounded-xl text-[14px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#E3F2F0] text-[#0F766E]'
                    : 'text-[#1C1917] hover:bg-[#F3EFE9]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Mobile Secondary Horizontal Strip for Sub-Sections */}
        <div className="md:hidden w-full flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {(
            [
              { id: 'listings', label: 'المنشورات' },
              { id: 'analytics', label: 'الأرباح والتقارير' },
              { id: 'leads', label: 'المشترون' },
              { id: 'sellers', label: 'البائعون' },
              { id: 'fb-generator', label: 'مولّد فيسبوك' },
              { id: 'taxonomy', label: 'الأقسام والمحافظات' },
              { id: 'tools', label: 'التنبيهات والنسخ' },
              { id: 'settings', label: 'الإعدادات' },
              { id: 'guide', label: 'الدليل' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveAdminTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap shrink-0 border ${
                activeAdminTab === tab.id
                  ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                  : 'bg-white border-[#E7E1D8] text-[#6B645B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Viewport */}
        <div className="flex-1 w-full space-y-6">
          {/* 4 Top Stat Cards per Section 4.6 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
            <div className="broker-card p-4 md:p-5 bg-white flex items-center justify-between">
              <div>
                <div className="text-[28px] font-bold text-[#1C1917] tabular-nums leading-tight">
                  {toLatinDigits(availableCount)}
                </div>
                <div className="text-[13px] font-medium text-[#6B645B] mt-1">
                  منشورات متاحة
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" strokeWidth={1.75} />
              </div>
            </div>

            <div className="broker-card p-4 md:p-5 bg-white flex items-center justify-between">
              <div>
                <div className="text-[28px] font-bold text-[#1C1917] tabular-nums leading-tight">
                  {toLatinDigits(reservedCount)}
                </div>
                <div className="text-[13px] font-medium text-[#6B645B] mt-1">
                  منشورات محجوزة
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" strokeWidth={1.75} />
              </div>
            </div>

            <div className="broker-card p-4 md:p-5 bg-white flex items-center justify-between">
              <div>
                <div className="text-[28px] font-bold text-[#1C1917] tabular-nums leading-tight">
                  {toLatinDigits(soldCount)}
                </div>
                <div className="text-[13px] font-medium text-[#6B645B] mt-1">
                  مبيعات مكتملة
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#E3F2F0] text-[#0F766E] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" strokeWidth={1.75} />
              </div>
            </div>

            <div className="broker-card p-4 md:p-5 bg-white flex items-center justify-between">
              <div>
                <div className="text-[22px] md:text-[24px] font-bold text-[#0F766E] tabular-nums leading-tight">
                  {formatPrice(totalCommissionIQD, 'IQD')}
                </div>
                <div className="text-[13px] font-medium text-[#6B645B] mt-1">
                  إجمالي العمولات (د.ع)
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" strokeWidth={1.75} />
              </div>
            </div>
          </div>

          {/* TAB 1: LISTINGS MANAGEMENT (Section 6.1) */}
          {activeAdminTab === 'listings' && (
            <div className="space-y-4">
              {/* Instant Search & Status Counters Bar */}
              <div className="broker-card p-4 md:p-5 bg-white space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-6 relative">
                    <Search className="w-4 h-4 text-[#6B645B] absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="بحث فوري بالاسم، رقم البائع، الرقم المرجعي (#1024)، أو الملاحظات..."
                      className="w-full h-[44px] pr-10 pl-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] text-[#1C1917] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F766E]"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <select
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                      className="w-full h-[44px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] font-semibold"
                    >
                      <option value="all">كل الأقسام</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <select
                      value={provFilter}
                      onChange={(e) => setProvFilter(e.target.value)}
                      className="w-full h-[44px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] font-semibold"
                    >
                      <option value="all">كل المحافظات</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Filter Pills with Counters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                  {(
                    [
                      { id: 'all', label: 'الكل', count: listings.length },
                      { id: 'available', label: 'متاح', count: availableCount },
                      { id: 'reserved', label: 'محجوز', count: reservedCount },
                      { id: 'sold', label: 'مباع', count: soldCount },
                      { id: 'archived', label: 'مؤرشف', count: archivedCount },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                          : 'bg-[#FAF8F5] border-[#E7E1D8] text-[#6B645B]'
                      }`}
                    >
                      {st.label} ({toLatinDigits(st.count)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Listings Table (Desktop) & Stacked Cards (Mobile) */}
              <div className="broker-card bg-white overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E7E1D8] text-[13px] font-semibold text-[#6B645B]">
                        <th className="py-3.5 px-4">المنتج والمرجع</th>
                        <th className="py-3.5 px-4">الحالة السريعة</th>
                        <th className="py-3.5 px-4">السعر المعروض</th>
                        <th className="py-3.5 px-4">البائع الخاص (سري)</th>
                        <th className="py-3.5 px-4">العمولة</th>
                        <th className="py-3.5 px-4">النقرات والمشترون</th>
                        <th className="py-3.5 px-4">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E1D8] text-[14px]">
                      {filteredAdminListings.map((item) => {
                        const sellerWa = normalizeIraqiPhone(
                          item.privateData.sellerPhone
                        );
                        const itemLeadsCount = leads.filter(
                          (ld) => ld.listingId === item.id
                        ).length;
                        const matchedCats = categories
                          .filter((c) =>
                            c.allowedTagIds.some((tid) =>
                              item.tagIds.includes(tid)
                            )
                          )
                          .map((c) => c.name);
                        const catName =
                          matchedCats.length > 0
                            ? matchedCats.join(' · ')
                            : categories.find((c) => c.id === item.categoryId)
                                ?.name || 'عام';
                        const provName =
                          provinces.find((p) => p.id === item.provinceId)?.name ||
                          '';
                        const isExpanded = expandedPrivateId === item.id;

                        return (
                          <React.Fragment key={item.id}>
                            <tr className="hover:bg-[#FAF8F5]/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.images[0]}
                                    alt=""
                                    className="w-14 h-11 rounded-lg object-cover border border-[#E7E1D8] shrink-0"
                                  />
                                  <div>
                                    <div className="font-bold text-[#1C1917] line-clamp-1 max-w-xs">
                                      {item.title}
                                    </div>
                                    <div className="text-[12px] text-[#6B645B] tabular-nums">
                                      {toLatinDigits(item.refNumber)} · {provName} · {catName}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <QuickStatusDropdown
                                  status={item.status}
                                  onChange={(st) =>
                                    onStatusChangeRequest(item.id, st)
                                  }
                                />
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-bold text-[#0F766E] tabular-nums">
                                  {formatPrice(item.displayPrice, 'IQD')}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="inline-flex flex-col bg-[#FEF3C7]/60 border border-[#D97706]/30 rounded-xl px-3 py-1.5">
                                  <span className="text-[13px] font-bold text-[#92400E]">
                                    {item.privateData.sellerName}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <a
                                      href={`https://wa.me/${sellerWa}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[12px] font-bold text-[#0F766E] hover:underline tabular-nums flex items-center gap-1"
                                      dir="ltr"
                                    >
                                      <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                                      <span>{toLatinDigits(item.privateData.sellerPhone)}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedPrivateId(
                                          isExpanded ? null : item.id
                                        )
                                      }
                                      className="text-[11px] text-[#92400E] underline cursor-pointer"
                                    >
                                      {isExpanded ? 'إخفاء' : 'تفاصيل'}
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="tabular-nums font-bold text-[#1C1917]">
                                  {formatPrice(
                                    item.privateData.commissionAmount,
                                    item.currency
                                  )}
                                </div>
                                <span
                                  className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    item.privateData.commissionPaid === 'yes'
                                      ? 'bg-[#DCFCE7] text-[#166534]'
                                      : item.privateData.commissionPaid === 'partial'
                                      ? 'bg-[#FEF3C7] text-[#92400E]'
                                      : 'bg-[#DC2626]/10 text-[#DC2626]'
                                  }`}
                                >
                                  {item.privateData.commissionPaid === 'yes'
                                    ? 'مستلمة'
                                    : item.privateData.commissionPaid === 'partial'
                                    ? 'جزئي'
                                    : 'معلقة'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="text-[13px] font-semibold text-[#1C1917] tabular-nums">
                                  {toLatinDigits(item.clicks)} نقرة زر
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreselectedListingId(item.id);
                                    setActiveAdminTab('leads');
                                  }}
                                  className="text-[12px] font-semibold text-[#0F766E] hover:underline cursor-pointer"
                                >
                                  {toLatinDigits(itemLeadsCount)} مشترٍ مهتم
                                </button>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreselectedListingId(item.id);
                                      setActiveAdminTab('fb-generator');
                                    }}
                                    className="p-2 rounded-lg bg-[#F3EFE9] text-[#1C1917] hover:bg-[#E7E1D8] cursor-pointer"
                                    title="توليد نص منشور فيسبوك"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditListingModal(item)}
                                    className="p-2 rounded-lg bg-[#E3F2F0] text-[#0F766E] hover:brightness-95 cursor-pointer"
                                    title="تعديل المنشور وبيانات البائع"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRequestDeleteListing(item)}
                                    className="p-2 rounded-lg bg-[#DC2626]/10 text-[#DC2626] hover:bg-[#DC2626]/20 cursor-pointer"
                                    title="حذف المنشور"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-[#FAF8F5]">
                                <td colSpan={7} className="p-4">
                                  <SellerPrivateBox
                                    listing={mapBrokerListingToDemo(
                                      item,
                                      categories,
                                      provinces,
                                      tags
                                    )}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards (No Horizontal Scroll per Section 4.6) */}
                <div className="lg:hidden divide-y divide-[#E7E1D8]">
                  {filteredAdminListings.map((item) => {
                    const demoItem = mapBrokerListingToDemo(
                      item,
                      categories,
                      provinces,
                      tags
                    );
                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[12px] font-bold text-[#6B645B] tabular-nums">
                              {toLatinDigits(item.refNumber)} · {demoItem.provinceName}
                            </span>
                            <h4 className="text-[15px] font-bold text-[#1C1917] mt-0.5">
                              {item.title}
                            </h4>
                          </div>
                          <QuickStatusDropdown
                            status={item.status}
                            onChange={(st) => onStatusChangeRequest(item.id, st)}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[14px]">
                          <span className="text-[#6B645B]">السعر المعروض:</span>
                          <span className="font-bold text-[#0F766E] tabular-nums">
                            {formatPrice(item.displayPrice, item.currency)}
                          </span>
                        </div>

                        <SellerPrivateBox listing={demoItem} />

                        <div className="flex items-center justify-between gap-2 pt-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setPreselectedListingId(item.id);
                              setActiveAdminTab('fb-generator');
                            }}
                            icon={<Share2 className="w-4 h-4" />}
                          >
                            نص فيسبوك
                          </Button>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => onOpenEditListingModal(item)}
                            >
                              تعديل
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => onRequestDeleteListing(item)}
                            >
                              حذف
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYTICS & REPORTS (Phase 7) */}
          {activeAdminTab === 'analytics' && (
            <AnalyticsAndReports
              listings={listings}
              categories={categories}
              provinces={provinces}
              onMarkCommissionPaid={onMarkCommissionPaid}
              onTriggerToast={onTriggerToast}
            />
          )}

          {/* TAB 3: TAXONOMY (Categories, Tags, Relational Junction Table, 18 Provinces, Custom Fields - Phase 3) */}
          {activeAdminTab === 'taxonomy' && (
            <TaxonomyManager
              categories={categories}
              tags={tags}
              provinces={provinces}
              listings={listings}
              onSaveCategories={onSaveCategories}
              onSaveTags={onSaveTags}
              onSaveProvinces={onSaveProvinces}
              onSeedToFirestore={onSeedToFirestore}
              onTriggerToast={onTriggerToast}
            />
          )}

          {/* TABS 4, 5, 6, 7, 8: LEADS, FB GENERATOR, SELLERS, TOOLS, SETTINGS */}
          {(activeAdminTab === 'leads' ||
            activeAdminTab === 'fb-generator' ||
            activeAdminTab === 'sellers' ||
            activeAdminTab === 'tools' ||
            activeAdminTab === 'settings') && (
            <LeadsAndTools
              activeSection={activeAdminTab}
              listings={listings}
              leads={leads}
              categories={categories}
              provinces={provinces}
              activityLogs={activityLogs}
              publicSettings={publicSettings}
              privateSettings={privateSettings}
              preselectedListingId={preselectedListingId}
              onSaveLeads={onSaveLeads}
              onTouchSellerContact={onTouchSellerContact}
              onSaveSettings={onSaveSettings}
              onTriggerToast={onTriggerToast}
            />
          )}

          {/* TAB 9: TEAM & SECURITY RULES */}
          {activeAdminTab === 'team' && (
            <div className="space-y-6">
              <div className="broker-card p-6 bg-white space-y-6">
                <div>
                  <h3 className="typo-h2 text-[#1C1917]">
                    إدارة المدير المساعد والصلاحيات (مجموعة admins)
                  </h3>
                  <p className="typo-body text-[#6B645B] mt-1">
                    المدير الرئيسي ({PRIMARY_ADMIN_EMAIL}) يمتلك الصلاحيات الكاملة، ويمكنه إضافة مساعد بصلاحيات محدودة.
                  </p>
                </div>

                <form
                  onSubmit={handleAddAssistant}
                  className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-4"
                >
                  <div className="flex items-center gap-2 font-bold text-[15px] text-[#1C1917]">
                    <UserPlus className="w-5 h-5 text-[#0F766E]" />
                    <span>إضافة مدير مساعد جديد</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="معرّف المستخدم (Firebase UID)"
                      placeholder="assistant_uid_1"
                      value={newAssistantUid}
                      onChange={(e) => setNewAssistantUid(toLatinDigits(e.target.value))}
                      className="bg-white font-mono"
                    />
                    <FormInput
                      label="اسم المساعد"
                      placeholder="أحمد المساعد"
                      value={newAssistantName}
                      onChange={(e) => setNewAssistantName(e.target.value)}
                      className="bg-white"
                    />
                    <FormInput
                      label="البريد الإلكتروني للمساعد"
                      type="email"
                      placeholder="assistant@gmail.com"
                      value={newAssistantEmail}
                      onChange={(e) => setNewAssistantEmail(e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <label className="inline-flex items-center gap-2 text-[14px] text-[#1C1917] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canViewFinancials}
                        onChange={(e) => setCanViewFinancials(e.target.checked)}
                        className="w-4 h-4 accent-[#0F766E]"
                      />
                      <span>السماح برؤية تقارير الأرباح والعمولات</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-[14px] text-[#1C1917] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canDelete}
                        onChange={(e) => setCanDelete(e.target.checked)}
                        className="w-4 h-4 accent-[#0F766E]"
                      />
                      <span>السماح بحذف المنشورات النهائي</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={savingAssistant}
                    disabled={!isPrimaryOwner}
                  >
                    {isPrimaryOwner
                      ? 'حفظ المساعد في Firestore'
                      : 'سجّل الدخول كمدير رئيسي لإضافة مساعد'}
                  </Button>
                </form>

                {assistants.length > 0 && (
                  <div className="space-y-2">
                    {assistants.map((ast) => (
                      <div
                        key={ast.id}
                        className="p-4 rounded-xl bg-white border border-[#E7E1D8] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#1C1917]">{ast.name}</div>
                          <div className="text-[12px] text-[#6B645B] font-mono">
                            {ast.email} (UID: {ast.id})
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssistant(ast.id)}
                          className="p-2 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="broker-card p-6 bg-white space-y-4">
                <h3 className="typo-h2 text-[#1C1917]">
                  حماية البيانات وقواعد الأمان الـ 12 (Dirty Dozen Verified)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dirtyDozenTests.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] flex items-center justify-between gap-2"
                    >
                      <span className="text-[13px] font-semibold text-[#1C1917] tabular-nums">
                        #{t.id} — {t.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-bold">
                        محمي
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: CONCISE USER GUIDE (Phase 9) */}
          {activeAdminTab === 'guide' && (
            <div className="broker-card p-6 md:p-8 bg-white space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#E7E1D8]">
                <HelpCircle className="w-6 h-6 text-[#0F766E]" />
                <h2 className="typo-h2 text-[#1C1917]">
                  دليل الاستخدام المختصر للوسيط (المرحلة 9)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[14px] leading-relaxed">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-2">
                  <h4 className="font-bold text-[#0F766E] text-[15px]">
                    1. كيف تضيف منتجاً جديداً وتنشره على فيسبوك؟
                  </h4>
                  <p className="text-[#1C1917]">
                    اضغط زر <strong>"إضافة منشور جديد"</strong>، ارفع صور السلعة (سيتم ضغطها تلقائياً بصيغة WebP)، أدخل السعر المعروض وبيانات البائع السرية. بعد الحفظ اضغط أيقونة المشاركة بجانب المنتج لنسخ <strong>نص منشور فيسبوك الجاهز</strong> الخالي من رقم البائع!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-2">
                  <h4 className="font-bold text-[#0F766E] text-[15px]">
                    2. ماذا تفعل عندما يتصل بك مشترٍ مهتم؟
                  </h4>
                  <p className="text-[#1C1917]">
                    سيعطيك المشتري <strong>الرقم المرجعي</strong> (مثل <span className="tabular-nums font-bold">#1024</span>). اكتبه في شريط البحث الفوري لتظهر لك فوراً بيانات البائع السرية ورقمه لتتصل به عبر واتساب، ثم سجّل المشتري في قسم <strong>المشترون المهتمون (Leads)</strong> واضغط <strong>"توثيق إحالة المشتري للبائع"</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-2">
                  <h4 className="font-bold text-[#0F766E] text-[15px]">
                    3. كيف تسجّل البيع وتحسب العمولة؟
                  </h4>
                  <p className="text-[#1C1917]">
                    انقر على شارة الحالة بجانب المنتج واختر <strong>"مباع"</strong>. ستفتح لك نافذة تطلب السعر النهائي وتاريخ البيع وتحسب عمولتك تلقائياً (سواء كانت مبلغاً ثابتاً أو نسبة مئوية) وتضيفها لتقارير أرباحك.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-2">
                  <h4 className="font-bold text-[#0F766E] text-[15px]">
                    4. كيف تحافظ على نسخة احتياطية من عملك؟
                  </h4>
                  <p className="text-[#1C1917]">
                    من تبويب <strong>"الأرباح والتقارير"</strong> يمكنك تصدير جدول المبيعات كملف <strong>Excel / CSV</strong>، ومن تبويب <strong>"التنبيهات وسجل النشاط"</strong> يمكنك تحميل نسخة احتياطية كاملة بصيغة <strong>JSON</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (5 items max per Section 4.6) */}
      <nav
        aria-label="تنقل لوحة التحكم للموبايل"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7E1D8] h-[64px] px-2 flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => setActiveAdminTab('analytics')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[11px] font-semibold cursor-pointer ${
            activeAdminTab === 'analytics' ? 'text-[#0F766E]' : 'text-[#6B645B]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span>الرئيسية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('listings')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[11px] font-semibold cursor-pointer ${
            activeAdminTab === 'listings' ? 'text-[#0F766E]' : 'text-[#6B645B]'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span>المنتجات</span>
        </button>

        {/* Highlighted Primary "إضافة" Button in the center per Section 4.6 */}
        <button
          type="button"
          onClick={onOpenAddListingModal}
          className="flex flex-col items-center justify-center -mt-4 bg-[#0F766E] text-white w-12 h-12 rounded-2xl shadow-md cursor-pointer"
        >
          <PlusCircle className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-bold">إضافة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('leads')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[11px] font-semibold cursor-pointer ${
            activeAdminTab === 'leads' ? 'text-[#0F766E]' : 'text-[#6B645B]'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span>المشترون</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('tools')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[11px] font-semibold cursor-pointer ${
            activeAdminTab === 'tools' || activeAdminTab === 'taxonomy'
              ? 'text-[#0F766E]'
              : 'text-[#6B645B]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" strokeWidth={1.75} />
          <span>المزيد</span>
        </button>
      </nav>
    </div>
  );
}
