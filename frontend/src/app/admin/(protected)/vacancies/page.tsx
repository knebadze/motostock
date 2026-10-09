import { getAllVacanciesFromServer } from "@/lib/api/server";
import { VacanciesManager } from "@/components/admin/vacancies/VacanciesManager";

export default async function VacanciesPage() {
  const vacancies = await getAllVacanciesFromServer();

  return <VacanciesManager initialVacancies={vacancies} />;
}
