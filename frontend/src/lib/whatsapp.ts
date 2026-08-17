// Plain "click to chat" wa.me link — no Meta Business API credentials
// needed at all, works the moment a phone number is set in Company Info.
// Upgrade path later (once Meta credentials exist): swap this for the
// Cloud API so replies can also be automated from our side, not just
// opened in the visitor's own WhatsApp.
export function buildWhatsAppLink(phone: string | null, message: string): string | null {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly) return null;

  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
