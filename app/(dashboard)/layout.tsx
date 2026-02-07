import React from "react"
import { NavigationWrapper } from '@/components/navigation-wrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavigationWrapper />
      {children}
    </>
  );
}
