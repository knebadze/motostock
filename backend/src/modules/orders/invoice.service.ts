import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import { getCompanyInfo } from "../company-info/company-info.service.js";
import type { ordersRepository } from "./orders.repository.js";

// pdfkit needs real font FILES to embed (no web-font/system-font lookup) —
// pulled from their own npm-distributed static files rather than vendoring
// binary font files directly into the repo. fontkit (pdfkit's embedding
// engine) decodes .woff directly, no conversion step needed.
//
// Three separate fonts, not one: Google Fonts subsets each font family by
// script for browser performance, and — confirmed by directly probing glyph
// coverage with fontkit — none of them is a superset of what this document
// needs. "Noto Sans Georgian"'s georgian subset covers ONLY Georgian letters
// and a space, nothing else — no digits, no punctuation, not even a comma.
// "Noto Sans"'s latin subset covers Latin letters, digits and punctuation.
// "Noto Sans"'s cyrillic subset covers Cyrillic letters (but no digits or
// punctuation either). A real invoice mixes these constantly within a single
// line (a Georgian street name followed by a numeric apartment number, an
// admin-typed company name in Latin, "12.00" next to a Georgian label) — see
// splitIntoRuns/drawRuns below, which is what actually makes that work.
const require = createRequire(import.meta.url);
const FONT_FILES = {
  Georgian: require.resolve("@fontsource/noto-sans-georgian/files/noto-sans-georgian-georgian-400-normal.woff"),
  "Georgian-Bold": require.resolve(
    "@fontsource/noto-sans-georgian/files/noto-sans-georgian-georgian-700-normal.woff",
  ),
  Latin: require.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff"),
  "Latin-Bold": require.resolve("@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff"),
  Cyrillic: require.resolve("@fontsource/noto-sans/files/noto-sans-cyrillic-400-normal.woff"),
  "Cyrillic-Bold": require.resolve("@fontsource/noto-sans/files/noto-sans-cyrillic-700-normal.woff"),
} as const;

type Script = "Georgian" | "Latin" | "Cyrillic";
export type InvoiceLocale = "ka" | "en" | "ru";

type OrderRow = NonNullable<Awaited<ReturnType<typeof ordersRepository.findById>>>;

function scriptOfChar(char: string): Script {
  const codePoint = char.codePointAt(0) ?? 0;
  if (codePoint >= 0x10a0 && codePoint <= 0x10ff) return "Georgian"; // Georgian (Mkhedruli) block
  if (codePoint >= 0x0400 && codePoint <= 0x04ff) return "Cyrillic"; // Cyrillic block
  return "Latin"; // ASCII, digits, punctuation, Latin letters — the safe default
}

// Splits text into consecutive same-script runs, so mixed-script strings
// (see the FONT_FILES comment above) can be drawn one run at a time, each
// with the one font that actually has glyphs for it.
function splitIntoRuns(text: string): { text: string; script: Script }[] {
  const runs: { text: string; script: Script }[] = [];
  for (const char of text) {
    const script = scriptOfChar(char);
    const last = runs[runs.length - 1];
    if (last && last.script === script) last.text += char;
    else runs.push({ text: char, script });
  }
  return runs;
}

type Labels = {
  title: string;
  orderCode: string;
  date: string;
  buyer: string;
  bank: string;
  paymentStatus: string;
  orderStatus: string;
  colName: string;
  colQty: string;
  colPrice: string;
  colTotal: string;
  subtotal: string;
  discount: string;
  delivery: string;
  promoCode: string;
  totalDue: string;
  fulfillment: Record<OrderRow["fulfillmentMethod"], string>;
  paymentStatusValue: Partial<Record<OrderRow["paymentStatus"], string>>;
};

const LABELS: Record<InvoiceLocale, Labels> = {
  ka: {
    title: "ინვოისი",
    orderCode: "შეკვეთის კოდი",
    date: "თარიღი",
    buyer: "მყიდველი",
    bank: "ბანკი",
    paymentStatus: "გადახდის სტატუსი",
    orderStatus: "შეკვეთის სტატუსი",
    colName: "დასახელება",
    colQty: "რაოდ.",
    colPrice: "ფასი",
    colTotal: "ჯამი",
    subtotal: "შუალედური ჯამი",
    discount: "ფასდაკლება",
    delivery: "მიწოდება",
    promoCode: "პრომოკოდი",
    totalDue: "ჯამი გადასახდელი",
    fulfillment: {
      CARD: "ბარათით გადახდა",
      COURIER: "კურიერით მიწოდება (ადგილზე გადახდა)",
      PICKUP: "თვითმიღება მაღაზიიდან",
    },
    paymentStatusValue: {
      AWAITING_PAYMENT: "გადახდის მოლოდინში",
      PAID: "გადახდილია",
      FAILED: "გადახდა ვერ შედგა",
      REFUNDED: "თანხა დაბრუნებულია",
    },
  },
  en: {
    title: "Invoice",
    orderCode: "Order code",
    date: "Date",
    buyer: "Buyer",
    bank: "Bank",
    paymentStatus: "Payment status",
    orderStatus: "Order status",
    colName: "Item",
    colQty: "Qty",
    colPrice: "Price",
    colTotal: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    delivery: "Delivery",
    promoCode: "Promo code",
    totalDue: "Total due",
    fulfillment: {
      CARD: "Card payment",
      COURIER: "Courier delivery (cash on delivery)",
      PICKUP: "Store pickup",
    },
    paymentStatusValue: {
      AWAITING_PAYMENT: "Awaiting payment",
      PAID: "Paid",
      FAILED: "Payment failed",
      REFUNDED: "Refunded",
    },
  },
  ru: {
    title: "Счёт",
    orderCode: "Код заказа",
    date: "Дата",
    buyer: "Покупатель",
    bank: "Банк",
    paymentStatus: "Статус оплаты",
    orderStatus: "Статус заказа",
    colName: "Наименование",
    colQty: "Кол-во",
    colPrice: "Цена",
    colTotal: "Сумма",
    subtotal: "Промежуточный итог",
    discount: "Скидка",
    delivery: "Доставка",
    promoCode: "Промокод",
    totalDue: "Итого к оплате",
    fulfillment: {
      CARD: "Оплата картой",
      COURIER: "Доставка курьером (оплата при получении)",
      PICKUP: "Самовывоз из магазина",
    },
    paymentStatusValue: {
      AWAITING_PAYMENT: "Ожидает оплаты",
      PAID: "Оплачено",
      FAILED: "Оплата не прошла",
      REFUNDED: "Возвращено",
    },
  },
};

function itemName(item: OrderRow["items"][number], locale: InvoiceLocale): string {
  return locale === "ka" ? item.itemNameKa : locale === "ru" ? item.itemNameRu : item.itemNameEn;
}

function trilingualName(status: { nameKa: string; nameEn: string; nameRu: string }, locale: InvoiceLocale): string {
  return locale === "ka" ? status.nameKa : locale === "ru" ? status.nameRu : status.nameEn;
}

// No currency symbol (₾) — confirmed via fontkit that none of the embedded
// fonts contain U+20BE, so it would silently render as a blank glyph. A
// plain currency code renders correctly in every font here and is standard
// invoice practice anyway.
function formatMoney(value: number): string {
  return `${value.toFixed(2)} GEL`;
}

function formatDate(date: Date): string {
  // Fixed Asia/Tbilisi offset (UTC+4, no DST) — same reasoning as
  // lib/tbilisi-dates.ts: this runs on the server, whose own runtime
  // timezone is UTC (Docker's Node image), not Tbilisi.
  const shifted = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(shifted.getUTCDate())}.${pad(shifted.getUTCMonth() + 1)}.${shifted.getUTCFullYear()} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

type PdfDoc = InstanceType<typeof PDFDocument>;
type DrawOptions = { bold?: boolean; size?: number; color?: string; width?: number; align?: "left" | "right" };

// The script-aware text primitives every document here is built from —
// shared by the invoice and the admin packing slip so both get the same
// mixed Georgian/Latin/Cyrillic handling (see FONT_FILES/splitIntoRuns).
function createPdfWriter(doc: PdfDoc) {
  for (const [name, file] of Object.entries(FONT_FILES)) {
    doc.registerFont(name, file);
  }

  function fontFor(script: Script, bold: boolean): string {
    return bold ? `${script}-Bold` : script;
  }

  function widthOf(text: string, bold = false): number {
    return splitIntoRuns(text).reduce((sum, run) => {
      doc.font(fontFor(run.script, bold));
      return sum + doc.widthOfString(run.text);
    }, 0);
  }

  // Draws a single line of (possibly script-mixed) text at explicit
  // coordinates, one script-run at a time — see splitIntoRuns/FONT_FILES's
  // comment for why this is necessary instead of one doc.text() call.
  function drawRuns(text: string, x: number, y: number, opts: DrawOptions = {}) {
    const { bold = false, size = 10, color = "#000", width, align = "left" } = opts;
    doc.fontSize(size).fillColor(color);
    const runs = splitIntoRuns(text);
    let cursorX = align === "right" && width != null ? x + width - widthOf(text, bold) : x;
    for (const run of runs) {
      doc.font(fontFor(run.script, bold));
      doc.text(run.text, cursorX, y, { lineBreak: false });
      cursorX += doc.widthOfString(run.text);
    }
  }

  // Item names are free-typed admin text and the one field long enough to
  // need a fit check — shortened with an ellipsis (kept to one line, no
  // wrap) rather than measured per multi-line layout, since real product
  // names in this catalog are short and this only ever triggers as a rare
  // safety net.
  function truncateToWidth(text: string, maxWidth: number): string {
    if (widthOf(text) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && widthOf(`${truncated}…`) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated.length > 0 ? `${truncated}…` : "…";
  }

  return { drawRuns, truncateToWidth };
}

type PdfWriter = ReturnType<typeof createPdfWriter>;

function renderPdf(build: (doc: PdfDoc, writer: PdfWriter) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc, createPdfWriter(doc));
    doc.end();
  });
}

type CompanyInfo = Awaited<ReturnType<typeof getCompanyInfo>>;

// Business info (left) + document title/code/date (right), then a rule.
// Returns the y position the body should start at.
function drawDocumentHeader(
  doc: PdfDoc,
  { drawRuns }: PdfWriter,
  args: { company: CompanyInfo; title: string; order: OrderRow; locale: InvoiceLocale; orderCodeLabel: string; dateLabel: string },
): number {
  const { company, title, order, locale, orderCodeLabel, dateLabel } = args;
  drawRuns(company.name, 50, 50, { bold: true, size: 16 });
  const companyLines = [
    [company.city ? trilingualName(company.city, locale) : null, company.street].filter(Boolean).join(", "),
    company.phone,
    company.email,
  ].filter((line): line is string => Boolean(line));
  let companyY = 72;
  for (const line of companyLines) {
    drawRuns(line, 50, companyY, { size: 9, color: "#555" });
    companyY += 13;
  }

  drawRuns(title, 300, 50, { bold: true, size: 20, width: 245, align: "right" });
  drawRuns(`${orderCodeLabel}: ${order.orderCode}`, 300, 78, { size: 10, color: "#333", width: 245, align: "right" });
  drawRuns(`${dateLabel}: ${formatDate(order.createdAt)}`, 300, 93, {
    size: 10,
    color: "#333",
    width: 245,
    align: "right",
  });

  doc.moveTo(50, 130).lineTo(545, 130).strokeColor("#ddd").stroke();
  return 145;
}

type ShippingSnapshot = {
  phone: string;
  city: { nameKa: string; nameEn: string; nameRu: string };
  street: string;
  building: string | null;
  apartment: string | null;
};

function formatShippingAddress(shipping: ShippingSnapshot, locale: InvoiceLocale): string {
  return [trilingualName(shipping.city, locale), shipping.street, shipping.building, shipping.apartment]
    .filter(Boolean)
    .join(", ");
}

export async function generateOrderInvoicePdf(order: OrderRow, locale: InvoiceLocale = "ka"): Promise<Buffer> {
  const company = await getCompanyInfo();
  const L = LABELS[locale];

  return renderPdf((doc, writer) => {
    const { drawRuns, truncateToWidth } = writer;
    let y = drawDocumentHeader(doc, writer, {
      company,
      title: L.title,
      order,
      locale,
      orderCodeLabel: L.orderCode,
      dateLabel: L.date,
    });

    // Buyer + delivery info.
    drawRuns(L.buyer, 50, y, { bold: true, size: 11 });
    y += 16;
    drawRuns(`${order.user.firstName} ${order.user.lastName}`, 50, y, { size: 10, color: "#333" });
    y += 14;
    drawRuns(order.user.email, 50, y, { size: 10, color: "#333" });
    y += 14;

    if (order.shippingSnapshot) {
      const shipping = order.shippingSnapshot as ShippingSnapshot;
      drawRuns(`${shipping.phone} · ${formatShippingAddress(shipping, locale)}`, 50, y, { size: 10, color: "#333" });
      y += 14;
    }

    drawRuns(L.fulfillment[order.fulfillmentMethod], 50, y, { size: 10, color: "#333" });
    y += 14;
    if (order.bank) {
      drawRuns(`${L.bank}: ${trilingualName(order.bank, locale)}`, 50, y, { size: 10, color: "#333" });
      y += 14;
    }
    const paymentLabel = L.paymentStatusValue[order.paymentStatus];
    if (paymentLabel) {
      drawRuns(`${L.paymentStatus}: ${paymentLabel}`, 50, y, { size: 10, color: "#333" });
      y += 14;
    }
    drawRuns(`${L.orderStatus}: ${trilingualName(order.status, locale)}`, 50, y, { size: 10, color: "#333" });
    y += 24;

    // Items table.
    const tableTop = y;
    const col = { name: 50, qty: 330, unitPrice: 390, total: 470 };
    drawRuns(L.colName, col.name, tableTop, { bold: true });
    drawRuns(L.colQty, col.qty, tableTop, { bold: true, width: 50, align: "right" });
    drawRuns(L.colPrice, col.unitPrice, tableTop, { bold: true, width: 70, align: "right" });
    drawRuns(L.colTotal, col.total, tableTop, { bold: true, width: 75, align: "right" });
    doc.moveTo(50, tableTop + 16).lineTo(545, tableTop + 16).strokeColor("#ddd").stroke();

    y = tableTop + 24;
    for (const item of order.items) {
      const name = truncateToWidth(itemName(item, locale), 270);
      drawRuns(name, col.name, y);
      drawRuns(String(item.quantity), col.qty, y, { width: 50, align: "right" });
      drawRuns(formatMoney(Number(item.unitPrice)), col.unitPrice, y, { width: 70, align: "right" });
      drawRuns(formatMoney(Number(item.lineTotal)), col.total, y, { width: 75, align: "right" });
      y += 20;
    }

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#ddd").stroke();
    y += 12;

    // Totals block, right-aligned.
    function totalsLine(label: string, value: string, bold = false) {
      const size = bold ? 12 : 10;
      drawRuns(label, 330, y, { bold, size, color: "#000", width: 130 });
      drawRuns(value, 470, y, { bold, size, color: "#000", width: 75, align: "right" });
      y += bold ? 18 : 14;
    }

    totalsLine(L.subtotal, formatMoney(Number(order.subtotal)));
    if (Number(order.discountTotal) > 0) {
      totalsLine(L.discount, `−${formatMoney(Number(order.discountTotal))}`);
    }
    if (Number(order.deliveryCost) > 0) {
      totalsLine(L.delivery, formatMoney(Number(order.deliveryCost)));
    }
    if (order.promoCodeSnapshot) {
      totalsLine(L.promoCode, `${order.promoCodeSnapshot} (−${Number(order.promoDiscountPercent)}%)`);
    }
    y += 4;
    totalsLine(L.totalDue, formatMoney(Number(order.total)), true);
  });
}

// Per-item picking details the order snapshot doesn't carry (OrderItem only
// snapshots name/price) — read live from the variant. Null when the variant
// was since deleted (OrderItem.productVariantId is SetNull), in which case
// the slip just shows the snapshotted name.
export type PackingSlipVariantInfo = { sku: string | null; size: string | null; color: string | null };

const PACKING_SLIP_PAGE_BOTTOM = 770;

// Staff-facing (Georgian-only, like the rest of the admin) document for
// picking/packing a courier order or handing over a pickup: what to pull off
// the shelf (SKU, size, color, quantity, a tick box per line), who it goes
// to, and a signature line. Deliberately no prices — it travels inside the
// parcel / gets handed to the customer, and the invoice covers the money.
export async function generateOrderPackingSlipPdf(
  order: OrderRow,
  extras: { customerPhone: string | null; variants: Map<number, PackingSlipVariantInfo> },
): Promise<Buffer> {
  const company = await getCompanyInfo();
  const locale: InvoiceLocale = "ka";
  const L = LABELS.ka;

  return renderPdf((doc, writer) => {
    const { drawRuns, truncateToWidth } = writer;
    let y = drawDocumentHeader(doc, writer, {
      company,
      title: "შეფუთვის ფურცელი",
      order,
      locale,
      orderCodeLabel: L.orderCode,
      dateLabel: L.date,
    });

    // Recipient — the courier/pickup counterpart needs the phone first.
    drawRuns("მიმღები", 50, y, { bold: true, size: 11 });
    drawRuns("მიწოდების ტიპი", 330, y, { bold: true, size: 11 });
    y += 16;
    const shipping = order.shippingSnapshot as ShippingSnapshot | null;
    drawRuns(`${order.user.firstName} ${order.user.lastName}`, 50, y, { size: 10, color: "#333" });
    drawRuns(L.fulfillment[order.fulfillmentMethod], 330, y, { size: 10, color: "#333" });
    y += 14;
    const phone = shipping?.phone ?? extras.customerPhone;
    if (phone) {
      drawRuns(`ტელ: ${phone}`, 50, y, { size: 10, color: "#333" });
      y += 14;
    }
    if (shipping) {
      drawRuns(truncateToWidth(formatShippingAddress(shipping, locale), 270), 50, y, { size: 10, color: "#333" });
      y += 14;
    }
    y += 16;

    // Items table — tick box, item (with SKU/size/color underneath), qty.
    const col = { check: 50, name: 72, sku: 350, qty: 480 };
    const drawTableHeader = () => {
      drawRuns("დასახელება", col.name, y, { bold: true });
      drawRuns("SKU", col.sku, y, { bold: true });
      drawRuns("რაოდ.", col.qty, y, { bold: true, width: 65, align: "right" });
      doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor("#ddd").stroke();
      y += 24;
    };
    drawTableHeader();

    let totalQuantity = 0;
    for (const item of order.items) {
      if (y > PACKING_SLIP_PAGE_BOTTOM) {
        doc.addPage();
        y = 50;
        drawTableHeader();
      }
      const variant = item.productVariantId != null ? extras.variants.get(item.productVariantId) : undefined;
      const details = [variant?.size, variant?.color].filter(Boolean).join(" · ");

      doc.rect(col.check, y, 11, 11).strokeColor("#888").stroke();
      drawRuns(truncateToWidth(item.itemNameKa, 265), col.name, y);
      drawRuns(variant?.sku ?? "—", col.sku, y, { size: 9, color: "#333" });
      drawRuns(String(item.quantity), col.qty, y, { bold: true, width: 65, align: "right" });
      if (details) {
        drawRuns(details, col.name, y + 13, { size: 9, color: "#555" });
        y += 13;
      }
      y += 22;
      totalQuantity += item.quantity;
    }

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#ddd").stroke();
    y += 10;
    drawRuns(`სულ ერთეული: ${totalQuantity}`, 330, y, { bold: true, width: 215, align: "right" });
    y += 50;

    if (y > PACKING_SLIP_PAGE_BOTTOM - 40) {
      doc.addPage();
      y = 80;
    }
    // Hand-over signatures — staff who packed it, and the customer/courier
    // who received it.
    doc.moveTo(50, y).lineTo(250, y).strokeColor("#888").stroke();
    doc.moveTo(345, y).lineTo(545, y).strokeColor("#888").stroke();
    drawRuns("შეფუთა (სახელი, ხელმოწერა)", 50, y + 6, { size: 9, color: "#555" });
    drawRuns("ჩაიბარა (სახელი, ხელმოწერა)", 345, y + 6, { size: 9, color: "#555" });
  });
}
