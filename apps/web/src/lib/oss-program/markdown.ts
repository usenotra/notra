import {
  OSS_PROGRAM_BENEFITS,
  OSS_PROGRAM_BENEFITS_HEADING,
  OSS_PROGRAM_BENEFITS_SUBCOPY,
  OSS_PROGRAM_ELIGIBILITY,
  OSS_PROGRAM_ELIGIBILITY_HEADING,
  OSS_PROGRAM_STATUS_HEADING,
  OSS_PROGRAM_STATUS_SUBCOPY,
  OSS_PROGRAM_SUBTITLE,
  OSS_PROGRAM_TITLE,
} from "@/lib/oss-program/constants";
import { markdownSection } from "@/utils/markdown";

export function buildOssProgramMarkdown(): string {
  const benefits = OSS_PROGRAM_BENEFITS.flatMap((benefit) => [
    `### ${benefit.label}`,
    benefit.detail,
    "",
  ]);
  const eligibility = OSS_PROGRAM_ELIGIBILITY.map(
    (item) => `- ${item.content}`
  );

  return [
    `# ${OSS_PROGRAM_TITLE}`,
    "",
    OSS_PROGRAM_SUBTITLE,
    "",
    markdownSection(OSS_PROGRAM_BENEFITS_HEADING, [
      OSS_PROGRAM_BENEFITS_SUBCOPY,
      "",
      ...benefits,
    ]),
    markdownSection(OSS_PROGRAM_ELIGIBILITY_HEADING, eligibility),
    markdownSection(OSS_PROGRAM_STATUS_HEADING, [OSS_PROGRAM_STATUS_SUBCOPY]),
  ].join("\n");
}
