"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { listServiceRecordsForVehicle, type ServiceRecord } from "@/lib/api/service-records";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatDate, formatPrice } from "@/lib/format";

export function ServiceHistoryModal({
  garageVehicleId,
  vehicleLabel,
  onClose,
}: {
  garageVehicleId: number;
  vehicleLabel: string;
  onClose: () => void;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account.garage");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const [records, setRecords] = useState<ServiceRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listServiceRecordsForVehicle(garageVehicleId)
      .then((items) => {
        if (!cancelled) setRecords(items);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(resolveApiErrorMessage(error, tErrors, t("serviceHistoryLoadError")));
        onClose();
      });

    return () => {
      cancelled = true;
    };
  }, [garageVehicleId, onClose, t, tErrors]);

  const positionLabels: Record<string, string> = {
    FRONT: t("serviceHistoryPositionFront"),
    REAR: t("serviceHistoryPositionRear"),
    BOTH: t("serviceHistoryPositionBoth"),
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t("serviceHistoryTitle")} — ${vehicleLabel}`}
      size="xl"
      closeLabel={tCommon("modal.close")}
    >
      {records === null ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" label={tCommon("loader.loading")} />
        </div>
      ) : records.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("serviceHistoryEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => {
            const name = record.serviceTypeName?.[locale] ?? record.customServiceName ?? "";
            const detailParts = [
              record.position ? positionLabels[record.position] : null,
              record.filterChanged ? t("serviceHistoryFilterChanged") : null,
            ].filter((part): part is string => Boolean(part));

            return (
              <div key={record.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{name}</p>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(record.performedAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {record.mileageKm} {t("serviceHistoryMileageUnit")}
                  {detailParts.length > 0 ? ` · ${detailParts.join(" · ")}` : ""}
                  {record.price != null ? ` · ${formatPrice(record.price)}` : ""}
                </p>
                {record.notes && <p className="mt-2 text-sm text-muted-foreground">{record.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
