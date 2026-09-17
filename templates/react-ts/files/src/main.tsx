import React from "react";
import ReactDOM from "react-dom/client";
{{#if rtkQuery}}
import { Provider } from "react-redux";
import { store } from "./store";
{{/if}}
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
{{#if rtkQuery}}
    <Provider store={store}>
      <App />
    </Provider>
{{else}}
    <App />
{{/if}}
  </React.StrictMode>,
);
