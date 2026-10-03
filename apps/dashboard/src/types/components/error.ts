export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export interface ErrorContentCopy {
  eyebrow: string;
  title: string;
  description: string;
  reference: (digest: string) => string;
  tryAgain: string;
  goHome: string;
}

export interface ErrorContentProps {
  error: Error & { digest?: string };
  reset: () => void;
  className?: string;
  copy?: ErrorContentCopy;
}
