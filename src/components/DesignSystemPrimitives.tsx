import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Lock,
  Loader2,
  ChevronDown,
  Phone,
  ExternalLink,
  AlertTriangle,
  SearchX,
  Trash2,
  X,
  Check,
  ShieldAlert,
  Calculator,
} from 'lucide-react';
import {
  DemoListing,
  INITIAL_DEMO_LISTINGS,
} from '../lib/demoAssets';
import {
  formatPrice,
  normalizeIraqiPhone,
  toLatinDigits,
  formatCtaMessage,
} from '../lib/firebase';

export type ListingStatus = 'available' | 'reserved' | 'sold' | 'archived';

export const STATUS_CONFIG: Record<
  ListingStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  available: {
    label: 'متاح',
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#166534]',
    dot: 'bg-[#166534]',
  },
  reserved: {
    label: 'محجوز',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
    dot: 'bg-[#92400E]',
  },
  sold: {
    label: 'مباع',
    bg: 'bg-[#E7E5E4]',
    text: 'text-[#44403C]',
    dot: 'bg-[#44403C]',
  },
  archived: {
    label: 'مؤرشف',
    bg: 'bg-[#F5F5F4]',
    text: 'text-[#78716C]',
    dot: 'bg-[#78716C]',
  },
};

/* Brand SVG Icons (WhatsApp, Facebook, Telegram) per Section 4.4 */
export function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5.016L2 22l5.156-1.359c1.484.813 3.156 1.25 4.875 1.25 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.531.078-1.203.109-1.953-.125-.453-.141-1.047-.344-1.797-.672-3.156-1.359-5.219-4.547-5.375-4.766-.156-.203-1.281-1.703-1.281-3.25s.813-2.313 1.094-2.625c.297-.313.641-.391.859-.391.219 0 .422.016.609.016.203.016.469-.078.734.563.266.656.906 2.219.984 2.375.078.156.125.344.031.547-.109.203-.156.344-.313.531-.156.188-.328.406-.469.547-.156.156-.328.328-.141.641.188.328.828 1.359 1.781 2.203 1.219 1.094 2.25 1.438 2.578 1.594.313.156.5.125.688-.078.188-.219.797-.938 1.016-1.25.219-.313.422-.266.719-.156.297.109 1.875.891 2.203 1.047.313.156.531.234.609.375.078.141.078.813-.172 1.516z" />
    </svg>
  );
}

export function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

export function TelegramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/* Section 4.5 Buttons */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp' | 'amber';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 min-h-[44px] h-[46px] px-5 rounded-xl text-[15px] font-semibold transition-all duration-150 ease-out whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[#0F766E] text-white hover:bg-[#0B5F58] shadow-xs',
    secondary:
      'bg-transparent border border-[#0F766E] text-[#0F766E] hover:bg-[#E3F2F0]',
    ghost:
      'bg-transparent text-[#1C1917] hover:bg-[#F3EFE9] border border-transparent',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-xs',
    whatsapp: 'bg-[#25D366] text-[#1C1917] hover:brightness-95 shadow-xs font-bold',
    amber: 'bg-[#D97706] text-white hover:bg-[#B45309] shadow-xs',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin shrink-0" strokeWidth={1.75} />
          <span>جاري التنفيذ...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

/* Section 4.5 Status Badge */
export function StatusBadge({
  status,
  className = '',
}: {
  status: ListingStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span>{cfg.label}</span>
    </span>
  );
}

/* Section 4.6 Quick Clickable Status Badge with Dropdown */
export function QuickStatusDropdown({
  status,
  onChange,
}: {
  status: ListingStatus;
  onChange: (newStatus: ListingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full text-[12px] font-semibold transition-all duration-150 cursor-pointer border border-black/5 hover:brightness-95 ${cfg.bg} ${cfg.text}`}
        title="انقر لتغيير الحالة سريعاً"
      >
        <span>{cfg.label}</span>
        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-1.5 w-36 bg-white border border-[#E7E1D8] rounded-xl shadow-lg py-1 z-30"
        >
          {(Object.keys(STATUS_CONFIG) as ListingStatus[]).map((key) => {
            const item = STATUS_CONFIG[key];
            const isSelected = key === status;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (key !== status) onChange(key);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium hover:bg-[#F3EFE9] transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#E3F2F0]/60 text-[#0F766E] font-semibold' : 'text-[#1C1917]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span>{item.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#0F766E]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Section 4.6 Form Input */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function FormInput({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: FormInputProps) {
  const inputId = id || `input-${label}`;
  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="block text-[13px] font-medium text-[#6B645B] mb-1.5"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border text-[15px] text-[#1C1917] placeholder:text-[#6B645B]/70 transition-all duration-150 focus:outline-none focus:bg-white focus:ring-2 ${
          error
            ? 'border-[#DC2626] focus:ring-[#DC2626]'
            : 'border-[#E7E1D8] focus:ring-[#0F766E]'
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1 text-[12px] text-[#6B645B]">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-[12px] font-medium text-[#DC2626] flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/* Section 4.5 Product Card (4:3 Image, Status Top-Right, 2-Line Title, Primary Price, Location · Category) */
export function ProductCard({
  listing,
  onSelect,
  showAdminControls = false,
  onQuickStatusChange,
}: {
  listing: DemoListing;
  onSelect?: (listing: DemoListing) => void;
  showAdminControls?: boolean;
  onQuickStatusChange?: (id: string, newStatus: ListingStatus) => void;
}) {
  const isSold = listing.status === 'sold';
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelect?.(listing)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(listing);
        }
      }}
      className="broker-card broker-card-interactive overflow-hidden flex flex-col text-right cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
    >
      {/* 4:3 Image Container */}
      <div className="relative w-full aspect-[4/3] bg-[#F3EFE9] overflow-hidden border-b border-[#E7E1D8]">
        {!imgError ? (
          <img
            src={listing.image}
            alt={listing.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] ${
              isSold ? 'grayscale-[65%] opacity-85' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#F3EFE9] text-[#6B645B]">
            <span className="text-[13px] font-semibold">{listing.categoryName}</span>
            <span className="text-[12px] tabular-nums">{listing.refNumber}</span>
          </div>
        )}

        {/* Top-Right Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          {showAdminControls && onQuickStatusChange ? (
            <QuickStatusDropdown
              status={listing.status}
              onChange={(st) => onQuickStatusChange(listing.id, st)}
            />
          ) : (
            <StatusBadge status={listing.status} />
          )}
        </div>

        {/* Reference Number Chip Top-Left */}
        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-[#E7E1D8] text-[12px] font-semibold text-[#1C1917] tabular-nums">
          {toLatinDigits(listing.refNumber)}
        </div>

        {/* Diagonal Sold Ribbon Overlay per Section 4.5 */}
        {isSold && (
          <div className="absolute inset-0 bg-[#1C1917]/20 flex items-center justify-center pointer-events-none">
            <div className="bg-[#1C1917]/90 text-white px-6 py-1.5 rounded-full text-[14px] font-bold tracking-wide shadow-md -rotate-6 border border-white/20">
              تم البيع
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 md:p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <h3 className="typo-card-title text-[#1C1917] group-hover:text-[#0F766E] transition-colors">
            {listing.title}
          </h3>
        </div>

        <div className="pt-1 flex flex-col gap-1.5">
          <div className="typo-price text-[#0F766E] tabular-nums">
            {formatPrice(listing.displayPrice, listing.currency)}
          </div>

          <div className="flex items-center justify-between text-[13px] font-medium text-[#6B645B]">
            <div className="flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 text-[#6B645B] shrink-0" strokeWidth={1.75} />
              <span className="truncate">{listing.provinceName}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{listing.categoryName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Section 4.5 Skeleton Loader matching ProductCard dimensions */
export function ProductCardSkeleton() {
  return (
    <div className="broker-card overflow-hidden flex flex-col animate-pulse">
      <div className="w-full aspect-[4/3] bg-[#F3EFE9] border-b border-[#E7E1D8]" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-[#F3EFE9] rounded-md w-11/12" />
        <div className="h-4 bg-[#F3EFE9] rounded-md w-3/4" />
        <div className="h-6 bg-[#E3F2F0] rounded-md w-1/2 mt-1" />
        <div className="h-3.5 bg-[#F3EFE9] rounded-md w-2/3" />
      </div>
    </div>
  );
}

/* Section 4.5 Friendly Arabic Empty State */
export function EmptyState({
  title = 'لا توجد منشورات مطابقة للبحث',
  description = 'جرّب تغيير الفلاتر أو البحث بكلمات أخرى للعثور على طلبك.',
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div className="broker-card p-8 md:p-12 text-center max-w-lg mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-[#F3EFE9] text-[#0F766E] flex items-center justify-center mx-auto mb-4">
        <SearchX className="w-7 h-7" strokeWidth={1.75} />
      </div>
      <h3 className="typo-h2 text-[#1C1917] mb-2">{title}</h3>
      <p className="typo-body text-[#6B645B] mb-6">{description}</p>
      {onReset && (
        <Button variant="secondary" onClick={onReset}>
          إعادة ضبط الفلاتر
        </Button>
      )}
    </div>
  );
}

/* Section 4.6 Locked Amber Box for Private Seller Information */
export function SellerPrivateBox({
  listing,
  ctaTargetToCheck,
}: {
  listing: DemoListing;
  ctaTargetToCheck?: string;
}) {
  const { privateData, currency } = listing;
  const normalizedSellerWa = normalizeIraqiPhone(privateData.sellerPhone);
  const normalizedCtaTarget = normalizeIraqiPhone(ctaTargetToCheck ?? listing.cta.target);
  const isLeakingSellerPhone =
    normalizedSellerWa.length >= 10 && normalizedSellerWa === normalizedCtaTarget;

  return (
    <div className="rounded-2xl bg-[#FEF3C7]/65 border border-[#D97706]/35 p-4 md:p-5 text-right">
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#D97706]/20">
        <div className="flex items-center gap-2 text-[#92400E]">
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#D97706]/30 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-[#D97706]" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#92400E]">
              بيانات البائع والعمولة الخاصة (سري للمدير فقط)
            </h4>
            <p className="text-[12px] text-[#92400E]/80">
              محفوظة في مجموعة مستقلة <code className="font-mono">listings_private</code> ولا تُرسل للزوار إطلاقاً
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] border border-[#D97706]/30 text-[12px] font-semibold text-[#92400E] tabular-nums">
          {listing.refNumber}
        </span>
      </div>

      {/* Security Warning if CTA target matches seller phone per Section 5.1 */}
      {isLeakingSellerPhone && (
        <div className="mb-4 p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626] text-[#DC2626] flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2} />
          <div className="text-[13px] font-semibold">
            تحذير أمني خطير: رقم زر التواصل العام يطابق رقم البائع الخاص ({toLatinDigits(privateData.sellerPhone)})! يرجى استبداله برقمك أنت فوراً لحماية عمولتك.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-[14px]">
        <div className="bg-white/85 rounded-xl p-3 border border-[#E7E1D8]">
          <span className="block text-[12px] font-medium text-[#6B645B] mb-1">اسم البائع</span>
          <span className="font-semibold text-[#1C1917]">{privateData.sellerName}</span>
        </div>

        <div className="bg-white/85 rounded-xl p-3 border border-[#E7E1D8]">
          <span className="block text-[12px] font-medium text-[#6B645B] mb-1">
            رقم هاتف البائع
          </span>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-[#1C1917] tabular-nums" dir="ltr">
              {toLatinDigits(privateData.sellerPhone)}
            </span>
            <div className="flex items-center gap-1.5">
              <a
                href={`https://wa.me/${normalizedSellerWa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] text-[#1C1917] text-[12px] font-bold hover:brightness-95"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
              <a
                href={`tel:+${normalizedSellerWa}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F766E] text-white text-[12px] font-semibold hover:bg-[#0B5F58]"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>اتصال</span>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white/85 rounded-xl p-3 border border-[#E7E1D8]">
          <span className="block text-[12px] font-medium text-[#6B645B] mb-1">رابط حساب البائع</span>
          {privateData.sellerProfileUrl ? (
            <a
              href={privateData.sellerProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#0F766E] font-semibold hover:underline"
            >
              <FacebookIcon className="w-4 h-4" />
              <span>فتح حساب البائع</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
          ) : (
            <span className="text-[13px] text-[#6B645B]">غير مضاف</span>
          )}
        </div>

        <div className="bg-white/85 rounded-xl p-3 border border-[#E7E1D8]">
          <span className="block text-[12px] font-medium text-[#6B645B] mb-1">
            العمولة المتفق عليها (د.ع)
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#0F766E] tabular-nums">
              {formatPrice(privateData.commissionAmount, 'IQD')}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                privateData.commissionPaid === 'yes'
                  ? 'bg-[#DCFCE7] text-[#166534]'
                  : privateData.commissionPaid === 'partial'
                  ? 'bg-[#FEF3C7] text-[#92400E]'
                  : 'bg-[#DC2626]/10 text-[#DC2626]'
              }`}
            >
              {privateData.commissionPaid === 'yes'
                ? 'مستلمة'
                : privateData.commissionPaid === 'partial'
                ? 'جزئي'
                : 'معلقة'}
            </span>
          </div>
        </div>
      </div>

      {privateData.notes && (
        <div className="mt-3 bg-white/85 rounded-xl p-3 border border-[#E7E1D8] text-[13px] text-[#1C1917]">
          <span className="font-semibold text-[#92400E] ml-1">تفاصيل إضافية للبائع:</span>
          <span>{privateData.notes}</span>
        </div>
      )}
    </div>
  );
}

/* Section 5.1 Customizable CTA Button Renderer */
export function CustomCtaButtons({
  listing,
  onTrackClick,
  onViewSimilar,
}: {
  listing: DemoListing;
  onTrackClick?: (id: string, isSecondary?: boolean) => void;
  onViewSimilar?: () => void;
}) {
  const { cta, status } = listing;

  if (cta.type === 'none') return null;

  // Dynamic status behavior per Section 5.1
  if (cta.autoAdaptByStatus && status === 'sold') {
    return (
      <Button
        variant="secondary"
        fullWidth
        onClick={() => onViewSimilar?.()}
      >
        شاهد منتجات مشابهة
      </Button>
    );
  }

  const effectiveLabel =
    cta.autoAdaptByStatus && status === 'reserved'
      ? 'محجوز، اسأل عن البدائل'
      : cta.label;

  const formattedMsg = formatCtaMessage(cta.message, {
    title: listing.title,
    refNumber: listing.refNumber,
    price: formatPrice(listing.displayPrice, listing.currency),
    province: listing.provinceName,
    url: typeof window !== 'undefined' ? window.location.href : 'https://broker.iq',
  });

  const normalizedPhone = normalizeIraqiPhone(cta.target);

  const getPrimaryHref = () => {
    if (cta.type === 'whatsapp') {
      return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(formattedMsg)}`;
    }
    if (cta.type === 'call') {
      return `tel:+${normalizedPhone}`;
    }
    if (cta.type === 'telegram') {
      return cta.target.startsWith('http') ? cta.target : `https://t.me/${cta.target.replace('@', '')}`;
    }
    if (cta.type === 'messenger') {
      return cta.target.startsWith('http') ? cta.target : `https://m.me/${cta.target}`;
    }
    return cta.target;
  };

  const getIcon = () => {
    if (cta.type === 'whatsapp') return <WhatsAppIcon className="w-5 h-5" />;
    if (cta.type === 'call') return <Phone className="w-5 h-5" strokeWidth={1.75} />;
    if (cta.type === 'telegram') return <TelegramIcon className="w-5 h-5" />;
    if (cta.type === 'messenger') return <FacebookIcon className="w-5 h-5" />;
    return <ExternalLink className="w-5 h-5" strokeWidth={1.75} />;
  };

  const btnVariant =
    cta.type === 'whatsapp' && (!cta.color || cta.color === '#25D366')
      ? 'whatsapp'
      : cta.color === '#D97706'
      ? 'amber'
      : 'primary';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
      <a
        href={getPrimaryHref()}
        target={cta.type === 'call' ? undefined : '_blank'}
        rel="noopener noreferrer"
        onClick={() => onTrackClick?.(listing.id, false)}
        className="flex-1"
      >
        <Button variant={btnVariant} fullWidth icon={getIcon()}>
          {effectiveLabel}
        </Button>
      </a>

      {cta.secondaryType && cta.secondaryType !== 'none' && (
        <a
          href={`tel:+${normalizedPhone}`}
          onClick={() => onTrackClick?.(listing.id, true)}
          className="sm:w-auto"
        >
          <Button
            variant="secondary"
            fullWidth
            icon={<Phone className="w-4 h-4" strokeWidth={1.75} />}
          >
            {cta.secondaryLabel || 'اتصال مباشر'}
          </Button>
        </a>
      )}
    </div>
  );
}

/* Sold Modal (Asks for Final Sale Price in IQD & Editable Stored Commission Amount in IQD) */
export function SoldCalculationModal({
  listing,
  isOpen,
  onClose,
  onConfirmSold,
}: {
  listing: DemoListing | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSold: (
    listingId: string,
    finalPrice: number,
    saleDate: string,
    calculatedCommission: number,
    commissionPaid: 'yes' | 'no' | 'partial'
  ) => void;
}) {
  const [finalPrice, setFinalPrice] = useState<string>('');
  const [commissionInput, setCommissionInput] = useState<string>('');
  const [commissionPaid, setCommissionPaid] = useState<'yes' | 'no' | 'partial'>('yes');

  useEffect(() => {
    if (listing) {
      setFinalPrice(String(listing.displayPrice));
      setCommissionInput(
        String(
          listing.privateData.commissionAmount ||
            listing.privateData.commissionValue ||
            0
        )
      );
      setCommissionPaid('yes');
    }
  }, [listing]);

  if (!isOpen || !listing) return null;

  const numericPrice =
    Number(toLatinDigits(finalPrice).replace(/[^\d.]/g, '')) || 0;
  const numericCommission =
    Number(toLatinDigits(commissionInput).replace(/[^\d.]/g, '')) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="broker-card max-w-md w-full p-6 bg-white animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E7E1D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E3F2F0] text-[#0F766E] flex items-center justify-center">
              <Calculator className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#1C1917]">
                تأكيد البيع ومبلغ العمولة
              </h3>
              <p className="text-[12px] text-[#6B645B] tabular-nums">
                {toLatinDigits(listing.refNumber)} — {listing.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-[#F3EFE9] flex items-center justify-center text-[#6B645B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <FormInput
            label="مبلغ البيع النهائي بالدينار العراقي (د.ع) *"
            value={finalPrice}
            onChange={(e) => setFinalPrice(toLatinDigits(e.target.value))}
            className="tabular-nums font-bold"
            hint={`المبلغ: ${formatPrice(numericPrice, 'IQD')}`}
          />

          <FormInput
            label="مبلغ العمولة بالدينار العراقي (المخزّن مسبقاً ويمكنك تغييره) *"
            value={commissionInput}
            onChange={(e) => setCommissionInput(toLatinDigits(e.target.value))}
            className="tabular-nums font-bold"
            hint={`العمولة النهائية: ${formatPrice(numericCommission, 'IQD')}`}
          />

          <div>
            <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
              هل استلمت العمولة؟
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'yes', label: 'نعم (كاملة)' },
                  { id: 'partial', label: 'جزئي' },
                  { id: 'no', label: 'لا (معلقة)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCommissionPaid(opt.id)}
                  className={`h-[42px] rounded-xl text-[13px] font-semibold border transition-colors cursor-pointer ${
                    commissionPaid === opt.id
                      ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                      : 'bg-[#F3EFE9] border-[#E7E1D8] text-[#1C1917]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              onConfirmSold(
                listing.id,
                numericPrice,
                today,
                numericCommission,
                commissionPaid
              );
              onClose();
            }}
          >
            تأكيد البيع وحفظ العمولة
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Section 4.6 Delete Confirmation Modal */
export function ConfirmDeleteModal({
  isOpen,
  title,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="broker-card max-w-md w-full p-6 bg-white">
        <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <h3 className="text-[18px] font-bold text-[#1C1917] mb-2">تأكيد الحذف النهائي</h3>
        <p className="typo-body text-[#6B645B] mb-6">
          هل أنت متأكد من حذف <strong className="text-[#1C1917]">"{title}"</strong>؟ سيؤدي ذلك إلى حذف المنشور العام وبيانات البائع الخاصة المرتبطة به ولا يمكن التراجع عن هذه الخطوة.
        </p>
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose}>
            تراجع
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            نعم، احذف المنشور
          </Button>
        </div>
      </div>
    </div>
  );
}
