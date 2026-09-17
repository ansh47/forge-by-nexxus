import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Worked RTK Query example — points at a public placeholder API so
 * useGetExampleQuery() returns real data with zero setup. Point baseUrl at
 * your actual backend and replace the endpoint once you have one.
 */
export const exampleApi = createApi({
  reducerPath: "exampleApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://jsonplaceholder.typicode.com" }),
  endpoints: (builder) => ({
    getExample: builder.query<{ id: number; title: string }, void>({
      query: () => "/todos/1",
    }),
  }),
});

export const { useGetExampleQuery } = exampleApi;
