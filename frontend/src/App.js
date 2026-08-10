import { useState } from "react";
import "@/App.css";
import { useTelemetry } from "@/hooks/useTelemetry";
import { Header } from "@/components/dashboard/Header";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Field3D from "@/pages/Field3D";
import Replay from "@/pages/Replay";
import SystemDiagram from "@/pages/SystemDiagram";
import Sessions from "@/pages/Sessions";

function App() {
  const [view, setView] = useState("dashboard");
  const { status, frame, history, sendAction } = useTelemetry();

  return (
    <div className="App min-h-screen bg-zinc-50">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <Header status={status} frame={frame} view={view} setView={setView} />
        {view === "dashboard" && (
          <Dashboard frame={frame} history={history} sendAction={sendAction} />
        )}
        {view === "diagram" && <SystemDiagram />}
        {view === "field3d" && <Field3D frame={frame} />}
        {view === "replay" && <Replay />}
        {view === "sessions" && <Sessions />}
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
