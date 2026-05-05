"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import DashboardLayout from "@/components/dashboard-layout"
import { DirectoryProvider } from "@/components/directory-provider"
import { PermissionAlertProvider } from "@/components/permission-alert-provider"
import { WorkspaceProvider } from "@/components/workspace-context"

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isAuthPage = pathname === "/login" || pathname === "/register"

    if (isAuthPage) {
        return <>{children}</>
    }

    return (
        <AuthGuard>
            <DirectoryProvider>
                <WorkspaceProvider>
                    <PermissionAlertProvider />
                    <DashboardLayout>{children}</DashboardLayout>
                </WorkspaceProvider>
            </DirectoryProvider>
        </AuthGuard>
    )
}
