import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";

export const AppLayout = () => {
  return (
    <>
      <Navigation />
      <Outlet />
      <BottomNavigation />
    </>
  );
};
