export interface DashboardSessionState {
  isAuthenticated: boolean;
  isResolved: boolean;
}

declare global {
  interface Window {
    __notraNavbarSession?: Promise<boolean>;
    __notraNavbarSessionResolved?: boolean;
  }
}
