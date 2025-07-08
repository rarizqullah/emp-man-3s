"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Helper function to get variant classes
const getVariantClasses = (variant?: string, align?: string): string => {
  const alignClass = align ? `text-${align}` : "";
  
  switch (variant) {
    // Heading variants
    case "h1":
      return `scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${alignClass}`;
    case "h2":
      return `scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${alignClass}`;
    case "h3":
      return `scroll-m-20 text-2xl font-semibold tracking-tight ${alignClass}`;
    case "h4":
      return `scroll-m-20 text-xl font-semibold tracking-tight ${alignClass}`;
    case "h5":
      return `scroll-m-20 text-lg font-semibold tracking-tight ${alignClass}`;
    case "h6":
      return `scroll-m-20 text-base font-semibold tracking-tight ${alignClass}`;
    
    // Text variants
    case "lead":
      return `text-xl text-muted-foreground ${alignClass}`;
    case "large":
      return `text-lg font-semibold ${alignClass}`;
    case "small":
      return `text-sm font-medium leading-none ${alignClass}`;
    case "muted":
      return `text-sm text-muted-foreground ${alignClass}`;
    case "subtle":
      return `text-xs text-muted-foreground ${alignClass}`;
    case "default":
    default:
      return `text-base leading-7 ${alignClass}`;
  }
};

// Main Typography component
export const Typography = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    variant?: string;
    align?: string;
    as?: React.ElementType;
  }
>(({ className, variant, align, as, ...props }, ref) => {
  const Component = as || "p";
  const variantClasses = getVariantClasses(variant, align);

  return (
    <Component
      className={cn(variantClasses, className)}
      ref={ref}
      {...props}
    />
  );
});

Typography.displayName = "Typography";

// Specific heading components
export const H1 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h1
      className={cn("scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl", className)}
      ref={ref}
      {...props}
    />
  )
);
H1.displayName = "H1";

export const H2 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      className={cn("scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0", className)}
      ref={ref}
      {...props}
    />
  )
);
H2.displayName = "H2";

export const H3 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}
      ref={ref}
      {...props}
    />
  )
);
H3.displayName = "H3";

export const H4 = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4
      className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}
      ref={ref}
      {...props}
    />
  )
);
H4.displayName = "H4";

// Specific text components
export const Lead = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      className={cn("text-xl text-muted-foreground", className)}
      ref={ref}
      {...props}
    />
  )
);
Lead.displayName = "Lead";

export const Large = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      className={cn("text-lg font-semibold", className)}
      ref={ref}
      {...props}
    />
  )
);
Large.displayName = "Large";

export const P = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      className={cn("text-base leading-7 [&:not(:first-child)]:mt-6", className)}
      ref={ref}
      {...props}
    />
  )
);
P.displayName = "P";

export const Small = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <small
      className={cn("text-sm font-medium leading-none", className)}
      ref={ref}
      {...props}
    />
  )
);
Small.displayName = "Small";

export const Muted = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      ref={ref}
      {...props}
    />
  )
);
Muted.displayName = "Muted";

export const Subtle = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      className={cn("text-xs text-muted-foreground", className)}
      ref={ref}
      {...props}
    />
  )
);
Subtle.displayName = "Subtle";

// List components
export const List = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  )
);
List.displayName = "List";

export const OrderedList = React.forwardRef<HTMLOListElement, React.HTMLAttributes<HTMLOListElement>>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)}
      {...props}
    />
  )
);
OrderedList.displayName = "OrderedList";

// Blockquote component
export const Blockquote = React.forwardRef<HTMLQuoteElement, React.HTMLAttributes<HTMLQuoteElement>>(
  ({ className, ...props }, ref) => (
    <blockquote
      ref={ref}
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    />
  )
);
Blockquote.displayName = "Blockquote";

// Code components
export const InlineCode = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <code
      ref={ref}
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className
      )}
      {...props}
    />
  )
);
InlineCode.displayName = "InlineCode";

export const CodeBlock = React.forwardRef<HTMLPreElement, React.HTMLAttributes<HTMLPreElement>>(
  ({ className, ...props }, ref) => (
    <pre
      ref={ref}
      className={cn(
        "mb-4 mt-6 overflow-x-auto rounded-lg border bg-muted p-4",
        className
      )}
      {...props}
    />
  )
);
CodeBlock.displayName = "CodeBlock";

// Table Typography
export const TableTypography = {
  Root: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn("my-6 w-full overflow-y-auto", className)}
        {...props}
      />
    )
  ),
  
  Caption: React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
    ({ className, ...props }, ref) => (
      <caption
        ref={ref}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
      />
    )
  ),
};

TableTypography.Root.displayName = "TableRoot";
TableTypography.Caption.displayName = "TableCaption"; 