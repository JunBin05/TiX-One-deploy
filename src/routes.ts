import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import ConcertDetail from "./pages/ConcertDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/concert/:id",
    Component: ConcertDetail,
  },
]);
