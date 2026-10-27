import React, { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Bell,
  Trash2,
  Eye,
  Phone,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  StatusBadge,
  QuickStatusDropdown,
  FormInput,
  ProductCard,
  ProductCardSkeleton,
  EmptyState,
  SellerPrivateBox,
  CustomCtaButtons,
  ListingStatus,
  WhatsAppIcon,
} from './DesignSystemPrimitives';
import { DemoListing } from '../lib/demoAssets';
import {
  formatPrice,
  normalizeIraqiPhone,
  toLatinDigits,
  formatCtaMessage,
} from '../lib/firebase';

interface Phase1DesignLabProps {
  listings: DemoListing[];
  onSelectListing: (listing: DemoListing) => void;
  onStatusChangeRequest: (listingId: string, newStatus: ListingStatus) => void;
  onTriggerToast: (type: 'success' | 'error', message: string) => void;
  onTriggerDeleteModal: (title: string) => void;
}

export function Phase1DesignLab({
  listings,
  onSelectListing,
  onStatusChangeRequest,
  onTriggerToast,
  onTriggerDeleteModal,
}: Phase1DesignLabProps) {
  const [phoneTestInput, setPhoneTestInput] = useState('٠٧٧٠١٢٣٤٥٦٧');
  const [sampleInput, setSampleInput] = useState('دار سكنية في المنصور');
  const [errorInput, setErrorInput] = useState('٠٧٨٠');
  const [showSkeletonPreview, setShowSkeletonPreview] = useState(false);
  const [showEmptyPreview, setShowEmptyPreview] = useState(false);

  // Interactive Custom CTA preview state (Section 5.1)
  const sampleListing = listings[0];
  const [ctaType, setCtaType] = useState<'whatsapp' | 'call' | 'telegram' | 'messenger' | 'link'>('whatsapp');
  const [ctaLabel, setCtaLabel] = useState('تواصل معي عبر واتساب');
  const [ctaTarget, setCtaTarget] = useState('07701234567');
  const [ctaStatus, setCtaStatus] = useState<ListingStatus>('available');
  const [ctaAutoAdapt, setCtaAutoAdapt] = useState(true);

  const previewListing: DemoListing = {
    ...sampleListing,
    status: ctaStatus,
    cta: {
      ...sampleListing.cta,
      type: ctaType,
      label: ctaLabel,
      target: ctaTarget,
      autoAdaptByStatus: ctaAutoAdapt,
    },
  };

  const colorSwatches = [
    { name: '--bg', hex: '#FAF8F5', desc: 'خلفية الصفحة الدافئة', bg: 'bg-[#FAF8F5]' },
    { name: '--surface', hex: '#FFFFFF', desc: 'البطاقات والنوافذ', bg: 'bg-[#FFFFFF]' },
    { name: '--surface-2', hex: '#F3EFE9', desc: 'الحقول والشرائح', bg: 'bg-[#F3EFE9]' },
    { name: '--border', hex: '#E7E1D8', desc: 'الحدود (1px)', bg: 'bg-[#E7E1D8]' },
    { name: '--text', hex: '#1C1917', desc: 'النص الرئيسي', bg: 'bg-[#1C1917]', dark: true },
    { name: '--text-muted', hex: '#6B645B', desc: 'النص الثانوي', bg: 'bg-[#6B645B]', dark: true },
    { name: '--primary', hex: '#0F766E', desc: 'اللون الرئيسي والأزرار', bg: 'bg-[#0F766E]', dark: true },
    { name: '--primary-hover', hex: '#0B5F58', desc: 'حالة التمرير', bg: 'bg-[#0B5F58]', dark: true },
    { name: '--primary-soft', hex: '#E3F2F0', desc: 'العناصر المحددة', bg: 'bg-[#E3F2F0]' },
    { name: '--accent', hex: '#D97706', desc: 'عنبري للتمييز والشارات', bg: 'bg-[#D97706]', dark: true },
    { name: '--whatsapp', hex: '#25D366', desc: 'زر واتساب فقط', bg: 'bg-[#25D366]' },
    { name: 'خطأ / حذف', hex: '#DC2626', desc: 'التنبيهات والحذف', bg: 'bg-[#DC2626]', dark: true },
  ];

  return (
    <div className="space-y-10 md:space-y-12 pb-12">
      {/* Intro Banner */}
      <section className="broker-card p-6 md:p-8 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E7E1D8]">
          <div>
            <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F766E] mb-2">
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
              <span>المرحلة 1 مكتملة — نظام التصميم والمكونات الأساسية (القسم 4)</span>
            </div>
            <h1 className="typo-h1 text-[#1C1917]">
              صفحة فحص نظام التصميم والمكوّنات التفاعلية
            </h1>
            <p className="typo-body text-[#6B645B] mt-1">
              جميع المكوّنات أدناه مبنية حرفيًا وفق القسم 4 من المواصفات: خط <strong className="font-semibold text-[#1C1917]">IBM Plex Sans Arabic</strong>، أرقام لاتينية <span className="tabular-nums font-semibold text-[#1C1917]">(0-9)</span> مع محاذاة جدولية، بدون أي خط مائل، وبنفس متغيرات الألوان والحواف.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              onClick={() =>
                onTriggerToast('success', 'تم حفظ التعديلات وتحديث حالة المنشور بنجاح!')
              }
              icon={<Bell className="w-4 h-4" strokeWidth={1.75} />}
            >
              تجربة إشعار نجاح (Toast)
            </Button>
            <Button
              variant="danger"
              onClick={() => onTriggerDeleteModal('تويوتا لاندكروزر GXR 2023')}
              icon={<Trash2 className="w-4 h-4" strokeWidth={1.75} />}
            >
              تجربة نافذة الحذف (Modal)
            </Button>
          </div>
        </div>

        {/* 1. Color Variables */}
        <div className="mt-6">
          <h2 className="typo-h2 text-[#1C1917] mb-4">1. متغيرات الألوان المعتمدة (القسم 4.3)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {colorSwatches.map((swatch) => (
              <div
                key={swatch.name}
                className="rounded-xl border border-[#E7E1D8] overflow-hidden bg-white"
              >
                <div
                  className={`h-14 ${swatch.bg} flex items-end justify-between p-2.5 border-b border-[#E7E1D8]`}
                >
                  <span
                    className={`text-[12px] font-bold font-mono tabular-nums ${
                      swatch.dark ? 'text-white' : 'text-[#1C1917]'
                    }`}
                  >
                    {swatch.hex}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="text-[13px] font-bold text-[#1C1917] font-mono">
                    {swatch.name}
                  </div>
                  <div className="text-[12px] text-[#6B645B] mt-0.5">{swatch.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Typography & Latin Numerals */}
      <section className="broker-card p-6 md:p-8 bg-white">
        <h2 className="typo-h2 text-[#1C1917] mb-4">
          2. مقياس الخطوط والأرقام اللاتينية (القسم 4.2)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 divide-y divide-[#E7E1D8]">
            <div className="pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="typo-muted shrink-0">H1 عنوان الصفحة (26px ← 34px / 700)</span>
              <span className="typo-h1 text-[#1C1917]">سوق الوساطة العقارية والسيارات</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="typo-muted shrink-0">H2 عنوان قسم (20px ← 24px / 600)</span>
              <span className="typo-h2 text-[#1C1917]">أحدث العقارات والسيارات المعروضة</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="typo-muted shrink-0">عنوان بطاقة (16px / 600 / سطرين)</span>
              <span className="typo-card-title text-[#1C1917] max-w-md">
                تويوتا لاندكروزر GXR موديل 2023 خليجي رقم بغداد مكفول من الدعامية للدعامية
              </span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="typo-muted shrink-0">نص عادي (15px ← 16px / 400 / 1.8)</span>
              <span className="typo-body text-[#1C1917] max-w-md">
                تواصل مع الوسيط مباشرة لترتيب موعد معاينة وفحص السلعة في بغداد وباقي المحافظات.
              </span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="typo-muted shrink-0">السعر (18px ← 22px / 700 / tabular-nums)</span>
              <div className="flex items-center gap-4">
                <span className="typo-price text-[#0F766E]">{formatPrice(74500, 'USD')}</span>
                <span className="typo-price text-[#0F766E]">{formatPrice(680000000, 'IQD')}</span>
              </div>
            </div>
          </div>

          {/* Interactive Iraqi Phone & Latin Digit Normalizer */}
          <div className="rounded-2xl bg-[#F3EFE9] border border-[#E7E1D8] p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-[#1C1917] mb-1">
                اختبار تطبيع الأرقام اللاتينية والهاتف العراقي
              </h3>
              <p className="text-[13px] text-[#6B645B] mb-4">
                أدخل أرقامًا عربية (٠-٩) أو رقم هاتف عراقي (07XX) لترى التحويل التلقائي إلى لاتيني (0-9) وصيغة واتساب الدولية:
              </p>
              <FormInput
                label="جرّب كتابة رقم بالعربي أو الإنجليزي"
                value={phoneTestInput}
                onChange={(e) => setPhoneTestInput(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="mt-4 space-y-2.5 bg-white p-3.5 rounded-xl border border-[#E7E1D8] text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B645B]">تحويل لاتيني (0-9):</span>
                <span className="font-bold text-[#1C1917] tabular-nums" dir="ltr">
                  {toLatinDigits(phoneTestInput)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B645B]">تطبيع واتساب العراقي:</span>
                <span className="font-bold text-[#0F766E] tabular-nums" dir="ltr">
                  {normalizeIraqiPhone(phoneTestInput)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E7E1D8] flex items-center justify-between">
                <span className="text-[#6B645B]">رابط واتساب الناتج:</span>
                <a
                  href={`https://wa.me/${normalizeIraqiPhone(phoneTestInput)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0F766E] font-semibold hover:underline tabular-nums"
                  dir="ltr"
                >
                  wa.me/{normalizeIraqiPhone(phoneTestInput)}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Buttons & Badges */}
      <section className="broker-card p-6 md:p-8 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Buttons */}
          <div>
            <h2 className="typo-h2 text-[#1C1917] mb-4">3. الأزرار وحالاتها (القسم 4.5)</h2>
            <p className="typo-muted mb-4">
              ارتفاع 46px، حواف rounded-xl (12px)، وزن خط 600، وأهداف لمس لا تقل عن 44px.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">زر رئيسي (Primary)</Button>
              <Button variant="secondary">زر ثانوي (Secondary)</Button>
              <Button variant="ghost">زر شبح (Ghost)</Button>
              <Button variant="danger">زر خطر / حذف</Button>
              <Button variant="whatsapp" icon={<WhatsAppIcon className="w-5 h-5" />}>
                تواصل عبر واتساب
              </Button>
              <Button variant="primary" loading>
                حالة التحميل
              </Button>
              <Button variant="primary" disabled>
                زر معطّل (Disabled)
              </Button>
            </div>
          </div>

          {/* Badges & Quick Status Switcher */}
          <div>
            <h2 className="typo-h2 text-[#1C1917] mb-4">
              4. الشارات وتغيير الحالة السريع (القسم 4.5 و 4.6)
            </h2>
            <p className="typo-muted mb-4">
              حجم 12px، وزن 600، حشوة 4×10px، وحواف دائرية كاملة. انقر على الشارة التفاعلية لتجربة القائمة المنسدلة:
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <StatusBadge status="available" />
              <StatusBadge status="reserved" />
              <StatusBadge status="sold" />
              <StatusBadge status="archived" />
            </div>

            <div className="p-4 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-bold text-[#1C1917]">
                  تجربة تغيير الحالة بنقرة واحدة (مع نافذة حساب العمولة عند اختيار "مباع"):
                </div>
                <div className="text-[12px] text-[#6B645B]">
                  انقر على الشارة بجانب الإعلان {sampleListing.refNumber} لتغيير حالته فوراً
                </div>
              </div>
              <QuickStatusDropdown
                status={sampleListing.status}
                onChange={(newSt) => onStatusChangeRequest(sampleListing.id, newSt)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Custom CTA Builder (Section 5.1) */}
      <section className="broker-card p-6 md:p-8 bg-white">
        <div className="flex items-center gap-2 text-[#0F766E] text-[13px] font-semibold mb-1">
          <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
          <span>ميزة القسم 5.1 — معاينة حية لزر التواصل القابل للتخصيص لكل منشور</span>
        </div>
        <h2 className="typo-h2 text-[#1C1917] mb-4">
          5. تخصيص زر التواصل لكل منشور + التكيّف التلقائي مع الحالة
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                نوع زر التواصل (cta.type)
              </label>
              <select
                value={ctaType}
                onChange={(e) => setCtaType(e.target.value as typeof ctaType)}
                className="w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[15px] text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="whatsapp">واتساب (الافتراضي برقم الوسيط)</option>
                <option value="call">اتصال هاتفي مباشر (tel:)</option>
                <option value="telegram">تيليغرام (Telegram)</option>
                <option value="messenger">ماسنجر فيسبوك (Messenger)</option>
                <option value="link">رابط خارجي مخصص</option>
              </select>
            </div>

            <FormInput
              label="نص الزر (cta.label)"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
            />

            <FormInput
              label="الرقم أو الرابط (cta.target)"
              value={ctaTarget}
              onChange={(e) => setCtaTarget(toLatinDigits(e.target.value))}
              hint={`جرّب كتابة رقم البائع (${sampleListing.privateData.sellerPhone}) لترى التحذير الأمني!`}
            />

            <div>
              <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                حالة المنتج لمعاينة تغيّر الزر تلقائياً
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['available', 'reserved', 'sold'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCtaStatus(st)}
                    className={`h-[44px] rounded-xl text-[13px] font-semibold border transition-colors cursor-pointer ${
                      ctaStatus === st
                        ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                        : 'bg-[#F3EFE9] border-[#E7E1D8] text-[#1C1917]'
                    }`}
                  >
                    {st === 'available' ? 'متاح' : st === 'reserved' ? 'محجوز' : 'مباع'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live CTA Preview Box */}
          <div className="lg:col-span-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D8] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#1C1917]">معاينة الزر كما يظهر للمشتري:</span>
              <StatusBadge status={ctaStatus} />
            </div>

            <CustomCtaButtons
              listing={previewListing}
              onViewSimilar={() =>
                onTriggerToast('success', 'تم توجيه الزائر إلى قسم المنتجات المشابهة!')
              }
            />

            <div className="p-3 rounded-xl bg-white border border-[#E7E1D8] text-[12px] text-[#6B645B] space-y-1">
              <div className="font-semibold text-[#1C1917]">قالب رسالة واتساب المولّد تلقائياً:</div>
              <p className="leading-relaxed">
                {formatCtaMessage(previewListing.cta.message, {
                  title: previewListing.title,
                  refNumber: previewListing.refNumber,
                  price: formatPrice(previewListing.displayPrice, previewListing.currency),
                  province: previewListing.provinceName,
                  url: 'https://broker.iq/listings/1024',
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Forms & Locked Amber Seller Box */}
      <section className="broker-card p-6 md:p-8 bg-white space-y-6">
        <h2 className="typo-h2 text-[#1C1917]">
          6. حقول النماذج وصندوق بيانات البائع السري (القسم 4.6)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="حقل إدخال قياسي (ارتفاع 44px وخلفية --surface-2)"
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
            placeholder="أدخل عنوان المنشور..."
          />
          <FormInput
            label="حقل مع تلميح توضيحي"
            defaultValue="74500"
            hint="تُعرض الأسعار دائماً بأرقام لاتينية (0-9)"
          />
          <FormInput
            label="حقل في حالة خطأ تحقق (Validation Error)"
            value={errorInput}
            onChange={(e) => setErrorInput(e.target.value)}
            error="رقم الهاتف العراقي يجب أن يتكون من 11 رقماً يبدأ بـ 07"
          />
        </div>

        {/* Locked Seller Box */}
        <SellerPrivateBox listing={sampleListing} ctaTargetToCheck={ctaTarget} />
      </section>

      {/* 7. Product Cards Grid (4 columns desktop, 3 tablet, 2 mobile) + Skeleton & Empty State */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="typo-h2 text-[#1C1917]">
              7. شبكة بطاقات المنتجات (4:3) وحالات التحميل والفراغ (القسم 4.5)
            </h2>
            <p className="typo-muted">
              عمودان على الموبايل، 3 على التابلت، 4 على الديسكتوب. انقر على أي بطاقة لفتح صفحة تفاصيل المنتج الكاملة.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showSkeletonPreview ? 'primary' : 'secondary'}
              onClick={() => {
                setShowSkeletonPreview((v) => !v);
                setShowEmptyPreview(false);
              }}
            >
              {showSkeletonPreview ? 'إخفاء Skeleton' : 'معاينة التحميل (Skeleton)'}
            </Button>
            <Button
              variant={showEmptyPreview ? 'primary' : 'secondary'}
              onClick={() => {
                setShowEmptyPreview((v) => !v);
                setShowSkeletonPreview(false);
              }}
            >
              {showEmptyPreview ? 'إخفاء الحالة الفارغة' : 'معاينة عدم وجود نتائج'}
            </Button>
          </div>
        </div>

        {showSkeletonPreview ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        ) : showEmptyPreview ? (
          <EmptyState onReset={() => setShowEmptyPreview(false)} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {listings.map((item) => (
              <ProductCard
                key={item.id}
                listing={item}
                onSelect={onSelectListing}
                showAdminControls
                onQuickStatusChange={onStatusChangeRequest}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
