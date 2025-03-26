/**
 * This is the client-side entrypoint for your tRPC API.
 * It's used to create the `api` object which contains the Next.js App-wrapper
 * as well as your typesafe react-query hooks.
 *
 * We also create a few inference helpers for input and output types
 */
import superjson from "superjson";

import {
  type TRPCClientErrorLike,
  httpBatchLink,
  httpLink,
  loggerLink,
  splitLink,
} from "./client";
import { createTRPCNext } from "./next";
import type { Maybe, inferRouterInputs, inferRouterOutputs } from "./server";
import { type AppRouter } from "./server/root";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

/**
 * A set of typesafe react-query hooks for your tRPC API
 */
export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      /**
       * Transformer used for data de-serialization from the server
       * @see https://trpc.io/docs/data-transformers
       **/
      transformer: superjson,

      /**
       * Links used to determine request flow from client to server
       * @see https://trpc.io/docs/links
       * */
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            
            // Include cookies
            if (typeof window !== 'undefined') {
              const cookies = document.cookie;
              headers['cookie'] = cookies;

              // Log cookies for debugging
              console.log('tRPC request cookies:', {
                cookies,
                sessionToken: cookies.includes('next-auth.session-token'),
                emailCookie: cookies.includes('x-insa-auth-email'),
              });
            }
            
            return headers;
          },
          fetch(url, options) {
            // Log request details for debugging
            console.log('tRPC request details:', {
              url,
              method: options?.method,
              headers: options?.headers,
              body: options?.body,
            });

            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            retry(failureCount, _err) {
              const err = _err as never as Maybe<
                TRPCClientErrorLike<AppRouter>
              >;
              const code = err?.data?.code;
              
              // Log error for debugging
              if (err) {
                console.error('tRPC Query Error:', {
                  code,
                  error: err,
                  data: err.data,
                  message: err.message,
                  shape: err.shape,
                });
              }

              if (
                (
                  [
                    "BAD_REQUEST",
                    "FORBIDDEN",
                    "UNAUTHORIZED",
                    "NOT_FOUND",
                    "PRECONDITION_FAILED",
                  ] as (typeof code)[]
                ).includes(code)
              ) {
                return false;
              }

              const MAX_QUERY_RETRIES = 3;
              return failureCount < MAX_QUERY_RETRIES;
            },
          },
        },
      },
    };
  },
  /**
   * Whether tRPC should await queries when server rendering pages
   * @see https://trpc.io/docs/nextjs#ssr-boolean-default-false
   */
  ssr: false,
});

/**
 * Inference helper for inputs
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
export type RouterInputs = inferRouterInputs<AppRouter>;
/**
 * Inference helper for outputs
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>;
