import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Chat } from "./pages/Chat";
import { Result } from "./pages/Result";
import { History } from "./pages/History";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/chat",
    Component: Chat,
  },
  {
    path: "/result",
    Component: Result,
  },
  {
    path: "/history",
    Component: History,
  },
]);
