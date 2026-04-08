"use client"

import { useEffect, useMemo, useState } from "react"
import { Pie, PieChart, Cell } from "recharts"
import { CalendarDays, ChevronDown, Search } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useDirectory } from "@/components/directory-provider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspace, type TimePeriod } from "@/components/workspace-context"
import { findPersonForAuthUser, getTeamById } from "@/lib/people"

type ViewMode = "employee" | "project"
type PeriodFilter = "all" | TimePeriod

const STATUS_META = {
    pending: {
        label: "Chờ thực hiện",
        color: "#6b7280",
        tailwind: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    },
    inProgress: {
        label: "Đang thực hiện",
        color: "#2596f3",
        tailwind: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    },
    completed: {
        label: "Hoàn thành",
        color: "#2fb36c",
        tailwind: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    },
    failed: {
        label: "Không hoàn thành",
        color: "#ef4444",
        tailwind: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
    },
} as const

const chartConfig = {
    pending: { label: STATUS_META.pending.label, color: STATUS_META.pending.color },
    inProgress: { label: STATUS_META.inProgress.label, color: STATUS_META.inProgress.color },
    completed: { label: STATUS_META.completed.label, color: STATUS_META.completed.color },
    failed: { label: STATUS_META.failed.label, color: STATUS_META.failed.color },
}

function getProgressLabel(progress: number) {
    if (progress <= 20) {
        return "Cần xem lại"
    }

    if (progress <= 50) {
        return "Ổn định"
    }

    if (progress <= 80) {
        return "Tốt"
    }

    return "Tuyệt vời"
}

function getProgressMeta(progress: number) {
    if (progress <= 20) {
        return {
            label: "Cần xem lại",
            percentageClass: "text-red-600 dark:text-red-300",
            barClass: "bg-red-500",
        }
    }

    if (progress <= 50) {
        return {
            label: "Ổn định",
            percentageClass: "text-amber-600 dark:text-amber-300",
            barClass: "bg-amber-400",
        }
    }

    if (progress <= 80) {
        return {
            label: "Tốt",
            percentageClass: "text-blue-600 dark:text-blue-300",
            barClass: "bg-blue-500",
        }
    }

    return {
        label: "Tuyệt vời",
        percentageClass: "text-green-600 dark:text-green-300",
        barClass: "bg-green-500",
    }
}

export default function DashboardPage() {
    const { user } = useAuth()
    const { people, teams } = useDirectory()
    const { currentUserId, projects, projectTasks } = useWorkspace()
    const [viewMode, setViewMode] = useState<ViewMode>("employee")
    const [selectedEntityId, setSelectedEntityId] = useState<string>("all")
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const currentUser =
        findPersonForAuthUser(user, people) ??
        people.find((person) => person.id === currentUserId) ?? {
            id: user?.id ?? "guest-user",
            name: user?.name ?? "Guest User",
            role: user?.role === "admin" ? "Admin" : "Member",
            email: user?.email ?? "",
            imageURL: "/placeholder.svg",
            workingHours: { start: "09:00", end: "17:00", timezone: "UTC" },
            team: user?.role === "admin" ? "all" : "product",
        }
    const canViewAllData =
        user?.role === "admin" ||
        user?.role === "leader" ||
        currentUser.role.toLowerCase() === "leader"
    const accessibleMemberIds = useMemo(
        () =>
            canViewAllData
                ? user?.role === "admin"
                    ? people.map((person) => person.id)
                    : people.filter((person) => person.team === currentUser.team).map((person) => person.id)
                : [currentUserId],
        [canViewAllData, currentUser.team, currentUserId, people, user?.role],
    )
    const scopedProjects = useMemo(() => {
        const projectIds = new Set(
            Object.entries(projectTasks).flatMap(([projectId, taskGroups]) => {
                const hasAccessibleTask = (Object.values(taskGroups) as typeof taskGroups[TimePeriod][])
                    .flat()
                    .some((task) => accessibleMemberIds.includes(task.assigneeId))

                return hasAccessibleTask ? [projectId] : []
            }),
        )

        return projects.filter((project) => projectIds.has(project.id))
    }, [accessibleMemberIds, projectTasks, projects])

    const flattenedTasks = useMemo(() => {
        return Object.entries(projectTasks).flatMap(([projectId, taskGroups]) =>
            (Object.entries(taskGroups) as [TimePeriod, typeof taskGroups[TimePeriod]][]).flatMap(
                ([period, tasks]) =>
                    tasks.map((task) => ({
                        ...task,
                        timePeriod: period,
                    })),
            ),
        )
    }, [projectTasks])
    const scopedTasks = useMemo(
        () => flattenedTasks.filter((task) => accessibleMemberIds.includes(task.assigneeId)),
        [accessibleMemberIds, flattenedTasks],
    )

    const employeeOptions = useMemo(() => {
        const assigneeIds = Array.from(new Set(scopedTasks.map((task) => task.assigneeId)))
        return assigneeIds
            .map((assigneeId) => people.find((person) => person.id === assigneeId))
            .filter(Boolean)
    }, [scopedTasks])

    useEffect(() => {
        setSelectedEntityId("all")
    }, [viewMode])

    const filteredTasks = useMemo(() => {
        return scopedTasks.filter((task) => {
            if (selectedEntityId !== "all") {
                if (viewMode === "employee" && task.assigneeId !== selectedEntityId) {
                    return false
                }

                if (viewMode === "project" && task.projectId !== selectedEntityId) {
                    return false
                }
            }

            if (selectedPeriod !== "all" && task.timePeriod !== selectedPeriod) {
                return false
            }

            const searchValue = searchQuery.trim().toLowerCase()
            if (!searchValue) {
                return true
            }

            const person = people.find((item) => item.id === task.assigneeId)
            const project = scopedProjects.find((item) => item.id === task.projectId)

            return [
                task.name,
                task.description,
                person?.name,
                project?.name,
            ]
                .filter(Boolean)
                .some((value) => value?.toLowerCase().includes(searchValue))
        })
    }, [scopedProjects, scopedTasks, searchQuery, selectedEntityId, selectedPeriod, viewMode])

    const statusBuckets = useMemo(() => {
        return filteredTasks.reduce(
            (acc, task) => {
                if (task.status === "Completed") {
                    acc.completed += 1
                } else if (task.status === "In Progress") {
                    acc.inProgress += 1
                } else if (task.timePeriod === "Last Week") {
                    acc.failed += 1
                } else {
                    acc.pending += 1
                }

                return acc
            },
            { pending: 0, inProgress: 0, completed: 0, failed: 0 },
        )
    }, [filteredTasks])

    const chartData = useMemo(
        () =>
            Object.entries(statusBuckets).map(([key, value]) => ({
                key,
                value,
                fill: chartConfig[key as keyof typeof chartConfig].color,
                label: chartConfig[key as keyof typeof chartConfig].label,
            })),
        [statusBuckets],
    )

    const totalTasks = filteredTasks.length

    const tableRows = useMemo(() => {
        if (viewMode === "employee") {
            const grouped = filteredTasks.reduce<Record<string, typeof filteredTasks>>((acc, task) => {
                if (!acc[task.assigneeId]) {
                    acc[task.assigneeId] = []
                }
                acc[task.assigneeId].push(task)
                return acc
            }, {})

            return Object.entries(grouped).map(([assigneeId, tasks]) => {
                const person = people.find((item) => item.id === assigneeId)
                const team = person ? getTeamById(person.team, teams) : undefined

                return {
                    key: assigneeId,
                    title: person?.name || "Unknown",
                    subtitle: team?.name || "-",
                    pending: tasks.filter((task) => task.status === "Pending" && task.timePeriod !== "Last Week").length,
                    inProgress: tasks.filter((task) => task.status === "In Progress").length,
                    completed: tasks.filter((task) => task.status === "Completed").length,
                    failed: tasks.filter((task) => task.status === "Pending" && task.timePeriod === "Last Week").length,
                    progress: tasks.length === 0 ? 0 : Math.round(tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) / tasks.length),
                    total: tasks.length,
                }
            })
        }

        const grouped = filteredTasks.reduce<Record<string, typeof filteredTasks>>((acc, task) => {
            if (!acc[task.projectId]) {
                acc[task.projectId] = []
            }
            acc[task.projectId].push(task)
            return acc
        }, {})

        return Object.entries(grouped).map(([projectId, tasks]) => {
            const project = scopedProjects.find((item) => item.id === projectId)

            return {
                key: projectId,
                title: project?.name || "Unknown Project",
                subtitle: tasks[0]?.executionPeriod || "-",
                pending: tasks.filter((task) => task.status === "Pending" && task.timePeriod !== "Last Week").length,
                inProgress: tasks.filter((task) => task.status === "In Progress").length,
                completed: tasks.filter((task) => task.status === "Completed").length,
                failed: tasks.filter((task) => task.status === "Pending" && task.timePeriod === "Last Week").length,
                progress: tasks.length === 0 ? 0 : Math.round(tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) / tasks.length),
                total: tasks.length,
            }
        })
    }, [filteredTasks, scopedProjects, viewMode])

    const totalsRow = useMemo(
        () => ({
            pending: tableRows.reduce((sum, row) => sum + row.pending, 0),
            inProgress: tableRows.reduce((sum, row) => sum + row.inProgress, 0),
            completed: tableRows.reduce((sum, row) => sum + row.completed, 0),
            failed: tableRows.reduce((sum, row) => sum + row.failed, 0),
            progress: tableRows.length === 0 ? 0 : Math.round(tableRows.reduce((sum, row) => sum + row.progress, 0) / tableRows.length),
            total: tableRows.reduce((sum, row) => sum + row.total, 0),
        }),
        [tableRows],
    )

    return (
        <div className="min-h-full bg-gray-100/80 p-6 dark:bg-gray-950">
            <div className="mx-auto max-w-7xl space-y-5">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Báo cáo tình hình thực hiện mục tiêu/chỉ tiêu
                    </h1>
                </div>

                <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Xem theo</span>
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                        type="radio"
                                        checked={viewMode === "project"}
                                        onChange={() => setViewMode("project")}
                                    />
                                    Dự án
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                        type="radio"
                                        checked={viewMode === "employee"}
                                        onChange={() => setViewMode("employee")}
                                    />
                                    Nhân viên
                                </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {viewMode === "employee" ? "Nhân viên" : "Mục tiêu/Chỉ tiêu"}
                                </span>
                                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                                    <SelectTrigger className="w-[190px] bg-white dark:bg-gray-900">
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        {viewMode === "employee"
                                            ? employeeOptions.map((person) => (
                                                  <SelectItem key={person!.id} value={person!.id}>
                                                      {person!.name}
                                                  </SelectItem>
                                              ))
                                            : scopedProjects.map((project) => (
                                                  <SelectItem key={project.id} value={project.id}>
                                                      {project.name}
                                                  </SelectItem>
                                              ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full min-w-[220px] flex-1 sm:w-[280px]">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Tìm kiếm"
                                    className="pl-9"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kỳ thực hiện</span>
                                <Select value={selectedPeriod} onValueChange={(value: PeriodFilter) => setSelectedPeriod(value)}>
                                    <SelectTrigger className="w-[170px] bg-white dark:bg-gray-900">
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="This Week">Tuần này</SelectItem>
                                        <SelectItem value="Last Week">Tuần trước</SelectItem>
                                        <SelectItem value="This Month">Tháng này</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                <CalendarDays className="h-4 w-4" />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
                    <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl text-gray-900 dark:text-white">
                                Biểu đồ báo cáo tình hình thực hiện mục tiêu theo {viewMode === "employee" ? "nhân viên" : "dự án"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex h-[90%] justify-center ">
                            <div className=" flex h-full justify-center grid gap-8 xl:grid-cols-[0.7fr_1.3fr] xl:items-center">
                                <div className="flex items-center justify-center">
                                    <ChartContainer
                                        config={chartConfig}
                                        className="mx-auto h-[220px] w-full max-w-[280px]"
                                    >
                                        <PieChart>
                                            <ChartTooltip content={(props) => <ChartTooltipContent {...(props as any)} hideLabel />} />
                                            <Pie
                                                data={chartData}
                                                dataKey="value"
                                                nameKey="label"
                                                innerRadius={52}
                                                outerRadius={74}
                                                strokeWidth={0}
                                            >
                                                {chartData.map((entry) => (
                                                    <Cell key={entry.key} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <text
                                                x="50%"
                                                y="50%"
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="fill-gray-900 dark:fill-white"
                                            >
                                                <tspan x="50%" dy="-0.4em" className="text-sm font-medium fill-gray-500 dark:fill-gray-400">
                                                    Tổng
                                                </tspan>
                                                <tspan x="50%" dy="1.2em" className="text-xl font-bold">
                                                    {totalTasks}
                                                </tspan>
                                            </text>
                                        </PieChart>
                                    </ChartContainer>
                                </div>

                                <div className=" flex justify-center items-center grid gap-4 sm:grid-cols-2">
                                    {chartData.map((item) => {
                                        const percentage = totalTasks === 0 ? 0 : Math.round((item.value / totalTasks) * 100)

                                        return (
                                            <div
                                                key={item.key}
                                                className=" min-h-[96px] items-center justify-center justify-between gap-4 rounded-xl border border-gray-200 px-5 py-4 dark:border-gray-800"
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <span
                                                        className="h-3 w-3 shrink-0 rounded-full"
                                                        style={{ backgroundColor: item.fill }}
                                                    />
                                                    <span className="text-[14px] font-semibold leading-7 text-gray-700 dark:text-gray-200 text-100">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-base font-semibold text-[14px]"
                                                >
                                                    {item.value} task · {percentage}%
                                                </Badge>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl text-gray-900 dark:text-white">
                                Tổng quan cập nhật
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số dự án</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{scopedProjects.length}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Task đang lọc</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Nhân viên tham gia</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                                    {new Set(filteredTasks.map((task) => task.assigneeId)).size}
                                </p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tỷ lệ hoàn thành</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                                    {tableRows.length === 0 ? 0 : totalsRow.progress}%
                                </p>
                                <div className="mt-3">
                                    <Progress value={tableRows.length === 0 ? 0 : totalsRow.progress} className="h-2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-xl text-gray-900 dark:text-white">
                                Bảng báo cáo chi tiết
                            </CardTitle>
                            <button className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                                {selectedPeriod === "all" ? "Tất cả kỳ" : selectedPeriod}
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                                        <tr className="text-left text-gray-600 dark:text-gray-300">
                                            <th className="px-5 py-4 font-semibold">
                                                {viewMode === "employee" ? "Nhân viên" : "Dự án"}
                                            </th>
                                            <th className="px-5 py-4 font-semibold">
                                                {viewMode === "employee" ? "Vị trí công việc" : "Kỳ gần nhất"}
                                            </th>
                                            <th className="px-5 py-4 font-semibold">Chờ thực hiện</th>
                                            <th className="px-5 py-4 font-semibold">Đang thực hiện</th>
                                            <th className="px-5 py-4 font-semibold">Hoàn thành</th>
                                            <th className="px-5 py-4 font-semibold">Không hoàn thành</th>
                                            <th className="px-5 py-4 font-semibold">Tiến độ</th>
                                            <th className="px-5 py-4 font-semibold">Tổng số</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        <tr className="bg-blue-50/70 dark:bg-blue-950/20">
                                            <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">Tổng</td>
                                            <td className="px-5 py-4 text-gray-500 dark:text-gray-400">-</td>
                                            <td className="px-5 py-4 text-gray-700 dark:text-gray-200">{totalsRow.pending}</td>
                                            <td className="px-5 py-4 text-blue-600 dark:text-blue-300">{totalsRow.inProgress}</td>
                                            <td className="px-5 py-4 text-green-600 dark:text-green-300">{totalsRow.completed}</td>
                                            <td className="px-5 py-4 text-red-600 dark:text-red-300">{totalsRow.failed}</td>
                                            <td className="px-5 py-4">
                                                <div className="min-w-[160px] space-y-2">
                                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                        <span>Trung bình</span>
                                                        <span className={getProgressMeta(totalsRow.progress).percentageClass}>{totalsRow.progress}%</span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${getProgressMeta(totalsRow.progress).barClass}`}
                                                            style={{ width: `${Math.max(0, Math.min(100, totalsRow.progress))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{totalsRow.total}</td>
                                        </tr>

                                        {tableRows.map((row) => (
                                            <tr key={row.key} className="bg-white dark:bg-gray-900">
                                                <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                                                    {row.title}
                                                </td>
                                                <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                                                    {row.subtitle}
                                                </td>
                                                <td className="px-5 py-4 text-gray-700 dark:text-gray-200">{row.pending}</td>
                                                <td className="px-5 py-4 text-blue-600 dark:text-blue-300">{row.inProgress}</td>
                                                <td className="px-5 py-4 text-green-600 dark:text-green-300">{row.completed}</td>
                                                <td className="px-5 py-4 text-red-600 dark:text-red-300">{row.failed}</td>
                                                <td className="px-5 py-4">
                                                    <div className="min-w-[160px] space-y-2">
                                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                            <span>{getProgressMeta(row.progress).label}</span>
                                                            <span className={getProgressMeta(row.progress).percentageClass}>{row.progress}%</span>
                                                        </div>
                                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${getProgressMeta(row.progress).barClass}`}
                                                                style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{row.total}</td>
                                            </tr>
                                        ))}

                                        {tableRows.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                                >
                                                    Không có dữ liệu phù hợp với bộ lọc hiện tại.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
