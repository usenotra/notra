import type { PreviewGateError } from "../types/pages";

export const NOTRA_MARK_SVG =
  '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 800 800" fill="none"><path d="M572.881 462.223c-12.712 43.22-290.678 105.932-394.068 83.898l-48.305-10.169 48.305-78.814 68.644-104.237 73.729-106.78 251.695-127.119 78.814-22.881 17.796 17.796h10.17c17.796 35.593 3.945 147.458-12.712 195.763-25.424 73.729-124.576 96.61-177.966 114.407-4.064 1.355 96.61-5.085 83.898 38.136Z" fill="#c8b2ee" stroke="currentColor" stroke-width="35" stroke-linecap="round"/><path d="M700 96.111c-162.712-4.237-510.508 111.356-600 607.627" stroke="currentColor" stroke-width="75" stroke-linecap="round"/></svg>';

export const NOTRA_MARK_CHIP_SVG = NOTRA_MARK_SVG.replace(
  'width="22" height="22"',
  'width="14" height="14"'
);

export const GLOBE_ICON_SVG =
  '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12c0 6 4 10 4 10s4-4 4-10-4-10-4-10-4 4-4 10Z"/><path d="M21 15H3M21 9H3"/></svg>';

export const LOCK_ICON_SVG =
  '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.268 18.845c.225 1.67 1.608 2.979 3.292 3.056 1.416.065 2.855.099 4.44.099s3.024-.034 4.44-.1c1.684-.076 3.067-1.385 3.292-3.055.147-1.09.268-2.207.268-3.345s-.121-2.255-.268-3.345c-.225-1.67-1.608-2.979-3.292-3.056A95 95 0 0 0 12 9c-1.585 0-3.024.034-4.44.1-1.684.076-3.067 1.385-3.292 3.055C4.12 13.245 4 14.362 4 15.5s.121 2.255.268 3.345Z"/><path d="M7.5 9V6.5a4.5 4.5 0 0 1 9 0V9"/><path d="M11.996 15.5h.008"/></svg>';

export const SYSTEM_PAGE_CSS = `
:root{color-scheme:light dark;--bg:#fff;--fg:hsl(0 0% 9%);--muted:hsl(240 4% 40%);--border:hsl(0 0% 89.8%);--field:#fff;--tile:hsl(240 6% 96%);--primary:oklch(.6056 .2189 292.7172);--primary-fg:oklch(.997 0 0);--ring:oklch(.6056 .2189 292.7172/.35);--error:hsl(0 72% 45%)}
@media (prefers-color-scheme:dark){:root{--bg:hsl(233 7% 8%);--fg:hsl(0 0% 98%);--muted:hsl(0 0% 63.9%);--border:hsl(0 1% 17%);--field:hsl(240 6% 10%);--tile:hsl(240 5% 13%);--primary-fg:oklch(.985 0 0);--error:hsl(0 84% 70%)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
header{padding:20px 24px}
.brand{display:inline-flex;align-items:center;gap:8px;color:var(--fg);text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-.01em;border-radius:6px}
.brand svg{display:block}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:24px 24px 15vh}
.panel{width:100%;max-width:360px;text-align:center}
.icon{display:inline-grid;place-items:center;width:44px;height:44px;margin-bottom:20px;border-radius:12px;background:var(--tile);color:var(--fg);box-shadow:inset 0 0 0 1px var(--border)}
.code{margin:0 0 12px;color:var(--muted);font:500 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
h1{margin:0 0 8px;font-size:20px;line-height:1.3;font-weight:600;letter-spacing:-.015em;text-wrap:balance}
p{margin:0;color:var(--muted);text-wrap:pretty}
.actions{margin-top:28px;display:grid;gap:12px;text-align:left}
.button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:40px;padding:0 16px;border:1px solid transparent;border-radius:12px;font-family:inherit;font-size:14px;font-weight:500;line-height:1;text-decoration:none;cursor:pointer;transition:filter .15s ease-out,transform .15s ease-out,background-color .15s ease-out}
.button:active{transform:scale(.97)}
.primary{border-color:color-mix(in oklch,var(--primary) 60%,transparent);background:linear-gradient(to bottom,color-mix(in oklch,var(--primary) 85%,transparent),var(--primary));color:var(--primary-fg);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 1px 2px rgba(0,0,0,.18)}
.primary:hover{filter:brightness(1.1)}
.chip{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:5px;background:#fff;color:#1e1e1e;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08),0 1px 1px rgba(0,0,0,.12)}.chip svg{display:block}
.secondary{border-color:var(--border);background:var(--field);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.05)}
.secondary:hover{background:var(--tile)}
.divider{display:flex;align-items:center;gap:12px;margin:4px 0;color:var(--muted);font-size:13px}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--border)}
label{display:block;margin-bottom:6px;font-size:13px;font-weight:500}
input{display:block;width:100%;height:40px;padding:0 12px;border:1px solid var(--border);border-radius:10px;background:var(--field);color:var(--fg);font-family:inherit;font-size:16px;transition:border-color .15s ease-out,box-shadow .15s ease-out}
input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px var(--ring)}
input[aria-invalid=true]{border-color:var(--error)}
form{display:grid;gap:10px}
.error{margin:0;color:var(--error);font-size:13px}
.notice{margin-top:20px;padding:10px 12px;border-radius:10px;background:var(--tile);color:var(--fg);font-size:13px;text-align:left}
.frame{margin-top:28px;padding:2px;border-radius:14px;background:var(--tile);box-shadow:inset 0 0 0 1px var(--border);text-align:left}
.rows{border-radius:12px;background:var(--bg);box-shadow:0 0 0 1px var(--border),0 1px 2px rgba(0,0,0,.04)}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;font-size:13px}
.row+.row{border-top:1px solid var(--border)}
.row span{color:var(--muted)}
.row a{font-weight:500;text-decoration:none}
.row a:hover{text-decoration:underline}
.frame-foot{padding:10px 12px 8px;color:var(--muted);font-size:12px}
.panel a{color:var(--fg);text-underline-offset:3px;text-decoration-color:color-mix(in oklch,var(--fg) 35%,transparent)}.panel a:hover{text-decoration-color:currentColor}
a:focus-visible,.button:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.foot{padding:20px 24px;color:var(--muted);font-size:12px;text-align:center}
@media (max-width:480px){header{padding:16px 20px}main{padding:16px 20px 12vh}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`
  .replaceAll("\n", "")
  .trim();

export const NOTRA_HOME_URL = "https://usenotra.com";

export const SITES_ABUSE_EMAIL = "abuse@usenotra.com";
export const SITES_SECURITY_EMAIL = "security@usenotra.com";
export const SECURITY_TXT_LIFETIME_DAYS = 180;

export const GATE_ERROR_MESSAGES: Record<PreviewGateError, string> = {
  wrong_password: "That password isn't right. Try again.",
  too_many_attempts: "Too many attempts. Wait a minute, then try again.",
  forbidden:
    "Your Notra account doesn't have access to this site. Ask for a share link.",
  invalid_link: "This link has expired or is invalid. Sign in to continue.",
};
