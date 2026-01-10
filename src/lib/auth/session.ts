import { api } from "../../../convex/_generated/api";
import { fetchAuthQuery } from "./auth-server";

interface GetServerSessionParams {
  headers: Headers;
}

export async function getServerSession(_params: GetServerSessionParams) {
  try {
    const user = await fetchAuthQuery(api.auth.getCurrentUser, {});
    if (!user) {
      return { session: null, user: null };
    }
    return { session: { userId: user._id }, user };
  } catch (error) {
    console.error("Error getting server session", error);
    return { session: null, user: null };
  }
}
