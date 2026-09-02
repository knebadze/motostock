import { getUsersFromServer } from "@/lib/api/server";
import { UsersManager } from "@/components/admin/users/UsersManager";

export default async function UsersPage() {
  const initialData = await getUsersFromServer();

  return <UsersManager initialData={initialData} />;
}
