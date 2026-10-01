import React from "react";
import { CapturePage } from "./pages";
import "./App.css";

const App: React.FC = () => {
  return (
    <main className="w-screen h-screen overflow-hidden bg-transparent">
      <CapturePage />
    </main>
  );
};

export default App;
