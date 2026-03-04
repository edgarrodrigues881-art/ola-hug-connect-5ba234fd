import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerfMonitor } from "./lib/perfMonitor";

createRoot(document.getElementById("root")!).render(<App />);

initPerfMonitor();
