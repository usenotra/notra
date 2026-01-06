import {
  ContentCard,
  type ContentType,
} from "@/components/content/content-card";

interface PageClientProps {
  organizationSlug: string;
}

interface ExampleContent {
  id: string;
  title: string;
  preview: string;
  contentType: ContentType;
  date: Date;
}

const EXAMPLE_CONTENT: ExampleContent[] = [
  {
    id: "1",
    title: "Q4 2024 Product Update",
    preview:
      "This quarter we shipped major improvements to our API performance, reduced latency by 40%, and introduced new authentication methods for enterprise customers.",
    contentType: "investor_update",
    date: new Date(),
  },
  {
    id: "2",
    title: "Introducing Dark Mode Support",
    preview:
      "We're excited to announce that dark mode is now available across all our applications. This highly requested feature helps reduce eye strain and improves the user experience.",
    contentType: "blog_post",
    date: new Date(),
  },
  {
    id: "3",
    title: "Just shipped: Real-time collaboration features!",
    preview:
      "Now you can work together with your team in real-time. See changes as they happen and never worry about conflicting edits again.",
    contentType: "twitter_post",
    date: new Date(),
  },
  {
    id: "4",
    title: "Version 2.5.0 Release Notes",
    preview:
      "New features: Multi-workspace support, improved search, custom themes. Bug fixes: Fixed authentication issues, resolved memory leaks, improved error handling.",
    contentType: "changelog",
    date: new Date(),
  },
  {
    id: "5",
    title: "Scaling Our Engineering Team",
    preview:
      "We're thrilled to share how our engineering organization has grown from 5 to 50 engineers while maintaining our culture of innovation and quality.",
    contentType: "linkedin_post",
    date: new Date(),
  },
  {
    id: "6",
    title: "API v3 Migration Guide",
    preview:
      "Everything you need to know about migrating from API v2 to v3. Includes breaking changes, new endpoints, and a step-by-step migration checklist.",
    contentType: "blog_post",
    date: new Date(),
  },
];

function formatDateHeading(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Content</h1>
          <p className="text-muted-foreground">
            View and manage your generated content
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="font-semibold text-lg">{formatDateHeading()}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLE_CONTENT.map((content) => (
              <ContentCard
                contentType={content.contentType}
                href={`/${organizationSlug}/content/${content.id}`}
                key={content.id}
                preview={content.preview}
                title={content.title}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
