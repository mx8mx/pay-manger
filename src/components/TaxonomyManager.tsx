import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Tags,
  MapPin,
  Layers,
  Check,
  Database,
  Sparkles,
  Filter,
} from 'lucide-react';
import {
  CategoryItem,
  TagItem,
  ProvinceItem,
  BrokerListing,
  doesCategoryCaptureListing,
} from '../types/broker';
import { Button, FormInput } from './DesignSystemPrimitives';
import { toLatinDigits, formatPrice } from '../lib/firebase';

interface TaxonomyManagerProps {
  categories: CategoryItem[];
  tags: TagItem[];
  provinces: ProvinceItem[];
  listings: BrokerListing[];
  onSaveCategories: (cats: CategoryItem[]) => void;
  onSaveTags: (tags: TagItem[]) => void;
  onSaveProvinces: (provs: ProvinceItem[]) => void;
  onSeedToFirestore?: () => Promise<void>;
  onTriggerToast: (type: 'success' | 'error', msg: string) => void;
}

const ICON_OPTIONS = [
  { id: 'Car', label: 'سيارات' },
  { id: 'Building2', label: 'عقارات' },
  { id: 'Map', label: 'أراضي' },
  { id: 'Wrench', label: 'معدات وسلع' },
  { id: 'LayoutGrid', label: 'عام' },
];

export function TaxonomyManager({
  categories,
  tags,
  provinces,
  listings,
  onSaveCategories,
  onSaveTags,
  onSaveProvinces,
  onSeedToFirestore,
  onTriggerToast,
}: TaxonomyManagerProps) {
  const [subTab, setSubTab] = useState<'categories' | 'tags' | 'provinces'>(
    'categories'
  );
  const [seeding, setSeeding] = useState(false);

  // Category Form State (Name ONLY + Allowed Tags; ID & Slug are generated automatically)
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Car');
  const [catVisible, setCatVisible] = useState(true);
  const [catAllowedTags, setCatAllowedTags] = useState<string[]>([]);

  // Inline Quick-Tag Creation inside Category Form (Name ONLY)
  const [quickTagName, setQuickTagName] = useState('');

  // Tag Form State (Name ONLY; ID & Slug are generated automatically)
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  // Province Form State
  const [newProvName, setNewProvName] = useState('');
  const [editingProvId, setEditingProvId] = useState<string | null>(null);

  // Auto-generate clean ID & slug behind the scenes
  const generateAutoIdAndSlug = (prefix: string) => {
    const uniqueSuffix = `${Date.now().toString().slice(-5)}${Math.floor(
      10 + Math.random() * 89
    )}`;
    return {
      id: `${prefix}-${uniqueSuffix}`,
      slug: `${prefix}-${uniqueSuffix}`,
    };
  };

  const startEditCategory = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatVisible(cat.visible);
    setCatAllowedTags([...cat.allowedTagIds]);
  };

  const resetCategoryForm = () => {
    setEditingCatId(null);
    setCatName('');
    setCatIcon('Car');
    setCatVisible(true);
    setCatAllowedTags([]);
  };

  // Inline Quick Tag creation while creating/editing a Category (Name only!)
  const handleQuickAddTagForCategory = () => {
    const trimmed = quickTagName.trim();
    if (!trimmed) {
      onTriggerToast('error', 'أدخل اسم التاغ أولاً');
      return;
    }

    const existingTag = tags.find((t) => t.name === trimmed);
    if (existingTag) {
      if (!catAllowedTags.includes(existingTag.id)) {
        setCatAllowedTags((prev) => [...prev, existingTag.id]);
      }
      onTriggerToast('success', `تم تفعيل التاغ "${existingTag.name}" لهذا القسم`);
      setQuickTagName('');
      return;
    }

    const auto = generateAutoIdAndSlug('tag');
    const createdTag: TagItem = {
      id: auto.id,
      name: trimmed,
      slug: auto.slug,
    };
    onSaveTags([...tags, createdTag]);
    setCatAllowedTags((prev) => [...prev, createdTag.id]);
    setQuickTagName('');
    onTriggerToast(
      'success',
      `تم تجهيز التاغ "${createdTag.name}" وربطه بالقسم مباشرة!`
    );
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      onTriggerToast('error', 'يرجى إدخال اسم القسم');
      return;
    }

    if (editingCatId) {
      const updated = categories.map((c) =>
        c.id === editingCatId
          ? {
              ...c,
              name: catName.trim(),
              icon: catIcon,
              visible: catVisible,
              allowedTagIds: catAllowedTags,
              customFieldDefs: [],
            }
          : c
      );
      onSaveCategories(updated);
      onTriggerToast('success', `تم تحديث قسم "${catName}" بنجاح`);
    } else {
      const auto = generateAutoIdAndSlug('cat');
      const newCat: CategoryItem = {
        id: auto.id,
        name: catName.trim(),
        slug: auto.slug,
        icon: catIcon,
        order: categories.length + 1,
        visible: catVisible,
        allowedTagIds: catAllowedTags,
        customFieldDefs: [],
      };
      onSaveCategories([...categories, newCat]);
      onTriggerToast('success', `تم إنشاء قسم "${catName}" وربط تاغاته تلقائياً!`);
    }
    resetCategoryForm();
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const copy = [...categories];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    const reordered = copy.map((c, idx) => ({ ...c, order: idx + 1 }));
    onSaveCategories(reordered);
  };

  const handleToggleCategoryVisible = (id: string) => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, visible: !c.visible } : c
    );
    onSaveCategories(updated);
  };

  const handleDeleteCategory = (id: string) => {
    onSaveCategories(categories.filter((c) => c.id !== id));
    onTriggerToast('success', 'تم حذف القسم');
  };

  // Tag handlers (Name ONLY; ID & Slug auto-generated)
  const handleSaveTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) {
      onTriggerToast('error', 'يرجى إدخال اسم التاغ');
      return;
    }

    if (editingTagId) {
      onSaveTags(
        tags.map((t) =>
          t.id === editingTagId ? { ...t, name: trimmed } : t
        )
      );
      onTriggerToast('success', 'تم تعديل اسم التاغ بنجاح');
    } else {
      const auto = generateAutoIdAndSlug('tag');
      const created: TagItem = {
        id: auto.id,
        name: trimmed,
        slug: auto.slug,
      };
      onSaveTags([...tags, created]);
      onTriggerToast('success', `تم تجهيز التاغ "${created.name}" بنجاح`);
    }
    setEditingTagId(null);
    setNewTagName('');
  };

  // Province handlers
  const handleSaveProvince = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvName.trim()) return;
    if (editingProvId) {
      onSaveProvinces(
        provinces.map((p) =>
          p.id === editingProvId ? { ...p, name: newProvName.trim() } : p
        )
      );
      onTriggerToast('success', 'تم تحديث اسم المحافظة');
    } else {
      const created: ProvinceItem = {
        id: `prov-${Date.now().toString().slice(-5)}`,
        name: newProvName.trim(),
        order: provinces.length + 1,
      };
      onSaveProvinces([...provinces, created]);
      onTriggerToast('success', 'تمت إضافة المحافظة');
    }
    setEditingProvId(null);
    setNewProvName('');
  };

  const handleMoveProvince = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= provinces.length) return;
    const copy = [...provinces];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    onSaveProvinces(copy.map((p, i) => ({ ...p, order: i + 1 })));
  };

  // Live captured listings for the Category draft currently being created/edited
  const draftCapturedListings = listings.filter((item) =>
    catAllowedTags.length > 0 &&
    item.tagIds.some((tid) => catAllowedTags.includes(tid))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="broker-card p-5 md:p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="typo-h2 text-[#1C1917]">
            إدارة الأقسام والتاغات والمحافظات (الالتقاط التلقائي بالتاجات)
          </h2>
          <p className="typo-muted mt-1">
            أدخل الاسم فقط — يتم إنشاء المعرّفات والعلاقات العلائقية في قاعدة البيانات تلقائياً لتسريع عملك.
          </p>
        </div>

        {onSeedToFirestore && (
          <Button
            variant="secondary"
            loading={seeding}
            onClick={async () => {
              setSeeding(true);
              try {
                await onSeedToFirestore();
              } finally {
                setSeeding(false);
              }
            }}
            icon={<Database className="w-4 h-4" strokeWidth={1.75} />}
          >
            مزامنة البيانات مع Firestore
          </Button>
        )}
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSubTab('categories')}
          className={`inline-flex items-center gap-2 h-[44px] px-5 rounded-xl text-[14px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'categories'
              ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
              : 'bg-white border-[#E7E1D8] text-[#1C1917] hover:bg-[#F3EFE9]'
          }`}
        >
          <Layers className="w-4 h-4" strokeWidth={1.75} />
          <span>الأقسام وتاغات الالتقاط ({toLatinDigits(categories.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('tags')}
          className={`inline-flex items-center gap-2 h-[44px] px-5 rounded-xl text-[14px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'tags'
              ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
              : 'bg-white border-[#E7E1D8] text-[#1C1917] hover:bg-[#F3EFE9]'
          }`}
        >
          <Tags className="w-4 h-4" strokeWidth={1.75} />
          <span>التاغات المجهزة مسبقاً ({toLatinDigits(tags.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('provinces')}
          className={`inline-flex items-center gap-2 h-[44px] px-5 rounded-xl text-[14px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'provinces'
              ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
              : 'bg-white border-[#E7E1D8] text-[#1C1917] hover:bg-[#F3EFE9]'
          }`}
        >
          <MapPin className="w-4 h-4" strokeWidth={1.75} />
          <span>المحافظات العراقية ({toLatinDigits(provinces.length)})</span>
        </button>
      </div>

      {/* 1. Categories + Assigned Tags for Item Capture */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add/Edit Category Form (Fast & Simple: Name + Tags) */}
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-5 broker-card p-5 md:p-6 bg-white space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E1D8]">
              <div>
                <h3 className="text-[17px] font-bold text-[#1C1917]">
                  {editingCatId ? 'تعديل القسم وتاغاته' : 'إنشاء قسم جديد سريع'}
                </h3>
                <p className="text-[12px] text-[#6B645B] mt-0.5">
                  أدخل اسم القسم واختر التاغات التي سيعتمدها لالتقاط المنشورات تلقائياً.
                </p>
              </div>
              {editingCatId && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="text-[12px] font-semibold text-[#DC2626] hover:underline cursor-pointer shrink-0"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <FormInput
              label="اسم القسم *"
              placeholder="مثال: سيارات، عقارات، أو عروض الأقساط"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[13px] font-medium text-[#6B645B] mb-1.5">
                  أيقونة القسم
                </label>
                <select
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] text-[14px] text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic.id} value={ic.id}>
                      {ic.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="h-[44px] px-3.5 rounded-xl bg-[#F3EFE9] border border-[#E7E1D8] flex items-center justify-between cursor-pointer">
                <span className="text-[13px] font-semibold text-[#1C1917]">
                  ظاهر للزوار
                </span>
                <input
                  type="checkbox"
                  checked={catVisible}
                  onChange={(e) => setCatVisible(e.target.checked)}
                  className="w-4 h-4 accent-[#0F766E]"
                />
              </label>
            </div>

            {/* Relational Tag Selection */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D8] space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[14px] font-bold text-[#0F766E] flex items-center gap-1.5">
                  <Filter className="w-4 h-4" strokeWidth={2} />
                  <span>التاغات التي يلتقط بها هذا القسم المنشورات:</span>
                </label>

                <div className="flex items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setCatAllowedTags(tags.map((t) => t.id))}
                    className="font-semibold text-[#0F766E] hover:underline cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-[#6B645B]">·</span>
                  <button
                    type="button"
                    onClick={() => setCatAllowedTags([])}
                    className="font-semibold text-[#6B645B] hover:text-[#DC2626] cursor-pointer"
                  >
                    مسح
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = catAllowedTags.includes(tag.id);
                  const matchingListingsCount = listings.filter((l) =>
                    l.tagIds.includes(tag.id)
                  ).length;

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setCatAllowedTags((prev) =>
                          selected
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#E3F2F0] border-[#0F766E] text-[#0F766E]'
                          : 'bg-white border-[#E7E1D8] text-[#1C1917] hover:bg-[#F3EFE9]'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" strokeWidth={2.2} />}
                      <span>{tag.name}</span>
                      <span className="text-[11px] font-bold text-[#6B645B] tabular-nums">
                        ({toLatinDigits(matchingListingsCount)})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Inline Tag Preparation (Name Only!) */}
              <div className="pt-3 border-t border-[#E7E1D8] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="أضف تاغاً جديداً سريعاً (الاسم فقط)..."
                  value={quickTagName}
                  onChange={(e) => setQuickTagName(e.target.value)}
                  className="flex-1 h-[38px] px-3 rounded-xl bg-white border border-[#E7E1D8] text-[13px]"
                />
                <button
                  type="button"
                  onClick={handleQuickAddTagForCategory}
                  className="h-[38px] px-3.5 rounded-xl bg-[#0F766E] text-white text-[12px] font-semibold hover:bg-[#0B5F58] cursor-pointer shrink-0"
                >
                  + إضافة وربط
                </button>
              </div>

              {/* Live Relational Capture Preview */}
              <div className="p-3 rounded-xl bg-white border border-[#E7E1D8] space-y-1.5">
                <div className="text-[12px] font-bold text-[#1C1917] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D97706]" />
                  <span>
                    المنشورات التي سيلتقطها القسم حالياً ({toLatinDigits(draftCapturedListings.length)} منشور):
                  </span>
                </div>
                {draftCapturedListings.length === 0 ? (
                  <p className="text-[12px] text-[#6B645B]">
                    اختر التاغات بالأعلى ليلتقط القسم تلقائياً أي منشور يحملها.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {draftCapturedListings.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E7E1D8] text-[12px] text-[#1C1917]"
                      >
                        <strong className="text-[#0F766E] tabular-nums">
                          {toLatinDigits(item.refNumber)}
                        </strong>
                        <span className="truncate max-w-[150px]">{item.title}</span>
                        <span className="text-[11px] text-[#6B645B] tabular-nums">
                          ({formatPrice(item.displayPrice)})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth icon={<Plus className="w-4 h-4" />}>
              {editingCatId ? 'حفظ تعديلات القسم' : 'إنشاء القسم'}
            </Button>
          </form>

          {/* Categories List */}
          <div className="lg:col-span-7 space-y-3.5">
            {categories.map((cat, idx) => {
              const capturedByCat = listings.filter((l) =>
                doesCategoryCaptureListing(cat, l)
              );

              return (
                <div
                  key={cat.id}
                  className="broker-card p-4 md:p-5 bg-white flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-[#E3F2F0] text-[#0F766E] text-[12px] font-bold flex items-center justify-center tabular-nums">
                        {toLatinDigits(idx + 1)}
                      </span>
                      <h4 className="text-[16px] font-bold text-[#1C1917]">
                        {cat.name}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[12px] font-bold tabular-nums">
                        يلتقط {toLatinDigits(capturedByCat.length)} منشور
                      </span>
                      {!cat.visible && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F5F5F4] text-[#78716C] text-[11px] font-semibold">
                          مخفي
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-2 rounded-lg bg-[#F3EFE9] text-[#1C1917] disabled:opacity-40 hover:bg-[#E7E1D8] cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-2 rounded-lg bg-[#F3EFE9] text-[#1C1917] disabled:opacity-40 hover:bg-[#E7E1D8] cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryVisible(cat.id)}
                        className="p-2 rounded-lg bg-[#F3EFE9] text-[#1C1917] hover:bg-[#E7E1D8] cursor-pointer"
                        title={cat.visible ? 'إخفاء القسم' : 'إظهار القسم'}
                      >
                        {cat.visible ? (
                          <Eye className="w-4 h-4 text-[#0F766E]" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-[#6B645B]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditCategory(cat)}
                        className="p-2 rounded-lg bg-[#E3F2F0] text-[#0F766E] hover:brightness-95 cursor-pointer"
                        title="تعديل القسم"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 rounded-lg bg-[#DC2626]/10 text-[#DC2626] hover:bg-[#DC2626]/20 cursor-pointer"
                        title="حذف القسم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned Tags */}
                  <div className="pt-2 border-t border-[#E7E1D8] flex items-center flex-wrap gap-1.5 text-[13px]">
                    <span className="text-[12px] font-semibold text-[#6B645B] ml-1">
                      التاغات المعتمدة لالتقاط المنشورات:
                    </span>
                    {cat.allowedTagIds.length === 0 ? (
                      <span className="text-[12px] text-[#6B645B]">
                        لم يتم تحديد تاغات بعد
                      </span>
                    ) : (
                      cat.allowedTagIds.map((tid) => {
                        const tObj = tags.find((t) => t.id === tid);
                        if (!tObj) return null;
                        return (
                          <span
                            key={tid}
                            className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E7E1D8] text-[12px] font-semibold text-[#1C1917]"
                          >
                            {tObj.name}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Pre-prepared Tags Management (Name ONLY) */}
      {subTab === 'tags' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveTag}
            className="lg:col-span-4 broker-card p-5 bg-white space-y-4"
          >
            <div>
              <h3 className="text-[16px] font-bold text-[#1C1917]">
                {editingTagId ? 'تعديل اسم التاغ' : 'إضافة تاغ جديد'}
              </h3>
              <p className="text-[12px] text-[#6B645B] mt-0.5">
                أدخل اسم التاغ فقط، وسيتم حفظه وتوليد معرّفه تلقائياً.
              </p>
            </div>

            <FormInput
              label="اسم التاغ *"
              placeholder="مثال: تويوتا، طابو صرف، أقساط"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              required
            />

            <div className="flex gap-2">
              <Button type="submit" variant="primary" fullWidth>
                {editingTagId ? 'حفظ التعديل' : 'إضافة التاغ'}
              </Button>
              {editingTagId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingTagId(null);
                    setNewTagName('');
                  }}
                >
                  إلغاء
                </Button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 broker-card p-5 bg-white">
            <h3 className="text-[16px] font-bold text-[#1C1917] mb-4">
              التاغات المجهزة مسبقاً ({toLatinDigits(tags.length)})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tags.map((tag) => {
                const usedInCats = categories
                  .filter((c) => c.allowedTagIds.includes(tag.id))
                  .map((c) => c.name);
                const usedInListingsCount = listings.filter((l) =>
                  l.tagIds.includes(tag.id)
                ).length;

                return (
                  <div
                    key={tag.id}
                    className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-[#1C1917] text-[14px]">
                        {tag.name}
                      </div>
                      <div className="text-[11px] text-[#6B645B] mt-0.5">
                        الأقسام: {usedInCats.join('، ') || 'غير مرتبط بقسم'}
                      </div>
                      <div className="text-[11px] text-[#0F766E] font-semibold mt-0.5 tabular-nums">
                        في {toLatinDigits(usedInListingsCount)} منشور
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setNewTagName(tag.name);
                        }}
                        className="p-1.5 rounded-lg text-[#0F766E] hover:bg-[#E3F2F0] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveTags(tags.filter((t) => t.id !== tag.id));
                          onSaveCategories(
                            categories.map((c) => ({
                              ...c,
                              allowedTagIds: c.allowedTagIds.filter(
                                (tid) => tid !== tag.id
                              ),
                            }))
                          );
                          onTriggerToast('success', 'تم حذف التاغ');
                        }}
                        className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Iraqi Provinces Management */}
      {subTab === 'provinces' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveProvince}
            className="lg:col-span-4 broker-card p-5 bg-white space-y-4"
          >
            <h3 className="text-[16px] font-bold text-[#1C1917]">
              {editingProvId ? 'تعديل اسم المحافظة' : 'إضافة محافظة / منطقة'}
            </h3>
            <FormInput
              label="اسم المحافظة"
              placeholder="مثال: بغداد"
              value={newProvName}
              onChange={(e) => setNewProvName(e.target.value)}
            />
            <Button type="submit" variant="primary" fullWidth>
              {editingProvId ? 'حفظ التعديل' : 'إضافة المحافظة'}
            </Button>
          </form>

          <div className="lg:col-span-8 broker-card p-5 bg-white">
            <h3 className="text-[16px] font-bold text-[#1C1917] mb-4">
              المحافظات العراقية الـ 18 (قابلة للتعديل وإعادة الترتيب)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {provinces.map((prov, idx) => (
                <div
                  key={prov.id}
                  className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E1D8] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#E7E1D8] text-[12px] font-bold text-[#6B645B] flex items-center justify-center tabular-nums">
                      {toLatinDigits(idx + 1)}
                    </span>
                    <span className="font-bold text-[#1C1917] text-[14px]">
                      {prov.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveProvince(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-[#6B645B] hover:text-[#1C1917] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveProvince(idx, 'down')}
                      disabled={idx === provinces.length - 1}
                      className="p-1 text-[#6B645B] hover:text-[#1C1917] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProvId(prov.id);
                        setNewProvName(prov.name);
                      }}
                      className="p-1 text-[#0F766E] hover:bg-[#E3F2F0] rounded cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
