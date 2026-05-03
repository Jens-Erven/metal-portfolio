"use client";

import { SignInButton } from "@clerk/nextjs";
import { LogInIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";

export default function Page() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center p-6">
      <Empty className="max-w-md flex-none border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LogInIcon />
          </EmptyMedia>
          <EmptyTitle>Metal Portfolio</EmptyTitle>
          <EmptyDescription>
            Sign in to open your dashboard and manage your portfolio.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="items-stretch pt-2 sm:items-center">
          <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
            <Button className="w-full sm:w-auto">Log in</Button>
          </SignInButton>
        </EmptyContent>
      </Empty>
    </main>
  );
}
