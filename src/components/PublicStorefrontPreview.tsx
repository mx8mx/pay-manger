import React, { useState, useEffect } from 'react';
import {
  Search,
  Car,
  Building2,
  Map,
  Wrench,
  LayoutGrid,
  SlidersHorizontal,
  MapPin,
  ArrowRight,
  Maximize2,
  X,
  Check,
  Share2,
} from 'lucide-react';
import {
  Button,
  StatusBadge,
  ProductCard,
  EmptyState,
  CustomCtaButtons,
} from './DesignSystemPrimitives';
import {
  BrokerListing,
  CategoryItem,
  ProvinceItem,
  TagItem,
  PublicSettingsConfig,
  doesCategoryCaptureListing,
} from '../types/broker';
import { mapBrokerListingToDemo } from '../lib/demoAssets';
import { formatPrice, toLatinDigits } from '../lib/firebase';

interface PublicStorefrontPreviewProps {
  listings: BrokerListing[];
  categories: CategoryItem[];
  provinces: ProvinceItem[];
  tags: TagItem[];
  publicSettings: PublicSettingsConfig;
  selectedListingId: string | null;
  onSelectListingId: (id: string | null) => void;
  onTrackCtaClick: (id: string, isSecondary?: boolean) => void;
  onTriggerToast: (type: 'success' | 'error', msg: string) => void;
}

export function PublicStorefrontPreview({
  listings,
  categories,
  provinces,
  tags,
  publicSettings,
  selectedListingId,
  onSelectListingId,
  onTrackCtaClick,
  onTriggerToast,
}: PublicStorefrontPreviewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [selectedProvinceId, setSelectedProvinceId] = useState('all');
  const [selectedTagId, setSelectedTagId] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Gallery & Lightbox states for Product Detail view
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selectedListing = listings.find((l) => l.id === selectedListingId) || null;

  // Dynamic SEO, OpenGraph, Twitter Cards & Schema.org Structured Data per Section 5
  useEffect(() => {
    const setMeta = (selector: string, attr: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, content);
    };

    if (selectedListing) {
      const priceText = formatPrice(
        selectedListing.displayPrice,
        selectedListing.currency
      );
      const provName =
        provinces.find((p) => p.id === selectedListing.provinceId)?.name || 'العراق';
      const pageTitle = `${selectedListing.title} (${selectedListing.refNumber}) - ${priceText} | ${publicSettings.siteName}`;
      const pageDesc = `${selectedListing.description.slice(0, 140)} — المحافظة: ${provName} — السعر: ${priceText}`;

      document.title = pageTitle;
      setMeta('meta[name="description"]', 'content', pageDesc);
      setMeta('meta[property="og:title"]', 'content', pageTitle);
      setMeta('meta[property="og:description"]', 'content', pageDesc);
    } else {
      const defaultTitle = `${publicSettings.siteName} — منصة الوساطة العقارية والتجارية`;
      const defaultDesc =
        'منصة وساطة حديثة وموثوقة لعرض العقارات والسيارات والأراضي والسلع في العراق.';
      document.title = defaultTitle;
      setMeta('meta[name="description"]', 'content', defaultDesc);
      setMeta('meta[property="og:title"]', 'content', defaultTitle);
      setMeta('meta[property="og:description"]', 'content', defaultDesc);
    }
  }, [selectedListing, provinces, publicSettings.siteName]);

  const getCategoryIcon = (iconName: string) => {
    if (iconName === 'Car') return Car;
    if (iconName === 'Building2') return Building2;
    if (iconName === 'Map') return Map;
    if (iconName === 'Wrench') return Wrench;
    return LayoutGrid;
  };

  // Visible public listings (never show 'archived'; respect hideSoldListings setting)
  const publicListings = listings.filter((item) => {
    if (item.status === 'archived') return false;
    if (publicSettings.hideSoldListings && item.status === 'sold') return false;
    return true;
  });

  // PRODUCT DETAIL VIEW (Section 4.5 & Section 5)
  if (selectedListing) {
    const demoItem = mapBrokerListingToDemo(
      selectedListing,
      categories,
      provinces,
      tags
    );
    const gallery = demoItem.gallery;
    const currentImg = gallery[activeImageIdx] || demoItem.image;
    const similarListings = publicListings
      .filter((l) => l.id !== selectedListing.id)
      .slice(0, 4);

    // Schema.org Product JSON-LD
    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: selectedListing.title,
      sku: selectedListing.refNumber,
      description: selectedListing.description,
      offers: {
        '@type': 'Offer',
        price: String(selectedListing.displayPrice),
        priceCurrency: selectedListing.currency,
        availability:
          selectedListing.status === 'available'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
      },
    };

    const handleShareLink = async () => {
      const shareUrl = `${window.location.origin}/?listing=${selectedListing.id}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        onTriggerToast(
          'success',
          `تم نسخ رابط المنتج الثابت (${selectedListing.refNumber}) للمشاركة على فيسبوك أو واتساب!`
        );
      } catch {
        onTriggerToast('error', 'تعذر نسخ الرابط');
      }
    };

    return (
      <div className="space-y-10 pb-24 md:pb-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />

        {/* Top Bar: Back + Share Fixed Link */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setActiveImageIdx(0);
              onSelectListingId(null);
            }}
            icon={<ArrowRight className="w-5 h-5" strokeWidth={1.75} />}
          >
            العودة إلى قائمة المنشورات
          </Button>

          <Button
            variant="secondary"
            onClick={handleShareLink}
            icon={<Share2 className="w-4 h-4" strokeWidth={1.75} />}
          >
            نسخ رابط المنتج ({toLatinDigits(selectedListing.refNumber)})
          </Button>
        </div>

        {/* Gallery (4:3 + Thumbnails + Lightbox) & Contiguous Contact Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div
              onClick={() => setLightboxOpen(true)}
              className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#F3EFE9] border border-[#E7E1D8] cursor-zoom-in"
            >
              <img
                src={currentImg}
                alt={selectedListing.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E7E1D8] text-[12px] font-semibold text-[#1C1917] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-[#0F766E]" strokeWidth={1.75} />
                <span>تكبير بملء الشاشة</span>
              </button>
            </div>

            {gallery.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-20 aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImageIdx === idx
                        ? 'border-[#0F766E] ring-2 ring-[#E3F2F0]'
                        : 'border-[#E7E1D8] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 broker-card p-6 md:p-7 bg-white space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedListing.status} />
                <span className="text-[13px] font-medium text-[#6B645B]">
                  {demoItem.categoryName}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] font-bold text-[#1C1917] tabular-nums">
                الرقم المرجعي: {toLatinDigits(selectedListing.refNumber)}
              </span>
            </div>

            <h1 className="typo-h1 text-[#1C1917]">{selectedListing.title}</h1>

            <div className="flex items-baseline justify-between pt-2 pb-4 border-b border-[#E7E1D8]">
              <div>
                <div className="text-[12px] font-medium text-[#6B645B] mb-0.5">
                  السعر المعروض
                </div>
                <div className="text-[28px] font-bold text-[#0F766E] tabular-nums">
                  {formatPrice(selectedListing.displayPrice, selectedListing.currency)}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1C1917]">
                <MapPin className="w-4 h-4 text-[#0F766E]" strokeWidth={1.75} />
                <span>{demoItem.provinceName}</span>
              </div>
            </div>

            {demoItem.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 text-[13px] text-[#6B645B]">
                <span className="font-semibold text-[#1C1917] ml-1">الوسوم:</span>
                {demoItem.tags.map((tName, idx) => (
                  <React.Fragment key={tName}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span>{tName}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="pt-2">
              <CustomCtaButtons
                listing={demoItem}
                onTrackClick={(id, isSec) => onTrackCtaClick(id, isSec)}
                onViewSimilar={() =>
                  onSelectListingId(similarListings[0]?.id || null)
                }
              />
            </div>

            <p className="text-[12px] text-[#6B645B] text-center pt-1">
              اذكر الرقم المرجعي ({toLatinDigits(selectedListing.refNumber)}) عند التواصل مع الوسيط لخدمتك فوراً.
            </p>
          </div>
        </div>

        {/* Clean Full-Width Details Section */}
        <div className="broker-card p-6 md:p-7 bg-white space-y-3">
          <h2 className="typo-h2 text-[#1C1917]">التفاصيل الكاملة للمنشور</h2>
          <p className="typo-body text-[#1C1917] whitespace-pre-line">
            {selectedListing.description}
          </p>
        </div>

        {/* Similar Listings */}
        {similarListings.length > 0 && (
          <div className="space-y-4">
            <h2 className="typo-h2 text-[#1C1917]">منشورات مشابهة قد تهمك</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {similarListings.map((item) => (
                <ProductCard
                  key={item.id}
                  listing={mapBrokerListingToDemo(item, categories, provinces, tags)}
                  onSelect={(l) => {
                    setActiveImageIdx(0);
                    onSelectListingId(l.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mobile Sticky Bottom Bar per Section 4.5 */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7E1D8] p-3 flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="text-[11px] text-[#6B645B]">السعر</div>
            <div className="text-[18px] font-bold text-[#0F766E] tabular-nums">
              {formatPrice(selectedListing.displayPrice, selectedListing.currency)}
            </div>
          </div>
          <div className="flex-1 max-w-[235px]">
            <CustomCtaButtons
              listing={{
                ...demoItem,
                cta: { ...demoItem.cta, secondaryType: 'none' },
              }}
              onTrackClick={(id) => onTrackCtaClick(id, false)}
            />
          </div>
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-5 left-5 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={currentImg}
              alt={selectedListing.title}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // Filter & Sort Public Storefront Listings
  const visibleCategories = categories
    .filter((c) => c.visible)
    .sort((a, b) => a.order - b.order);

  const activeCategoryObj = categories.find((c) => c.id === activeCategoryId);
  const availableFilterTags =
    activeCategoryId === 'all'
      ? tags
      : tags.filter((t) => activeCategoryObj?.allowedTagIds.includes(t.id));

  const minNum = Number(toLatinDigits(minPrice).replace(/[^\d.]/g, '')) || 0;
  const maxNum = Number(toLatinDigits(maxPrice).replace(/[^\d.]/g, '')) || 0;

  const filteredListings = publicListings
    .filter((item) => {
      const matchCat =
        activeCategoryId === 'all' ||
        doesCategoryCaptureListing(activeCategoryObj, item);
      const matchProv =
        selectedProvinceId === 'all' || item.provinceId === selectedProvinceId;
      const matchTag =
        selectedTagId === 'all' || item.tagIds.includes(selectedTagId);
      const matchMin = !minNum || item.displayPrice >= minNum;
      const matchMax = !maxNum || item.displayPrice <= maxNum;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.refNumber.toLowerCase().includes(q) ||
        (item.specs && item.specs.toLowerCase().includes(q));
      return matchCat && matchProv && matchTag && matchMin && matchMax && matchQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.displayPrice - b.displayPrice;
      if (sortBy === 'price-desc') return b.displayPrice - a.displayPrice;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <div className="space-y-8 pb-12">
      {/* Compact Hero Section per Section 4.5 */}
      <section className="broker-card p-6 md:p-8 bg-white">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="typo-h1 text-[#1C1917] text-balance">
            تصفّح أحدث العروض الموثوقة للعقارات والسيارات والأراضي
          </h1>
          <p className="typo-body text-[#6B645B]">
            عروض مفحوصة ومباشرة عبر الوسيط — تواصل معنا بالرقم المرجعي لترتيب المعاينة.
          </p>

          <div className="relative max-w-xl mx-auto pt-1">
            <Search
              className="w-5 h-5 text-[#6B645B] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم السلعة، المواصفات، أو الرقم المرجعي (#1024)..."
              className="w-full h-[50px] pr-12 pl-4 rounded-full bg-[#F3EFE9] border border-[#E7E1D8] text-[15px] text-[#1C1917] placeholder:text-[#6B645B] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F766E] transition-all"
            />
          </div>
        </div>

        {/* Horizontal Scrollable Category Strip per Section 4.5 */}
        <div className="mt-6 pt-5 border-t border-[#E7E1D8] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => {
                setActiveCategoryId('all');
                setSelectedTagId('all');
              }}
              className={`inline-flex items-center gap-2 h-[44px] px-4 rounded-full text-[14px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                activeCategoryId === 'all'
                  ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                  : 'bg-[#F3EFE9] border-[#E7E1D8] text-[#1C1917] hover:bg-[#E7E1D8]/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>الكل ({toLatinDigits(publicListings.length)})</span>
            </button>

            {visibleCategories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              const isSelected = activeCategoryId === cat.id;
              const capturedCount = publicListings.filter((item) =>
                doesCategoryCaptureListing(cat, item)
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setSelectedTagId('all');
                  }}
                  className={`inline-flex items-center gap-2 h-[44px] px-4 rounded-full text-[14px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                      : 'bg-[#F3EFE9] border-[#E7E1D8] text-[#1C1917] hover:bg-[#E7E1D8]/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span>
                    {cat.name} ({toLatinDigits(capturedCount)})
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="inline-flex items-center gap-1.5 h-[44px] px-4 rounded-full bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] font-semibold text-[#1C1917] hover:bg-[#E7E1D8]/70 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#0F766E]" strokeWidth={1.75} />
            <span>الفلاتر والترتيب</span>
          </button>
        </div>

        {/* Desktop Filter Bar (Province + Tag Chips + Price Range + Sort) */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E7E1D8]/60">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedProvinceId}
              onChange={(e) => setSelectedProvinceId(e.target.value)}
              className="h-[40px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] font-semibold text-[#1C1917]"
            >
              <option value="all">كل المحافظات (18)</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'newest' | 'price-asc' | 'price-desc')
              }
              className="h-[40px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] font-semibold text-[#1C1917]"
            >
              <option value="newest">الترتيب: الأحدث أولاً</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="السعر من"
                value={minPrice}
                onChange={(e) => setMinPrice(toLatinDigits(e.target.value))}
                className="w-24 h-[40px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] tabular-nums"
              />
              <span className="text-[#6B645B]">—</span>
              <input
                type="text"
                placeholder="إلى"
                value={maxPrice}
                onChange={(e) => setMaxPrice(toLatinDigits(e.target.value))}
                className="w-24 h-[40px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[13px] tabular-nums"
              />
            </div>
          </div>

          {/* Selectable Tag Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedTagId('all')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer ${
                selectedTagId === 'all'
                  ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                  : 'bg-[#FAF8F5] border-[#E7E1D8] text-[#6B645B]'
              }`}
            >
              كل التاجات
            </button>
            {availableFilterTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setSelectedTagId((prev) => (prev === t.id ? 'all' : t.id))
                }
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border whitespace-nowrap cursor-pointer ${
                  selectedTagId === t.id
                    ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                    : 'bg-[#FAF8F5] border-[#E7E1D8] text-[#6B645B]'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid (2 cols mobile, 3 tablet, 4 desktop) */}
      {filteredListings.length === 0 ? (
        <EmptyState
          onReset={() => {
            setSearchQuery('');
            setActiveCategoryId('all');
            setSelectedProvinceId('all');
            setSelectedTagId('all');
            setMinPrice('');
            setMaxPrice('');
          }}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {filteredListings.map((item) => (
            <ProductCard
              key={item.id}
              listing={mapBrokerListingToDemo(item, categories, provinces, tags)}
              onSelect={(l) => {
                setActiveImageIdx(0);
                onSelectListingId(l.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom Sheet Filters (Mobile & Tablet) per Section 4.5 */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E1D8]">
              <h3 className="text-[17px] font-bold text-[#1C1917]">
                تصفية وترتيب المنشورات
              </h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#F3EFE9] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#1C1917] mb-1.5">
                  المحافظة
                </label>
                <select
                  value={selectedProvinceId}
                  onChange={(e) => setSelectedProvinceId(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] font-semibold"
                >
                  <option value="all">كل المحافظات العراقية</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1C1917] mb-1.5">
                  التاجات (شرائح قابلة للاختيار)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTagId('all')}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border ${
                      selectedTagId === 'all'
                        ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                        : 'bg-[#F3EFE9] border-[#E7E1D8] text-[#1C1917]'
                    }`}
                  >
                    الكل
                  </button>
                  {availableFilterTags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTagId(t.id)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border ${
                        selectedTagId === t.id
                          ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                          : 'bg-[#F3EFE9] border-[#E7E1D8] text-[#1C1917]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1C1917] mb-1">
                    نطاق السعر (من)
                  </label>
                  <input
                    type="text"
                    value={minPrice}
                    onChange={(e) => setMinPrice(toLatinDigits(e.target.value))}
                    placeholder="0"
                    className="w-full h-[44px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#1C1917] mb-1">
                    نطاق السعر (إلى)
                  </label>
                  <input
                    type="text"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(toLatinDigits(e.target.value))}
                    placeholder="أقصى سعر"
                    className="w-full h-[44px] px-3 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1C1917] mb-1.5">
                  الترتيب
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'newest' | 'price-asc' | 'price-desc')
                  }
                  className="w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] font-semibold"
                >
                  <option value="newest">الأحدث نشراً</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-3 border-t border-[#E7E1D8]">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedProvinceId('all');
                  setSelectedTagId('all');
                  setMinPrice('');
                  setMaxPrice('');
                  setSortBy('newest');
                }}
              >
                إعادة ضبط
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => setMobileFilterOpen(false)}
              >
                عرض النتائج ({toLatinDigits(filteredListings.length)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
