import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "relaxed" | "compact";
}

export const PageContainer = ({
  children,
  className,
  variant = "relaxed",
  ...props
}: ContainerProps) => {
  const containerClass = {
    default: "page-container",
    relaxed: "page-container-relaxed",
    compact: "page-container-compact",
  }[variant];

  return (
    <div className={cn(containerClass, className)} {...props}>
      {children}
    </div>
  );
};
