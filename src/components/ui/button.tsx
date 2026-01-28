import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", ...props }: Props) {
  return (
    <button
      className={
        "w-full h-12 rounded-2xl font-semibold " +
        "bg-primary text-primary-foreground " +
        "hover:opacity-90 transition " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        "disabled:opacity-70 disabled:cursor-not-allowed " +
        className
      }
      {...props}
    />
  );
}
