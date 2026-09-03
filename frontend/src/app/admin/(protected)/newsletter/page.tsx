import {
  getNewsletterCampaignsFromServer,
  getNewsletterSubscriberCountsFromServer,
  getNewsletterSubscribersFromServer,
} from "@/lib/api/server";
import { NewsletterManager } from "@/components/admin/newsletter/NewsletterManager";

export default async function NewsletterPage() {
  const [campaigns, subscribers, counts] = await Promise.all([
    getNewsletterCampaignsFromServer(),
    getNewsletterSubscribersFromServer(),
    getNewsletterSubscriberCountsFromServer(),
  ]);

  return (
    <NewsletterManager
      initialCampaigns={campaigns}
      initialSubscribersPage={subscribers}
      initialCounts={counts}
    />
  );
}
