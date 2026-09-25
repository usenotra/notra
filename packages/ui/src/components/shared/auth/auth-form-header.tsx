import type { AuthFormHeaderProps } from "../../../types/auth";

export function AuthFormHeader({ title, description }: AuthFormHeaderProps) {
  if (!(title || description)) {
    return null;
  }

  return (
    <div className="text-center">
      {title && (
        <h1 className="font-semibold text-2xl tracking-tight lg:text-[1.75rem]">
          {title}
        </h1>
      )}
      {description && (
        <p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
