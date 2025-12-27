"use client";

import type * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "..";

interface LabelProps {
  required?: boolean;
}

function Label({
  className,
  children,
  required,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-foreground flex items-center text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
    </LabelPrimitive.Root>
  );
}

export { Label };
