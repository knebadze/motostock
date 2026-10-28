"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { useAdminRole } from "@/components/admin/AdminRoleContext";
import { deleteTag, listTagProducts, listTags, type Tag, type TagProduct } from "@/lib/api/tags";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { TagFormModal } from "./TagFormModal";

const columns: DataTableColumn<Tag>[] = [
  {
    header: "სახელი",
    render: (tag) => (
      <div>
        <p className="font-medium">{tag.name}</p>
        {tag.description && <p className="text-xs text-muted-foreground">{tag.description}</p>}
      </div>
    ),
  },
  { header: "პროდუქტები", render: (tag) => tag.productCount, cellClassName: "text-muted-foreground" },
  {
    header: "სტატუსი",
    render: (tag) =>
      tag.isActive ? (
        <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-success">აქტიური</span>
      ) : (
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">გამორთული</span>
      ),
  },
];

// Buy-together tags: CRUD + "which products carry this tag" (the kit the
// tag forms). OPERATOR sees the list read-only — writes are ADMIN-only on
// the backend too (same split as buy-together/products).
export function TagsManager({ initialTags }: { initialTags: Tag[] }) {
  const isOperator = useAdminRole() === "OPERATOR";
  const [tags, setTags] = useState(initialTags);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [viewingTag, setViewingTag] = useState<Tag | null>(null);
  const [viewingProducts, setViewingProducts] = useState<TagProduct[] | null>(null);

  const filteredTags = search.trim()
    ? tags.filter((tag) => tag.name.toLowerCase().includes(search.trim().toLowerCase()))
    : tags;

  async function refresh() {
    try {
      setTags(await listTags());
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა");
    }
  }

  async function openProducts(tag: Tag) {
    setViewingTag(tag);
    setViewingProducts(null);
    try {
      setViewingProducts(await listTagProducts(tag.id));
    } catch (error) {
      setViewingTag(null);
      toast.error(error instanceof ApiRequestError ? error.message : "პროდუქტების ჩატვირთვა ვერ მოხერხდა");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ტეგები</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            საერთო ტეგის მქონე, სხვადასხვა კატეგორიის პროდუქტები ერთმანეთს „ერთად შეძენაში&rdquo; შესთავაზებს.
          </p>
        </div>
        {!isOperator && (
          <button
            type="button"
            onClick={() => {
              setEditingTag(null);
              setFormOpen(true);
            }}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            + ტეგის დამატება
          </button>
        )}
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="ძიება სახელით…"
        aria-label="ტეგის ძიება"
        className="mt-4 w-72 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={filteredTags}
          totalCount={filteredTags.length}
          getRowKey={(tag) => tag.id}
          emptyMessage={search.trim() ? "ტეგი ვერ მოიძებნა" : "ტეგი ჯერ არ არსებობს"}
          actions={(tag) => (
            <RowActions
              onView={() => void openProducts(tag)}
              onEdit={
                isOperator
                  ? undefined
                  : () => {
                      setEditingTag(tag);
                      setFormOpen(true);
                    }
              }
              onDelete={isOperator ? undefined : () => setDeletingTag(tag)}
            />
          )}
        />
      </div>

      <TagFormModal
        key={`${editingTag?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => void refresh()}
        tag={editingTag}
      />

      <Modal
        open={viewingTag !== null}
        onClose={() => setViewingTag(null)}
        title={viewingTag ? `ტეგი „${viewingTag.name}“ — პროდუქტები` : ""}
      >
        {viewingProducts === null ? (
          <p className="text-sm text-muted-foreground">იტვირთება…</p>
        ) : viewingProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">ეს ტეგი ჯერ არცერთ პროდუქტს არ აქვს მინიჭებული.</p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {viewingProducts.map((product) => {
              const imageUrl = resolveMediaUrl(product.imageUrl);
              return (
                <li key={product.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="size-10 rounded-md border border-border object-cover" />
                  ) : (
                    <div className="size-10 rounded-md border border-dashed border-border" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name.ka}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.category.name.ka}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={deletingTag !== null}
        onClose={() => setDeletingTag(null)}
        title="ტეგის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ ტეგი{" "}
            <span className="font-semibold text-foreground">{deletingTag?.name}</span>?
            {deletingTag && deletingTag.productCount > 0 && (
              <> ის მოეხსნება {deletingTag.productCount} პროდუქტს.</>
            )}{" "}
            ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ტეგი წაიშალა"
        onConfirm={async () => {
          if (!deletingTag) return;
          await deleteTag(deletingTag.id);
          await refresh();
        }}
      />
    </div>
  );
}
