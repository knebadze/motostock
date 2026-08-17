import { getAllFaqsFromServer } from "@/lib/api/server";
import { FaqManager } from "@/components/admin/faq/FaqManager";

export default async function FaqPage() {
  const faqs = await getAllFaqsFromServer();

  return <FaqManager initialFaqs={faqs} />;
}
