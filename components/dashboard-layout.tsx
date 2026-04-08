"use client"

import type React from "react"
import type { Route } from "next"

import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "./ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "./ui/separator"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { useDirectory } from "@/components/directory-provider"
import { useWorkspace } from "@/components/workspace-context"
import { isAdminLikeRole } from "@/lib/auth"
import { findPersonForAuthUser, getTeamById } from "@/lib/people"
import {
    Plus,
    Bell,
    ChevronDown,
    BarChart3,
    MessageSquare,
    FileText,
    Receipt,
    Settings,
    HelpCircle,
    User,
    LogOut,
    Folder,
    LayoutTemplateIcon as Template,
    Import,
    CheckCircle,
    Users,
} from "lucide-react"

type SidebarPath = "/" | "/dashboard" | "/projects" | "/people" | "/chats" | "/documents" | "/recipts"

interface SidebarItem {
    name: string
    icon: typeof BarChart3
    path: SidebarPath
}

type ProfileFormState = {
    name: string
    email: string
    imageURL: string
    start: string
    end: string
    timezone: string
}

type ApprovalRequest = {
    id: string
    email: string
    name: string
    role: "admin" | "ceo" | "leader" | "employee"
    department: string
    createdAt: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { projects, addProject } = useWorkspace()
    const { user, logout, refreshSession } = useAuth()
    const { people, teams, refresh } = useDirectory()
    const [newProjectName, setNewProjectName] = useState("")
    const [newProjectColor, setNewProjectColor] = useState("bg-blue-200")
    const [newProjectMemberIds, setNewProjectMemberIds] = useState<string[]>([])
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
    const [isProjectSubmitting, setIsProjectSubmitting] = useState(false)
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
    const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)
    const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
    const [approvalActionKey, setApprovalActionKey] = useState<string | null>(null)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const selectedProjectId = searchParams.get("projectId")
    const isAdminUser = isAdminLikeRole(user?.role)
    const todayLabel = useMemo(
        () =>
            new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
            }).format(new Date()),
        [],
    )

    const currentUser =
        findPersonForAuthUser(user, people) ?? {
            id: user?.id ?? "guest-user",
            name: user?.name ?? "Guest User",
            role: "Nhân viên",
            email: user?.email ?? "",
            imageURL: "/placeholder.svg",
            workingHours: { start: "09:00", end: "17:00", timezone: "UTC" },
            team: "product",
        }
    const [profileForm, setProfileForm] = useState<ProfileFormState>({
        name: currentUser.name,
        email: currentUser.email,
        imageURL: currentUser.imageURL === "/placeholder.svg" ? "" : currentUser.imageURL,
        start: currentUser.workingHours.start,
        end: currentUser.workingHours.end,
        timezone: currentUser.workingHours.timezone,
    })

    const sidebarItems: SidebarItem[] = [
        { name: "Dashboard", icon: BarChart3, path: "/dashboard" },
        { name: "Teams", icon: FileText, path: "/projects" },
        { name: "My Task", icon: CheckCircle, path: "/" },
        { name: "People", icon: Users, path: "/people" },
        { name: "Chats", icon: MessageSquare, path: "/chats" },
        { name: "Documents", icon: FileText, path: "/documents" },
        { name: "Receipts", icon: Receipt, path: "/recipts" },
    ]

    const colorOptions = [
        { name: "Blue", value: "bg-blue-200 dark:bg-blue-800" },
        { name: "Pink", value: "bg-pink-200 dark:bg-pink-800" },
        { name: "Green", value: "bg-green-200 dark:bg-green-800" },
        { name: "Yellow", value: "bg-yellow-200 dark:bg-yellow-800" },
        { name: "Purple", value: "bg-purple-200 dark:bg-purple-800" },
        { name: "Red", value: "bg-red-200 dark:bg-red-800" },
    ]

    const notifications = [
        {
            id: 1,
            title: "New task assigned",
            message: `${people[0]?.name ?? "A teammate"} assigned you to 'Help DStudio get more customers'`,
            time: "2 minutes ago",
            unread: true,
        },
        {
            id: 2,
            title: "Meeting reminder",
            message: "Kickoff Meeting starts in 30 minutes",
            time: "28 minutes ago",
            unread: true,
        },
        {
            id: 3,
            title: "Task completed",
            message: `${people[2]?.name ?? "A teammate"} completed 'Return a package'`,
            time: "1 hour ago",
            unread: false,
        },
        {
            id: 4,
            title: "Comment added",
            message: `${people[1]?.name ?? "A teammate"} commented on 'Plan a trip'`,
            time: "2 hours ago",
            unread: false,
        },
    ]

    const loadApprovalRequests = async () => {
        if (!isAdminUser) {
            setApprovalRequests([])
            return
        }

        const response = await fetch("/api/admin/approval-requests", {
            credentials: "include",
            cache: "no-store",
        })

        if (!response.ok) {
            setApprovalRequests([])
            return
        }

        const payload = (await response.json()) as { ok: boolean; requests?: ApprovalRequest[] }
        setApprovalRequests(payload.ok ? payload.requests ?? [] : [])
    }

    const currentTeamPeople = useMemo(
        () => people.filter((person) => person.team === currentUser.team),
        [currentUser.team],
    )

    const visibleProjects = useMemo(
        () => projects.filter((project) => project.memberIds.includes(currentUser.id)),
        [currentUser.id, projects],
    )

    const handleAddProject = async () => {
        if (newProjectName.trim()) {
            setIsProjectSubmitting(true)
            try {
                const newProject = await addProject({
                    name: newProjectName.trim(),
                    color: newProjectColor,
                    memberIds: Array.from(new Set([currentUser.id, ...newProjectMemberIds])),
                })
                setNewProjectName("")
                setNewProjectColor("bg-blue-200 dark:bg-blue-800")
                setNewProjectMemberIds([])
                setIsProjectDialogOpen(false)
                router.push(`/?projectId=${newProject.id}`)
            } finally {
                setIsProjectSubmitting(false)
            }
        }
    }

    const handleSignOut = async () => {
        setIsSigningOut(true)
        await logout()
        router.replace("/login" as Route)
    }

    const handleApprovalAction = async (requestId: string, action: "approve" | "reject") => {
        setApprovalActionKey(`${action}:${requestId}`)
        try {
            const response = await fetch("/api/admin/approval-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ requestId, action }),
            })

            const payload = (await response.json()) as { ok: boolean; message?: string }
            if (!response.ok || !payload.ok) {
                toast({
                    title: action === "approve" ? "Không thể duyệt tài khoản" : "Không thể từ chối tài khoản",
                    description: payload.message ?? (action === "approve" ? "Yêu cầu duyệt thất bại." : "Yêu cầu từ chối thất bại."),
                    variant: "destructive",
                })
                return
            }

            await Promise.all([loadApprovalRequests(), refresh(), refreshSession()])
            toast({
                title: action === "approve" ? "Duyệt tài khoản thành công" : "Đã từ chối tài khoản",
                description:
                    action === "approve"
                        ? "Tài khoản đã được kích hoạt và email thông báo đã được xử lý."
                        : "Yêu cầu đã được từ chối và email thông báo đã được xử lý.",
            })
        } finally {
            setApprovalActionKey(null)
        }
    }

    const openProfileDialog = () => {
        setProfileForm({
            name: currentUser.name,
            email: currentUser.email,
            imageURL: currentUser.imageURL === "/placeholder.svg" ? "" : currentUser.imageURL,
            start: currentUser.workingHours.start,
            end: currentUser.workingHours.end,
            timezone: currentUser.workingHours.timezone,
        })
        setIsProfileDialogOpen(true)
    }

    const updateProfileForm = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
        setProfileForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSaveProfile = async () => {
        if (!profileForm.name.trim() || !profileForm.email.trim()) {
            toast({
                title: "Thiếu thông tin",
                description: "Vui lòng nhập họ tên và email công ty.",
                variant: "destructive",
            })
            return
        }

        setIsProfileSubmitting(true)

        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: profileForm.name,
                    email: profileForm.email,
                    imageURL: profileForm.imageURL,
                    workingHours: {
                        start: profileForm.start,
                        end: profileForm.end,
                        timezone: profileForm.timezone,
                    },
                }),
            })

            const payload = (await response.json()) as { ok: boolean; message?: string }
            if (!response.ok || !payload.ok) {
                throw new Error(payload.message || "Không thể cập nhật hồ sơ.")
            }

            await Promise.all([refresh(), refreshSession()])
            setIsProfileDialogOpen(false)
            toast({
                title: "Cập nhật hồ sơ thành công",
                description: "Thông tin tài khoản của bạn đã được lưu.",
            })
        } catch (error) {
            toast({
                title: "Không thể cập nhật hồ sơ",
                description: error instanceof Error ? error.message : "Server từ chối thao tác này.",
                variant: "destructive",
            })
        } finally {
            setIsProfileSubmitting(false)
        }
    }

    useEffect(() => {
        void loadApprovalRequests()
    }, [isAdminUser, user?.id])

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold tracking-tight text-orange-500">Face Wash Fox</h1>
                </div>

                <nav className="flex-1 px-4">
                    {sidebarItems.map((item) => {
                        const isActive =
                            item.path === "/"
                                ? pathname === "/" && !selectedProjectId
                                : pathname === item.path

                        return (
                        <button
                            key={item.name}
                            onClick={() => router.push(item.path as Parameters<typeof router.push>[0])}
                            className={`w-full flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-lg transition-colors ${isActive
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                        >
                            <item.icon className="w-4 h-4 mr-3" />
                            {item.name}
                        </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Teams</span>
                            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white dark:bg-gray-800">
                                    <DialogHeader>
                                        <DialogTitle className="text-gray-900 dark:text-white">Add New Team</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="project-name" className="text-gray-700 dark:text-gray-300">
                                                Team Name
                                            </Label>
                                            <Input
                                                id="project-name"
                                                value={newProjectName}
                                                onChange={(e) => setNewProjectName(e.target.value)}
                                                placeholder="Enter team name"
                                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-700 dark:text-gray-300">Team Color</Label>
                                            <div className="flex space-x-2 mt-2">
                                                {colorOptions.map((color) => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => setNewProjectColor(color.value)}
                                                        className={`w-8 h-8 rounded-full ${color.value} border-2 ${newProjectColor === color.value
                                                            ? "border-gray-800 dark:border-gray-200"
                                                            : "border-gray-300 dark:border-gray-600"
                                                            }`}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-gray-700 dark:text-gray-300">Team Members</Label>
                                            <div className="mt-3 space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                                                {currentTeamPeople.map((person) => {
                                                    const isChecked =
                                                        person.id === currentUser.id || newProjectMemberIds.includes(person.id)

                                                    return (
                                                        <label
                                                            key={person.id}
                                                            className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    disabled={person.id === currentUser.id}
                                                                    onCheckedChange={(checked) => {
                                                                        if (person.id === currentUser.id) {
                                                                            return
                                                                        }

                                                                        setNewProjectMemberIds((prev) =>
                                                                            checked
                                                                                ? [...prev, person.id]
                                                                                : prev.filter((memberId) => memberId !== person.id),
                                                                        )
                                                                    }}
                                                                />
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                                                    <AvatarFallback>
                                                                        {person.name
                                                                            .split(" ")
                                                                            .map((part) => part[0])
                                                                            .join("")}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{person.name}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{person.role}</p>
                                                                </div>
                                                            </div>
                                                            {person.id === currentUser.id && <Badge variant="secondary">Owner</Badge>}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleAddProject} loading={isProjectSubmitting}>
                                                {isProjectSubmitting ? "Creating..." : "Create Team"}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        {visibleProjects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => router.push(`/?projectId=${project.id}`)}
                                className={`w-full flex items-center mb-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                    pathname === "/" && selectedProjectId === project.id
                                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${project.color} mr-2`} />
                                <span className="text-sm">{project.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <Settings className="w-4 h-4 mr-3" />
                            Settings
                        </button>
                        <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <HelpCircle className="w-4 h-4 mr-3" />
                            Help & Support
                            <Badge
                                variant="secondary"
                                className="ml-auto bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                            >
                                8
                            </Badge>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{todayLabel}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-r-none"
                                    onClick={() => setIsProjectDialogOpen(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Team
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-l-none border-l border-blue-500 dark:border-blue-600 px-2">
                                            <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                    >
                                        <DropdownMenuItem className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <Folder className="w-4 h-4 mr-2" />
                                            New Folder
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <Template className="w-4 h-4 mr-2" />
                                            From Template
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <Import className="w-4 h-4 mr-2" />
                                            Import Team
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <ThemeToggle />

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="w-4 h-4" />
                                        {(approvalRequests.length > 0 || notifications.some((item) => item.unread)) && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                    align="end"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                            <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300">
                                                Mark all as read
                                            </Button>
                                        </div>
                                        <Separator className="bg-gray-200 dark:bg-gray-700" />
                                        <div className="space-y-3 max-h-80 overflow-y-auto">
                                            {approvalRequests.map((request) => (
                                                <div
                                                    key={request.id}
                                                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-900/20"
                                                >
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        Yêu cầu duyệt {request.role.toUpperCase()}
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                        {request.name} · {request.email}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        {request.department}
                                                    </p>
                                                    <div className="mt-3 flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            loading={approvalActionKey === `approve:${request.id}`}
                                                            onClick={() => void handleApprovalAction(request.id, "approve")}
                                                        >
                                                            Duyệt
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            loading={approvalActionKey === `reject:${request.id}`}
                                                            onClick={() => void handleApprovalAction(request.id, "reject")}
                                                        >
                                                            Từ chối
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-3 rounded-lg ${notification.unread ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-700"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{notification.time}</p>
                                                        </div>
                                                        {notification.unread && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Avatar className="w-8 h-8 cursor-pointer">
                                        <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {currentUser.name
                                                .split(" ")
                                                .map((n: string) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                    align="end"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                                                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                                                    {currentUser.name
                                                        .split(" ")
                                                        .map((n: string) => n[0])
                                                        .join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">{currentUser.email}</p>
                                            </div>
                                        </div>
                                        <Separator className="bg-gray-200 dark:bg-gray-700" />
                                        <div className="space-y-2">
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={openProfileDialog}
                                            >
                                                <User className="w-4 h-4 mr-2" />
                                                Profile Settings
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <Settings className="w-4 h-4 mr-2" />
                                                Account Settings
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <HelpCircle className="w-4 h-4 mr-2" />
                                                Help & Support
                                            </Button>
                                        </div>
                                        <Separator className="bg-gray-200 dark:bg-gray-700" />
                                        <Button
                                            variant="ghost"
                                            loading={isSigningOut}
                                            className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={handleSignOut}
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Sign Out
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">{children}</div>
            </div>

            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent className="sm:max-w-xl bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">Profile Settings</DialogTitle>
                        <DialogDescription>
                            Bạn có thể tự cập nhật thông tin tài khoản cá nhân tại đây.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="profile-name">Họ và tên</Label>
                            <Input id="profile-name" value={profileForm.name} onChange={(event) => updateProfileForm("name", event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="profile-email">Email</Label>
                            <Input id="profile-email" type="email" value={profileForm.email} onChange={(event) => updateProfileForm("email", event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="profile-image">Avatar URL</Label>
                            <Input id="profile-image" value={profileForm.imageURL} onChange={(event) => updateProfileForm("imageURL", event.target.value)} placeholder="https://..." />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Role</Label>
                                <Input value={currentUser.role} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>Team</Label>
                                <Input value={getTeamById(currentUser.team, teams)?.name ?? currentUser.team} disabled />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="profile-start">Bắt đầu</Label>
                                <Input id="profile-start" value={profileForm.start} onChange={(event) => updateProfileForm("start", event.target.value)} placeholder="09:00" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="profile-end">Kết thúc</Label>
                                <Input id="profile-end" value={profileForm.end} onChange={(event) => updateProfileForm("end", event.target.value)} placeholder="17:00" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="profile-timezone">Timezone</Label>
                                <Input id="profile-timezone" value={profileForm.timezone} onChange={(event) => updateProfileForm("timezone", event.target.value)} placeholder="UTC+7" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} disabled={isProfileSubmitting}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveProfile} loading={isProfileSubmitting} disabled={isProfileSubmitting}>
                            {isProfileSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
