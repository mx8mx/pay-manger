import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Star,
  Trash2,
  Lock,
  AlertTriangle,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Layers,
  UserCheck,
} from 'lucide-react';
import {
  BrokerListing,
  CategoryItem,
  ProvinceItem,
  TagItem,
  PublicSettingsConfig,
  ListingStatus,
} from '../types/broker';
import { Button, FormInput } from './DesignSystemPrimitives';
import { compressImageFileToWebP } from '../lib/imageCompressor';
import { DEMO_IMAGES } from '../lib/demoAssets';
import {
  normalizeIraqiPhone,
  toLatinDigits,
  formatPrice,
} from '../lib/firebase';

interface ListingFormModalProps {
  isOpen: boolean;
  editingListing: BrokerListing | null;
  allListings: BrokerListing[];
  categories: CategoryItem[];
  provinces: ProvinceItem[];
  tags: TagItem[];
  publicSettings: PublicSettingsConfig;
  onClose: () => void;
  onSaveListing: (listing: BrokerListing, isEdit: boolean) => Promise<void>;
  onTriggerToast: (type: 'success' | 'error', msg: string) => void;
}

export function ListingFormModal({
  isOpen,
  editingListing,
  allListings,
  categories,
  provinces,
  tags,
  publicSettings,
  onClose,
  onSaveListing,
  onTriggerToast,
}: ListingFormModalProps) {
  // Fixed Public Fields: Title, Details, Price (IQD), Images, Tags, Province
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [provinceId, setProvinceId] = useState('baghdad');
  const [status, setStatus] = useState<ListingStatus>('available');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);

  // Fixed Private Seller Fields: Seller Name, Phone, Profile URL, Agreed Commission (IQD), Additional Details Textbox
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerProfileUrl, setSellerProfileUrl] = useState('');
  const [agreedCommission, setAgreedCommission] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingListing) {
      setTitle(editingListing.title);
      setDescription(editingListing.description);
      setDisplayPrice(String(editingListing.displayPrice));
      setProvinceId(editingListing.provinceId || provinces[0]?.id || 'baghdad');
      setStatus(editingListing.status);
      setSelectedTagIds(editingListing.tagIds);
      setImages(editingListing.images);

      setSellerName(editingListing.privateData.sellerName);
      setSellerPhone(editingListing.privateData.sellerPhone);
      setSellerProfileUrl(editingListing.privateData.sellerProfileUrl);
      setAgreedCommission(String(editingListing.privateData.commissionAmount || ''));
      setNotes(editingListing.privateData.notes);
    } else {
      setTitle('');
      setDescription('');
      setDisplayPrice('');
      setProvinceId(provinces[0]?.id || 'baghdad');
      setStatus('available');
      setSelectedTagIds([]);
      setImages([DEMO_IMAGES.landCruiser]);

      setSellerName('');
      setSellerPhone('');
      setSellerProfileUrl('');
      setAgreedCommission('');
      setNotes('');
    }
    setCompressionStats(null);
  }, [isOpen, editingListing, provinces]);

  if (!isOpen) return null;

  // Categories that will automatically capture this listing based on selectedTagIds
  const capturingCategories = categories.filter((cat) =>
    cat.allowedTagIds.some((tid) => selectedTagIds.includes(tid))
  );

  // Existing Seller Detection (auto-populates seller info if phone is already in Sellers list)
  const normalizedEnteredSellerPhone = normalizeIraqiPhone(sellerPhone);
  const previousSellerListings =
    normalizedEnteredSellerPhone.length >= 9
      ? allListings.filter(
          (item) =>
            item.id !== editingListing?.id &&
            normalizeIraqiPhone(item.privateData.sellerPhone) ===
              normalizedEnteredSellerPhone
        )
      : [];

  // Client-Side WebP Image Upload & Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setCompressing(true);
    try {
      const newCompressedUrls: string[] = [];
      let totalOrigKB = 0;
      let totalCompKB = 0;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const res = await compressImageFileToWebP(file, 1600, 0.8);
        newCompressedUrls.push(res.fullWebpDataUrl);
        totalOrigKB += res.originalSizeKB;
        totalCompKB += res.compressedSizeKB;
      }

      setImages((prev) => [...prev, ...newCompressedUrls].slice(0, 10));
      setCompressionStats(
        `تم ضغط ${newCompressedUrls.length} صورة بصيغة WebP (من ${totalOrigKB}KB إلى ${totalCompKB}KB)`
      );
      onTriggerToast('success', 'تم ضغط الصور تلقائياً إلى WebP وإضافتها للمنشور');
    } catch (err) {
      onTriggerToast(
        'error',
        err instanceof Error ? err.message : 'تعذر ضغط الصورة'
      );
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSetMainImage = (idx: number) => {
    if (idx === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(idx, 1);
      return [chosen, ...copy];
    });
  };

  const handleMoveImage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title.trim() ||
      !displayPrice.trim() ||
      !sellerName.trim() ||
      !sellerPhone.trim()
    ) {
      onTriggerToast(
        'error',
        'يرجى ملء الحقول الأساسية: العنوان، السعر، واسم ورقم البائع'
      );
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const nextNum = 1024 + allListings.length + 1;
      const autoRefNumber = editingListing?.refNumber || `#${nextNum}`;

      // Automatically assign categoryId based on the first capturing category (or fallback)
      const autoCategoryId =
        capturingCategories[0]?.id ||
        editingListing?.categoryId ||
        categories[0]?.id ||
        'cat-general';

      const cleanPrice =
        Number(toLatinDigits(displayPrice).replace(/[^\d.]/g, '')) || 0;
      const cleanCommission =
        Number(toLatinDigits(agreedCommission).replace(/[^\d.]/g, '')) || 0;

      const listingObj: BrokerListing = {
        id: editingListing?.id || `listing-${Date.now().toString().slice(-6)}`,
        refNumber: autoRefNumber,
        title: title.trim(),
        description: description.trim() || title.trim(),
        specs: '',
        images: images.length > 0 ? images : [DEMO_IMAGES.landCruiser],
        displayPrice: cleanPrice,
        currency: 'IQD', // Always Iraqi Dinar
        provinceId,
        categoryId: autoCategoryId,
        tagIds: selectedTagIds,
        customFields: {},
        status,
        cta: editingListing?.cta || {
          useDefault: true,
          type: publicSettings.defaultCtaType,
          label: publicSettings.defaultCtaLabel,
          target: publicSettings.brokerPhone,
          message: publicSettings.defaultCtaMessage,
          color: publicSettings.defaultCtaColor,
          secondaryType: 'call',
          secondaryLabel: 'اتصال مباشر',
          autoAdaptByStatus: true,
        },
        createdAt: editingListing?.createdAt || today,
        updatedAt: today,
        soldAt: status === 'sold' ? editingListing?.soldAt || today : undefined,
        clicks: editingListing?.clicks || 0,
        secondaryClicks: editingListing?.secondaryClicks || 0,
        privateData: {
          sellerName: sellerName.trim(),
          sellerPhone: toLatinDigits(sellerPhone.trim()),
          sellerProfileUrl: sellerProfileUrl.trim(),
          sellerAskingPrice: cleanPrice,
          finalSalePrice: editingListing?.privateData.finalSalePrice,
          commissionType: 'fixed',
          commissionValue: cleanCommission,
          commissionAmount: cleanCommission,
          commissionPaid: editingListing?.privateData.commissionPaid || 'no',
          commissionPaidAt: editingListing?.privateData.commissionPaidAt,
          notes: notes.trim(),
          lastContactAt: today,
        },
      };

      await onSaveListing(listingObj, Boolean(editingListing));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs overflow-y-auto p-3 md:p-6 flex items-start justify-center">
      <div className="broker-card max-w-3xl w-full bg-white my-4 overflow-hidden shadow-2xl">
        {/* Sticky Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E7E1D8] flex items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="typo-h2 text-[#1C1917]">
              {editingListing
                ? `تعديل المنشور (${toLatinDigits(editingListing.refNumber)})`
                : 'نشر منشور جديد'}
            </h2>
            <p className="text-[12px] text-[#6B645B]">
              نموذج سريع ومباشر — العملة بالدينار العراقي (د.ع) دائماً، والأقسام تلتقط المنشور تلقائياً حسب التاغات
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#F3EFE9] hover:bg-[#E7E1D8] flex items-center justify-center text-[#1C1917] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-7">
          {/* SECTION 1: FIXED PUBLIC FIELDS (Title, Details, Price in IQD, Images, Tags) */}
          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-[#0F766E] pb-2 border-b border-[#E7E1D8]">
              1. بيانات المنشور العامة (العنوان، التفاصيل، السعر، الصور، والتاغات)
            </h3>

            <FormInput
              label="عنوان المنشور *"
              placeholder="مثال: تويوتا لاندكروزر GXR موديل 2023 خليجي رقم بغداد مكفول"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                التفاصيل الكاملة للمنشور *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب جميع تفاصيل ومواصفات السلعة أو العقار هنا بدون ذكر اسم أو رقم البائع..."
                className="w-full p-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[15px] text-[#1C1917] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FormInput
                  label="السعر بالدينار العراقي (د.ع) *"
                  placeholder="مثال: 98000000"
                  value={displayPrice}
                  onChange={(e) => setDisplayPrice(toLatinDigits(e.target.value))}
                  className="tabular-nums font-bold"
                  hint={
                    displayPrice
                      ? `يُعرض: ${formatPrice(
                          Number(toLatinDigits(displayPrice).replace(/[^\d.]/g, '')) || 0
                        )}`
                      : undefined
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                  المحافظة
                </label>
                <select
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[15px] text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  {provinces.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                  حالة المنشور
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ListingStatus)}
                  className="w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] font-bold text-[#1C1917]"
                >
                  <option value="available">متاح</option>
                  <option value="reserved">محجوز</option>
                  <option value="sold">مباع</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>
            </div>

            {/* Relational Tags Selector (Replaces Manual Category Dropdown) */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-3">
              <div>
                <label className="block text-[14px] font-bold text-[#1C1917]">
                  اختر التاغات الخاصة بالمنشور (الأقسام تلتقط المنشور تلقائياً بناءً عليها):
                </label>
                <p className="text-[12px] text-[#6B645B] mt-0.5">
                  لا داعي لاختيار القسم يدوياً — بمجرد تحديد التاغات سيظهر المنشور تلقائياً في كل قسم يعتمد على هذه التاغات.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const active = selectedTagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setSelectedTagIds((prev) =>
                          active
                            ? prev.filter((id) => id !== t.id)
                            : [...prev, t.id]
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                          : 'bg-white border-[#E7E1D8] text-[#1C1917] hover:bg-[#F3EFE9]'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" strokeWidth={2.2} />}
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Automatic Category Capture Indicator */}
              <div className="pt-2 border-t border-[#E7E1D8] flex items-center flex-wrap gap-2 text-[12px]">
                <span className="font-semibold text-[#6B645B] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>الأقسام التي ستلتقط هذا المنشور تلقائياً:</span>
                </span>
                {capturingCategories.length === 0 ? (
                  <span className="text-[#6B645B]">
                    اختر تاغاً واحداً أو أكثر بالأعلى ليتم التقاطه في الأقسام المقابلة
                  </span>
                ) : (
                  capturingCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-bold"
                    >
                      {cat.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Images Upload & WebP Compression */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-[14px] font-bold text-[#1C1917]">
                    صور المنشور (ضغط تلقائي WebP)
                  </label>
                  <p className="text-[12px] text-[#6B645B]">
                    يمكنك رفع عدة صور وتحديد الصورة الرئيسية.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 h-[40px] px-4 rounded-xl bg-[#0F766E] text-white text-[13px] font-semibold hover:bg-[#0B5F58] cursor-pointer shrink-0">
                  <Upload className="w-4 h-4" strokeWidth={1.75} />
                  <span>
                    {compressing ? 'جاري ضغط الصور...' : 'رفع صور من جهازك'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={compressing}
                  />
                </label>
              </div>

              {compressionStats && (
                <div className="px-3.5 py-2 rounded-xl bg-[#DCFCE7] text-[#166534] text-[13px] font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{compressionStats}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border-2 bg-[#F3EFE9] aspect-[4/3] ${
                      idx === 0 ? 'border-[#0F766E]' : 'border-[#E7E1D8]'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 ? (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#0F766E] text-white text-[11px] font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>الرئيسية</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(idx)}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[#1C1917] text-[11px] font-semibold hover:bg-[#0F766E] hover:text-white cursor-pointer"
                      >
                        تعيين كرئيسية
                      </button>
                    )}

                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between bg-black/60 backdrop-blur-xs rounded-lg p-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 1)}
                          disabled={idx === images.length - 1}
                          className="p-1 text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-[#FCA5A5] hover:text-white cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: PRIVATE SELLER DATA (Seller Name, Phone, Profile URL, Agreed Commission, Additional Details Textbox) */}
          <div className="rounded-2xl bg-[#FEF3C7]/60 border-2 border-[#D97706]/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2.5 text-[#92400E] pb-2 border-b border-[#D97706]/25 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#D97706]/40 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-[#D97706]" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#92400E]">
                    2. البيانات السرية للبائع والعمولة (خاصة بك فقط — ويندرج البائع تلقائياً في قائمة البائعين)
                  </h3>
                  <p className="text-[12px] text-[#92400E]/80">
                    لا تظهر للزوار إطلاقاً، وتُحفظ في سجل البائعين الخاص بك مع إجمالي عروضه وعمولاته.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 border border-[#D97706]/30 text-[11px] font-bold text-[#92400E]">
                <UserCheck className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>يندرج تلقائياً في سجل البائعين</span>
              </span>
            </div>

            {/* Duplicate Seller Phone Alert */}
            {previousSellerListings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white border border-[#D97706] text-[#92400E] space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[13px] font-bold">
                    <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span>
                      هذا البائع موجود مسبقاً في قائمة البائعين باسم ({previousSellerListings[0].privateData.sellerName}) ولديه {toLatinDigits(previousSellerListings.length)} منشور!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSellerName(previousSellerListings[0].privateData.sellerName);
                      setSellerProfileUrl(
                        previousSellerListings[0].privateData.sellerProfileUrl
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#92400E] text-[12px] font-bold hover:brightness-95 cursor-pointer"
                  >
                    تعبئة اسمه وحسابه تلقائياً
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="اسم البائع *"
                placeholder="مثال: الحاج أبو مصطفى"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="bg-white"
                required
              />
              <FormInput
                label="رقم هاتف البائع *"
                placeholder="07809988776"
                dir="ltr"
                value={sellerPhone}
                onChange={(e) => setSellerPhone(toLatinDigits(e.target.value))}
                className="bg-white tabular-nums font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="رابط حساب البائع (فيسبوك أو غيره)"
                placeholder="https://facebook.com/..."
                dir="ltr"
                value={sellerProfileUrl}
                onChange={(e) => setSellerProfileUrl(e.target.value)}
                className="bg-white"
              />
              <FormInput
                label="العمولة المتفق عليها بالدينار العراقي (د.ع) *"
                placeholder="مثال: 1500000"
                value={agreedCommission}
                onChange={(e) => setAgreedCommission(toLatinDigits(e.target.value))}
                className="bg-white tabular-nums font-bold"
                hint={
                  agreedCommission
                    ? `العمولة المحفوظة: ${formatPrice(
                        Number(toLatinDigits(agreedCommission).replace(/[^\d.]/g, '')) || 0
                      )}`
                    : undefined
                }
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#92400E] mb-1.5">
                تفاصيل إضافية خاصة بالبائع / الاتفاق (صندوق نص سري)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب أي تفاصيل إضافية عن البائع، أوقات الاتصال، أو اتفاق العمولة..."
                className="w-full p-3.5 rounded-xl bg-white border border-[#E7E1D8] text-[14px] text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
              />
            </div>
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E1D8]">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editingListing
                ? 'حفظ التعديلات وتحديث البائع'
                : 'نشر المنشور وإدراج البائع في القائمة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
