import { Badge } from "@notra/ui/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

import type { IrisArtifactCardProps } from "@/types/iris";
import { humanizeIrisContentType } from "@/utils/iris-copy";

export function IrisArtifactCard({
  artifact,
  organizationSlug,
}: IrisArtifactCardProps) {
  return (
    <Link
      className="border-border hover:bg-muted/50 flex min-w-0 gap-3 rounded-xl border p-3 transition-colors"
      href={`/${organizationSlug}/content/${artifact.postId}`}
    >
      {artifact.imageUrl ? (
        <Image
          alt={artifact.title}
          className="h-14 w-20 shrink-0 rounded-lg object-cover"
          height={630}
          src={artifact.imageUrl}
          unoptimized
          width={1200}
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">
            {humanizeIrisContentType(artifact.contentType)}
          </Badge>
          <Badge
            variant={artifact.status === "published" ? "default" : "ghost"}
          >
            {artifact.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <p className="truncate text-sm font-medium" title={artifact.title}>
          {artifact.title}
        </p>
        <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
          {artifact.excerpt}
        </p>
      </div>
    </Link>
  );
}
