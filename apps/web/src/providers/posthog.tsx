import { PostHogProvider as PostHogReactProvider } from "@posthog/react";
import posthog from "posthog-js";

import { env } from "../env";

if (typeof window !== "undefined" && env.VITE_POSTHOG_API_KEY) {
  posthog.init(env.VITE_POSTHOG_API_KEY, {
    api_host: env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!env.VITE_POSTHOG_API_KEY) {
    return <>{children}</>;
  }
  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}
