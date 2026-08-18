"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { Tabs } from "@/components/shared/Tabs";
import { SpecsList } from "@/components/shared/SpecsList";
import { formatValue } from "@/components/shop/product-detail/ProductSpecs";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import {
  getProductDetailAdmin,
  type ProductDetailAdmin,
  type ProductFitmentRuleSummary,
} from "@/lib/api/products";

function fitmentRuleLabel(rule: ProductFitmentRuleSummary): string {
  if (rule.type === "ALL") return "ყველა ტრანსპორტთან თავსებადი";
  if (rule.type === "CATEGORY") return `კატეგორია: ${rule.category?.name.ka ?? "—"}`;
  return `${rule.specFieldLabel?.ka ?? ""}: ${rule.specValue?.nameKa ?? "—"}`;
}

function Thumbnail({ url, alt }: { url: string | null; alt: string }) {
  const resolved = resolveMediaUrl(url);
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
      {resolved ? (
        <Image src={resolved} alt={alt} fill sizes="48px" className="object-cover" />
      ) : (
        <div className="size-full border border-dashed border-border" />
      )}
    </div>
  );
}

function MainTab({ product }: { product: ProductDetailAdmin }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Thumbnail url={product.imageUrl} alt={product.name.ka} />
        <div>
          <h3 className="text-lg font-semibold">{product.name.ka}</h3>
          <p className="text-sm text-muted-foreground">/{product.slug}</p>
        </div>
      </div>

      <SpecsList
        rows={[
          { label: "კატეგორია", value: product.category.name.ka },
          { label: "ბრენდი", value: product.productBrand?.name.ka ?? "—" },
          { label: "სახელი (en)", value: product.name.en || "—" },
          { label: "სახელი (ru)", value: product.name.ru || "—" },
          { label: "დამატებულია", value: formatDateTime(product.createdAt) },
          { label: "განახლებულია", value: formatDateTime(product.updatedAt) },
        ]}
        showAllLabel="ყველას ნახვა"
        collapseLabel="აკეცვა"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatsTab({ product }: { product: ProductDetailAdmin }) {
  const { sales } = product;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ნახვები" value={String(product.viewCount)} />
        <StatCard label="გაყიდულია (ცალი)" value={String(sales.totalQuantitySold)} />
        <StatCard label="შემოსავალი" value={formatPrice(sales.totalRevenue)} />
        <StatCard label="შეკვეთების რაოდენობა" value={String(sales.orderCount)} />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          ბოლო შეკვეთები
        </p>
        {sales.recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">ეს პროდუქტი ჯერ არავის უყიდია.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">კოდი</th>
                  <th className="px-4 py-3 font-medium">მყიდველი</th>
                  <th className="px-4 py-3 font-medium">თარიღი</th>
                  <th className="px-4 py-3 font-medium">რაოდენობა</th>
                  <th className="px-4 py-3 font-medium">თანხა</th>
                  <th className="px-4 py-3 font-medium">სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {sales.recentOrders.map((order) => (
                  <tr key={`${order.orderId}-${order.quantity}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono">{order.orderCode}</td>
                    <td className="px-4 py-2">
                      <p>{order.buyerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{order.quantity}</td>
                    <td className="px-4 py-2 font-semibold text-foreground">{formatPrice(order.lineTotal)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AttributesTab({ product }: { product: ProductDetailAdmin }) {
  if (product.attributeValues.length === 0) {
    return <p className="text-sm text-muted-foreground">მახასიათებლები არ არის მითითებული.</p>;
  }

  const rows = product.attributeValues.map((value) => ({
    label: value.attributeName.ka,
    value: formatValue(value, "ka", "კი", "არა"),
  }));

  return <SpecsList rows={rows} showAllLabel="ყველას ნახვა" collapseLabel="აკეცვა" />;
}

function DescriptionTab({ product }: { product: ProductDetailAdmin }) {
  const sections: { label: string; html: string | null }[] = [
    { label: "ქართულად", html: product.descriptionKa },
    { label: "ინგლისურად", html: product.descriptionEn },
    { label: "რუსულად", html: product.descriptionRu },
  ];

  if (sections.every((section) => !section.html)) {
    return <p className="text-sm text-muted-foreground">აღწერა არ არის მითითებული.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) =>
        section.html ? (
          <div key={section.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div
              className="mt-1.5 text-sm [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.html) }}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}

function VariantsTab({ product }: { product: ProductDetailAdmin }) {
  if (product.variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ეს პროდუქტი სპეციფიკაციად არსებობს, ვარიანტების გარეშე.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">ზომა / ფერი</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">ფასი</th>
            <th className="px-4 py-3 font-medium">მარაგი</th>
            <th className="px-4 py-3 font-medium">მდგომარეობა</th>
            <th className="px-4 py-3 font-medium">სტატუსი</th>
            <th className="px-4 py-3 font-medium">აქტიური</th>
          </tr>
        </thead>
        <tbody>
          {product.variants.map((variant) => (
            <tr key={variant.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2">
                {[variant.size?.nameKa, variant.color?.nameKa].filter(Boolean).join(" / ") || "—"}
              </td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{variant.sku ?? "—"}</td>
              <td className="px-4 py-2">
                {variant.activeDiscount ? (
                  <>
                    <span className="text-muted-foreground line-through">
                      {formatPrice(variant.price)}
                    </span>{" "}
                    <span className="font-semibold text-primary">
                      {formatPrice(variant.activeDiscount.discountPrice)}
                    </span>
                  </>
                ) : (
                  formatPrice(variant.price)
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{variant.stockQuantity}</td>
              <td className="px-4 py-2 text-muted-foreground">{variant.condition?.nameKa ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{variant.status?.nameKa ?? "—"}</td>
              <td className="px-4 py-2">{variant.isActive ? "კი" : "არა"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FitmentTab({ product }: { product: ProductDetailAdmin }) {
  if (product.fitments.length === 0 && product.fitmentRules.length === 0) {
    return <p className="text-sm text-muted-foreground">თავსებადობა არ არის მითითებული.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {product.fitmentRules.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">წესები</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {product.fitmentRules.map((rule) => (
              <li key={rule.id} className="text-sm">
                {fitmentRuleLabel(rule)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.fitments.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            კონკრეტული ტექნიკა ({product.fitments.length})
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {product.fitments.map((vehicle) => (
              <li key={vehicle.id} className="text-sm">
                {vehicle.brand.name} {vehicle.model.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BuyTogetherTab({ product }: { product: ProductDetailAdmin }) {
  if (product.buyTogether.length === 0) {
    return <p className="text-sm text-muted-foreground">დაკავშირებული პროდუქტები არ არის მითითებული.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {product.buyTogether.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          <Thumbnail url={item.imageUrl} alt={item.name.ka} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{item.name.ka}</span>
            <span className="text-xs text-muted-foreground">{item.category.name.ka}</span>
          </div>
          {item.minPrice != null && (
            <span className="font-semibold text-foreground">{formatPrice(item.minPrice)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ProductDetailModal({
  productId,
  onClose,
}: {
  productId: number;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<ProductDetailAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getProductDetailAdmin(productId)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof ApiRequestError ? error.message : "პროდუქტის ინფორმაციის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, onClose]);

  return (
    <Modal open onClose={onClose} title="პროდუქტის დეტალები" size="2xl">
      {loading || !product ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" />
        </div>
      ) : (
        <Tabs
          tabs={[
            { key: "main", label: "ძირითადი", content: <MainTab product={product} /> },
            { key: "stats", label: "სტატისტიკა", content: <StatsTab product={product} /> },
            { key: "attributes", label: "მახასიათებლები", content: <AttributesTab product={product} /> },
            { key: "description", label: "აღწერა", content: <DescriptionTab product={product} /> },
            { key: "variants", label: `ვარიანტები (${product.variants.length})`, content: <VariantsTab product={product} /> },
            { key: "fitment", label: "თავსებადობა", content: <FitmentTab product={product} /> },
            { key: "buy-together", label: "ერთად შეძენა", content: <BuyTogetherTab product={product} /> },
          ]}
        />
      )}
    </Modal>
  );
}
