import type { ContentType } from "@/components/content/content-card";

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  markdown: string;
  contentType: ContentType;
  date: Date;
}

export const EXAMPLE_CONTENT: ContentItem[] = [
  {
    id: "1",
    title: "Q4 2024 Product Update",
    content: `<h1>Q4 2024 Product Update</h1>

<h2>Executive Summary</h2>

<p>This quarter we shipped major improvements to our API performance, reduced latency by 40%, and introduced new authentication methods for enterprise customers.</p>

<h2>Key Achievements</h2>

<h3>Performance Improvements</h3>

<ul>
<li><strong>API Latency</strong>: Reduced average response time from 250ms to 150ms</li>
<li><strong>Database Optimization</strong>: Implemented connection pooling and query caching</li>
<li><strong>CDN Integration</strong>: Rolled out global edge caching for static assets</li>
</ul>

<h3>New Features</h3>

<ol>
<li><strong>Enterprise SSO</strong>: Added support for SAML 2.0 and OIDC authentication</li>
<li><strong>Webhook Events</strong>: New webhook events for real-time notifications</li>
<li><strong>Rate Limiting</strong>: Configurable rate limits per API key</li>
</ol>

<h3>Security Updates</h3>

<pre><code>- Updated all dependencies to latest secure versions
- Implemented CSP headers across all endpoints
- Added audit logging for sensitive operations</code></pre>

<h2>Looking Ahead</h2>

<p>In Q1 2025, we plan to focus on:</p>
<ul>
<li>GraphQL API support</li>
<li>Multi-region deployment</li>
<li>Enhanced analytics dashboard</li>
</ul>

<p>Thank you for your continued support!</p>`,
    markdown: `# Q4 2024 Product Update

## Executive Summary

This quarter we shipped major improvements to our API performance, reduced latency by 40%, and introduced new authentication methods for enterprise customers.

## Key Achievements

### Performance Improvements

- **API Latency**: Reduced average response time from 250ms to 150ms
- **Database Optimization**: Implemented connection pooling and query caching
- **CDN Integration**: Rolled out global edge caching for static assets

### New Features

1. **Enterprise SSO**: Added support for SAML 2.0 and OIDC authentication
2. **Webhook Events**: New webhook events for real-time notifications
3. **Rate Limiting**: Configurable rate limits per API key

### Security Updates

\`\`\`
- Updated all dependencies to latest secure versions
- Implemented CSP headers across all endpoints
- Added audit logging for sensitive operations
\`\`\`

## Looking Ahead

In Q1 2025, we plan to focus on:
- GraphQL API support
- Multi-region deployment
- Enhanced analytics dashboard

Thank you for your continued support!`,
    contentType: "investor_update",
    date: new Date(),
  },
  {
    id: "2",
    title: "Introducing Dark Mode Support",
    content: `<h1>Introducing Dark Mode Support</h1>

<p>We're excited to announce that <strong>dark mode</strong> is now available across all our applications!</p>

<h2>Why Dark Mode?</h2>

<p>This highly requested feature helps:</p>
<ul>
<li>Reduce eye strain during extended use</li>
<li>Improve battery life on OLED devices</li>
<li>Provide a more comfortable viewing experience in low-light environments</li>
</ul>

<h2>How to Enable</h2>

<ol>
<li>Navigate to <strong>Settings</strong></li>
<li>Select <strong>Appearance</strong></li>
<li>Choose your preferred theme:
<ul>
<li>Light</li>
<li>Dark</li>
<li>System (follows your OS preference)</li>
</ul>
</li>
</ol>

<h2>Technical Implementation</h2>

<p>We've implemented dark mode using CSS custom properties:</p>

<pre><code class="language-css">:root {
  --background: #ffffff;
  --foreground: #000000;
}

.dark {
  --background: #1a1a1a;
  --foreground: #ffffff;
}</code></pre>

<h2>Feedback Welcome</h2>

<p>We'd love to hear your thoughts on our dark mode implementation. Feel free to reach out!</p>`,
    markdown: `# Introducing Dark Mode Support

We're excited to announce that **dark mode** is now available across all our applications!

## Why Dark Mode?

This highly requested feature helps:
- Reduce eye strain during extended use
- Improve battery life on OLED devices
- Provide a more comfortable viewing experience in low-light environments

## How to Enable

1. Navigate to **Settings**
2. Select **Appearance**
3. Choose your preferred theme:
   - Light
   - Dark
   - System (follows your OS preference)

## Technical Implementation

We've implemented dark mode using CSS custom properties:

\`\`\`css
:root {
  --background: #ffffff;
  --foreground: #000000;
}

.dark {
  --background: #1a1a1a;
  --foreground: #ffffff;
}
\`\`\`

## Feedback Welcome

We'd love to hear your thoughts on our dark mode implementation. Feel free to reach out!`,
    contentType: "blog_post",
    date: new Date(),
  },
  {
    id: "3",
    title: "Just shipped: Real-time collaboration features!",
    content: `<h1>Just shipped: Real-time collaboration features!</h1>

<p>Now you can work together with your team in real-time. See changes as they happen and never worry about conflicting edits again.</p>

<h2>What's New</h2>

<ul>
<li><strong>Live cursors</strong>: See where your teammates are working</li>
<li><strong>Instant sync</strong>: Changes appear immediately for all users</li>
<li><strong>Conflict resolution</strong>: Smart merging prevents data loss</li>
</ul>

<p>Try it out today!</p>

<p>#ProductUpdate #Collaboration #TeamWork</p>`,
    markdown: `# Just shipped: Real-time collaboration features!

Now you can work together with your team in real-time. See changes as they happen and never worry about conflicting edits again.

## What's New

- **Live cursors**: See where your teammates are working
- **Instant sync**: Changes appear immediately for all users
- **Conflict resolution**: Smart merging prevents data loss

Try it out today!

#ProductUpdate #Collaboration #TeamWork`,
    contentType: "twitter_post",
    date: new Date(),
  },
  {
    id: "4",
    title: "Version 2.5.0 Release Notes",
    content: `<h1>Version 2.5.0 Release Notes</h1>

<p><em>Released: ${new Date().toLocaleDateString()}</em></p>

<hr />

<h2>New Features</h2>

<h3>Multi-workspace Support</h3>
<ul>
<li>Create and switch between multiple workspaces</li>
<li>Invite team members to specific workspaces</li>
<li>Role-based access control per workspace</li>
</ul>

<h3>Improved Search</h3>
<ul>
<li>Full-text search across all content</li>
<li>Filter by date, type, and author</li>
<li>Search history and saved queries</li>
</ul>

<h3>Custom Themes</h3>
<ul>
<li>Create your own color schemes</li>
<li>Import/export theme configurations</li>
<li>Community theme marketplace</li>
</ul>

<hr />

<h2>Bug Fixes</h2>

<table>
<thead>
<tr>
<th>Issue</th>
<th>Description</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr>
<td>#1234</td>
<td>Fixed authentication issues on Safari</td>
<td>Fixed</td>
</tr>
<tr>
<td>#1256</td>
<td>Resolved memory leaks in dashboard</td>
<td>Fixed</td>
</tr>
<tr>
<td>#1278</td>
<td>Improved error handling in API calls</td>
<td>Fixed</td>
</tr>
<tr>
<td>#1290</td>
<td>Fixed timezone display issues</td>
<td>Fixed</td>
</tr>
</tbody>
</table>

<hr />

<h2>Breaking Changes</h2>

<blockquote>
<p><strong>Note</strong>: The v1 API endpoints have been deprecated. Please migrate to v2 by January 2025.</p>
</blockquote>

<h2>Upgrade Instructions</h2>

<pre><code class="language-bash">npm update @your-app/client@2.5.0</code></pre>

<p>For detailed migration guide, see our documentation.</p>`,
    markdown: `# Version 2.5.0 Release Notes

*Released: ${new Date().toLocaleDateString()}*

---

## New Features

### Multi-workspace Support
- Create and switch between multiple workspaces
- Invite team members to specific workspaces
- Role-based access control per workspace

### Improved Search
- Full-text search across all content
- Filter by date, type, and author
- Search history and saved queries

### Custom Themes
- Create your own color schemes
- Import/export theme configurations
- Community theme marketplace

---

## Bug Fixes

| Issue | Description | Status |
|-------|-------------|--------|
| #1234 | Fixed authentication issues on Safari | Fixed |
| #1256 | Resolved memory leaks in dashboard | Fixed |
| #1278 | Improved error handling in API calls | Fixed |
| #1290 | Fixed timezone display issues | Fixed |

---

## Breaking Changes

> **Note**: The v1 API endpoints have been deprecated. Please migrate to v2 by January 2025.

## Upgrade Instructions

\`\`\`bash
npm update @your-app/client@2.5.0
\`\`\`

For detailed migration guide, see our documentation.`,
    contentType: "changelog",
    date: new Date(),
  },
  {
    id: "5",
    title: "Scaling Our Engineering Team",
    content: `<h1>Scaling Our Engineering Team</h1>

<p>We're thrilled to share how our engineering organization has grown from 5 to 50 engineers while maintaining our culture of innovation and quality.</p>

<h2>Our Journey</h2>

<p>When we started, we were a small team of 5 engineers working out of a garage. Today, we have a global team of 50+ engineers across multiple time zones.</p>

<h2>Key Learnings</h2>

<h3>1. Invest in Culture Early</h3>
<ul>
<li>Define your values before you scale</li>
<li>Hire for culture add, not just culture fit</li>
<li>Create mentorship programs</li>
</ul>

<h3>2. Build Strong Foundations</h3>
<ul>
<li>Documentation is not optional</li>
<li>Automated testing saves time</li>
<li>Code review is a learning opportunity</li>
</ul>

<h3>3. Embrace Remote Work</h3>
<ul>
<li>Async-first communication</li>
<li>Clear ownership and accountability</li>
<li>Regular virtual team building</li>
</ul>

<h2>What's Next</h2>

<p>We're continuing to grow and are looking for talented engineers to join our team. Check out our careers page to see open positions!</p>

<p>#Engineering #Startup #Growth #Hiring</p>`,
    markdown: `# Scaling Our Engineering Team

We're thrilled to share how our engineering organization has grown from 5 to 50 engineers while maintaining our culture of innovation and quality.

## Our Journey

When we started, we were a small team of 5 engineers working out of a garage. Today, we have a global team of 50+ engineers across multiple time zones.

## Key Learnings

### 1. Invest in Culture Early
- Define your values before you scale
- Hire for culture add, not just culture fit
- Create mentorship programs

### 2. Build Strong Foundations
- Documentation is not optional
- Automated testing saves time
- Code review is a learning opportunity

### 3. Embrace Remote Work
- Async-first communication
- Clear ownership and accountability
- Regular virtual team building

## What's Next

We're continuing to grow and are looking for talented engineers to join our team. Check out our careers page to see open positions!

#Engineering #Startup #Growth #Hiring`,
    contentType: "linkedin_post",
    date: new Date(),
  },
  {
    id: "6",
    title: "API v3 Migration Guide",
    content: `<h1>API v3 Migration Guide</h1>

<p>Everything you need to know about migrating from API v2 to v3.</p>

<h2>Overview</h2>

<p>API v3 introduces several improvements:</p>
<ul>
<li>Better performance</li>
<li>More consistent response formats</li>
<li>Enhanced error messages</li>
<li>New endpoints for batch operations</li>
</ul>

<h2>Breaking Changes</h2>

<h3>Authentication</h3>

<p><strong>v2 (deprecated)</strong></p>
<pre><code class="language-javascript">headers: {
  'X-API-Key': 'your-api-key'
}</code></pre>

<p><strong>v3 (new)</strong></p>
<pre><code class="language-javascript">headers: {
  'Authorization': 'Bearer your-api-key'
}</code></pre>

<h3>Response Format</h3>

<p><strong>v2 Response</strong></p>
<pre><code class="language-json">{
  "data": { ... },
  "error": null
}</code></pre>

<p><strong>v3 Response</strong></p>
<pre><code class="language-json">{
  "data": { ... },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-12-31T00:00:00Z"
  }
}</code></pre>

<h2>Migration Checklist</h2>

<ul>
<li>Update authentication headers</li>
<li>Update response parsing logic</li>
<li>Test all API endpoints</li>
<li>Update error handling</li>
<li>Monitor for deprecation warnings</li>
</ul>

<h2>Need Help?</h2>

<p>Contact our support team at support@example.com or join our Discord community.</p>`,
    markdown: `# API v3 Migration Guide

Everything you need to know about migrating from API v2 to v3.

## Overview

API v3 introduces several improvements:
- Better performance
- More consistent response formats
- Enhanced error messages
- New endpoints for batch operations

## Breaking Changes

### Authentication

**v2 (deprecated)**
\`\`\`javascript
headers: {
  'X-API-Key': 'your-api-key'
}
\`\`\`

**v3 (new)**
\`\`\`javascript
headers: {
  'Authorization': 'Bearer your-api-key'
}
\`\`\`

### Response Format

**v2 Response**
\`\`\`json
{
  "data": { ... },
  "error": null
}
\`\`\`

**v3 Response**
\`\`\`json
{
  "data": { ... },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2024-12-31T00:00:00Z"
  }
}
\`\`\`

## Migration Checklist

- Update authentication headers
- Update response parsing logic
- Test all API endpoints
- Update error handling
- Monitor for deprecation warnings

## Need Help?

Contact our support team at support@example.com or join our Discord community.`,
    contentType: "blog_post",
    date: new Date(),
  },
];

export function getContentById(id: string): ContentItem | undefined {
  return EXAMPLE_CONTENT.find((c) => c.id === id);
}
