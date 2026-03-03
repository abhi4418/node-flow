import { Sidebar } from "./components/Sidebar";
import { FlowCanvas } from "./components/FlowCanvas";

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <FlowCanvas />
    </div>
  );
}

export default App;
