"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { usePlans, useSubscription } from "@clerk/nextjs/experimental";
import {
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  resolveIndividualUpgradeMenuModel,
  subscriptionPlanBadgeLabel,
} from "@/lib/user-billing-upgrade";

function abbreviatedPlanBadgeText(fullName: string): string {
  if (fullName === "Free") return "Free";
  const word = fullName.trim().split(/\s+/)[0];
  return word || fullName;
}

function PlanBadge({
  loading,
  planFullName,
}: {
  loading: boolean;
  planFullName: string;
}) {
  if (loading) {
    return <Skeleton className="h-5 w-14 shrink-0 rounded-full" />;
  }
  return (
    <Badge
      variant="outline"
      title={`${planFullName} plan`}
      className="max-w-23 shrink-0 truncate px-1.5 py-0 text-[10px] font-normal"
    >
      {abbreviatedPlanBadgeText(planFullName)}
    </Badge>
  );
}

export function NavUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const enabledBilling = Boolean(user?.id);

  const { data: subscription, isLoading: subscriptionLoading } =
    useSubscription({
      for: "user",
      enabled: enabledBilling,
    });

  const { data: planCatalog, isLoading: plansLoading } = usePlans({
    for: "user",
    pageSize: 32,
    enabled: enabledBilling,
  });

  const planFullName = user ? subscriptionPlanBadgeLabel(subscription) : "Free";
  const planBadgeLoading = Boolean(enabledBilling && subscriptionLoading);

  const upgradeMenuModel = resolveIndividualUpgradeMenuModel({
    userPresent: Boolean(user),
    billingLoading: enabledBilling && (subscriptionLoading || plansLoading),
    subscription,
    catalogPlans: planCatalog,
  });

  if (!isLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="pointer-events-none hover:bg-transparent"
          >
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="grid min-w-0 flex-1 gap-1.5 text-left">
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="h-4 min-w-0 flex-1 max-w-32" />
                <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-3 max-w-40" />
            </div>
            <Skeleton className="ml-auto size-4 shrink-0 rounded-sm" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user?.hasImage ? (
                  <AvatarImage
                    src={user.imageUrl}
                    alt={`${user.firstName}-${user.lastName}`}
                  />
                ) : (
                  <AvatarFallback className="rounded-lg">
                    {user?.firstName?.charAt(0).toUpperCase() || ""}{" "}
                    {user?.lastName?.charAt(0).toUpperCase() || ""}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid min-w-0 flex-1 gap-0.5 text-left text-sm leading-tight">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <PlanBadge
                    loading={planBadgeLoading}
                    planFullName={planFullName}
                  />
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.emailAddresses[0].emailAddress}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user?.hasImage ? (
                    <AvatarImage
                      src={user.imageUrl}
                      alt={`${user.firstName}-${user.lastName}`}
                    />
                  ) : (
                    <AvatarFallback className="rounded-lg">
                      {user?.firstName?.charAt(0).toUpperCase() || ""}{" "}
                      {user?.lastName?.charAt(0).toUpperCase() || ""}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-0.5 text-left text-sm leading-tight">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <PlanBadge
                      loading={planBadgeLoading}
                      planFullName={planFullName}
                    />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.emailAddresses[0].emailAddress}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            {(upgradeMenuModel.kind === "loading" ||
              upgradeMenuModel.kind === "upgrade") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {upgradeMenuModel.kind === "loading" ? (
                    <DropdownMenuItem
                      disabled
                      className="pointer-events-none opacity-100"
                      aria-busy
                    >
                      <SparklesIcon />
                      <Skeleton className="h-4 w-[11rem]" />
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={() => {
                        router.push("/pricing");
                      }}
                    >
                      <SparklesIcon />
                      {upgradeMenuModel.label}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => openUserProfile()}>
                <UserIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  openUserProfile({ __experimental_startPath: "/security" })
                }
              >
                <ShieldIcon />
                Security
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  openUserProfile({ __experimental_startPath: "/billing" })
                }
              >
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void signOut({ redirectUrl: "/" })}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
