import { auth } from "@/lib/auth/server";

type GetServerSessionParams = {
  headers: Headers;
};

export async function getServerSession({ headers }: GetServerSessionParams) {
  const data = await auth.api.getSession({ headers }).catch((error) => {
    console.error("Error getting server session", error);
    return null;
  });
  return { session: data?.session, user: data?.user };
}
