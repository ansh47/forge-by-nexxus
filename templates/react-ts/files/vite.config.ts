import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
{{#if tailwind}}
import tailwindcss from "@tailwindcss/vite";
{{/if}}

export default defineConfig({
  plugins: [react(){{#if tailwind}}, tailwindcss(){{/if}}],
});
