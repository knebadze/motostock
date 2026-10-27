"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { listUsers, mergeUserInto, type AdminUser } from "@/lib/api/users";

const SEARCH_DEBOUNCE_MS = 350;

// Admin manual-merge fallback — for a walk-in customer the automatic
// phone-match on registration couldn't connect (different phone, or a
// Google/Facebook signup, which collects no phone at all).
export function LinkExistingUserModal({
  open,
  onClose,
  sourceUser,
  onMerged,
}: {
  open: boolean;
  onClose: () => void;
  sourceUser: AdminUser;
  onMerged: (user: AdminUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  // Merging is irreversible, so picking a result only asks first — same as
  // the phone-claim path in ServiceHistoryManager.tsx.
  const [pendingTarget, setPendingTarget] = useState<AdminUser | null>(null);

  function handleClose() {
    setQuery("");
    setResults([]);
    onClose();
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    setSearching(true);
    const timeoutId = setTimeout(() => {
      listUsers({ search: trimmed })
        .then((result) => setResults(result.users.filter((user) => user.id !== sourceUser.id)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [query, sourceUser.id]);

  async function handleMerge(target: AdminUser) {
    // mergeUserInto's response is the SOURCE row (now flagged as merged
    // away, its garage emptied onto `target`) — not useful to re-select.
    // `target` is the real account the admin just picked from the search
    // results above, already known in full here, so it's what the panel
    // should switch to.
    await mergeUserInto(sourceUser.id, target.id);
    onMerged(target);
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="დაკავშირება არსებულ მომხმარებელთან">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          მოძებნეთ ის რეალური ანგარიში, რომელსაც ეკუთვნის{" "}
          <span className="font-semibold text-foreground">{sourceUser.name}</span> — მისი
          ტრანსპორტი და სერვისის ისტორია გადავა არჩეულ ანგარიშზე.
        </p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="სახელი, გვარი, ემეილი ან ტელეფონი"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        {searching && (
          <div className="flex justify-center">
            <Loader size="sm" />
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setPendingTarget(user)}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm transition-colors hover:border-primary disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!searching && query.trim() && results.length === 0 && (
          <p className="text-sm text-muted-foreground">მომხმარებელი ვერ მოიძებნა</p>
        )}
      </div>

      <ConfirmDialog
        open={pendingTarget !== null}
        onClose={() => setPendingTarget(null)}
        title="სტუმრის დაკავშირება ანგარიშთან"
        message={
          pendingTarget
            ? `დარწმუნებული ხართ, რომ ${sourceUser.name} და ${pendingTarget.name} (${pendingTarget.email}) ერთი და იგივე პირია? გარაჟი და სერვისის ისტორია ამ ანგარიშს გადაეცემა — გაერთიანების გაუქმება შეუძლებელია.`
            : ""
        }
        confirmLabel="დაკავშირება"
        successMessage="მომხმარებლები გაერთიანდა"
        errorFallback="გაერთიანება ვერ მოხერხდა"
        onConfirm={async () => {
          if (pendingTarget) await handleMerge(pendingTarget);
        }}
      />
    </Modal>
  );
}
