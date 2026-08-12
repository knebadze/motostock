"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ApiRequestError } from "@/lib/api/client";
import {
  deleteNewsletterCampaign,
  listNewsletterCampaigns,
  sendNewsletterCampaign,
  type NewsletterCampaign,
  type NewsletterCampaignStatus,
} from "@/lib/api/newsletter-campaigns";
import {
  deleteNewsletterSubscriber,
  getNewsletterSubscriberCounts,
  listNewsletterSubscribers,
  type NewsletterSubscriber,
  type NewsletterSubscriberCounts,
  type NewsletterSubscriberStatus,
} from "@/lib/api/newsletter";
import { NewsletterCampaignFormModal } from "./NewsletterCampaignFormModal";

const CAMPAIGN_STATUS_BADGE_CLASSES: Record<NewsletterCampaignStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENDING: "bg-amber-500/15 text-amber-600",
  SENT: "bg-green-500/15 text-green-600",
  FAILED: "bg-red-500/15 text-red-600",
};

const CAMPAIGN_STATUS_LABELS: Record<NewsletterCampaignStatus, string> = {
  DRAFT: "მონახაზი",
  SENDING: "იგზავნება",
  SENT: "გაგზავნილია",
  FAILED: "ვერ გაიგზავნა",
};

const SUBSCRIBER_STATUS_BADGE_CLASSES: Record<NewsletterSubscriberStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-600",
  CONFIRMED: "bg-green-500/15 text-green-600",
  UNSUBSCRIBED: "bg-muted text-muted-foreground",
};

const SUBSCRIBER_STATUS_LABELS: Record<NewsletterSubscriberStatus, string> = {
  PENDING: "დასადასტურებელი",
  CONFIRMED: "დადასტურებული",
  UNSUBSCRIBED: "გამოწერილი აღარ არის",
};

function StatusBadge<T extends string>({
  status,
  classes,
  labels,
}: {
  status: T;
  classes: Record<T, string>;
  labels: Record<T, string>;
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" });
}

export function NewsletterManager({
  initialCampaigns,
  initialSubscribers,
  initialCounts,
}: {
  initialCampaigns: NewsletterCampaign[];
  initialSubscribers: NewsletterSubscriber[];
  initialCounts: NewsletterSubscriberCounts;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [counts, setCounts] = useState(initialCounts);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<NewsletterCampaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<NewsletterCampaign | null>(null);
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<NewsletterCampaign | null>(null);
  const [deletingSubscriber, setDeletingSubscriber] = useState<NewsletterSubscriber | null>(null);

  async function refreshCampaigns() {
    try {
      setCampaigns(await listNewsletterCampaigns());
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა");
    }
  }

  async function refreshSubscribers() {
    try {
      const [items, nextCounts] = await Promise.all([
        listNewsletterSubscribers(),
        getNewsletterSubscriberCounts(),
      ]);
      setSubscribers(items);
      setCounts(nextCounts);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა");
    }
  }

  function openCreateModal() {
    setEditingCampaign(null);
    setFormOpen(true);
  }

  function openEditModal(campaign: NewsletterCampaign) {
    setEditingCampaign(campaign);
    setFormOpen(true);
  }

  // Errors/loading/success toast are all handled by the ConfirmDialog that
  // calls this (see confirmSendCampaign below) — this just does the work.
  async function handleSend(campaign: NewsletterCampaign) {
    await sendNewsletterCampaign(campaign.id);
    await refreshCampaigns();
  }

  const campaignColumns: DataTableColumn<NewsletterCampaign>[] = [
    { header: "სათაური", render: (campaign) => campaign.subject },
    {
      header: "სტატუსი",
      render: (campaign) => (
        <StatusBadge
          status={campaign.status}
          classes={CAMPAIGN_STATUS_BADGE_CLASSES}
          labels={CAMPAIGN_STATUS_LABELS}
        />
      ),
    },
    {
      header: "მიმღებები",
      render: (campaign) =>
        campaign.status === "DRAFT"
          ? "—"
          : campaign.failedCount > 0
            ? `${campaign.recipientCount - campaign.failedCount} / ${campaign.recipientCount} (${campaign.failedCount} ვერ მიაღწია)`
            : `${campaign.recipientCount}`,
    },
    { header: "გაგზავნის თარიღი", render: (campaign) => formatDate(campaign.sentAt) },
  ];

  const subscriberColumns: DataTableColumn<NewsletterSubscriber>[] = [
    { header: "ელფოსტა", render: (subscriber) => subscriber.email },
    {
      header: "სტატუსი",
      render: (subscriber) => (
        <StatusBadge
          status={subscriber.status}
          classes={SUBSCRIBER_STATUS_BADGE_CLASSES}
          labels={SUBSCRIBER_STATUS_LABELS}
        />
      ),
    },
    { header: "გამოწერის თარიღი", render: (subscriber) => formatDate(subscriber.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Newsletter</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">დასადასტურებელი</p>
            <p className="mt-1 text-2xl font-bold">{counts.pending}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">დადასტურებული გამომწერი</p>
            <p className="mt-1 text-2xl font-bold text-primary">{counts.confirmed}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">გამოწერილი აღარ არის</p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">{counts.unsubscribed}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">კამპანიები</h3>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            + კამპანიის შექმნა
          </button>
        </div>

        <div className="mt-4">
          <DataTable
            columns={campaignColumns}
            data={campaigns}
            getRowKey={(campaign) => campaign.id}
            emptyMessage="კამპანია ჯერ არ არსებობს"
            actions={(campaign) => (
              <div className="flex justify-end gap-1">
                {campaign.status === "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => setConfirmSendCampaign(campaign)}
                    className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    გაგზავნა
                  </button>
                )}
                <RowActions
                  onEdit={() => openEditModal(campaign)}
                  onDelete={() => setDeletingCampaign(campaign)}
                />
              </div>
            )}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold tracking-tight">გამომწერები</h3>
        <div className="mt-4">
          <DataTable
            columns={subscriberColumns}
            data={subscribers}
            getRowKey={(subscriber) => subscriber.id}
            emptyMessage="გამომწერი ჯერ არ არსებობს"
            actions={(subscriber) => (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingSubscriber(subscriber)}
                  aria-label="წაშლა"
                  title="წაშლა"
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
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
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <NewsletterCampaignFormModal
        key={`${editingCampaign?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refreshCampaigns()}
        campaign={editingCampaign}
      />

      <ConfirmDialog
        open={deletingCampaign !== null}
        onClose={() => setDeletingCampaign(null)}
        title="კამპანიის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingCampaign?.subject}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="კამპანია წაიშალა"
        onConfirm={async () => {
          if (!deletingCampaign) return;
          await deleteNewsletterCampaign(deletingCampaign.id);
          await refreshCampaigns();
        }}
      />

      <ConfirmDialog
        open={confirmSendCampaign !== null}
        onClose={() => setConfirmSendCampaign(null)}
        title="კამპანიის გაგზავნა"
        confirmLabel="გაგზავნა"
        message={
          <>
            კამპანია{" "}
            <span className="font-semibold text-foreground">{confirmSendCampaign?.subject}</span>{" "}
            გაეგზავნება ყველა დადასტურებულ გამომწერს ({counts.confirmed}). გაგზავნის შემდეგ ვეღარ
            შეასწორებთ.
          </>
        }
        successMessage="კამპანია გაიგზავნა"
        onConfirm={async () => {
          if (!confirmSendCampaign) return;
          await handleSend(confirmSendCampaign);
        }}
      />

      <ConfirmDialog
        open={deletingSubscriber !== null}
        onClose={() => setDeletingSubscriber(null)}
        title="გამომწერის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingSubscriber?.email}</span>?
          </>
        }
        successMessage="გამომწერი წაიშალა"
        onConfirm={async () => {
          if (!deletingSubscriber) return;
          await deleteNewsletterSubscriber(deletingSubscriber.id);
          await refreshSubscribers();
        }}
      />
    </div>
  );
}
