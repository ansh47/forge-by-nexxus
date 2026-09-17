{{#if lucideReact}}
import { Sparkles } from "lucide-react";
{{/if}}
{{#if framerMotion}}
import { motion } from "framer-motion";
{{/if}}
{{#if rtkQuery}}
import { useGetExampleQuery } from "./store/apiSlice";
{{/if}}
import "./App.css";

function App() {
{{#if rtkQuery}}
  const { data, isLoading, error } = useGetExampleQuery();

{{/if}}
  return (
    <main className="app">
      <h1>
{{#if lucideReact}}
        <Sparkles size={28} className="title-icon" />
{{/if}}
        {{projectNameHuman}}
      </h1>
      <p className="hint">Scaffolded with forge — edit src/App.tsx to get started.</p>
{{#if framerMotion}}

      <motion.div
        className="status-card"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Framer Motion is wired up — this card fades/slides in on mount.
      </motion.div>
{{/if}}
{{#if rtkQuery}}

      <div className="status-card">
        {isLoading && <p>Loading example data via RTK Query…</p>}
        {error && <p className="error">RTK Query request failed — check your network.</p>}
        {data && <p>RTK Query fetched: “{data.title}”</p>}
      </div>
{{/if}}
{{#if tailwind}}

      <p className="mt-4 rounded-md bg-emerald-100 px-3 py-2 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
        Tailwind is wired up — this box is styled with utility classes.
      </p>
{{/if}}
    </main>
  );
}

export default App;
