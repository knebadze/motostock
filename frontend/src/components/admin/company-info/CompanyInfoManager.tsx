"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { Toggle } from "@/components/shared/Toggle";
import {
  updateCompanyInfo,
  uploadCompanyLogo,
  type CompanyInfo,
  type CompanyWorkingHour,
  type WeekDay,
} from "@/lib/api/company-info";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import type { LookupItem } from "@/lib/api/lookups";

const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  MONDAY: "ორშაბათი",
  TUESDAY: "სამშაბათი",
  WEDNESDAY: "ოთხშაბათი",
  THURSDAY: "ხუთშაბათი",
  FRIDAY: "პარასკევი",
  SATURDAY: "შაბათი",
  SUNDAY: "კვირა",
};

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function CompanyInfoManager({
  initialCompanyInfo,
  cities,
}: {
  initialCompanyInfo: CompanyInfo;
  cities: LookupItem[];
}) {
  const [name, setName] = useState(initialCompanyInfo.name);
  const [cityId, setCityId] = useState(
    initialCompanyInfo.city ? String(initialCompanyInfo.city.id) : "",
  );
  const [street, setStreet] = useState(initialCompanyInfo.street ?? "");
  const [phone, setPhone] = useState(initialCompanyInfo.phone ?? "");
  const [email, setEmail] = useState(initialCompanyInfo.email ?? "");
  const [facebookUrl, setFacebookUrl] = useState(initialCompanyInfo.facebookUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initialCompanyInfo.instagramUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialCompanyInfo.youtubeUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(initialCompanyInfo.tiktokUrl ?? "");
  const [latitude, setLatitude] = useState(initialCompanyInfo.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initialCompanyInfo.longitude?.toString() ?? "");
  const [workingHours, setWorkingHours] = useState<CompanyWorkingHour[]>(
    initialCompanyInfo.workingHours,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolveMediaUrl(initialCompanyInfo.logoUrl),
  );
  const [saving, setSaving] = useState(false);

  const cityLabelKey = "nameKa" as const;
  const cityOptions = cities.map((city) => ({ value: String(city.id), label: city[cityLabelKey] }));

  useEffect(() => {
    return () => {
      if (logoFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  function updateWorkingHour(dayOfWeek: WeekDay, patch: Partial<CompanyWorkingHour>) {
    setWorkingHours((current) =>
      current.map((hour) => (hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour)),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("სახელის მითითება სავალდებულოა");
      return;
    }

    setSaving(true);
    try {
      await updateCompanyInfo({
        name: name.trim(),
        cityId: cityId ? Number(cityId) : null,
        street: street.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        facebookUrl: facebookUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        youtubeUrl: youtubeUrl.trim() || null,
        tiktokUrl: tiktokUrl.trim() || null,
        latitude: latitude.trim() === "" ? null : Number(latitude),
        longitude: longitude.trim() === "" ? null : Number(longitude),
        workingHours,
      });

      if (logoFile) {
        try {
          const withLogo = await uploadCompanyLogo(logoFile);
          setPreviewUrl(resolveMediaUrl(withLogo.logoUrl));
        } catch {
          toast.error("ინფორმაცია შენახულია, მაგრამ ლოგოს ატვირთვა ვერ მოხერხდა");
          setSaving(false);
          return;
        }
      }

      setLogoFile(null);
      toast.success("კომპანიის ინფორმაცია განახლდა");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">კომპანიის ინფორმაცია</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="rounded-2xl border border-border p-5">
          <p className="font-medium text-foreground">ლოგო</p>
          <div className="mt-3 flex flex-col gap-2">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
            />
            <p className="text-xs text-muted-foreground">
              რეკომენდებული ზომა 400×140px (გამჭვირვალე PNG)
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <p className="font-medium text-foreground">ძირითადი ინფორმაცია</p>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-name" className="text-sm font-medium">
                სახელი *
              </label>
              <input
                id="company-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="company-city" className="text-sm font-medium">
                  ქალაქი
                </label>
                <Select
                  id="company-city"
                  options={cityOptions}
                  value={cityId}
                  onChange={setCityId}
                  searchable
                  placeholder="აირჩიეთ ქალაქი"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="company-street" className="text-sm font-medium">
                  მისამართი (ქუჩა)
                </label>
                <input
                  id="company-street"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-phone" className="text-sm font-medium">
                ტელეფონი
              </label>
              <input
                id="company-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+995555123456"
                className={inputClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-email" className="text-sm font-medium">
                ელფოსტა
              </label>
              <input
                id="company-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="info@motostock.ge"
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <p className="font-medium text-foreground">სოციალური ქსელები</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-facebook" className="text-sm font-medium">
                Facebook
              </label>
              <input
                id="company-facebook"
                type="url"
                value={facebookUrl}
                onChange={(event) => setFacebookUrl(event.target.value)}
                placeholder="https://facebook.com/..."
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-instagram" className="text-sm font-medium">
                Instagram
              </label>
              <input
                id="company-instagram"
                type="url"
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                placeholder="https://instagram.com/..."
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-youtube" className="text-sm font-medium">
                YouTube
              </label>
              <input
                id="company-youtube"
                type="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://youtube.com/..."
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-tiktok" className="text-sm font-medium">
                TikTok
              </label>
              <input
                id="company-tiktok"
                type="url"
                value={tiktokUrl}
                onChange={(event) => setTiktokUrl(event.target.value)}
                placeholder="https://tiktok.com/@..."
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <p className="font-medium text-foreground">კოორდინატები</p>
          <p className="mt-1 text-sm text-muted-foreground">
            გამოიყენება საკონტაქტო გვერდზე რუკის საჩვენებლად.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-lat" className="text-sm font-medium">
                Latitude
              </label>
              <input
                id="company-lat"
                type="number"
                step="0.0000001"
                min={-90}
                max={90}
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="41.7151"
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-lng" className="text-sm font-medium">
                Longitude
              </label>
              <input
                id="company-lng"
                type="number"
                step="0.0000001"
                min={-180}
                max={180}
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="44.8271"
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <p className="font-medium text-foreground">სამუშაო დღეები და საათები</p>
          <div className="mt-3 flex flex-col gap-2">
            {workingHours.map((hour) => (
              <div
                key={hour.dayOfWeek}
                className="grid grid-cols-1 items-center gap-2 rounded-xl border border-border p-3 sm:grid-cols-[120px_auto_1fr_1fr]"
              >
                <span className="text-sm font-medium text-foreground">
                  {WEEK_DAY_LABELS[hour.dayOfWeek]}
                </span>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Toggle
                    checked={!hour.isClosed}
                    onChange={(next) => updateWorkingHour(hour.dayOfWeek, { isClosed: !next })}
                  />
                  {hour.isClosed ? "დახურულია" : "ღიაა"}
                </label>
                <input
                  type="time"
                  value={hour.openTime ?? ""}
                  disabled={hour.isClosed}
                  onChange={(event) =>
                    updateWorkingHour(hour.dayOfWeek, { openTime: event.target.value || null })
                  }
                  className={`${inputClassName} disabled:opacity-50`}
                />
                <input
                  type="time"
                  value={hour.closeTime ?? ""}
                  disabled={hour.isClosed}
                  onChange={(event) =>
                    updateWorkingHour(hour.dayOfWeek, { closeTime: event.target.value || null })
                  }
                  className={`${inputClassName} disabled:opacity-50`}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "ინახება..." : "შენახვა"}
        </button>
      </form>
    </div>
  );
}
