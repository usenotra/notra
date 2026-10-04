import {
  File01Icon,
  FileCodeIcon,
  Folder01Icon,
  GitCommitIcon,
  GitCompareIcon,
  Github01Icon,
  GitPullRequestIcon,
  MagicWand01Icon,
  PaintBoardIcon,
  PencilEdit02Icon,
  PlugIcon,
  Search01Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

type ChatToolIcon = typeof File01Icon;

// Icons follow the thing a tool touches, matching the sidebar where one exists.
export const CHAT_TOOL_ICONS: Record<string, ChatToolIcon> = {
  editMarkdown: SourceCodeIcon,
  getMarkdown: File01Icon,
  open_repository: Github01Icon,
  list_repository_files: Folder01Icon,
  search_repository: Search01Icon,
  read_repository_file: FileCodeIcon,
  repository_history: GitCommitIcon,
  show_repository_change: GitCompareIcon,
  get_pull_requests: GitPullRequestIcon,
  getPullRequests: GitPullRequestIcon,
  get_commits_by_timeframe: GitCommitIcon,
  getCommitsByTimeframe: GitCommitIcon,
  get_available_integrations: PlugIcon,
  getAvailableIntegrations: PlugIcon,
  list_available_skills: MagicWand01Icon,
  listAvailableSkills: MagicWand01Icon,
  get_skill_by_name: MagicWand01Icon,
  getSkillByName: MagicWand01Icon,
  get_brand_references: PaintBoardIcon,
  getBrandReferences: PaintBoardIcon,
  create_post: PencilEdit02Icon,
};
