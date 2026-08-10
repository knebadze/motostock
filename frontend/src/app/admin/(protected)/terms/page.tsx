import { getTermsFromServer } from "@/lib/api/server";
import { TermsManager } from "@/components/admin/terms/TermsManager";

export default async function TermsPage() {
  const terms = await getTermsFromServer();

  return <TermsManager initialTerms={terms} />;
}
