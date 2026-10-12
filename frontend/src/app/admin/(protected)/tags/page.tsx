import { getTagsFromServer } from "@/lib/api/server";
import { TagsManager } from "@/components/admin/tags/TagsManager";

export default async function TagsPage() {
  const tags = await getTagsFromServer();
  return <TagsManager initialTags={tags} />;
}
