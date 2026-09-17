import { useEffect, useState } from "react";
import "./App.css";

interface HelloResponse {
  message: string;
  timestamp: string;
}

function App() {
  const [hello, setHello] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`);
        return res.json() as Promise<HelloResponse>;
      })
      .then(setHello)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="app">
      <h1>{{projectNameHuman}}</h1>
      <p className="hint">Scaffolded with forge — edit src/App.tsx to get started.</p>

      <div className="status-card">
        {error && (
          <p className="error">
            Couldn't reach the backend ({error}). Is it running on :8080?
          </p>
        )}
        {!error && !hello && <p>Calling /api/hello…</p>}
        {hello && (
          <>
            <p>{hello.message}</p>
            <p className="hint">{hello.timestamp}</p>
          </>
        )}
      </div>
    </main>
  );
}

export default App;
