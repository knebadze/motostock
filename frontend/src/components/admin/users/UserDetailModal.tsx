"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { getUser, type AdminUserDetail } from "@/lib/api/users";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";

function vehicleCatalogLabel(entry: VehicleCatalogEntry): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  const variant = entry.variant ? ` ${entry.variant}` : "";
  return `${entry.brand.name.ka} ${entry.model.name.ka}${variant}${year}`;
}

function authMethodBadges(user: AdminUserDetail) {
  const methods: string[] = [];
  if (user.hasPassword) methods.push("პაროლი");
  if (user.hasGoogle) methods.push("Google");
  if (user.hasFacebook) methods.push("Facebook");

  return (
    <div className="flex flex-wrap gap-1.5">
      {methods.map((method) => (
        <span
          key={method}
          className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
        >
          {method}
        </span>
      ))}
    </div>
  );
}

export function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getUser(userId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof ApiRequestError
            ? error.message
            : "მომხმარებლის ინფორმაციის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, onClose]);

  return (
    <Modal open onClose={onClose} title="მომხმარებლის დეტალები" size="xl">
      {loading || !detail ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold">{detail.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  detail.role === "ADMIN"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {detail.role === "ADMIN" ? "ადმინი" : "მომხმარებელი"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{detail.email}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  ავტორიზაცია
                </p>
                <div className="mt-1">{authMethodBadges(detail)}</div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  რეგისტრირებულია
                </p>
                <p className="mt-1 text-sm">{formatDateTime(detail.createdAt)}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold">მისამართები</h4>
            {detail.addresses.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">მისამართი არ არის მითითებული</p>
            ) : (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {detail.addresses.map((address) => (
                  <div key={address.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                    <p>{address.phone}</p>
                    <p className="mt-1 text-muted-foreground">
                      {address.city.nameKa}, {address.street}
                      {address.building ? `, ${address.building}` : ""}
                      {address.apartment ? `, ბინა ${address.apartment}` : ""}
                    </p>
                    {address.postalCode && (
                      <p className="mt-1 text-muted-foreground">
                        საფოსტო ინდექსი: {address.postalCode}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold">გარაჟი</h4>
            {detail.garage.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">გარაჟი ცარიელია</p>
            ) : (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {detail.garage.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold">
                      {vehicleCatalogLabel(vehicle.vehicleCatalog)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">წელი: {vehicle.year}</p>
                    {vehicle.vehicleCatalog.submittedBy && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        დამატებულია იუზერის მიერ
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
