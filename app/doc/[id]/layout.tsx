// Mark the file as a server-side component by NOT using "use client" at the top

import RoomProvider from "@/components/RoomProvider";
import { auth } from "@clerk/nextjs/server";

export default async function DocLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>; // Explicitly mark `params` as a Promise
}) {
  const { id } = await params; // Await `params` before accessing `id`

  // Use await to protect the route
  await auth.protect(); // Ensure that the user is authenticated

  return <RoomProvider roomId={id}>{children}</RoomProvider>;
}
