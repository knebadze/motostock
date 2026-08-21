"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toggle } from "@/components/shared/Toggle";
import {
  deleteTeamMember,
  listTeamMembers,
  reorderTeamMembers,
  updateTeamMember,
  type TeamMember,
} from "@/lib/api/team-members";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { TeamMemberFormModal } from "./TeamMemberFormModal";

export function TeamMembersManager({
  initialMembers,
  positions,
}: {
  initialMembers: TeamMember[];
  positions: LookupItem[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  async function refresh() {
    try {
      setMembers(await listTeamMembers());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  function openCreateModal() {
    setEditingMember(null);
    setFormOpen(true);
  }

  function openEditModal(member: TeamMember) {
    setEditingMember(member);
    setFormOpen(true);
  }

  async function handleToggleActive(member: TeamMember, isActive: boolean) {
    const previous = members;
    setMembers((current) => current.map((m) => (m.id === member.id ? { ...m, isActive } : m)));
    try {
      await updateTeamMember(member.id, { isActive });
    } catch (error) {
      setMembers(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleDrop(targetId: number) {
    const currentDraggedId = draggedId;
    setDraggedId(null);
    if (currentDraggedId === null || currentDraggedId === targetId) return;

    const order = members.map((member) => member.id);
    const fromIndex = order.indexOf(currentDraggedId);
    const toIndex = order.indexOf(targetId);
    const nextOrder = [...order];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, currentDraggedId);

    const previous = members;
    setMembers(nextOrder.map((id) => members.find((member) => member.id === id)!));

    try {
      setMembers(await reorderTeamMembers(nextOrder));
    } catch (error) {
      setMembers(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">ჩვენი გუნდი</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          + წევრის დამატება
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        გადაათრიეთ წევრები ერთმანეთში „ჩვენ შესახებ” გვერდზე გამოსაჩენი თანმიმდევრობის დასალაგებლად.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {members.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            წევრი არ არის დამატებული
          </p>
        )}

        {members.map((member) => {
          const previewUrl = resolveMediaUrl(member.imageUrl);
          return (
            <div
              key={member.id}
              draggable
              onDragStart={() => setDraggedId(member.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(member.id)}
              className="flex cursor-grab items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full border border-dashed border-border" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-semibold text-foreground">{member.name.ka}</p>
                <p className="text-sm text-muted-foreground">{member.role.ka}</p>
              </div>

              <Toggle checked={member.isActive} onChange={(checked) => handleToggleActive(member, checked)} />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(member)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  რედაქტირება
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingMember(member)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <TeamMemberFormModal
        key={`${editingMember?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
        member={editingMember}
        positions={positions}
      />

      <ConfirmDialog
        open={deletingMember !== null}
        onClose={() => setDeletingMember(null)}
        title="წევრის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">{deletingMember?.name.ka}</span>? ამ
            მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="წევრი წაიშალა"
        onConfirm={async () => {
          if (!deletingMember) return;
          await deleteTeamMember(deletingMember.id);
          await refresh();
        }}
      />
    </div>
  );
}
