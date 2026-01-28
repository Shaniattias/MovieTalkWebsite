import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className = "", ...props }: Props) {
  return (
    <input
      type="checkbox"
      className={
        "w-4 h-4 rounded border border-border/50 bg-input " +
        "accent-[color:var(--primary)] " +
        className
      }
      {...props}
    />
  );
}
