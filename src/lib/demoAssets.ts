import {
  BrokerListing,
  BuyerLead,
  CategoryItem,
  PrivateSettingsConfig,
  ProvinceItem,
  PublicSettingsConfig,
  TagItem,
  ActivityLogEntry,
} from '../types/broker';

function svgToDataUri(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const DEMO_IMAGES = {
  landCruiser: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E3F2F0"/>
          <stop offset="65%" stop-color="#FAF8F5"/>
          <stop offset="100%" stop-color="#E7E1D8"/>
        </linearGradient>
        <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#E7E5E4"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#sky1)"/>
      <circle cx="650" cy="130" r="65" fill="#FEF3C7" opacity="0.8"/>
      <rect x="60" y="160" width="420" height="230" rx="8" fill="#EFECE6" stroke="#D6CFC2" stroke-width="2"/>
      <rect x="95" y="195" width="110" height="140" rx="4" fill="#0F766E" opacity="0.12"/>
      <rect x="235" y="195" width="190" height="90" rx="4" fill="#0F766E" opacity="0.12"/>
      <rect x="0" y="390" width="800" height="210" fill="#E7E1D8"/>
      <path d="M0 430 L800 430" stroke="#D6CFC2" stroke-width="2"/>
      <ellipse cx="410" cy="458" rx="255" ry="22" fill="#1C1917" opacity="0.15"/>
      <path d="M165 360 L215 268 C225 252 242 245 265 245 L535 245 C558 245 572 256 582 276 L615 330 L655 342 C668 346 675 358 675 375 L675 422 C675 432 666 440 655 440 L165 440 C152 440 145 430 145 416 L145 380 C145 368 152 362 165 360 Z" fill="url(#carBody)" stroke="#1C1917" stroke-width="3"/>
      <path d="M235 264 L365 264 L365 330 L198 330 Z" fill="#0F766E" opacity="0.82"/>
      <path d="M380 264 L495 264 L495 330 L380 330 Z" fill="#0F766E" opacity="0.82"/>
      <path d="M510 264 L564 264 L595 330 L510 330 Z" fill="#0F766E" opacity="0.82"/>
      <rect x="642" y="352" width="30" height="24" rx="5" fill="#D97706"/>
      <rect x="145" y="356" width="18" height="26" rx="4" fill="#DC2626"/>
      <line x1="210" y1="368" x2="625" y2="368" stroke="#D6CFC2" stroke-width="3"/>
      <circle cx="255" cy="438" r="52" fill="#1C1917"/>
      <circle cx="255" cy="438" r="30" fill="#FAF8F5"/>
      <circle cx="255" cy="438" r="12" fill="#0F766E"/>
      <circle cx="565" cy="438" r="52" fill="#1C1917"/>
      <circle cx="565" cy="438" r="30" fill="#FAF8F5"/>
      <circle cx="565" cy="438" r="12" fill="#0F766E"/>
    </svg>
  `),
  mansourVilla: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E3F2F0"/>
          <stop offset="100%" stop-color="#FAF8F5"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#sky2)"/>
      <circle cx="160" cy="115" r="52" fill="#FEF3C7"/>
      <rect x="0" y="440" width="800" height="160" fill="#E7E1D8"/>
      <rect x="150" y="150" width="500" height="290" rx="6" fill="#FFFFFF" stroke="#1C1917" stroke-width="3"/>
      <rect x="120" y="135" width="560" height="22" rx="4" fill="#0F766E"/>
      <rect x="185" y="185" width="210" height="105" rx="6" fill="#E3F2F0" stroke="#0F766E" stroke-width="2"/>
      <rect x="430" y="185" width="185" height="105" rx="6" fill="#F3EFE9" stroke="#D6CFC2" stroke-width="2"/>
      <rect x="170" y="275" width="240" height="18" fill="#1C1917" opacity="0.8"/>
      <rect x="185" y="325" width="130" height="115" rx="4" fill="#D97706" opacity="0.85"/>
      <rect x="355" y="325" width="260" height="115" rx="6" fill="#E3F2F0" stroke="#0F766E" stroke-width="2"/>
      <rect x="405" y="157" width="22" height="283" fill="#E7E1D8" stroke="#1C1917" stroke-width="2"/>
      <circle cx="685" cy="390" r="45" fill="#166534" opacity="0.85"/>
      <rect x="680" y="415" width="10" height="35" fill="#92400E"/>
    </svg>
  `),
  erbilLand: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#FAF8F5"/>
      <path d="M0 310 L210 155 L410 290 L610 135 L800 285 L800 340 L0 340 Z" fill="#E3F2F0"/>
      <path d="M120 340 L330 195 L530 340 Z" fill="#0F766E" opacity="0.18"/>
      <rect x="0" y="320" width="800" height="280" fill="#F3EFE9"/>
      <polygon points="160,360 640,360 720,515 80,515" fill="#DCFCE7" stroke="#0F766E" stroke-width="4" stroke-dasharray="12 8"/>
      <circle cx="160" cy="360" r="10" fill="#D97706"/>
      <circle cx="640" cy="360" r="10" fill="#D97706"/>
      <circle cx="720" cy="515" r="10" fill="#D97706"/>
      <circle cx="80" cy="515" r="10" fill="#D97706"/>
      <rect x="310" y="410" width="180" height="54" rx="12" fill="#FFFFFF" stroke="#0F766E" stroke-width="2"/>
      <text x="400" y="444" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0F766E">400 m² Corner</text>
    </svg>
  `),
  excavator: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#F3EFE9"/>
      <rect x="0" y="430" width="800" height="170" fill="#E7E1D8"/>
      <rect x="210" y="395" width="290" height="65" rx="32" fill="#1C1917"/>
      <circle cx="255" cy="427" r="20" fill="#6B645B"/>
      <circle cx="355" cy="427" r="20" fill="#6B645B"/>
      <circle cx="455" cy="427" r="20" fill="#6B645B"/>
      <rect x="225" y="275" width="245" height="110" rx="14" fill="#D97706" stroke="#1C1917" stroke-width="3"/>
      <rect x="355" y="235" width="105" height="135" rx="10" fill="#FFFFFF" stroke="#1C1917" stroke-width="3"/>
      <rect x="370" y="250" width="75" height="80" rx="6" fill="#E3F2F0"/>
      <path d="M465 310 L595 170 L640 190 L505 345 Z" fill="#D97706" stroke="#1C1917" stroke-width="3"/>
      <path d="M595 170 L685 320 L650 335 L575 195 Z" fill="#D97706" stroke="#1C1917" stroke-width="3"/>
      <path d="M645 325 L715 325 C725 365 695 400 645 395 Z" fill="#1C1917"/>
    </svg>
  `),
};

export const IRAQI_PROVINCES = [
  'بغداد',
  'البصرة',
  'نينوى',
  'أربيل',
  'النجف',
  'كربلاء',
  'السليمانية',
  'الأنبار',
  'بابل',
  'ذي قار',
  'كركوك',
  'صلاح الدين',
  'ديالى',
  'واسط',
  'ميسان',
  'المثنى',
  'القادسية',
  'دهوك',
];

export const INITIAL_PROVINCES: ProvinceItem[] = [
  { id: 'baghdad', name: 'بغداد', order: 1 },
  { id: 'basra', name: 'البصرة', order: 2 },
  { id: 'nineveh', name: 'نينوى', order: 3 },
  { id: 'erbil', name: 'أربيل', order: 4 },
  { id: 'najaf', name: 'النجف', order: 5 },
  { id: 'karbala', name: 'كربلاء', order: 6 },
  { id: 'sulaymaniyah', name: 'السليمانية', order: 7 },
  { id: 'anbar', name: 'الأنبار', order: 8 },
  { id: 'babil', name: 'بابل', order: 9 },
  { id: 'dhiqar', name: 'ذي قار', order: 10 },
  { id: 'kirkuk', name: 'كركوك', order: 11 },
  { id: 'salahaddin', name: 'صلاح الدين', order: 12 },
  { id: 'diyala', name: 'ديالى', order: 13 },
  { id: 'wasit', name: 'واسط', order: 14 },
  { id: 'maysan', name: 'ميسان', order: 15 },
  { id: 'muthanna', name: 'المثنى', order: 16 },
  { id: 'qadisiyah', name: 'القادسية', order: 17 },
  { id: 'duhok', name: 'دهوك', order: 18 },
];

export const INITIAL_TAGS: TagItem[] = [
  { id: 'tag-toyota', name: 'تويوتا', slug: 'toyota' },
  { id: 'tag-kia', name: 'كيا', slug: 'kia' },
  { id: 'tag-hyundai', name: 'هيونداي', slug: 'hyundai' },
  { id: 'tag-auto', name: 'اوتوماتيك', slug: 'automatic' },
  { id: 'tag-fullcheck', name: 'فحص كامل', slug: 'full-check' },
  { id: 'tag-nopaint', name: 'بدون صبغ', slug: 'no-paint' },
  { id: 'tag-tabu', name: 'طابو صرف', slug: 'tabu-sarf' },
  { id: 'tag-modern', name: 'بناء حديث', slug: 'modern-build' },
  { id: 'tag-corner', name: 'ركن', slug: 'corner' },
  { id: 'tag-commercial', name: 'شارع تجاري', slug: 'commercial-street' },
  { id: 'tag-import', name: 'استيراد خاص', slug: 'special-import' },
];

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-cars',
    name: 'سيارات',
    slug: 'cars',
    icon: 'Car',
    order: 1,
    visible: true,
    allowedTagIds: [
      'tag-toyota',
      'tag-kia',
      'tag-hyundai',
      'tag-auto',
      'tag-fullcheck',
      'tag-nopaint',
    ],
    customFieldDefs: [],
  },
  {
    id: 'cat-realestate',
    name: 'عقارات',
    slug: 'real-estate',
    icon: 'Building2',
    order: 2,
    visible: true,
    allowedTagIds: ['tag-tabu', 'tag-modern'],
    customFieldDefs: [],
  },
  {
    id: 'cat-lands',
    name: 'أراضي',
    slug: 'lands',
    icon: 'Map',
    order: 3,
    visible: true,
    allowedTagIds: ['tag-tabu', 'tag-corner', 'tag-commercial'],
    customFieldDefs: [],
  },
  {
    id: 'cat-equipment',
    name: 'معدات وسلع',
    slug: 'equipment',
    icon: 'Wrench',
    order: 4,
    visible: true,
    allowedTagIds: ['tag-import', 'tag-fullcheck'],
    customFieldDefs: [],
  },
];

export const INITIAL_BROKER_LISTINGS: BrokerListing[] = [
  {
    id: 'listing-1024',
    refNumber: '#1024',
    title: 'تويوتا لاندكروزر GXR موديل 2023 خليجي رقم بغداد مكفول',
    description:
      'سيارة تويوتا لاندكروزر GXR موديل 2023 بحالة الوكالة، صبغ عام مكفول من الدعامية للدعامية، محرك 6 سلندر، شاشة كبيرة، ثلاجة، تشغيل عن بعد، إطارات جديدة، الممشى 18,500 كم فقط.',
    specs: '',
    images: [DEMO_IMAGES.landCruiser, DEMO_IMAGES.mansourVilla, DEMO_IMAGES.erbilLand],
    displayPrice: 98000000,
    currency: 'IQD',
    provinceId: 'baghdad',
    categoryId: 'cat-cars',
    tagIds: ['tag-toyota', 'tag-auto', 'tag-fullcheck', 'tag-nopaint'],
    customFields: {},
    status: 'available',
    cta: {
      useDefault: false,
      type: 'whatsapp',
      label: 'تواصل معي عبر واتساب',
      target: '07701234567',
      message:
        'مرحبا، أود الاستفسار عن {title} (رقم الإعلان {refNumber}) المعروض بسعر {price} في {province}.',
      color: '#25D366',
      secondaryType: 'call',
      secondaryLabel: 'اتصال مباشر',
      autoAdaptByStatus: true,
    },
    createdAt: '2026-10-05',
    updatedAt: '2026-10-25',
    clicks: 42,
    secondaryClicks: 11,
    privateData: {
      sellerName: 'الحاج أبو مصطفى الكرخ',
      sellerPhone: '07809988776',
      sellerProfileUrl: 'https://facebook.com/abu.mustafa.iq',
      sellerAskingPrice: 96000000,
      commissionType: 'fixed',
      commissionValue: 1500000,
      commissionAmount: 1500000,
      commissionPaid: 'no',
      notes: 'البائع مستعجل على البيع هذا الأسبوع ومستعد للتفاوض البسيط عند الجدّية.',
      lastContactAt: '2026-10-25',
    },
  },
  {
    id: 'listing-1025',
    refNumber: '#1025',
    title: 'دار سكنية حديثة طابقين في المنصور — مساحة 300 متر مربع واجهة 12 متر',
    description:
      'دار سكنية فخمة بتصميم معماري حديث في بغداد المنصور، بناء طابوق جمهوري درجة أولى، تضم 5 غرف نوم ماستر، صالتين، مطبخ حار وبارد، وحديقة وكراج لسيارتين، سند طابو صرف مستقل.',
    specs: '',
    images: [DEMO_IMAGES.mansourVilla, DEMO_IMAGES.erbilLand],
    displayPrice: 680000000,
    currency: 'IQD',
    provinceId: 'baghdad',
    categoryId: 'cat-realestate',
    tagIds: ['tag-tabu', 'tag-modern'],
    customFields: {},
    status: 'reserved',
    cta: {
      useDefault: false,
      type: 'whatsapp',
      label: 'احجز موعد معاينة',
      target: '07701234567',
      message: 'مرحبا، هل لا يزال العقار {title} ({refNumber}) متاحا أو يوجد بديل مشابه؟',
      color: '#0F766E',
      secondaryType: 'call',
      secondaryLabel: 'اتصال هاتفي',
      autoAdaptByStatus: true,
    },
    createdAt: '2026-10-12',
    updatedAt: '2026-10-26',
    clicks: 89,
    secondaryClicks: 24,
    privateData: {
      sellerName: 'المهندس سرمد العبيدي',
      sellerPhone: '07712233445',
      sellerProfileUrl: 'https://facebook.com/sarmad.architect',
      sellerAskingPrice: 665000000,
      commissionType: 'fixed',
      commissionValue: 6500000,
      commissionAmount: 6500000,
      commissionPaid: 'partial',
      commissionPaidAt: '2026-10-24',
      notes: 'تم أخذ عربون أولي من المشتري أستاذ حيدر، موعد التحويل في الطابو يوم الخميس.',
      lastContactAt: '2026-10-26',
    },
  },
  {
    id: 'listing-1026',
    refNumber: '#1026',
    title: 'قطعة أرض ركن تجارية وسكنية في أربيل — موقع استثماري مميز 400 م²',
    description:
      'قطعة أرض ركن على شارعين 20 متر و 15 متر، كاملة الخدمات (ماء، كهرباء، تبليط)، تصلح لبناء مجمع تجاري أو فيلا خاصة، سند طابو صرف تحويل فوري.',
    specs: '',
    images: [DEMO_IMAGES.erbilLand],
    displayPrice: 190000000,
    currency: 'IQD',
    provinceId: 'erbil',
    categoryId: 'cat-lands',
    tagIds: ['tag-corner', 'tag-tabu', 'tag-commercial'],
    customFields: {},
    status: 'sold',
    cta: {
      useDefault: true,
      type: 'whatsapp',
      label: 'تواصل معي',
      target: '07701234567',
      message: 'مرحبا، أود الاستفسار عن أراضي مشابهة للإعلان {refNumber}.',
      color: '#0F766E',
      secondaryType: 'none',
      autoAdaptByStatus: true,
    },
    createdAt: '2026-09-18',
    updatedAt: '2026-10-20',
    soldAt: '2026-10-20',
    clicks: 64,
    secondaryClicks: 9,
    privateData: {
      sellerName: 'كاك شيروان البرزنجي',
      sellerPhone: '07504455667',
      sellerProfileUrl: 'https://facebook.com/sherwan.realestate',
      sellerAskingPrice: 185000000,
      finalSalePrice: 188000000,
      commissionType: 'fixed',
      commissionValue: 3000000,
      commissionAmount: 3000000,
      commissionPaid: 'yes',
      commissionPaidAt: '2026-10-20',
      notes: 'تم البيع واستلام العمولة نقداً بالكامل والحمد لله.',
      lastContactAt: '2026-10-20',
    },
  },
  {
    id: 'listing-1027',
    refNumber: '#1027',
    title: 'حفارة كاتربيلر 320D نظيفة جداً جاهزة للعمل الفوري',
    description:
      'حفارة كاتربيلر استيراد خاص موديل 2019، ساعات عمل قليلة، محرك وبمب مكفول على الفحص، متواجدة في البصرة مع إمكانية النقل لكل المحافظات.',
    specs: '',
    images: [DEMO_IMAGES.excavator],
    displayPrice: 76000000,
    currency: 'IQD',
    provinceId: 'basra',
    categoryId: 'cat-equipment',
    tagIds: ['tag-fullcheck', 'tag-import'],
    customFields: {},
    status: 'available',
    cta: {
      useDefault: false,
      type: 'whatsapp',
      label: 'اسأل عن السعر النهائي',
      target: '07701234567',
      message: 'مرحبا، أرغب بمعاينة {title} ({refNumber}) في {province}.',
      color: '#25D366',
      secondaryType: 'call',
      secondaryLabel: 'اتصال مباشر',
      autoAdaptByStatus: true,
    },
    createdAt: '2026-09-25',
    updatedAt: '2026-10-02',
    clicks: 31,
    secondaryClicks: 7,
    privateData: {
      sellerName: 'شركة الجنوب للمقاولات (أبو كرار)',
      sellerPhone: '07728899001',
      sellerProfileUrl: 'https://facebook.com/aljanoub.equip',
      sellerAskingPrice: 74000000,
      commissionType: 'fixed',
      commissionValue: 1500000,
      commissionAmount: 1500000,
      commissionPaid: 'no',
      notes: 'الفحص في موقع الكراج بالزبير يومياً من 9 صباحاً حتى 4 عصراً.',
      lastContactAt: '2026-10-02',
    },
  },
];

export const INITIAL_LEADS: BuyerLead[] = [
  {
    id: 'lead-1',
    name: 'الأستاذ حيدر الكاظمي',
    phone: '07705544332',
    listingId: 'listing-1025',
    status: 'referred',
    notes: 'عاين الدار يوم الثلاثاء وأعجبه الموقع، تم ربطه بالمهندس سرمد لدفع العربون.',
    referredToSellerAt: '2026-10-23 16:30',
    createdAt: '2026-10-22',
    updatedAt: '2026-10-23',
  },
  {
    id: 'lead-2',
    name: 'علي الشمري (تاجر سيارات)',
    phone: '07812233990',
    listingId: 'listing-1024',
    status: 'negotiating',
    notes: 'يطلب تخفيض السعر إلى 96,500,000 د.ع نقداً بعد الفحص بالكمبيوتر.',
    createdAt: '2026-10-25',
    updatedAt: '2026-10-25',
  },
  {
    id: 'lead-3',
    name: 'شركة دجلة للاستثمار',
    phone: '07508877665',
    listingId: 'listing-1026',
    status: 'bought',
    notes: 'تم إتمام البيع بنجاح وتحويل السند واستلام العمولة.',
    referredToSellerAt: '2026-10-18 11:15',
    createdAt: '2026-10-17',
    updatedAt: '2026-10-20',
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogEntry[] = [
  {
    id: 'log-1',
    action: 'تغيير حالة إلى محجوز',
    targetId: '#1025',
    details: 'دار سكنية حديثة طابقين في المنصور — تم استلام عربون أولي',
    actorEmail: '1996firebase1@gmail.com',
    createdAt: '2026-10-26 10:15',
  },
  {
    id: 'log-2',
    action: 'إحالة مشترٍ للبائع',
    targetId: '#1025',
    details: 'تمت إحالة المشتري (الأستاذ حيدر الكاظمي) إلى البائع لإثبات حق العمولة',
    actorEmail: '1996firebase1@gmail.com',
    createdAt: '2026-10-23 16:30',
  },
  {
    id: 'log-3',
    action: 'إتمام بيع واستلام عمولة',
    targetId: '#1026',
    details: 'قطعة أرض ركن في أربيل — السعر النهائي 188,000,000 د.ع والعمولة 3,000,000 د.ع',
    actorEmail: '1996firebase1@gmail.com',
    createdAt: '2026-10-20 14:20',
  },
];

export const DEFAULT_PUBLIC_SETTINGS: PublicSettingsConfig = {
  siteName: 'وسيط السوق',
  brokerPhone: '07701234567',
  defaultCurrency: 'IQD',
  hideSoldListings: false,
  defaultCtaType: 'whatsapp',
  defaultCtaLabel: 'تواصل معي عبر واتساب',
  defaultCtaMessage:
    'مرحبا، أود الاستفسار عن {title} (رقم الإعلان {refNumber}) المعروض بسعر {price} في {province}.',
  defaultCtaColor: '#25D366',
};

export const DEFAULT_PRIVATE_SETTINGS: PrivateSettingsConfig = {
  fbPostTemplate: `🔥 عرض مميز عبر {siteName} 🔥
📌 {title}
🔢 الرقم المرجعي للإعلان: {refNumber}
📍 المحافظة: {province}

📋 التفاصيل:
{specs}

💰 السعر المعروض: {price}

📞 للاستفسار وترتيب موعد المعاينة تواصل معي مباشرة (الوسيط):
واتساب أو اتصال: {brokerPhone}
🔗 رابط الإعلان والصور الكاملة:
{url}`,
  staleListingDays: 14,
};

// Backward-compatible DemoListing type & array for Phase1DesignLab
export interface DemoListing {
  id: string;
  refNumber: string;
  title: string;
  description: string;
  displayPrice: number;
  currency: 'USD' | 'IQD';
  provinceName: string;
  categoryName: string;
  status: 'available' | 'reserved' | 'sold' | 'archived';
  image: string;
  gallery: string[];
  tags: string[];
  customFields: Record<string, string>;
  cta: {
    type: 'whatsapp' | 'call' | 'messenger' | 'telegram' | 'link' | 'none';
    label: string;
    target: string;
    message: string;
    color?: string;
    secondaryType?: 'call' | 'whatsapp' | 'none';
    secondaryLabel?: string;
    autoAdaptByStatus: boolean;
  };
  privateData: {
    sellerName: string;
    sellerPhone: string;
    sellerProfileUrl: string;
    sellerAskingPrice: number;
    finalSalePrice?: number;
    commissionType: 'fixed' | 'percentage';
    commissionValue: number;
    commissionAmount: number;
    commissionPaid: 'yes' | 'no' | 'partial';
    notes: string;
    lastContactAt: string;
  };
  clicks: number;
}

export function mapBrokerListingToDemo(
  item: BrokerListing,
  categories: CategoryItem[],
  provinces: ProvinceItem[],
  tags: TagItem[]
): DemoListing {
  // Derive category names relationally from categories whose allowedTagIds match item.tagIds
  const matchingCats = categories.filter((c) =>
    c.allowedTagIds.some((tid) => item.tagIds.includes(tid))
  );
  const fallbackCat = categories.find((c) => c.id === item.categoryId);
  const derivedCategoryName =
    matchingCats.length > 0
      ? matchingCats.map((c) => c.name).join(' · ')
      : fallbackCat?.name || 'عام';

  const prov = provinces.find((p) => p.id === item.provinceId);
  const itemTags = item.tagIds
    .map((tid) => tags.find((t) => t.id === tid)?.name)
    .filter(Boolean) as string[];

  return {
    id: item.id,
    refNumber: item.refNumber,
    title: item.title,
    description: item.description,
    displayPrice: item.displayPrice,
    currency: 'IQD',
    provinceName: prov?.name || 'بغداد',
    categoryName: derivedCategoryName,
    status: item.status,
    image: item.images[0] || DEMO_IMAGES.landCruiser,
    gallery: item.images.length > 0 ? item.images : [DEMO_IMAGES.landCruiser],
    tags: itemTags,
    customFields: {},
    cta: item.cta,
    privateData: item.privateData,
    clicks: item.clicks,
  };
}

export const INITIAL_DEMO_LISTINGS: DemoListing[] = INITIAL_BROKER_LISTINGS.map((b) =>
  mapBrokerListingToDemo(b, INITIAL_CATEGORIES, INITIAL_PROVINCES, INITIAL_TAGS)
);
