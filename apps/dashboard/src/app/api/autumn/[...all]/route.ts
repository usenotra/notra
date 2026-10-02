import { autumnHandler } from "autumn-js/fetch";

import { getAuthSession } from "@/lib/auth/server";
import { resolveBillingOrganizationId } from "@/lib/billing/resolve-billing-organization";
import { createDevelopmentAutumnHandler } from "@/utils/development-autumn";

type RouteHandler = (request: Request) => Response | Promise<Response>;

const developmentHandler = createDevelopmentAutumnHandler(
  process.env.NODE_ENV,
  process.env.AUTUMN_SECRET_KEY,
  async (request) => {
    const session = await getAuthSession();
    if (!session?.user) {
      return null;
    }
    return resolveBillingOrganizationId(request, session);
  }
);

const handler: RouteHandler = developmentHandler
  ? developmentHandler
  : autumnHandler({
      identify: async (request) => {
        const session = await getAuthSession();

        if (!session?.user) {
          return null;
        }

        const customerId = await resolveBillingOrganizationId(request, session);

        if (!customerId) {
          return null;
        }

        return {
          customerId,
          customerData: {
            name: session.user.name,
            email: session.user.email,
          },
        };
      },
    });

export const GET = handler;
export const POST = handler;
