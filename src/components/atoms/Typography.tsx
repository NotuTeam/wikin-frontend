"use client";

import React from "react";

type TypographyVariant = "h1" | "h2" | "h3" | "body" | "body-sm" | "label" | "caption";
type TypographyColor = "default" | "muted" | "primary" | "error" | "success" | "warning" | "info";
type TypographySize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";

interface TypographyProps {
  children: React.ReactNode;
  variant?: TypographyVariant;
  size?: TypographySize;
  color?: TypographyColor;
  className?: string;
  as?: React.ElementType;
}

const variantStyles: Record<TypographyVariant, string> = {
  h1: "text-3xl font-bold",
  h2: "text-2xl font-semibold",
  h3: "text-xl font-semibold",
  body: "text-base",
  "body-sm": "text-sm",
  label: "text-sm font-medium",
  caption: "text-xs",
};

const sizeStyles: Record<TypographySize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};

const colorStyles: Record<TypographyColor, string> = {
  default: "text-gray-900",
  muted: "text-gray-500",
  primary: "text-blue-600",
  error: "text-red-600",
  success: "text-green-600",
  warning: "text-amber-600",
  info: "text-sky-600",
};

const variantElements: Record<TypographyVariant, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  "body-sm": "p",
  label: "span",
  caption: "span",
};

export function Typography({
  children,
  variant = "body",
  size,
  color = "default",
  className = "",
  as,
}: TypographyProps) {
  const Component = as || variantElements[variant];
  const sizeClass = size ? sizeStyles[size] : "";

  return (
    <Component className={`${variantStyles[variant]} ${sizeClass} ${colorStyles[color]} ${className}`}>
      {children}
    </Component>
  );
}
