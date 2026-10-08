import { agentFeedbackRouter } from "./routers/agent-feedback";
import { analyticsRouter } from "./routers/analytics";
import { apiKeysRouter } from "./routers/api-keys";
import { attachmentsRouter } from "./routers/attachments";
import { automationRouter } from "./routers/automation";
import { brandRouter } from "./routers/brand";
import { chatRouter } from "./routers/chat";
import { commentsRouter } from "./routers/comments";
import { contentRouter } from "./routers/content";
import { contentCalendarRouter } from "./routers/content-calendar";
import { feedbackRouter } from "./routers/feedback";
import { geoRouter } from "./routers/geo";
import { githubRouter } from "./routers/github";
import { integrationsRouter } from "./routers/integrations";
import { irisRouter } from "./routers/iris";
import { logsRouter } from "./routers/logs";
import { notificationsRouter } from "./routers/notifications";
import { onboardingRouter } from "./routers/onboarding";
import { organizationRouter } from "./routers/organization";
import { outboundWebhooksRouter } from "./routers/outbound-webhooks";
import { searchRouter } from "./routers/search";
import { sitesRouter } from "./routers/sites";
import { skillsRouter } from "./routers/skills";
import { socialAccountsRouter } from "./routers/social-accounts";
import { uploadRouter } from "./routers/upload";
import { usageAlertsRouter } from "./routers/usage-alerts";
import { userRouter } from "./routers/user";

export const dashboardRouter = {
  comments: commentsRouter,
  outboundWebhooks: outboundWebhooksRouter,
  agentFeedback: agentFeedbackRouter,
  analytics: analyticsRouter,
  apiKeys: apiKeysRouter,
  attachments: attachmentsRouter,
  automation: automationRouter,
  brand: brandRouter,
  chat: chatRouter,
  content: contentRouter,
  contentCalendar: contentCalendarRouter,
  feedback: feedbackRouter,
  geo: geoRouter,
  github: githubRouter,
  iris: irisRouter,
  sites: sitesRouter,
  integrations: integrationsRouter,
  logs: logsRouter,
  notifications: notificationsRouter,
  onboarding: onboardingRouter,
  organization: organizationRouter,
  search: searchRouter,
  skills: skillsRouter,
  socialAccounts: socialAccountsRouter,
  upload: uploadRouter,
  usageAlerts: usageAlertsRouter,
  user: userRouter,
};

export type DashboardRouter = typeof dashboardRouter;
