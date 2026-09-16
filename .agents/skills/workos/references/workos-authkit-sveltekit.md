# WorkOS AuthKit for SvelteKit

## Step 1: Fetch SDK Documentation (BLOCKING)

**STOP. Do not proceed until complete.**

WebFetch: `https://raw.githubusercontent.com/workos/authkit-sveltekit/main/README.md`

The README is the source of truth. If this skill conflicts with README, follow README.

## Step 2: Pre-Flight Validation

### Project Structure

- Confirm `svelte.config.js` (or `svelte.config.ts`) exists
- Confirm `package.json` contains `@sveltejs/kit` dependency
- Confirm `src/routes/` directory exists

### Environment Variables

Check `.env` or `.env.local` for:

- `WORKOS_API_KEY` - starts with `sk_`
- `WORKOS_CLIENT_ID` - starts with `client_`
- `WORKOS_REDIRECT_URI` - valid callback URL
- `WORKOS_COOKIE_PASSWORD` - 32+ characters

SvelteKit uses `$env/static/private` and `$env/dynamic/private` natively. The agent should write env vars to `.env` (SvelteKit's default) or `.env.local`.

## Step 2b: Partial Install Recovery

Before installing the SDK, check if a previous AuthKit attempt already exists:

1. Check if `@workos/authkit-sveltekit` is already in `package.json`
2. Check for incomplete setup signals:
   - `src/hooks.server.ts` has commented-out `authKitHandle` import or exports a passthrough handle
   - `src/routes/+layout.server.ts` has TODO comments about loading the session
   - No callback `+server.ts` route exists in `src/routes/`
   - No `WORKOS_COOKIE_PASSWORD` in `.env`
3. If partial install detected:
   - Do NOT reinstall the SDK (it's already there)
   - Read existing files to understand what's done vs missing
   - Complete the integration by filling gaps rather than starting fresh
   - The most common gap is the missing callback route — create it
   - Wire up `authKitHandle` in hooks.server.ts properly (use `sequence()` if other hooks exist)
   - Complete the layout load function
   - Ensure `WORKOS_COOKIE_PASSWORD` is set in `.env`

## Step 2c: Existing Auth System Detection

Check for existing authentication before integrating:

```
package.json has 'lucia'?              → Lucia v3 session auth
package.json has '@auth0/auth0-spa-js'? → Auth0 SPA auth
package.json has '@auth/sveltekit'?    → Auth.js SvelteKit
src/hooks.server.ts handles cookies?   → Custom session middleware
```

If existing auth detected (Lucia is most common in SvelteKit):

- Do NOT remove or disable the existing auth system
- Use `sequence()` from `@sveltejs/kit/hooks` to compose handles:

  ```typescript
  import { sequence } from '@sveltejs/kit/hooks';
  import { authKitHandle } from '@workos/authkit-sveltekit';

  // Keep existing handle, compose with AuthKit
  export const handle = sequence(authKitHandle(), existingHandle);
  ```

- AuthKit handle should come FIRST in `sequence()` so it runs before other middleware
- Create separate WorkOS routes if `/login` or `/callback` are already taken (e.g., use `/auth/callback`)
- Ensure existing auth routes, form actions, and session cookies continue to work unchanged
- Document in code comments how to migrate fully to WorkOS AuthKit later

## Step 3: Install SDK

Detect package manager, install SDK package from README.

```
pnpm-lock.yaml? → pnpm add @workos/authkit-sveltekit
yarn.lock? → yarn add @workos/authkit-sveltekit
bun.lockb? → bun add @workos/authkit-sveltekit
else → npm install @workos/authkit-sveltekit
```

**Verify:** SDK package exists in node_modules before continuing.

## Step 4: Configure Server Hooks

SvelteKit uses `src/hooks.server.ts` for server-side middleware. This is where the AuthKit handler is registered.

Create or update `src/hooks.server.ts` with the AuthKit handle function from the README. When using SvelteKit's `$env` modules, call `configureAuthKit` as shown in the README before creating the hook.

### Existing Hooks (IMPORTANT)

If `src/hooks.server.ts` already exists with custom logic, use SvelteKit's `sequence()` helper to compose hooks:

```typescript
import { sequence } from '@sveltejs/kit/hooks';
import { authKitHandle } from '@workos/authkit-sveltekit';

export const handle = sequence(authKitHandle(), yourExistingHandle);
```

Check README for the exact export name and usage pattern.

## Step 5: Create Callback Route

Parse `WORKOS_REDIRECT_URI` to determine route path:

```
URI path          --> Route location
/callback         --> src/routes/callback/+server.ts
/auth/callback    --> src/routes/auth/callback/+server.ts
```

Use the SDK's callback handler from the README. Do not write custom OAuth logic.

**Critical:** SvelteKit uses `+server.ts` for API routes, not `+page.server.ts`.

## Step 6: Layout Setup

Update `src/routes/+layout.server.ts` to load the auth session and pass it to all pages.

Check README for the exact pattern — typically a `load` function that returns the user session from locals.

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  return {
    user: event.locals.auth.user,
  };
};
```

## Step 7: UI Integration

Add auth UI to `src/routes/+page.svelte` using the session data from the layout.

- Show user info when authenticated
- Show sign-in link/button when not authenticated
- Add sign-out functionality

Check README for sign-in URL generation and sign-out patterns.

## Verification Checklist (ALL MUST PASS)

Run these commands to confirm integration. **Do not mark complete until all pass:**

```bash
# 1. Check hooks.server.ts exists and has authkit
grep -i "workos\|authkit" src/hooks.server.ts || echo "FAIL: authkit missing from hooks.server.ts"

# 2. Check callback route exists
find src/routes -name "+server.ts" -path "*/callback/*"

# 3. Check layout loads auth session
grep -i "user\|auth\|session" src/routes/+layout.server.ts || echo "FAIL: auth session missing from layout"

# 4. Build succeeds
pnpm build || npm run build
```

## Error Recovery

### "Cannot find module '@workos/authkit-sveltekit'"

- Check: SDK installed before writing imports
- Check: SDK package directory exists in node_modules
- Re-run install if missing

### hooks.server.ts not taking effect

- Check: File is at `src/hooks.server.ts`, not `src/hooks.ts` or elsewhere
- Check: Named export is `handle` (SvelteKit requirement)
- Check: If using `sequence()`, all handles are properly composed

### Callback route not found (404)

- Check: File uses `+server.ts` (not `+page.server.ts`)
- Check: Route path matches `WORKOS_REDIRECT_URI` path exactly
- Check: Exports `GET` handler (SvelteKit convention)

### "locals" type errors

- Check: App.Locals interface is augmented in `src/app.d.ts`
- Check README for TypeScript setup instructions

### Cookie password error

- Verify `WORKOS_COOKIE_PASSWORD` is 32+ characters
- Generate new: `openssl rand -base64 32`

### Auth state not available in pages

- Check: `+layout.server.ts` load function returns user data
- Check: Pages access data via `export let data` (Svelte 4) or `$page.data` (Svelte 5)
