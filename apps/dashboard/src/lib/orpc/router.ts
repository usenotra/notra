import { agentFeedbackRouter } from "./routers/agent-feedback";
import { analyticsRouter } from "./routers/analytics";
import { apiKeysRouter } from "./routers/api-keys";
import { attachmentsRouter } from "./routers/attachments";
import { automationRouter } from "./routers/automation";
import { brandRouter } from "./routers/brand";
import { contentRouter } from "./routers/content";
import { feedbackRouter } from "./routers/feedback";
import { geoRouter } from "./routers/geo";
import { githubRouter } from "./routers/github";
import { integrationsRouter } from "./routers/integrations";
import { irisRouter } from "./routers/iris";
import { logsRouter } from "./routers/logs";
import { notificationsRouter } from "./routers/notifications";
import { onboardingRouter } from "./routers/onboarding";
import { outboundWebhooksRouter } from "./routers/outbound-webhooks";
import { searchRouter } from "./routers/search";
import { skillsRouter } from "./routers/skills";
import { socialAccountsRouter } from "./routers/social-accounts";
import { uploadRouter } from "./routers/upload";
import { userRouter } from "./routers/user";

export const dashboardRouter = {
  outboundWebhooks: outboundWebhooksRouter,
  agentFeedback: agentFeedbackRouter,
  analytics: analyticsRouter,
  apiKeys: apiKeysRouter,
  attachments: attachmentsRouter,
  automation: automationRouter,
  brand: brandRouter,
  content: contentRouter,
  feedback: feedbackRouter,
  geo: geoRouter,
  github: githubRouter,
  iris: irisRouter,
  integrations: integrationsRouter,
  logs: logsRouter,
  notifications: notificationsRouter,
  onboarding: onboardingRouter,
  search: searchRouter,
  skills: skillsRouter,
  socialAccounts: socialAccountsRouter,
  upload: uploadRouter,
  user: userRouter,
};

export type DashboardRouter = typeof dashboardRouter;
