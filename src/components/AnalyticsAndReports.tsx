import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  Check,
} from 'lucide-react';
import {
  BrokerListing,
  CategoryItem,
  ProvinceItem,
  doesCategoryCaptureListing,
} from '../types/broker';
import { Button, WhatsAppIcon } from './DesignSystemPrimitives';
import { formatPrice, normalizeIraqiPhone, toLatinDigits } from '../lib/firebase';

interface AnalyticsAndReportsProps {
  listings: BrokerListing[];
  categories: CategoryItem[];
  provinces: ProvinceItem[];
  onMarkCommissionPaid: (listingId: string) => void;
  onTriggerToast: (type: 'success' | 'error', msg: string) => void;
}

export function AnalyticsAndReports({
  listings,
  categories,
  provinces,
  onMarkCommissionPaid,
  onTriggerToast,
}: AnalyticsAndReportsProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('all');

  // Filter by period
  const filteredByPeriod = listings.filter((item) => {
    if (period === 'all') return true;
    const itemDate = new Date(item.updatedAt || item.createdAt);
    const now = new Date('2026-10-26');
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
    if (period === 'month') return diffDays <= 31;
    if (period === 'quarter') return diffDays <= 92;
    if (period === 'year') return diffDays <= 365;
    return true;
  });

  const soldListings = filteredByPeriod.filter((l) => l.status === 'sold');

  const totalRealizedSales = soldListings.reduce(
    (sum, item) => sum + (item.privateData.finalSalePrice || item.displayPrice),
    0
  );
  const totalCommissions = filteredByPeriod.reduce(
    (sum, item) => sum + item.privateData.commissionAmount,
    0
  );
  const receivedCommissions = filteredByPeriod
    .filter((l) => l.privateData.commissionPaid === 'yes')
    .reduce((sum, item) => sum + item.privateData.commissionAmount, 0);
  const pendingCommissions = filteredByPeriod
    .filter((l) => l.privateData.commissionPaid !== 'yes')
    .reduce((sum, item) => sum + item.privateData.commissionAmount, 0);

  // Pending commissions across all listings
  const pendingCommissionItems = listings.filter(
    (l) => l.privateData.commissionPaid !== 'yes'
  );

  // Monthly Commissions Chart Data (in Millions of IQD)
  const monthlyData = [
    { month: 'مايو', المستلمة: 1800000, المعلقة: 500000 },
    { month: 'يونيو', المستلمة: 2500000, المعلقة: 750000 },
    { month: 'يوليو', المستلمة: 3200000, المعلقة: 0 },
    { month: 'أغسطس', المستلمة: 2100000, المعلقة: 1000000 },
    { month: 'سبتمبر', المستلمة: 4000000, المعلقة: 1500000 },
    {
      month: 'أكتوبر',
      المستلمة: receivedCommissions || 3000000,
      المعلقة: pendingCommissions || 9500000,
    },
  ];

  // Sales by Category Chart Data (Relational tag capture)
  const categoryChartData = categories.map((cat) => {
    const catItems = filteredByPeriod.filter((l) =>
      doesCategoryCaptureListing(cat, l)
    );
    const soldCount = catItems.filter((l) => l.status === 'sold').length;
    return {
      name: cat.name,
      الكل: catItems.length,
      المباع: soldCount,
    };
  });

  // Sales by Province Chart Data (Top provinces with listings)
  const provinceChartData = provinces
    .map((prov) => {
      const provItems = filteredByPeriod.filter((l) => l.provinceId === prov.id);
      return {
        name: prov.name,
        المنشورات: provItems.length,
      };
    })
    .filter((p) => p.المنشورات > 0);

  // Export Realized Sales to CSV/Excel (with UTF-8 BOM for Arabic support in Excel)
  const handleExportCsv = () => {
    const allSold = listings.filter((l) => l.status === 'sold' || l.status === 'reserved');
    const headers = [
      'الرقم المرجعي',
      'عنوان المنتج',
      'القسم',
      'المحافظة',
      'الحالة',
      'السعر النهائي',
      'العملة',
      'اسم البائع',
      'رقم البائع',
      'العمولة',
      'حالة استلام العمولة',
      'تاريخ التحديث',
    ];

    const rows = allSold.map((item) => {
      const cat = categories.find((c) => c.id === item.categoryId)?.name || '';
      const prov = provinces.find((p) => p.id === item.provinceId)?.name || '';
      return [
        item.refNumber,
        `"${item.title.replace(/"/g, '""')}"`,
        cat,
        prov,
        item.status === 'sold' ? 'مباع' : 'محجوز',
        item.privateData.finalSalePrice || item.displayPrice,
        item.currency,
        `"${item.privateData.sellerName}"`,
        item.privateData.sellerPhone,
        item.privateData.commissionAmount,
        item.privateData.commissionPaid === 'yes'
          ? 'مستلمة'
          : item.privateData.commissionPaid === 'partial'
          ? 'جزئي'
          : 'معلقة',
        item.soldAt || item.updatedAt,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `broker-sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onTriggerToast('success', 'تم تصدير جدول المبيعات والعمولات بصيغة CSV/Excel بنجاح!');
  };

  return (
    <div className="space-y-6">
      {/* Header & Period / Currency Filters */}
      <div className="broker-card p-5 md:p-6 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="typo-h2 text-[#1C1917]">
            تقارير الأرباح والمبيعات والعمولات (القسم 6.3)
          </h2>
          <p className="typo-muted mt-0.5">
            متابعة دقيقة لإجمالي المبيعات المحققة، العمولات المستلمة والمعلقة، وتصدير الجداول لـ Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter */}
          <div className="inline-flex items-center bg-[#F3EFE9] p-1 rounded-xl border border-[#E7E1D8]">
            {(
              [
                { id: 'month', label: 'هذا الشهر' },
                { id: 'quarter', label: 'آخر 3 أشهر' },
                { id: 'year', label: 'سنة' },
                { id: 'all', label: 'الكل' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                  period === p.id
                    ? 'bg-white text-[#0F766E] shadow-xs'
                    : 'text-[#6B645B] hover:text-[#1C1917]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Fixed Currency Badge */}
          <span className="px-3.5 py-2 rounded-xl bg-[#E3F2F0] border border-[#0F766E]/25 text-[13px] font-bold text-[#0F766E]">
            العملة: دينار عراقي (د.ع)
          </span>

          <Button
            variant="secondary"
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" strokeWidth={1.75} />}
          >
            تصدير المبيعات (CSV / Excel)
          </Button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="broker-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#6B645B]">
              إجمالي المبيعات المحققة
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E3F2F0] text-[#0F766E] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#1C1917] tabular-nums">
            {formatPrice(totalRealizedSales, 'IQD')}
          </div>
          <div className="text-[12px] text-[#6B645B] mt-1">
            من {toLatinDigits(soldListings.length)} عملية بيع مكتملة
          </div>
        </div>

        <div className="broker-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#6B645B]">
              إجمالي العمولات المتفق عليها
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E3F2F0] text-[#0F766E] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#0F766E] tabular-nums">
            {formatPrice(totalCommissions, 'IQD')}
          </div>
          <div className="text-[12px] text-[#6B645B] mt-1">
            مجموع العمولات بالدينار العراقي
          </div>
        </div>

        <div className="broker-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#6B645B]">
              العمولات المستلمة فعلياً
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#166534] tabular-nums">
            {formatPrice(receivedCommissions, 'IQD')}
          </div>
          <div className="text-[12px] text-[#166534] mt-1">تم تحصيلها بالكامل</div>
        </div>

        <div className="broker-card p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#6B645B]">
              العمولات المعلقة (بانتظار الدفع)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#D97706] tabular-nums">
            {formatPrice(pendingCommissions, 'IQD')}
          </div>
          <div className="text-[12px] text-[#92400E] mt-1">
            تحتاج متابعة وتحصيل من البائعين
          </div>
        </div>
      </div>

      {/* Recharts Visualizations (Monthly Profits, By Category, By Province) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 broker-card p-5 bg-white">
          <h3 className="text-[16px] font-bold text-[#1C1917] mb-4">
            الأرباح والعمولات شهرياً (المستلمة مقابل المعلقة)
          </h3>
          <div className="h-[260px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D8" />
                <XAxis dataKey="month" stroke="#6B645B" fontSize={12} />
                <YAxis stroke="#6B645B" fontSize={12} />
                <Tooltip />
                <Bar dataKey="المستلمة" fill="#0F766E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="المعلقة" fill="#D97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 broker-card p-5 bg-white">
          <h3 className="text-[16px] font-bold text-[#1C1917] mb-4">
            المنشورات والمبيعات حسب القسم والمحافظة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[260px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D8" />
                <XAxis dataKey="name" stroke="#6B645B" fontSize={12} />
                <YAxis stroke="#6B645B" fontSize={12} />
                <Tooltip />
                <Bar dataKey="الكل" fill="#0F766E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="المباع" fill="#166534" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D8" />
                <XAxis dataKey="name" stroke="#6B645B" fontSize={12} />
                <YAxis stroke="#6B645B" fontSize={12} />
                <Tooltip />
                <Bar dataKey="المنشورات" fill="#D97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ⭐ Pending Commissions Reminder List per Section 6.3 */}
      <div className="broker-card p-5 md:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E1D8]">
          <div>
            <h3 className="typo-h2 text-[#1C1917]">
              قائمة العمولات المعلقة والجزئية (تذكير بمن لم يدفع)
            </h3>
            <p className="typo-muted">
              تواصل مع البائع بضغطة زر عبر واتساب أو قم بتأكيد استلام العمولة فوراً.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-bold tabular-nums">
            {toLatinDigits(pendingCommissionItems.length)} عمولة معلقة
          </span>
        </div>

        {pendingCommissionItems.length === 0 ? (
          <div className="p-6 text-center text-[#166534] bg-[#DCFCE7]/50 rounded-xl font-semibold">
            ممتاز! تم تحصيل جميع العمولات المسجلة بالكامل.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCommissionItems.map((item) => {
              const sellerWa = normalizeIraqiPhone(item.privateData.sellerPhone);
              const reminderMsg = encodeURIComponent(
                `مرحباً ${item.privateData.sellerName}، بخصوص إعلان (${item.title} - ${item.refNumber})، نود تذكيركم بتسوية العمولة المتفق عليها (${formatPrice(
                  item.privateData.commissionAmount,
                  item.currency
                )}). شكراً لتعاونكم.`
              );
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#FEF3C7]/45 border border-[#D97706]/35 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[12px] font-bold text-[#92400E] tabular-nums">
                        {item.refNumber} · {item.title}
                      </span>
                      <h4 className="text-[15px] font-bold text-[#1C1917] mt-0.5">
                        البائع: {item.privateData.sellerName}
                      </h4>
                    </div>
                    <span className="text-[16px] font-bold text-[#0F766E] tabular-nums shrink-0">
                      {formatPrice(item.privateData.commissionAmount, item.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D97706]/20">
                    <a
                      href={`https://wa.me/${sellerWa}?text=${reminderMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-[#1C1917] text-[13px] font-bold hover:brightness-95"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>تذكير عبر واتساب</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => onMarkCommissionPaid(item.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F766E] text-white text-[13px] font-semibold hover:bg-[#0B5F58] cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>تأكيد استلام العمولة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
