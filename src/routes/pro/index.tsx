import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pro/")({
  beforeLoad: () => {
    throw redirect({ to: "/pro/rapports" });
  },
});
