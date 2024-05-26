import App from "@/app";
import "@/global.css";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
