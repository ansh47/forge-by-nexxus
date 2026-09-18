import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface HelloResponse {
  message: string;
  timestamp: string;
}

/**
 * Talks to this project's own Spring Boot backend. The base URL is relative
 * on purpose: in development Vite proxies /api to localhost:8080 (see
 * vite.config.ts), and in production the same path works wherever the two are
 * deployed together. Replace getHello with your real endpoints.
 */
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    getHello: builder.query<HelloResponse, void>({
      query: () => "/hello",
    }),
  }),
});

export const { useGetHelloQuery } = api;
