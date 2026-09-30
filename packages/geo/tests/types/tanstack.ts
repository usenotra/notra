import { createMiddleware, createStart } from "@tanstack/react-start";

import { createGeoMiddleware } from "../../src/tanstack";

const geo = createMiddleware().server(
  createGeoMiddleware({ token: "typecheck-token" })
);

createStart(() => ({ requestMiddleware: [geo] }));

const withContext = createMiddleware().server(({ next }) =>
  next({ context: { accountId: "account-test" } })
);

const geoWithContext = createMiddleware()
  .middleware([withContext])
  .server(createGeoMiddleware({ token: "typecheck-token" }));

const consumeContext = createMiddleware()
  .middleware([geoWithContext])
  .server(({ context, next }) => {
    const accountId: string = context.accountId;
    return next({ context: { accountId } });
  });

createStart(() => ({ requestMiddleware: [consumeContext] }));
