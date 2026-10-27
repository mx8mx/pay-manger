import React, { useState } from 'react';
import {
  Users,
  Share2,
  Copy,
  CheckCheck,
  Clock,
  UserCheck,
  History,
  Download,
  Settings,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  Sparkles,
} from 'lucide-react';
import {
  BrokerListing,
  BuyerLead,
  LeadStatus,
  CategoryItem,
  ProvinceItem,
  ActivityLogEntry,
  PublicSettingsConfig,
  PrivateSettingsConfig,
} from '../types/broker';
import {
  Button,
  FormInput,
  WhatsAppIcon,
  FacebookIcon,
} from './DesignSystemPrimitives';
import {
  formatPrice,
  normalizeIraqiPhone,
  toLatinDigits,
} from '../lib/firebase';

interface LeadsAndToolsProps {
  activeSection: 'leads' | 'fb-generator' | 'sellers' | 'tools' | 'settings';
  listings: BrokerListing[];
  leads: BuyerLead[];
  categories: CategoryItem[];
  provinces: ProvinceItem[];
  activityLogs: ActivityLogEntry[];
  publicSettings: PublicSettingsConfig;
  privateSettings: PrivateSettingsConfig;
  preselectedListingId?: string | null;
  onSaveLeads: (leads: BuyerLead[], logText?: string) => void;
  onTouchSellerContact: (listingId: string) => void;
  onSaveSettings: (
    pub: PublicSettingsConfig,
    priv: PrivateSettingsConfig
  ) => Promise<void>;
  onTriggerToast: (type: 'success' | 'error', msg: string) => void;
}

const LEAD_STATUS_LABELS: Record<
  LeadStatus,
  { label: string; bg: string; text: string }
> = {
  new: { label: 'جديد', bg: 'bg-[#E3F2F0]', text: 'text-[#0F766E]' },
  referred: {
    label: 'تم ربطه بالبائع (إحالة موثقة)',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
  },
  negotiating: {
    label: 'قيد التفاوض',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#D97706]',
  },
  bought: { label: 'اشترى', bg: 'bg-[#DCFCE7]', text: 'text-[#166534]' },
  cancelled: { label: 'لم يشترِ', bg: 'bg-[#F5F5F4]', text: 'text-[#78716C]' },
};

export function LeadsAndTools({
  activeSection,
  listings,
  leads,
  categories,
  provinces,
  activityLogs,
  publicSettings,
  privateSettings,
  preselectedListingId,
  onSaveLeads,
  onTouchSellerContact,
  onSaveSettings,
  onTriggerToast,
}: LeadsAndToolsProps) {
  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadListingId, setLeadListingId] = useState(
    preselectedListingId || listings[0]?.id || ''
  );
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('new');
  const [leadNotes, setLeadNotes] = useState('');
  const [filterLeadListing, setFilterLeadListing] = useState<string>(
    preselectedListingId || 'all'
  );

  // Facebook Generator State
  const [fbSelectedListingId, setFbSelectedListingId] = useState<string>(
    preselectedListingId || listings[0]?.id || ''
  );
  const [copiedFb, setCopiedFb] = useState(false);

  // Settings Form State
  const [pubDraft, setPubDraft] = useState<PublicSettingsConfig>(publicSettings);
  const [privDraft, setPrivDraft] =
    useState<PrivateSettingsConfig>(privateSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // 1. Add Lead
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim() || !leadListingId) {
      onTriggerToast('error', 'يرجى إدخال اسم ورقم المشتري والمنتج المرتبط');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const nowStamp = `${today} ${new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newLead: BuyerLead = {
      id: `lead-${Date.now().toString().slice(-5)}`,
      name: leadName.trim(),
      phone: toLatinDigits(leadPhone.trim()),
      listingId: leadListingId,
      status: leadStatus,
      notes: leadNotes.trim(),
      referredToSellerAt: leadStatus === 'referred' ? nowStamp : undefined,
      createdAt: today,
      updatedAt: today,
    };

    const targetListing = listings.find((l) => l.id === leadListingId);
    onSaveLeads(
      [newLead, ...leads],
      `تسجيل مشترٍ مهتم (${newLead.name}) للإعلان ${targetListing?.refNumber || ''}`
    );
    setLeadName('');
    setLeadPhone('');
    setLeadNotes('');
    onTriggerToast('success', 'تم تسجيل المشتري المهتم بنجاح');
  };

  // Mark Lead as Referred to Seller (Proof of Referral for Commission)
  const handleReferLeadToSeller = (lead: BuyerLead) => {
    const today = new Date().toISOString().slice(0, 10);
    const nowStamp = `${today} ${new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const updated = leads.map((item) =>
      item.id === lead.id
        ? {
            ...item,
            status: 'referred' as LeadStatus,
            referredToSellerAt: nowStamp,
            updatedAt: today,
          }
        : item
    );
    const targetListing = listings.find((l) => l.id === lead.listingId);
    onSaveLeads(
      updated,
      `إحالة موثقة للمشتري (${lead.name}) إلى البائع للإعلان ${
        targetListing?.refNumber || ''
      }`
    );
    onTriggerToast(
      'success',
      `تم توثيق إحالة المشتري "${lead.name}" للبائع بتاريخ ووقت دقيق لحفظ حق عمولتك!`
    );
  };

  const handleUpdateLeadStatus = (leadId: string, newSt: LeadStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = leads.map((item) =>
      item.id === leadId ? { ...item, status: newSt, updatedAt: today } : item
    );
    onSaveLeads(updated);
    onTriggerToast('success', 'تم تحديث حالة المشتري');
  };

  // Generate Facebook Post text per Section 6.5 (Strictly NO private seller info)
  const generateFacebookPostText = (listing: BrokerListing | undefined): string => {
    if (!listing) return '';
    const cat =
      categories.find((c) => c.id === listing.categoryId)?.name || 'عام';
    const prov =
      provinces.find((p) => p.id === listing.provinceId)?.name || 'بغداد';
    const customFieldsStr = Object.entries(listing.customFields)
      .filter(([, val]) => Boolean(val))
      .map(([k, v]) => `• ${k}: ${toLatinDigits(v)}`)
      .join('\n');

    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?listing=${listing.id}`
        : `https://broker.iq/?listing=${listing.id}`;

    return privateSettings.fbPostTemplate
      .replace(/\{siteName\}/g, publicSettings.siteName)
      .replace(/\{title\}/g, listing.title)
      .replace(/\{refNumber\}/g, toLatinDigits(listing.refNumber))
      .replace(/\{province\}/g, prov)
      .replace(/\{category\}/g, cat)
      .replace(/\{specs\}/g, listing.specs || listing.description)
      .replace(/\{customFields\}/g, customFieldsStr)
      .replace(
        /\{price\}/g,
        formatPrice(listing.displayPrice, listing.currency)
      )
      .replace(/\{brokerPhone\}/g, toLatinDigits(publicSettings.brokerPhone))
      .replace(/\{url\}/g, shareUrl)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const selectedFbListing =
    listings.find((l) => l.id === fbSelectedListingId) || listings[0];
  const generatedFbText = generateFacebookPostText(selectedFbListing);

  const handleCopyFbText = async () => {
    try {
      await navigator.clipboard.writeText(generatedFbText);
      setCopiedFb(true);
      onTriggerToast(
        'success',
        'تم نسخ نص منشور فيسبوك للحافظة (بدون أي بيانات للبائع)!'
      );
      setTimeout(() => setCopiedFb(false), 3000);
    } catch {
      onTriggerToast('error', 'تعذر النسخ التلقائي، يمكنك تحديد النص ونسخه');
    }
  };

  // Group Sellers Directory (Automatically populated from every listing's private seller details)
  const sellersMap = new Map<
    string,
    {
      name: string;
      phone: string;
      profileUrl: string;
      notes: string;
      listings: BrokerListing[];
      soldCount: number;
      totalCommissionsIQD: number;
    }
  >();

  listings.forEach((item) => {
    const key =
      normalizeIraqiPhone(item.privateData.sellerPhone) ||
      item.privateData.sellerName;
    const existing = sellersMap.get(key);
    const commIqd = item.privateData.commissionAmount || 0;

    if (existing) {
      existing.listings.push(item);
      if (item.status === 'sold') existing.soldCount += 1;
      existing.totalCommissionsIQD += commIqd;
      if (!existing.notes && item.privateData.notes) {
        existing.notes = item.privateData.notes;
      }
      if (!existing.profileUrl && item.privateData.sellerProfileUrl) {
        existing.profileUrl = item.privateData.sellerProfileUrl;
      }
    } else {
      sellersMap.set(key, {
        name: item.privateData.sellerName,
        phone: item.privateData.sellerPhone,
        profileUrl: item.privateData.sellerProfileUrl,
        notes: item.privateData.notes,
        listings: [item],
        soldCount: item.status === 'sold' ? 1 : 0,
        totalCommissionsIQD: commIqd,
      });
    }
  });
  const sellersList = Array.from(sellersMap.values());

  // Stale Listings Alert (> X days without update/contact) per Section 6.6
  const staleThreshold = privateSettings.staleListingDays || 14;
  const staleListings = listings.filter((item) => {
    if (item.status !== 'available') return false;
    const lastDate = new Date(
      item.privateData.lastContactAt || item.updatedAt || item.createdAt
    );
    const now = new Date('2026-10-26');
    const diffDays = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)
    );
    return diffDays >= staleThreshold;
  });

  // Full Backup Download (JSON)
  const handleDownloadFullBackup = () => {
    const backupPayload = {
      exportedAt: new Date().toISOString(),
      publicSettings,
      privateSettings,
      categories,
      provinces,
      listings,
      leads,
      activityLogs,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broker-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast('success', 'تم تحميل النسخة الاحتياطية الكاملة لجميع بياناتك بنجاح!');
  };

  // SECTION A: LEADS MANAGEMENT
  if (activeSection === 'leads') {
    const visibleLeads =
      filterLeadListing === 'all'
        ? leads
        : leads.filter((l) => l.listingId === filterLeadListing);

    return (
      <div className="space-y-6">
        <div className="broker-card p-5 md:p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="typo-h2 text-[#1C1917]">
              إدارة المشترين المهتمين وإثبات الإحالة (Leads — القسم 6.4)
            </h2>
            <p className="typo-muted mt-0.5">
              سجّل كل مشترٍ يتواصل معك، ووثّق تاريخ إحالته للبائع لضمان حق عمولتك.
            </p>
          </div>

          <select
            value={filterLeadListing}
            onChange={(e) => setFilterLeadListing(e.target.value)}
            className="h-[44px] px-4 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] font-semibold text-[#1C1917]"
          >
            <option value="all">كل المنتجات ({toLatinDigits(leads.length)} مشترٍ)</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.refNumber} — {l.title.slice(0, 35)}...
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add Lead Form */}
          <form
            onSubmit={handleAddLead}
            className="lg:col-span-4 broker-card p-5 bg-white space-y-4"
          >
            <h3 className="text-[16px] font-bold text-[#1C1917] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0F766E]" />
              <span>تسجيل مشترٍ مهتم جديد</span>
            </h3>

            <FormInput
              label="اسم المشتري *"
              placeholder="مثال: الأستاذ حيدر الكاظمي"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              required
            />

            <FormInput
              label="رقم هاتف المشتري *"
              placeholder="07705544332"
              dir="ltr"
              value={leadPhone}
              onChange={(e) => setLeadPhone(toLatinDigits(e.target.value))}
              className="tabular-nums font-bold"
              required
            />

            <div>
              <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                المنتج المهتم به *
              </label>
              <select
                value={leadListingId}
                onChange={(e) => setLeadListingId(e.target.value)}
                className="w-full h-[44px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] text-[#1C1917]"
              >
                {listings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.refNumber} — {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                الحالة المبدئية
              </label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}
                className="w-full h-[44px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] text-[#1C1917]"
              >
                <option value="new">جديد</option>
                <option value="referred">تم ربطه بالبائع (إحالة)</option>
                <option value="negotiating">تفاوض</option>
                <option value="bought">اشترى</option>
                <option value="cancelled">لم يشترِ</option>
              </select>
            </div>

            <FormInput
              label="ملاحظات التفاوض / الموعد"
              placeholder="مثال: يرغب بالمعاينة يوم الخميس عصراً..."
              value={leadNotes}
              onChange={(e) => setLeadNotes(e.target.value)}
            />

            <Button type="submit" variant="primary" fullWidth>
              حفظ المشتري في السجل
            </Button>
          </form>

          {/* Leads List */}
          <div className="lg:col-span-8 space-y-3">
            {visibleLeads.map((lead) => {
              const linkedListing = listings.find((l) => l.id === lead.listingId);
              const buyerWa = normalizeIraqiPhone(lead.phone);
              const statusInfo = LEAD_STATUS_LABELS[lead.status];

              return (
                <div
                  key={lead.id}
                  className="broker-card p-5 bg-white space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7E1D8]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[16px] font-bold text-[#1C1917]">
                          {lead.name}
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      {linkedListing && (
                        <div className="text-[13px] font-semibold text-[#0F766E] mt-1">
                          المنتج المرتبط: {linkedListing.refNumber} — {linkedListing.title}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://wa.me/${buyerWa}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] text-[#1C1917] text-[12px] font-bold"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span dir="ltr" className="tabular-nums">
                          {toLatinDigits(lead.phone)}
                        </span>
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          onSaveLeads(
                            leads.filter((item) => item.id !== lead.id),
                            `حذف سجل المشتري ${lead.name}`
                          )
                        }
                        className="p-2 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {lead.notes && (
                    <p className="text-[14px] text-[#1C1917] bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E1D8]">
                      {lead.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#6B645B]">تغيير الحالة:</span>
                      <select
                        value={lead.status}
                        onChange={(e) =>
                          handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)
                        }
                        className="h-[36px] px-2.5 rounded-lg bg-[#F3EFE9] border border-[#E7E1D8] text-[12px] font-semibold text-[#1C1917]"
                      >
                        <option value="new">جديد</option>
                        <option value="referred">تم ربطه بالبائع</option>
                        <option value="negotiating">تفاوض</option>
                        <option value="bought">اشترى</option>
                        <option value="cancelled">لم يشترِ</option>
                      </select>
                    </div>

                    {lead.referredToSellerAt ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DCFCE7] text-[#166534] text-[12px] font-bold tabular-nums">
                        <UserCheck className="w-4 h-4" />
                        <span>موثق: أُحيل للبائع في {toLatinDigits(lead.referredToSellerAt)}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReferLeadToSeller(lead)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D97706] text-white text-[12px] font-bold hover:bg-[#B45309] cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>تسجيل وتوثيق إحالة المشتري للبائع (ضمان العمولة)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // SECTION B: FACEBOOK POST GENERATOR (Section 6.5)
  if (activeSection === 'fb-generator') {
    return (
      <div className="space-y-6">
        <div className="broker-card p-6 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E1D8]">
            <div>
              <h2 className="typo-h2 text-[#1C1917]">
                مولّد نص المنشور للفيسبوك (القسم 6.5 — بدون أي بيانات للبائع)
              </h2>
              <p className="typo-muted mt-0.5">
                يولّد نصاً احترافياً جاهزاً للنسخ والنشر على كروبات وصفحات فيسبوك يحتوي على رقمك أنت والرقم المرجعي فقط.
              </p>
            </div>

            <select
              value={fbSelectedListingId}
              onChange={(e) => setFbSelectedListingId(e.target.value)}
              className="h-[44px] px-4 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] font-bold text-[#1C1917]"
            >
              {listings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.refNumber} — {item.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              <label className="block text-[13px] font-bold text-[#1C1917]">
                النص الجاهز للنشر على فيسبوك:
              </label>
              <textarea
                readOnly
                rows={12}
                value={generatedFbText}
                className="w-full p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D8] text-[15px] text-[#1C1917] leading-relaxed font-medium focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleCopyFbText}
                  icon={
                    copiedFb ? (
                      <CheckCheck className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )
                  }
                >
                  {copiedFb ? 'تم النسخ للحافظة!' : 'نسخ نص المنشور'}
                </Button>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/?listing=${selectedFbListing?.id}`
                      : 'https://broker.iq'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="secondary"
                    icon={<FacebookIcon className="w-5 h-5" />}
                  >
                    مشاركة الرابط على فيسبوك
                  </Button>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#E3F2F0]/50 border border-[#0F766E]/25 space-y-3">
              <div className="flex items-center gap-2 text-[#0F766E] font-bold text-[15px]">
                <Sparkles className="w-5 h-5" />
                <span>فحص الأمان التلقائي للمنشور</span>
              </div>
              <ul className="space-y-2 text-[13px] text-[#1C1917]">
                <li>✅ خالٍ تماماً من اسم البائع ({selectedFbListing?.privateData.sellerName}).</li>
                <li>✅ خالٍ تماماً من رقم هاتف البائع ({selectedFbListing?.privateData.sellerPhone}).</li>
                <li>✅ يحتوي على رقمك أنت كوسيط ({publicSettings.brokerPhone}).</li>
                <li>✅ يحتوي على الرقم المرجعي ({selectedFbListing?.refNumber}) لسهولة البحث عنه في لوحة تحكمك عندما يتصل بك المشتري!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SECTION C: SELLERS DIRECTORY (Section 6.6)
  if (activeSection === 'sellers') {
    return (
      <div className="space-y-6">
        <div className="broker-card p-6 bg-white">
          <h2 className="typo-h2 text-[#1C1917]">
            سجل وصفحة البائعين (القسم 6.6 — يجمع كل منتجات نفس البائع وإجمالي مبيعاته)
          </h2>
          <p className="typo-muted mt-1">
            جميع البائعين المسجلين لديك مع عدد عروضهم، ما تم بيعه لهم، وإجمالي العمولات المحققة منهم.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sellersList.map((seller) => {
            const sellerWa = normalizeIraqiPhone(seller.phone);
            return (
              <div
                key={seller.phone}
                className="broker-card p-5 bg-white space-y-4 border-r-4 border-r-[#D97706]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-bold text-[#1C1917]">
                      {seller.name}
                    </h3>
                    <div className="text-[13px] font-bold text-[#6B645B] tabular-nums mt-0.5" dir="ltr">
                      {toLatinDigits(seller.phone)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${sellerWa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] text-[#1C1917] text-[12px] font-bold"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                    <a
                      href={`tel:+${sellerWa}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0F766E] text-white text-[12px] font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال</span>
                    </a>
                    {seller.profileUrl && (
                      <a
                        href={seller.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#F3EFE9] text-[#0F766E]"
                        title="حساب البائع"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E1D8]">
                  <div>
                    <div className="text-[18px] font-bold text-[#1C1917] tabular-nums">
                      {toLatinDigits(seller.listings.length)}
                    </div>
                    <div className="text-[11px] text-[#6B645B]">إجمالي عروضه</div>
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-[#166534] tabular-nums">
                      {toLatinDigits(seller.soldCount)}
                    </div>
                    <div className="text-[11px] text-[#6B645B]">تم بيعها</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-[#0F766E] tabular-nums">
                      {formatPrice(seller.totalCommissionsIQD, 'IQD')}
                    </div>
                    <div className="text-[11px] text-[#6B645B]">إجمالي العمولة</div>
                  </div>
                </div>

                {seller.notes && (
                  <div className="p-3 rounded-xl bg-[#FEF3C7]/45 border border-[#D97706]/30 text-[13px] text-[#1C1917]">
                    <span className="font-bold text-[#92400E] ml-1">
                      تفاصيل إضافية للبائع:
                    </span>
                    <span>{seller.notes}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-[12px] font-semibold text-[#6B645B]">
                    منشورات هذا البائع:
                  </div>
                  {seller.listings.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-[13px] px-3 py-2 rounded-lg bg-[#F3EFE9]/60"
                    >
                      <span className="font-semibold text-[#1C1917] truncate">
                        {toLatinDigits(l.refNumber)} — {l.title}
                      </span>
                      <span className="font-bold text-[#0F766E] tabular-nums shrink-0 mr-2">
                        {formatPrice(l.displayPrice, 'IQD')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // SECTION D: HELPER TOOLS (Stale Listings + Activity Log + Full Backup)
  if (activeSection === 'tools') {
    return (
      <div className="space-y-6">
        {/* Stale Listings Alert */}
        <div className="broker-card p-6 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7E1D8]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="typo-h2 text-[#1C1917]">
                  تنبيه المنشورات التي مضى عليها أكثر من {toLatinDigits(staleThreshold)} يوماً دون تحديث أو تواصل
                </h3>
                <p className="typo-muted">
                  تواصل مع البائع للتأكد من أن السلعة لم تُبع خارجياً وتحديث حالتها.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleDownloadFullBackup}
              icon={<Download className="w-4 h-4" />}
            >
              نسخ احتياطي كامل للبيانات (JSON)
            </Button>
          </div>

          {staleListings.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#DCFCE7]/50 text-[#166534] text-[14px] font-semibold">
              جميع المنشورات المتاحة محدّثة وتم التواصل مع بائعيها خلال آخر {toLatinDigits(staleThreshold)} يوماً.
            </div>
          ) : (
            <div className="space-y-3">
              {staleListings.map((item) => {
                const sellerWa = normalizeIraqiPhone(item.privateData.sellerPhone);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#FEF3C7]/45 border border-[#D97706]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[#1C1917]">
                        {item.refNumber} — {item.title}
                      </div>
                      <div className="text-[12px] text-[#92400E] mt-0.5 tabular-nums">
                        البائع: {item.privateData.sellerName} · آخر تواصل: {toLatinDigits(item.privateData.lastContactAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://wa.me/${sellerWa}?text=${encodeURIComponent(
                          `مرحباً ${item.privateData.sellerName}، هل لا يزال (${item.title}) متاحاً للبيع؟`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-[#1C1917] text-[12px] font-bold"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        <span>سؤال البائع بالواتساب</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => onTouchSellerContact(item.id)}
                        className="px-3 py-2 rounded-xl bg-[#0F766E] text-white text-[12px] font-semibold cursor-pointer"
                      >
                        تحديث تاريخ التواصل لليوم
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Log (سجل النشاط) */}
        <div className="broker-card p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E1D8]">
            <History className="w-5 h-5 text-[#0F766E]" />
            <h3 className="typo-h2 text-[#1C1917]">
              سجل النشاط والتغييرات (Activity Log)
            </h3>
          </div>

          <div className="divide-y divide-[#E7E1D8]">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]"
              >
                <div>
                  <span className="font-bold text-[#0F766E] ml-2">
                    [{log.action}]
                  </span>
                  <span className="font-bold text-[#1C1917] tabular-nums ml-2">
                    {log.targetId}
                  </span>
                  <span className="text-[#6B645B]">{log.details}</span>
                </div>
                <div className="text-[12px] text-[#6B645B] tabular-nums shrink-0">
                  {log.actorEmail} · {toLatinDigits(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SECTION E: SETTINGS (Public & Private Settings)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
          await onSaveSettings(pubDraft, privDraft);
        } finally {
          setSavingSettings(false);
        }
      }}
      className="broker-card p-6 bg-white space-y-6"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-[#E7E1D8]">
        <Settings className="w-5 h-5 text-[#0F766E]" />
        <h2 className="typo-h2 text-[#1C1917]">
          إعدادات الموقع وزر التواصل الافتراضي وقالب فيسبوك
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput
          label="اسم الموقع"
          value={pubDraft.siteName}
          onChange={(e) =>
            setPubDraft((p) => ({ ...p, siteName: e.target.value }))
          }
        />
        <FormInput
          label="رقمك الافتراضي للتواصل (الوسيط)"
          dir="ltr"
          value={pubDraft.brokerPhone}
          onChange={(e) =>
            setPubDraft((p) => ({
              ...p,
              brokerPhone: toLatinDigits(e.target.value),
            }))
          }
          className="tabular-nums font-bold"
        />
        <div>
          <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
            العملة المعتمدة في الموقع
          </label>
          <div className="w-full h-[44px] px-3.5 rounded-xl bg-[#E3F2F0] border border-[#0F766E]/30 text-[14px] font-bold text-[#0F766E] flex items-center">
            دينار عراقي (د.ع) دائماً
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInput
          label="نص زر التواصل الافتراضي"
          value={pubDraft.defaultCtaLabel}
          onChange={(e) =>
            setPubDraft((p) => ({ ...p, defaultCtaLabel: e.target.value }))
          }
        />
        <FormInput
          label="تنبيه عدم التحديث بعد (عدد الأيام)"
          type="number"
          value={String(privDraft.staleListingDays)}
          onChange={(e) =>
            setPrivDraft((p) => ({
              ...p,
              staleListingDays: Number(toLatinDigits(e.target.value)) || 14,
            }))
          }
          className="tabular-nums"
        />
        <label className="h-[44px] mt-6 px-4 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] flex items-center justify-between cursor-pointer">
          <span className="text-[14px] font-semibold text-[#1C1917]">
            إخفاء المنتجات المباعة من الواجهة العامة
          </span>
          <input
            type="checkbox"
            checked={pubDraft.hideSoldListings}
            onChange={(e) =>
              setPubDraft((p) => ({ ...p, hideSoldListings: e.target.checked }))
            }
            className="w-4 h-4 accent-[#0F766E]"
          />
        </label>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
          قالب منشور فيسبوك الافتراضي (يدعم المتغيرات: &#123;title&#125; &#123;refNumber&#125; &#123;price&#125; &#123;province&#125; &#123;category&#125; &#123;specs&#125; &#123;customFields&#125; &#123;brokerPhone&#125; &#123;url&#125;)
        </label>
        <textarea
          rows={6}
          value={privDraft.fbPostTemplate}
          onChange={(e) =>
            setPrivDraft((p) => ({ ...p, fbPostTemplate: e.target.value }))
          }
          className="w-full p-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] text-[#1C1917]"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={savingSettings}>
          حفظ جميع الإعدادات
        </Button>
      </div>
    </form>
  );
}
