export interface ChatAnnotationNoteFormProps {
  className?: string;
  initialNote?: string;
  onCancel: () => void;
  onSubmit: (note: string) => void;
  submitLabel?: string;
}
