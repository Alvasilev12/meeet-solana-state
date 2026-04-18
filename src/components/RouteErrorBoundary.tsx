import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

/** Wraps a lazy-loaded page with its own error boundary */
const RouteErrorBoundary = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, _ref) => <ErrorBoundary>{children}</ErrorBoundary>
);

RouteErrorBoundary.displayName = "RouteErrorBoundary";

export default RouteErrorBoundary;
