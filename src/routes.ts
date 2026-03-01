import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import ConcertDetail from "./pages/ConcertDetail";
import MyTicket from "./pages/MyTicket";
import MyWaitlists from "./pages/MyWaitlists";
import Marketplace from "./pages/Marketplace";
import Scanner from "./pages/Scanner";
import Checkout from "./pages/Checkout";
import BotDetected from "./pages/BotDetected";
import Appeal from "./pages/Appeal";
import CreateConcert from "./pages/CreateConcert";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/concert/:id",
    Component: ConcertDetail,
  },
  {
    path: "/my-ticket",
    Component: MyTicket,
  },
  {
    path: "/my-waitlists",
    Component: MyWaitlists,
  },
  {
    path: "/marketplace",
    Component: Marketplace,
  },
  {
    path: "/scanner",
    Component: Scanner,
  },
  {
    path: "/buy",
    Component: Checkout,
  },
  {
    path: "/bot-detected",
    Component: BotDetected,
  },
  {
    path: "/appeal",
    Component: Appeal,
  },
  {
    path: "/create-concert",
    Component: CreateConcert,
  },
]);
