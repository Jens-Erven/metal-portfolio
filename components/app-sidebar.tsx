"use client";

import {
  CalculatorIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  ScaleIcon,
  StoreIcon,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarAppBrand } from "@/components/sidebar-app-brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard"
        }
      ]
    },
    {
      title: "Compare Prices",
      url: "/dashboard/compare",
      icon: <ScaleIcon />,
      items: [
        {
          title: "Dealer Comparison",
          url: "/dashboard/compare"
        }
      ]
    },
    {
      title: "Products",
      url: "/dashboard/products",
      icon: <CoinsIcon />,
      items: [
        {
          title: "All Products",
          url: "/dashboard/products"
        }
      ]
    },
    {
      title: "Dealers",
      url: "/dashboard/dealers",
      icon: <StoreIcon />,
      items: [
        {
          title: "All Dealers",
          url: "/dashboard/dealers"
        }
      ]
    },
    {
      title: "Tools",
      url: "#",
      icon: <CalculatorIcon />,
      items: [
        {
          title: "Tax Simulator",
          url: "/dashboard/tax-simulator"
        }
      ]
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarAppBrand />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
