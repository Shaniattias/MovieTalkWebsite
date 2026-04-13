import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "missing-google-client-id";

console.groupCollapsed("[MovieTalk] Google Auth Debug");
console.log("VITE_GOOGLE_CLIENT_ID :", GOOGLE_CLIENT_ID);
console.log("window.location.origin :", window.location.origin);
console.log("Expected origin in Google Console: http://localhost:5173");
console.log("Client ID matches .env?          ", GOOGLE_CLIENT_ID !== "missing-google-client-id");
console.groupEnd();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
