import type { HTMLAttributes } from "react";

type AppSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  accent?: "amber" | "violet" | "cyan";
};

export function AppSurface({
  children,
  className = "",
  accent = "amber",
  ...props
}: AppSurfaceProps) {
  return (
    <div
      {...props}
      className={`app-surface app-surface--${accent} ${className}`}
    >
      {children}
    </div>
  );
}
