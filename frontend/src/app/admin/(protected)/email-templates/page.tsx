import { getEmailTemplatesFromServer } from "@/lib/api/server";
import { EmailTemplatesManager } from "@/components/admin/email-templates/EmailTemplatesManager";

export default async function EmailTemplatesPage() {
  const templates = await getEmailTemplatesFromServer();

  return <EmailTemplatesManager initialTemplates={templates} />;
}
