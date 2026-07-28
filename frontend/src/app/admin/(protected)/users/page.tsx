import { getUsersFromServer } from "@/lib/api/server";
import { UsersManager } from "@/components/admin/users/UsersManager";

export default async function UsersPage() {
  const users = await getUsersFromServer();

  return <UsersManager initialUsers={users} />;
}
