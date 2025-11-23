import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { NotificationProvider } from "./components/common/Notification";
import "./index.css";

createRoot(document.getElementById("root")).render(
  // <StrictMode> // COMMENT DULU untuk testing
  <NotificationProvider>
    <RouterProvider router={router} />
  </NotificationProvider>
  // </StrictMode>
);
