import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa";

// Log startup information for debugging
console.log("Starting nurse scheduler application...");
console.log("Environment:", import.meta.env.MODE);

// Register service worker for PWA
registerServiceWorker().catch(error => {
  console.error("Service worker registration failed:", error);
});

// Add a simple error boundary
try {
  console.log("Rendering main app component");
  createRoot(document.getElementById("root")!).render(<App />);
  console.log("App rendering complete");
} catch (error) {
  console.error("Error rendering application:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>NurseScheduler</h1>
      <p>An error occurred while loading the application.</p>
      <pre style="background: #f5f5f5; padding: 10px; text-align: left; margin-top: 20px;">${error}</pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Refresh</button>
    </div>
  `;
}
