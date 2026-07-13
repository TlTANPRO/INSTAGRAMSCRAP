import * as React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "danger" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-gradient-to-r from-[#833ab4] via-[#c13584] to-[#e1306c] text-white hover:opacity-90 shadow-[0_0_15px_rgba(193,53,132,0.4)]",
      outline: "border border-white/20 bg-transparent hover:bg-white/10 text-white",
      ghost: "hover:bg-white/10 text-white",
      danger: "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50",
    };
    return (
      <button ref={ref} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2", variants[variant], className)} {...props} />
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input ref={ref} className={cn("flex h-9 w-full rounded-md border border-white/10 bg-black/50 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c13584] disabled:cursor-not-allowed disabled:opacity-50 text-white", className)} {...props} />
    );
  }
);
Input.displayName = "Input";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }>(
  ({ className, noPadding, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border border-white/10 bg-[#0d0a14]/80 backdrop-blur-md text-card-foreground shadow-lg overflow-hidden", className)} {...props}>
      {!noPadding ? <div className="p-6">{props.children}</div> : props.children}
    </div>
  )
);
Card.displayName = "Card";

export const Badge = ({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "success" | "warning" | "danger" | "outline" }) => {
  const variants = {
    default: "bg-white/10 text-white",
    success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    danger: "bg-red-500/20 text-red-400 border border-red-500/30",
    outline: "border border-white/20 text-white",
  };
  return <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)} {...props} />;
};

export const Avatar = ({ src, fallback, className }: { src?: string; fallback: string; className?: string }) => {
  const [error, setError] = React.useState(false);
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10", className)}>
      {src && !error ? (
        <img src={src} alt="Avatar" className="aspect-square h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-white">{fallback}</div>
      )}
    </div>
  );
};

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-white/10", className)} />
);
