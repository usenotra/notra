import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { nanoid } from "nanoid";
// biome-ignore lint/performance/noNamespaceImport: Required for drizzle schema
import * as schema from "../src/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const db = drizzle(databaseUrl, { schema });

interface SeedPost {
  title: string;
  content: string;
  markdown: string;
  contentType: string;
}

const SEED_POSTS: SeedPost[] = [
  {
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
<h2>Looking Ahead</h2>
<p>In Q1 2025, we plan to focus on GraphQL API support, Multi-region deployment, and Enhanced analytics dashboard.</p>`,
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

## Looking Ahead

In Q1 2025, we plan to focus on GraphQL API support, Multi-region deployment, and Enhanced analytics dashboard.`,
    contentType: "investor_update",
  },
  {
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
<li>Choose your preferred theme: Light, Dark, or System</li>
</ol>
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
3. Choose your preferred theme: Light, Dark, or System

## Feedback Welcome

We'd love to hear your thoughts on our dark mode implementation. Feel free to reach out!`,
    contentType: "blog_post",
  },
  {
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
  },
  {
    title: "Version 2.5.0 Release Notes",
    content: `<h1>Version 2.5.0 Release Notes</h1>
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
<h2>Bug Fixes</h2>
<ul>
<li>#1234 - Fixed authentication issues on Safari</li>
<li>#1256 - Resolved memory leaks in dashboard</li>
<li>#1278 - Improved error handling in API calls</li>
</ul>`,
    markdown: `# Version 2.5.0 Release Notes

## New Features

### Multi-workspace Support
- Create and switch between multiple workspaces
- Invite team members to specific workspaces
- Role-based access control per workspace

### Improved Search
- Full-text search across all content
- Filter by date, type, and author
- Search history and saved queries

## Bug Fixes

- #1234 - Fixed authentication issues on Safari
- #1256 - Resolved memory leaks in dashboard
- #1278 - Improved error handling in API calls`,
    contentType: "changelog",
  },
  {
    title: "Scaling Our Engineering Team",
    content: `<h1>Scaling Our Engineering Team</h1>
<p>We're thrilled to share how our engineering organization has grown from 5 to 50 engineers while maintaining our culture of innovation and quality.</p>
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
<p>We're continuing to grow and are looking for talented engineers to join our team!</p>
<p>#Engineering #Startup #Growth #Hiring</p>`,
    markdown: `# Scaling Our Engineering Team

We're thrilled to share how our engineering organization has grown from 5 to 50 engineers while maintaining our culture of innovation and quality.

## Key Learnings

### 1. Invest in Culture Early
- Define your values before you scale
- Hire for culture add, not just culture fit
- Create mentorship programs

### 2. Build Strong Foundations
- Documentation is not optional
- Automated testing saves time
- Code review is a learning opportunity

We're continuing to grow and are looking for talented engineers to join our team!

#Engineering #Startup #Growth #Hiring`,
    contentType: "linkedin_post",
  },
  {
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
<p>The X-API-Key header is deprecated. Use Authorization: Bearer instead.</p>
<h2>Migration Checklist</h2>
<ul>
<li>Update authentication headers</li>
<li>Update response parsing logic</li>
<li>Test all API endpoints</li>
<li>Update error handling</li>
</ul>`,
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

The X-API-Key header is deprecated. Use Authorization: Bearer instead.

## Migration Checklist

- Update authentication headers
- Update response parsing logic
- Test all API endpoints
- Update error handling`,
    contentType: "blog_post",
  },
  {
    title: "New Dashboard Analytics",
    content: `<h1>New Dashboard Analytics</h1>
<p>We've completely revamped our analytics dashboard to give you deeper insights into your data.</p>
<h2>New Features</h2>
<ul>
<li>Real-time data visualization</li>
<li>Custom date range selection</li>
<li>Export to CSV and PDF</li>
<li>Scheduled email reports</li>
</ul>`,
    markdown: `# New Dashboard Analytics

We've completely revamped our analytics dashboard to give you deeper insights into your data.

## New Features

- Real-time data visualization
- Custom date range selection
- Export to CSV and PDF
- Scheduled email reports`,
    contentType: "blog_post",
  },
  {
    title: "Security Update: Two-Factor Authentication",
    content: `<h1>Security Update: Two-Factor Authentication</h1>
<p>We're rolling out two-factor authentication to all accounts.</p>
<h2>Supported Methods</h2>
<ul>
<li>Authenticator apps (Google Authenticator, Authy)</li>
<li>SMS verification</li>
<li>Hardware security keys (YubiKey)</li>
</ul>
<p>Enable 2FA today to secure your account!</p>`,
    markdown: `# Security Update: Two-Factor Authentication

We're rolling out two-factor authentication to all accounts.

## Supported Methods

- Authenticator apps (Google Authenticator, Authy)
- SMS verification
- Hardware security keys (YubiKey)

Enable 2FA today to secure your account!`,
    contentType: "changelog",
  },
  {
    title: "Mobile App Launch Announcement",
    content: `<h1>Mobile App Launch Announcement</h1>
<p>Our mobile app is now available on iOS and Android!</p>
<h2>Features</h2>
<ul>
<li>Full feature parity with web app</li>
<li>Offline mode support</li>
<li>Push notifications</li>
<li>Biometric authentication</li>
</ul>
<p>Download now from the App Store or Google Play.</p>`,
    markdown: `# Mobile App Launch Announcement

Our mobile app is now available on iOS and Android!

## Features

- Full feature parity with web app
- Offline mode support
- Push notifications
- Biometric authentication

Download now from the App Store or Google Play.`,
    contentType: "blog_post",
  },
  {
    title: "Q1 2025 Roadmap Preview",
    content: `<h1>Q1 2025 Roadmap Preview</h1>
<p>Here's what we're planning for the first quarter of 2025.</p>
<h2>Planned Features</h2>
<ul>
<li>GraphQL API support</li>
<li>Advanced workflow automation</li>
<li>Team collaboration improvements</li>
<li>Performance optimizations</li>
</ul>
<p>Stay tuned for more updates!</p>`,
    markdown: `# Q1 2025 Roadmap Preview

Here's what we're planning for the first quarter of 2025.

## Planned Features

- GraphQL API support
- Advanced workflow automation
- Team collaboration improvements
- Performance optimizations

Stay tuned for more updates!`,
    contentType: "investor_update",
  },
  {
    title: "Customer Success Story: TechCorp",
    content: `<h1>Customer Success Story: TechCorp</h1>
<p>Learn how TechCorp increased their productivity by 300% using our platform.</p>
<h2>The Challenge</h2>
<p>TechCorp was struggling with manual processes and siloed data.</p>
<h2>The Solution</h2>
<p>They implemented our platform to automate workflows and centralize data.</p>
<h2>The Results</h2>
<ul>
<li>300% increase in productivity</li>
<li>50% reduction in manual errors</li>
<li>2x faster time to market</li>
</ul>`,
    markdown: `# Customer Success Story: TechCorp

Learn how TechCorp increased their productivity by 300% using our platform.

## The Challenge

TechCorp was struggling with manual processes and siloed data.

## The Solution

They implemented our platform to automate workflows and centralize data.

## The Results

- 300% increase in productivity
- 50% reduction in manual errors
- 2x faster time to market`,
    contentType: "blog_post",
  },
  {
    title: "Version 2.6.0 Release Notes",
    content: `<h1>Version 2.6.0 Release Notes</h1>
<h2>New Features</h2>
<ul>
<li>Bulk import/export functionality</li>
<li>Custom webhook configurations</li>
<li>Advanced filtering options</li>
</ul>
<h2>Improvements</h2>
<ul>
<li>50% faster page load times</li>
<li>Improved accessibility</li>
<li>Better mobile responsiveness</li>
</ul>`,
    markdown: `# Version 2.6.0 Release Notes

## New Features

- Bulk import/export functionality
- Custom webhook configurations
- Advanced filtering options

## Improvements

- 50% faster page load times
- Improved accessibility
- Better mobile responsiveness`,
    contentType: "changelog",
  },
  {
    title: "Announcing our Series B Funding",
    content: `<h1>Announcing our Series B Funding</h1>
<p>We're excited to announce that we've raised $50M in Series B funding!</p>
<h2>What This Means</h2>
<ul>
<li>Accelerated product development</li>
<li>Global expansion</li>
<li>Growing our team</li>
</ul>
<p>Thank you to all our customers and investors for believing in our vision!</p>`,
    markdown: `# Announcing our Series B Funding

We're excited to announce that we've raised $50M in Series B funding!

## What This Means

- Accelerated product development
- Global expansion
- Growing our team

Thank you to all our customers and investors for believing in our vision!`,
    contentType: "linkedin_post",
  },
  {
    title: "Infrastructure Updates: 99.99% Uptime",
    content: `<h1>Infrastructure Updates: 99.99% Uptime</h1>
<p>We've achieved 99.99% uptime for the past 12 months.</p>
<h2>Key Improvements</h2>
<ul>
<li>Multi-region failover</li>
<li>Enhanced monitoring</li>
<li>Automated incident response</li>
</ul>`,
    markdown: `# Infrastructure Updates: 99.99% Uptime

We've achieved 99.99% uptime for the past 12 months.

## Key Improvements

- Multi-region failover
- Enhanced monitoring
- Automated incident response`,
    contentType: "changelog",
  },
  {
    title: "New Integration: Slack",
    content: `<h1>New Integration: Slack</h1>
<p>We're excited to announce our new Slack integration!</p>
<h2>Features</h2>
<ul>
<li>Real-time notifications in Slack</li>
<li>Create tasks from Slack messages</li>
<li>Status updates via slash commands</li>
</ul>
<p>Set it up in just 2 minutes!</p>`,
    markdown: `# New Integration: Slack

We're excited to announce our new Slack integration!

## Features

- Real-time notifications in Slack
- Create tasks from Slack messages
- Status updates via slash commands

Set it up in just 2 minutes!`,
    contentType: "twitter_post",
  },
];

async function seed() {
  console.log("Starting seed...");

  // Get all organizations
  const orgs = await db.select().from(schema.organizations);

  if (orgs.length === 0) {
    console.log("No organizations found. Please create an organization first.");
    process.exit(1);
  }

  console.log(`Found ${orgs.length} organizations`);

  for (const org of orgs) {
    console.log(`Seeding posts for organization: ${org.name} (${org.id})`);

    // Create posts with staggered dates for infinite scroll testing
    const postsToInsert = SEED_POSTS.map((post, index) => {
      const date = new Date();
      // Stagger posts by days going back
      date.setDate(date.getDate() - Math.floor(index / 3));
      date.setHours(date.getHours() - (index % 3) * 4);

      return {
        id: nanoid(),
        organizationId: org.id,
        title: post.title,
        content: post.content,
        markdown: post.markdown,
        contentType: post.contentType,
        createdAt: date,
        updatedAt: date,
      };
    });

    // Delete existing posts for this org to prevent duplicates
    await db
      .delete(schema.posts)
      .where(eq(schema.posts.organizationId, org.id));

    await db.insert(schema.posts).values(postsToInsert);
    console.log(`Inserted ${postsToInsert.length} posts for ${org.name}`);
  }

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
