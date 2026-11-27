import { HomeView } from "@/components/app/HomeView";
import { getWorkspace } from "@/lib/server/workspace";

export default async function HomePage() {
  // Every page checks for itself; layouts aren't re-run on every navigation.
  const { user, docs } = await getWorkspace();
  return <HomeView name={user.name} docs={docs} />;
}
