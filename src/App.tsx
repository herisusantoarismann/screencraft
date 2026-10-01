import React from "react";
import { StageContainer } from "./components/canvas/StageContainer";
import "./App.css";

const App: React.FC = () => {
  return (
    <main className="w-screen h-screen overflow-hidden bg-transparent">
      <StageContainer />
    </main>
  );
};

export default App;
