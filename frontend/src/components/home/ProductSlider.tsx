"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/lib/api/products";
import type { LocalizedString } from "@/lib/api/categories";

const SCROLL_AMOUNT_PX = 640;

export function ProductSlider({ title, products }: { title: LocalizedString; products: Product[] }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{title[locale]}</h2>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-SCROLL_AMOUNT_PX)}
            aria-label="წინა"
            className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollBy(SCROLL_AMOUNT_PX)}
            aria-label="შემდეგი"
            className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="w-56 shrink-0 sm:w-64">
            <ProductCard product={product} layout="grid" />
          </div>
        ))}
      </div>
    </section>
  );
}
