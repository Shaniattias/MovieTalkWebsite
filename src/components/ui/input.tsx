import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={
          "w-full h-12 px-4 rounded-2xl bg-input text-foreground " +
          "border border-border/40 placeholder:text-muted-foreground " +
          "focus:outline-none focus:ring-2 focus:ring-ring " +
          "transition " +
          className
        }
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
