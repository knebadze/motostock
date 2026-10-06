import "server-only";
import type { Metadata } from "next";
import { API_ORIGIN } from "@/lib/api/client";
import { getCompanyInfoFromServer } from "@/lib/api/server";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/lib/seo";

// Link previews — what Messenger, WhatsApp, Telegram, Viber, Facebook, X...
// show when someone pastes a link: image, title, short description, read
// from the page's Open Graph / Twitter tags.
//
// Images go through the backend's /api/share-image (modules/share-image):
// uploads are WebP (several messengers, WhatsApp included, won't preview
// WebP) at arbitrary ratios, so it serves a 1200×630 JPEG instead — the
// size every major platform expects for a large preview card.
const SHARE_IMAGE_WIDTH = 1200;
const SHARE_IMAGE_HEIGHT = 630;

type ShareImage = { url: string; width?: number; height?: number };

// `src` is an image path exactly as stored (`/uploads/...`, or a Cloudinary
// URL when cloud storage is on), NOT a resolveMediaUrl()'d one.
export function toShareImage(src: string | null | undefined): ShareImage | null {
  if (!src) return null;
  if (src.startsWith("/uploads/")) {
    return {
      url: `${API_ORIGIN}/api/share-image?src=${encodeURIComponent(src)}`,
      width: SHARE_IMAGE_WIDTH,
      height: SHARE_IMAGE_HEIGHT,
    };
  }
  // Cloudinary transforms by URL — same 1200×630 white-padded JPEG.
  const cloudinary = src.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (cloudinary) {
    return {
      url: `${cloudinary[1]}c_pad,w_${SHARE_IMAGE_WIDTH},h_${SHARE_IMAGE_HEIGHT},b_white,f_jpg,q_auto/${cloudinary[2]}`,
      width: SHARE_IMAGE_WIDTH,
      height: SHARE_IMAGE_HEIGHT,
    };
  }
  return /^https?:\/\//.test(src) ? { url: src } : null;
}

// Every page's openGraph + twitter tags in one place. Next.js REPLACES (not
// merges) a page's openGraph over the layout's, so each page has to carry
// the full set — siteName/type/locale/url and an image, falling back to the
// shop logo (admin → company info) when the page has no image of its own.
export async function buildSocialMetadata({
  locale,
  title,
  description,
  pathname,
  imageSrc,
}: {
  locale: string;
  title: string;
  description: string;
  pathname?: string;
  imageSrc?: string | null;
}): Promise<Pick<Metadata, "openGraph" | "twitter">> {
  const image = toShareImage(imageSrc) ?? toShareImage((await getCompanyInfoFromServer()).logoUrl);
  return {
    openGraph: {
      title,
      description,
      siteName: siteConfig.name,
      locale,
      type: "website",
      url: pathname ? buildCanonicalUrl(pathname, locale) : undefined,
      images: image ? [{ ...image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}
