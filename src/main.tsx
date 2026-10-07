import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/organisms/ErrorBoundary";
import { initGlobalCrashReporting } from "./services/crashReporterService";

// Register global uncaught error & unhandled promise rejection listeners
initGlobalCrashReporting();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
