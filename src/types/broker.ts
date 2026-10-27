export type ListingStatus = 'available' | 'reserved' | 'sold' | 'archived';
export type CurrencyType = 'USD' | 'IQD';
export type CtaType = 'whatsapp' | 'call' | 'messenger' | 'telegram' | 'link' | 'none';
export type CommissionType = 'fixed' | 'percentage';
export type CommissionPaidStatus = 'yes' | 'no' | 'partial';
export type LeadStatus = 'new' | 'referred' | 'negotiating' | 'bought' | 'cancelled';

export interface CustomFieldDef {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
  visible: boolean;
  allowedTagIds: string[];
  customFieldDefs: CustomFieldDef[];
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
}

/**
 * Junction table record (category_tags) linking Categories (PK: categoryId)
 * and Tags (PK: tagId) in an explicit Many-to-Many relational schema.
 */
export interface CategoryTagRelation {
  id: string; // `${categoryId}_${tagId}`
  categoryId: string;
  tagId: string;
  order: number;
}

/**
 * Relational query helper:
 * A Category captures a Listing based on its assigned relational Tags (`category_tags`):
 * Any listing that carries at least one tag from `category.allowedTagIds` is captured by this Category.
 */
export function doesCategoryCaptureListing(
  category: CategoryItem | undefined,
  listing: BrokerListing
): boolean {
  if (!category) return true;
  if (
    category.allowedTagIds.length > 0 &&
    listing.tagIds.some((tid) => category.allowedTagIds.includes(tid))
  ) {
    return true;
  }
  return listing.categoryId === category.id;
}

/**
 * Builds the normalized `category_tags` junction table rows from Categories.
 */
export function buildCategoryTagRelations(
  categories: CategoryItem[]
): CategoryTagRelation[] {
  const rows: CategoryTagRelation[] = [];
  categories.forEach((cat) => {
    cat.allowedTagIds.forEach((tagId, idx) => {
      rows.push({
        id: `${cat.id}_${tagId}`,
        categoryId: cat.id,
        tagId,
        order: idx + 1,
      });
    });
  });
  return rows;
}

export interface ProvinceItem {
  id: string;
  name: string;
  order: number;
}

export interface ListingCtaConfig {
  useDefault?: boolean;
  type: CtaType;
  label: string;
  target: string;
  message: string;
  color?: string;
  icon?: string;
  secondaryType?: 'call' | 'whatsapp' | 'none';
  secondaryLabel?: string;
  autoAdaptByStatus: boolean;
}

export interface ListingPrivateData {
  sellerName: string;
  sellerPhone: string;
  sellerProfileUrl: string;
  sellerAskingPrice: number;
  finalSalePrice?: number;
  commissionType: CommissionType;
  commissionValue: number;
  commissionAmount: number;
  commissionPaid: CommissionPaidStatus;
  commissionPaidAt?: string;
  notes: string;
  lastContactAt: string;
}

export interface BrokerListing {
  id: string;
  refNumber: string;
  title: string;
  description: string;
  specs: string;
  images: string[];
  thumbnail?: string;
  displayPrice: number;
  currency: CurrencyType;
  provinceId: string;
  categoryId: string;
  tagIds: string[];
  customFields: Record<string, string>;
  status: ListingStatus;
  cta: ListingCtaConfig;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  clicks: number;
  secondaryClicks: number;
  privateData: ListingPrivateData;
}

export interface BuyerLead {
  id: string;
  name: string;
  phone: string;
  listingId: string;
  status: LeadStatus;
  notes: string;
  referredToSellerAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  targetId: string;
  details: string;
  actorEmail: string;
  createdAt: string;
}

export interface PublicSettingsConfig {
  siteName: string;
  brokerPhone: string;
  defaultCurrency: CurrencyType;
  hideSoldListings: boolean;
  defaultCtaType: CtaType;
  defaultCtaLabel: string;
  defaultCtaMessage: string;
  defaultCtaColor: string;
}

export interface PrivateSettingsConfig {
  fbPostTemplate: string;
  staleListingDays: number;
}
