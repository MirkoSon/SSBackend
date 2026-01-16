import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

// Material Dashboard 2 React Context Provider
import { MaterialUIControllerProvider } from "context";
import { ProjectProvider } from "context/projectContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <MaterialUIControllerProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </MaterialUIControllerProvider>
    </BrowserRouter>
  </React.StrictMode>
);
