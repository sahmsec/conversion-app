import type { LoaderFunctionArgs } from "@remix-run/node";

/** Public liveness endpoint for the host's health check (no auth). */
export const loader = async (_args: LoaderFunctionArgs) => {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
};
