import { ClaudeSpinner } from "../components/claude-spinner";

export default function ClaudeSpinnerExample() {
  return (
    <div className="bg-claude-bg flex items-center gap-6 p-6">
      <ClaudeSpinner animated size={22} />
      <ClaudeSpinner animated size={32} />
      <ClaudeSpinner size={22} />
    </div>
  );
}
