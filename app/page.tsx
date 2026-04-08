"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import NotesSection from "@/components/notes-section"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { useDirectory } from "@/components/directory-provider"
import { type NewTaskInput, type Task, type TimePeriod, useWorkspace } from "@/components/workspace-context"
import { findPersonForAuthUser, getTeamById } from "@/lib/people"
import {
    Share,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    BarChart3,
    Calendar,
    MessageSquare,
    Plus,
    MoreHorizontal,
    Edit3,
    Users,
    Zap,
    Paperclip,
    FileText,
    X,
    Copy,
    Link2,
    Trash2,
} from "lucide-react"

interface Note {
    id: string
    title: string
    description: string
    completed: boolean
}

interface ScheduleItem {
    title: string
    time: string
    attendeeIds: string[]
}

type SharePermission = "Can view" | "Can comment" | "Can edit"

interface SharedMember {
    personId: string
    permission: SharePermission
}

const TASK_STATUS_OPTIONS = {
    Pending: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    "In Progress": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
} as const

export default function MyTaskPage() {
    const vietnamNow = useMemo(() => {
        const now = new Date()
        return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    }, [])
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const { people, teams } = useDirectory()
    const { currentUserId, projectTasks, projects, addTask, updateTask, updateTaskAssignee } = useWorkspace()
    const [notes, setNotes] = useState<Note[]>([
        {
            id: "1",
            title: "Landing Page For Website",
            description: "To get started on a landing page, could you provide a bit more detail about its purpose?",
            completed: false,
        },
        {
            id: "2",
            title: "Fixing icons with dark backgrounds",
            description:
                "Use icons that are easily recognizable and straightforward. Avoid overly complex designs that might confuse users",
            completed: false,
        },
        {
            id: "3",
            title: "Discussion regarding userflow improvement",
            description: "What's the main goal of the landing page? (e.g., lead generation, product)",
            completed: true,
        },
    ])

    const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>("This Week")
    const [selectedDate, setSelectedDate] = useState(17)
    const [currentWeekStart, setCurrentWeekStart] = useState(15)
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
    const [isTeamTasksOpen, setIsTeamTasksOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [taskDraft, setTaskDraft] = useState<Task | null>(null)
    const [shareSearchQuery, setShareSearchQuery] = useState("")
    const [sharePermission, setSharePermission] = useState<SharePermission>("Can view")
    const [generalAccess, setGeneralAccess] = useState<"Restricted" | "Team" | "Anyone with link">("Restricted")
    const [sharedMembers, setSharedMembers] = useState<SharedMember[]>([
        { personId: "people_1", permission: "Can edit" },
        { personId: "people_4", permission: "Can comment" },
    ])
    const [shareFeedback, setShareFeedback] = useState("")

    const [scheduleData, setScheduleData] = useState<Record<number, ScheduleItem[]>>({
        15: [
            {
                title: "Team Standup",
                time: "09:00 AM to 09:30 AM",
                attendeeIds: ["people_0", "people_1"],
            },
        ],
        16: [
            {
                title: "Client Review Meeting",
                time: "02:00 PM to 03:00 PM",
                attendeeIds: ["people_2", "people_3"],
            },
        ],
        17: [
            {
                title: "Kickoff Meeting",
                time: "01:00 PM to 02:30 PM",
                attendeeIds: ["people_4", "people_5"],
            },
            {
                title: "Create Wordpress website for event Registration",
                time: "04:00 PM to 02:30 PM",
                attendeeIds: ["people_6", "people_7"],
            },
            {
                title: "Create User flow for hotel booking",
                time: "05:00 PM to 02:30 PM",
                attendeeIds: ["people_8", "people_9"],
            },
        ],
        18: [
            {
                title: "Design Review",
                time: "10:00 AM to 11:00 AM",
                attendeeIds: ["people_10"],
            },
        ],
        19: [
            {
                title: "Sprint Planning",
                time: "03:00 PM to 04:30 PM",
                attendeeIds: ["people_11", "people_12", "people_13"],
            },
        ],
        20: [
            {
                title: "Weekly Demo",
                time: "11:00 AM to 12:00 PM",
                attendeeIds: ["people_14", "people_15"],
            },
        ],
        21: [],
    })

    const handleAddNote = (note: Omit<Note, "id">) => {
        const newNote = {
            ...note,
            id: Date.now().toString(),
        }
        setNotes([...notes, newNote])
    }

    const handleUpdateNote = (id: string, updates: Partial<Note>) => {
        setNotes(notes.map((note) => (note.id === id ? { ...note, ...updates } : note)))
    }

    const handleDeleteNote = (id: string) => {
        setNotes(notes.filter((note) => note.id !== id))
    }

    const handleChangeAssignee = async (taskId: number, newAssigneeId: string) => {
        await updateTaskAssignee(taskId, newAssigneeId, selectedProjectId ?? undefined)
    }

    const handleChangeStatus = async (taskId: number, newStatus: keyof typeof TASK_STATUS_OPTIONS, projectId?: string) => {
        await updateTask(
            taskId,
            {
                status: newStatus,
                statusColor: TASK_STATUS_OPTIONS[newStatus],
            },
            projectId ?? selectedProjectId ?? undefined,
        )

        if (selectedTask?.id === taskId && taskDraft) {
            const nextTask = {
                ...taskDraft,
                status: newStatus,
                statusColor: TASK_STATUS_OPTIONS[newStatus],
            }
            setSelectedTask(nextTask)
            setTaskDraft(nextTask)
        }
    }

    const handleChangeScheduleAttendees = (date: number, itemIndex: number, newAttendeeIds: string[]) => {
        setScheduleData((prevData) => ({
            ...prevData,
            [date]: prevData[date].map((item, index) =>
                index === itemIndex ? { ...item, attendeeIds: newAttendeeIds } : item,
            ),
        }))
    }

    const getCurrentWeekDays = () => {
        const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
        return days.map((day, index) => ({
            day,
            date: currentWeekStart + index,
        }))
    }

    const navigateWeek = (direction: "prev" | "next") => {
        setCurrentWeekStart((prev) => (direction === "next" ? prev + 7 : prev - 7))
    }

    const selectedProjectId = searchParams.get("projectId")
    const selectedProject = projects.find((project) => project.id === selectedProjectId)
    const defaultProjectId = selectedProjectId ?? projects[0]?.id ?? ""
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
    const currentTeam = getTeamById(currentUser.team, teams)
    const currentTeamPeople = useMemo(
        () =>
            user?.role === "admin"
                ? people
                : people.filter((person) => person.team === currentUser.team),
        [currentUser.team, people, user?.role],
    )
    const currentTeamMemberIds = useMemo(() => currentTeamPeople.map((person) => person.id), [currentTeamPeople])
    const canManageAllTasks =
        user?.role === "admin" ||
        user?.role === "leader" ||
        currentUser.role.toLowerCase() === "leader"
    const greetingLabel = `${user?.role === "admin" ? "Admin" : currentTeam?.name ?? "Team"} · ${currentUser.name}`
    const greetingText = useMemo(() => {
        const hour = vietnamNow.getHours()

        if (hour < 12) {
            return "Good Morning!"
        }

        if (hour < 18) {
            return "Good Afternoon!"
        }

        return "Good Evening!"
    }, [vietnamNow])
    const todayLabel = useMemo(
        () =>
            new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Ho_Chi_Minh",
                weekday: "long",
                day: "numeric",
                month: "long",
            }).format(vietnamNow),
        [vietnamNow],
    )
    const [newTaskForm, setNewTaskForm] = useState<NewTaskInput>({
        projectId: defaultProjectId,
        timePeriod: "This Week",
        name: "",
        assigneeId: currentUserId,
        status: "Pending",
        executionPeriod: "Week 1 (01/03 - 07/03/2026)",
        audience: "Personal",
        weight: "20%",
        resultMethod: "Manual Entry",
        target: "",
        progress: 0,
        kpis: [],
        childGoal: "",
        parentGoal: "",
        description: "",
        attachments: [],
    })

    const updateNewTaskForm = <K extends keyof NewTaskInput>(key: K, value: NewTaskInput[K]) => {
        setNewTaskForm((prev) => ({ ...prev, [key]: value }))
    }

    const currentTasks = useMemo(() => {
        if (selectedProjectId && projectTasks[selectedProjectId]) {
            return projectTasks[selectedProjectId][selectedTimePeriod].filter(
                (task) => task.assigneeId === currentUserId,
            )
        }

        return Object.values(projectTasks)
            .flatMap((taskGroups) => taskGroups[selectedTimePeriod])
            .filter((task) => task.assigneeId === currentUserId)
    }, [currentUserId, projectTasks, selectedProjectId, selectedTimePeriod])
    const teamTasks = useMemo(() => {
        if (!canManageAllTasks) {
            return []
        }

        if (selectedProjectId && projectTasks[selectedProjectId]) {
            return projectTasks[selectedProjectId][selectedTimePeriod].filter(
                (task) => currentTeamMemberIds.includes(task.assigneeId) && task.assigneeId !== currentUserId,
            )
        }

        return Object.values(projectTasks)
            .flatMap((taskGroups) => taskGroups[selectedTimePeriod])
            .filter((task) => currentTeamMemberIds.includes(task.assigneeId) && task.assigneeId !== currentUserId)
    }, [canManageAllTasks, currentTeamMemberIds, currentUserId, projectTasks, selectedProjectId, selectedTimePeriod])

    const currentScheduleItems = scheduleData[selectedDate] || []
    const selectedTaskAssignee = taskDraft ? people.find((person) => person.id === taskDraft.assigneeId) : null
    const selectedTaskProject = selectedTask ? projects.find((project) => project.id === selectedTask.projectId) : null
    const taskDetailAssignees = canManageAllTasks ? currentTeamPeople : [currentUser]
    const shareLink = useMemo(() => {
        const projectPath = selectedProjectId ? `/?projectId=${selectedProjectId}` : "/"

        if (typeof window === "undefined") {
            return projectPath
        }

        return new URL(projectPath, window.location.origin).toString()
    }, [selectedProjectId])
    const shareablePeople = useMemo(() => {
        const searchValue = shareSearchQuery.trim().toLowerCase()

        return people.filter((person) => {
            if (person.id === currentUserId) {
                return false
            }

            if (!searchValue) {
                return true
            }

            return [person.name, person.email].some((value) => value.toLowerCase().includes(searchValue))
        })
    }, [currentUserId, shareSearchQuery])

    const handleOpenAddTask = () => {
        setNewTaskForm({
            projectId: selectedProjectId ?? projects[0]?.id ?? "",
            timePeriod: selectedTimePeriod,
            name: "",
            assigneeId: currentUserId,
            status: "Pending",
            executionPeriod: "Week 1 (01/03 - 07/03/2026)",
            audience: "Personal",
            weight: "20%",
            resultMethod: "Manual Entry",
            target: "",
            progress: 0,
            kpis: [],
            childGoal: "",
            parentGoal: "",
            description: "",
            attachments: [],
        })
        setIsAddTaskOpen(true)
    }

    const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? [])

        updateNewTaskForm(
            "attachments",
            files.map((file) => ({
                id: `${file.name}-${file.size}-${file.lastModified}`,
                name: file.name,
                size: file.size,
                type: file.type,
            })),
        )
    }

    const handleRemoveAttachment = (attachmentId: string) => {
        updateNewTaskForm(
            "attachments",
            newTaskForm.attachments.filter((attachment) => attachment.id !== attachmentId),
        )
    }

    const handleSubmitTask = async () => {
        if (!newTaskForm.name.trim() || !newTaskForm.projectId) {
            return
        }

        const createdTask = await addTask({
            ...newTaskForm,
            name: newTaskForm.name.trim(),
            childGoal: newTaskForm.childGoal.trim(),
            parentGoal: newTaskForm.parentGoal.trim(),
            description: newTaskForm.description.trim(),
        })

        setIsAddTaskOpen(false)
        setSelectedTask(createdTask)
    }

    const handleOpenTask = (task: Task) => {
        setSelectedTask(task)
        setTaskDraft(task)
    }

    const updateTaskDraft = <K extends keyof Task>(key: K, value: Task[K]) => {
        setTaskDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    }

    const handleSubmitTaskUpdate = async () => {
        if (!selectedTask || !taskDraft) {
            return
        }

        const normalizedStatus = taskDraft.status as keyof typeof TASK_STATUS_OPTIONS
        const normalizedStatusColor = TASK_STATUS_OPTIONS[normalizedStatus] ?? TASK_STATUS_OPTIONS.Pending
        const normalizedTask = {
            ...taskDraft,
            name: taskDraft.name.trim(),
            executionPeriod: taskDraft.executionPeriod.trim(),
            audience: taskDraft.audience.trim(),
            weight: taskDraft.weight.trim(),
            resultMethod: taskDraft.resultMethod.trim(),
            target: (taskDraft.target ?? "").trim(),
            progress: Math.min(100, Math.max(0, Number(taskDraft.progress ?? 0))),
            childGoal: taskDraft.childGoal.trim(),
            parentGoal: taskDraft.parentGoal.trim(),
            description: taskDraft.description.trim(),
            kpis: taskDraft.kpis.map((kpi) => kpi.trim()).filter(Boolean),
            status: normalizedStatus,
            statusColor: normalizedStatusColor,
        }

        const updatedTask = await updateTask(
            selectedTask.id,
            {
                assigneeId: normalizedTask.assigneeId,
                name: normalizedTask.name,
                executionPeriod: normalizedTask.executionPeriod,
                audience: normalizedTask.audience,
                weight: normalizedTask.weight,
                resultMethod: normalizedTask.resultMethod,
                target: normalizedTask.target,
                progress: normalizedTask.progress,
                childGoal: normalizedTask.childGoal,
                parentGoal: normalizedTask.parentGoal,
                description: normalizedTask.description,
                kpis: normalizedTask.kpis,
                attachments: normalizedTask.attachments,
                status: normalizedTask.status,
                statusColor: normalizedTask.statusColor,
            },
            selectedTask.projectId,
        )

        if (!updatedTask) {
            return
        }

        setSelectedTask(updatedTask)
        setTaskDraft(updatedTask)
        toast({
            title: "Cập nhật thành công",
            description: "Nội dung task đã được cập nhật và đang chờ phản hồi từ leader.",
        })
    }

    const handleAddSharedMember = (personId: string) => {
        setSharedMembers((prev) => {
            const existingMember = prev.find((member) => member.personId === personId)

            if (existingMember) {
                return prev.map((member) =>
                    member.personId === personId ? { ...member, permission: sharePermission } : member,
                )
            }

            return [...prev, { personId, permission: sharePermission }]
        })
        setShareSearchQuery("")
        setShareFeedback("Access updated.")
    }

    const handleUpdateSharedMemberPermission = (personId: string, permission: SharePermission) => {
        setSharedMembers((prev) =>
            prev.map((member) => (member.personId === personId ? { ...member, permission } : member)),
        )
        setShareFeedback("Permission updated.")
    }

    const handleRemoveSharedMember = (personId: string) => {
        setSharedMembers((prev) => prev.filter((member) => member.personId !== personId))
        setShareFeedback("Member removed from share list.")
    }

    const handleCopyShareLink = async () => {
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareLink)
            } else if (typeof document !== "undefined") {
                const textArea = document.createElement("textarea")
                textArea.value = shareLink
                textArea.setAttribute("readonly", "true")
                textArea.style.position = "absolute"
                textArea.style.left = "-9999px"
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
            }

            setShareFeedback("Share link copied.")
        } catch {
            setShareFeedback("Unable to copy automatically. Copy the link manually.")
        }
    }

    return (
        <div className="p-6">
            {/* Welcome Section */}
            <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{todayLabel}</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {greetingText} {greetingLabel},
                </h2>

                <div className="flex items-center space-x-6 mb-6">
                    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent"
                            >
                                <Share className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800">
                            <DialogHeader>
                                <DialogTitle className="text-gray-900 dark:text-white">
                                    Share {selectedProject ? selectedProject.name : "workspace"}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-2">
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Share link</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Copy a direct link to this {selectedProject ? "project" : "workspace view"}.
                                            </p>
                                        </div>
                                        <Button type="button" variant="outline" onClick={handleCopyShareLink}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy link
                                        </Button>
                                    </div>
                                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                                        <Link2 className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                                        <p className="truncate text-sm text-gray-700 dark:text-gray-300">{shareLink}</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                                    <div className="space-y-2">
                                        <Label htmlFor="share-search">Invite people</Label>
                                        <Input
                                            id="share-search"
                                            value={shareSearchQuery}
                                            onChange={(event) => setShareSearchQuery(event.target.value)}
                                            placeholder="Search by name or email"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Permission</Label>
                                        <Select
                                            value={sharePermission}
                                            onValueChange={(value: SharePermission) => setSharePermission(value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Can view">Can view</SelectItem>
                                                <SelectItem value="Can comment">Can comment</SelectItem>
                                                <SelectItem value="Can edit">Can edit</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                                    {shareablePeople.map((person) => {
                                        const existingMember = sharedMembers.find((member) => member.personId === person.id)

                                        return (
                                            <div
                                                key={person.id}
                                                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                                        <AvatarFallback>
                                                            {person.name
                                                                .split(" ")
                                                                .map((part) => part[0])
                                                                .join("")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                            {person.name}
                                                        </p>
                                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                            {person.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant={existingMember ? "secondary" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleAddSharedMember(person.id)}
                                                >
                                                    {existingMember ? "Update access" : "Add"}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">General access</p>
                                        <div className="w-48">
                                            <Select
                                                value={generalAccess}
                                                onValueChange={(value: "Restricted" | "Team" | "Anyone with link") =>
                                                    setGeneralAccess(value)
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Restricted">Restricted</SelectItem>
                                                    <SelectItem value="Team">Team</SelectItem>
                                                    <SelectItem value="Anyone with link">Anyone with link</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {generalAccess === "Restricted" &&
                                            "Only people added below can open this view."}
                                        {generalAccess === "Team" &&
                                            "Anyone in your team can open this view with the link."}
                                        {generalAccess === "Anyone with link" &&
                                            "Anyone with the link can open this view."}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">People with access</p>
                                    <div className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                                        <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                                                    <AvatarFallback>
                                                        {currentUser.name
                                                            .split(" ")
                                                            .map((part: string) => part[0])
                                                            .join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary">Owner</Badge>
                                        </div>

                                        {sharedMembers.length > 0 ? (
                                            sharedMembers.map((member) => {
                                                const person = people.find((item) => item.id === member.personId)

                                                if (!person) {
                                                    return null
                                                }

                                                return (
                                                    <div
                                                        key={member.personId}
                                                        className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                                                <AvatarFallback>
                                                                    {person.name
                                                                        .split(" ")
                                                                        .map((part) => part[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                                    {person.name}
                                                                </p>
                                                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                                    {person.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-40">
                                                                <Select
                                                                    value={member.permission}
                                                                    onValueChange={(value: SharePermission) =>
                                                                        handleUpdateSharedMemberPermission(member.personId, value)
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Can view">Can view</SelectItem>
                                                                        <SelectItem value="Can comment">Can comment</SelectItem>
                                                                        <SelectItem value="Can edit">Can edit</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9"
                                                                onClick={() => handleRemoveSharedMember(member.personId)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                No collaborators added yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {shareFeedback && (
                                    <p className="text-sm text-green-600 dark:text-green-400">{shareFeedback}</p>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenAddTask}
                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-white dark:bg-gray-800">
                            <DialogHeader>
                                <DialogTitle className="text-gray-900 dark:text-white">Create New Task</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-6 py-2 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="task-name">Tên Task</Label>
                                    <Input
                                        id="task-name"
                                        value={newTaskForm.name}
                                        onChange={(event) => updateNewTaskForm("name", event.target.value)}
                                        placeholder="Enter task name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dự án</Label>
                                    <Select
                                        value={newTaskForm.projectId}
                                        onValueChange={(value) => updateNewTaskForm("projectId", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map((project) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Khoảng thời gian</Label>
                                    <Select
                                        value={newTaskForm.timePeriod}
                                        onValueChange={(value: TimePeriod) => updateNewTaskForm("timePeriod", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select time period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="This Week">Tuần này</SelectItem>
                                            <SelectItem value="Last Week">Tuần trước</SelectItem>
                                            <SelectItem value="This Month">Tháng này</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Người thực hiện</Label>
                                    <Select
                                        value={newTaskForm.assigneeId}
                                        onValueChange={(value) => updateNewTaskForm("assigneeId", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select assignee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentTeamPeople.map((person) => (
                                                <SelectItem key={person.id} value={person.id}>
                                                    {person.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Trạng thái</Label>
                                    <Select
                                        value={newTaskForm.status}
                                        onValueChange={(value: Task["status"]) => updateNewTaskForm("status", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pending">Đang chờ</SelectItem>
                                            <SelectItem value="In Progress">Đang thưc hiện</SelectItem>
                                            <SelectItem value="Completed">Hoàn thành</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="execution-period">Thời gian hết hạn</Label>
                                    <Input
                                        id="execution-period"
                                        value={newTaskForm.executionPeriod}
                                        onChange={(event) => updateNewTaskForm("executionPeriod", event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="audience">Đối tượng</Label>
                                    <Input
                                        id="audience"
                                        value={newTaskForm.audience}
                                        onChange={(event) => updateNewTaskForm("audience", event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Trọng số</Label>
                                    <Input
                                        id="weight"
                                        value={newTaskForm.weight}
                                        onChange={(event) => updateNewTaskForm("weight", event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="result-method">Cách tính kết quả</Label>
                                    <Input
                                        id="result-method"
                                        value={newTaskForm.resultMethod}
                                        onChange={(event) => updateNewTaskForm("resultMethod", event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="kpis">Thêm mục tiêu</Label>
                                    <Input
                                        id="kpis"
                                        value={newTaskForm.kpis.join(", ")}
                                        onChange={(event) =>
                                            updateNewTaskForm(
                                                "kpis",
                                                event.target.value
                                                    .split(",")
                                                    .map((item) => item.trim())
                                                    .filter(Boolean),
                                            )
                                        }
                                        placeholder="KPI 1, KPI 2"
                                    />
                                </div>
                               
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={newTaskForm.description}
                                        onChange={(event) => updateNewTaskForm("description", event.target.value)}
                                        placeholder="Describe the task details and expected result"
                                    />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                    <Label htmlFor="task-attachments">Tệp đính kèm</Label>
                                    <label
                                        htmlFor="task-attachments"
                                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-gray-800"
                                    >
                                        <Paperclip className="mb-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            Upload file cho task này
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Có thể chọn một hoặc nhiều file
                                        </span>
                                    </label>
                                    <Input
                                        id="task-attachments"
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleAttachmentChange}
                                    />
                                    {newTaskForm.attachments.length > 0 && (
                                        <div className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                                            {newTaskForm.attachments.map((attachment) => (
                                                <div
                                                    key={attachment.id}
                                                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <FileText className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                                {attachment.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {(attachment.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleRemoveAttachment(attachment.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitTask}>Create Task</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-8 mb-8">
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">12hrs</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Time Saved</span>
                    </div>
                    <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">24</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Projects Completed</span>
                    </div>
                    <div className="flex items-center">
                        <Zap className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">7</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Projects In-progress</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-y-6">
                {/* My Projects - Full Width */}
                <div className="lg:col-span-3">
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                                    <BarChart3 className="w-5 h-5 mr-2" />
                                    {selectedProject ? `${selectedProject.name} Tasks` : "My Tasks"}
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    {canManageAllTasks && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsTeamTasksOpen(true)}
                                            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent"
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Team&apos;s Tasks
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent"
                                            >
                                                {selectedTimePeriod}
                                                <ChevronDown className="w-4 h-4 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                            <DropdownMenuItem
                                                onClick={() => setSelectedTimePeriod("This Week")}
                                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                This Week
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setSelectedTimePeriod("Last Week")}
                                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                Last Week
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setSelectedTimePeriod("This Month")}
                                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                This Month
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300">
                                        See All
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                                    <div className="col-span-6 flex items-center">
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        Task Name
                                    </div>
                                    <div className="col-span-3 flex items-center">
                                        <Users className="w-4 h-4 mr-2" />
                                        Assign
                                    </div>
                                    <div className="col-span-3 flex items-center">
                                        <Zap className="w-4 h-4 mr-2" />
                                        Status
                                    </div>
                                </div>

                                {/* Task Rows */}
                                {currentTasks.map((task) => {
                                    const assignee = people.find((p) => p.id === task.assigneeId) || people[0]
                                    return (
                                        <div
                                            key={task.id}
                                            className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                            onClick={() => handleOpenTask(task)}
                                        >
                                            <div className="col-span-6">
                                                <div className="flex items-center">
                                                    <CheckCircle className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</span>
                                                    <div className="flex items-center ml-4 space-x-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                                            <MessageSquare className="w-3 h-3 mr-1" />
                                                            {task.comments}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                                            ♥ {task.likes}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 max-w-md">
                                                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                        <span>{task.target || "Chưa đặt mục tiêu"}</span>
                                                        <span>{task.progress ?? 0}%</span>
                                                    </div>
                                                    <Progress value={task.progress ?? 0} className="h-2" />
                                                </div>
                                            </div>
                                            <div className="col-span-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <div className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-1">
                                                            <Avatar className="w-6 h-6 mr-2">
                                                                <AvatarImage src={assignee.imageURL || "/placeholder.svg"} />
                                                                <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">
                                                                    {assignee.name
                                                                        .split(" ")
                                                                        .map((n) => n[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{assignee.name}</span>
                                                            <ChevronDown className="w-3 h-3 ml-1" />
                                                        </div>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                        {currentTeamPeople.map((person) => (
                                                            <DropdownMenuItem
                                                                key={person.id}
                                                                onClick={() => handleChangeAssignee(task.id, person.id)}
                                                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            >
                                                                <Avatar className="w-5 h-5 mr-2">
                                                                    <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                                                    <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">
                                                                        {person.name
                                                                            .split(" ")
                                                                            .map((n) => n[0])
                                                                            .join("")}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm">{person.name}</span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{person.email}</span>
                                                                </div>
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="col-span-3">
                                                <Select
                                                    value={task.status}
                                                    onValueChange={(value: keyof typeof TASK_STATUS_OPTIONS) =>
                                                        handleChangeStatus(task.id, value)
                                                    }
                                                >
                                                    <SelectTrigger className="w-[150px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.keys(TASK_STATUS_OPTIONS).map((status) => (
                                                            <SelectItem key={status} value={status}>
                                                                {status}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )
                                })}
                                {currentTasks.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        No tasks found for this view. Add a new task to start tracking work here.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Schedule */}
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                                    <Calendar className="w-5 h-5 mr-2" />
                                    Schedule
                                </CardTitle>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Calendar Week View with Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button variant="ghost" size="icon" onClick={() => navigateWeek("prev")}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="grid grid-cols-7 gap-1 text-center text-xs flex-1 mx-2">
                                    {getCurrentWeekDays().map(({ day, date }, index) => (
                                        <div key={day} className="py-2">
                                            <div className="text-gray-500 dark:text-gray-400">{day}</div>
                                            <button
                                                onClick={() => setSelectedDate(date)}
                                                className={`mt-1 w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs transition-colors ${selectedDate === date
                                                        ? "bg-purple-500 text-white"
                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    }`}
                                            >
                                                {date}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => navigateWeek("next")}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Schedule Items */}
                            <div className="space-y-3 min-h-[192px]">
                                {currentScheduleItems.length > 0 ? (
                                    currentScheduleItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{item.time}</p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="flex -space-x-1 cursor-pointer">
                                                        {item.attendeeIds.map((attendeeId) => {
                                                            const attendee = people.find((p) => p.id === attendeeId) || people[0]
                                                            return (
                                                                <Avatar key={attendeeId} className="w-5 h-5 border border-white dark:border-gray-800">
                                                                    <AvatarImage src={attendee.imageURL || "/placeholder.svg"} />
                                                                    <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">
                                                                        {attendee.name
                                                                            .split(" ")
                                                                            .map((n) => n[0])
                                                                            .join("")}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            )
                                                        })}
                                                        <div className="w-5 h-5 border border-white dark:border-gray-800 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                            <ChevronDown className="w-2 h-2" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                    {people.map((person) => (
                                                        <DropdownMenuItem
                                                            key={person.id}
                                                            onClick={() => {
                                                                const currentAttendees = item.attendeeIds
                                                                const newAttendees = currentAttendees.includes(person.id)
                                                                    ? currentAttendees.filter((id) => id !== person.id)
                                                                    : [...currentAttendees, person.id]
                                                                handleChangeScheduleAttendees(selectedDate, index, newAttendees)
                                                            }}
                                                            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            <Avatar className="w-5 h-5 mr-2">
                                                                <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                                                <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">
                                                                    {person.name
                                                                        .split(" ")
                                                                        .map((n) => n[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="text-sm">{person.name}</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">{person.email}</span>
                                                            </div>
                                                            {item.attendeeIds.includes(person.id) && (
                                                                <CheckCircle className="w-4 h-4 ml-auto text-green-600 dark:text-green-400" />
                                                            )}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Button variant="ghost" size="icon" className="w-6 h-6">
                                                <MoreHorizontal className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No events scheduled for this day</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <NotesSection
                        notes={notes}
                        onAddNote={handleAddNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                    />
                </div>
            </div>

            <Sheet
                open={isTeamTasksOpen}
                onOpenChange={setIsTeamTasksOpen}
            >
                <SheetContent side="right" className="w-full max-w-5xl overflow-y-auto bg-white dark:bg-gray-900 sm:max-w-5xl">
                    <SheetHeader className="border-b border-gray-200 pb-4 dark:border-gray-700">
                        <div className="pr-10">
                            <div className="mb-2 flex items-center gap-2">
                                <Badge variant="secondary">{selectedTimePeriod}</Badge>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {currentTeam?.name ?? "Your team"}
                                </span>
                            </div>
                            <SheetTitle className="flex items-center text-2xl font-bold text-gray-900 dark:text-white">
                                <Users className="mr-2 h-6 w-6" />
                                Team&apos;s Tasks
                            </SheetTitle>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Manage tasks of everyone in {currentTeam?.name ?? "your team"} without mixing them into your personal list.
                            </p>
                        </div>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                        <div className="grid grid-cols-12 gap-4 border-b border-gray-200 pb-2 text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            <div className="col-span-6 flex items-center">
                                <Edit3 className="mr-2 h-4 w-4" />
                                Task Name
                            </div>
                            <div className="col-span-3 flex items-center">
                                <Users className="mr-2 h-4 w-4" />
                                Assign
                            </div>
                            <div className="col-span-3 flex items-center">
                                <Zap className="mr-2 h-4 w-4" />
                                Status
                            </div>
                        </div>

                        {teamTasks.map((task) => {
                            const assignee = people.find((p) => p.id === task.assigneeId) || people[0]
                            return (
                                <div
                                    key={task.id}
                                    className="grid grid-cols-12 gap-4 items-center rounded-lg border-b border-gray-100 py-3 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                                    onClick={() => {
                                        handleOpenTask(task)
                                        setIsTeamTasksOpen(false)
                                    }}
                                >
                                    <div className="col-span-6">
                                        <div className="flex items-center">
                                            <CheckCircle className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</span>
                                            <div className="ml-4 flex items-center space-x-2">
                                                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <MessageSquare className="mr-1 h-3 w-3" />
                                                    {task.comments}
                                                </span>
                                                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    ♥ {task.likes}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 max-w-md">
                                            <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <span>{task.target || "Chưa đặt mục tiêu"}</span>
                                                <span>{task.progress ?? 0}%</span>
                                            </div>
                                            <Progress value={task.progress ?? 0} className="h-2" />
                                        </div>
                                    </div>
                                    <div className="col-span-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <div className="flex cursor-pointer items-center rounded p-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <Avatar className="mr-2 h-6 w-6">
                                                        <AvatarImage src={assignee.imageURL || "/placeholder.svg"} />
                                                        <AvatarFallback className="bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white">
                                                            {assignee.name
                                                                .split(" ")
                                                                .map((n) => n[0])
                                                                .join("")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{assignee.name}</span>
                                                    <ChevronDown className="ml-1 h-3 w-3" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                {currentTeamPeople.map((person) => (
                                                    <DropdownMenuItem
                                                        key={person.id}
                                                        onClick={() => handleChangeAssignee(task.id, person.id)}
                                                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <Avatar className="mr-2 h-5 w-5">
                                                            <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                                            <AvatarFallback className="bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white">
                                                                {person.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm">{person.name}</span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{person.email}</span>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="col-span-3">
                                        <Select
                                            value={task.status}
                                            onValueChange={(value: keyof typeof TASK_STATUS_OPTIONS) =>
                                                handleChangeStatus(task.id, value)
                                            }
                                        >
                                            <SelectTrigger className="w-[150px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(TASK_STATUS_OPTIONS).map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )
                        })}

                        {teamTasks.length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                No team tasks found for this view.
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet
                open={Boolean(selectedTask)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedTask(null)
                        setTaskDraft(null)
                    }
                }}
            >
                <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-white dark:bg-gray-900 sm:max-w-2xl">
                    {selectedTask && taskDraft && (
                        <>
                            <SheetHeader className="border-b border-gray-200 pb-4 dark:border-gray-700">
                                <div className="pr-10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <Badge className={taskDraft.statusColor}>{taskDraft.status}</Badge>
                                        {selectedTaskProject && (
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {selectedTaskProject.name}
                                            </span>
                                        )}
                                    </div>
                                    <SheetTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {taskDraft.name}
                                    </SheetTitle>
                                </div>
                            </SheetHeader>
                            <div className="grid gap-8 py-6">
                                <div className="grid gap-6 md:grid-cols-[150px_1fr]">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Execution Period</p>
                                    <Input
                                        value={taskDraft.executionPeriod}
                                        onChange={(event) => updateTaskDraft("executionPeriod", event.target.value)}
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Status</p>
                                    <Select
                                        value={taskDraft.status}
                                        onValueChange={(value: keyof typeof TASK_STATUS_OPTIONS) => {
                                            updateTaskDraft("status", value)
                                            updateTaskDraft("statusColor", TASK_STATUS_OPTIONS[value])
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(TASK_STATUS_OPTIONS).map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Assignee</p>
                                    <div className="border-b border-gray-200 pb-2 dark:border-gray-700">
                                        {canManageAllTasks ? (
                                            <Select
                                                value={taskDraft.assigneeId}
                                                onValueChange={(value) => updateTaskDraft("assigneeId", value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select assignee" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {taskDetailAssignees.map((person) => (
                                                        <SelectItem key={person.id} value={person.id}>
                                                            {person.name} · {person.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={selectedTaskAssignee?.imageURL || "/placeholder.svg"} />
                                                    <AvatarFallback>
                                                        {selectedTaskAssignee?.name
                                                            ?.split(" ")
                                                            .map((part) => part[0])
                                                            .join("") || "NA"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {selectedTaskAssignee?.name || "Unknown"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {selectedTaskAssignee?.email || ""}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Audience</p>
                                    <Input
                                        value={taskDraft.audience}
                                        onChange={(event) => updateTaskDraft("audience", event.target.value)}
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Weight</p>
                                    <Input
                                        value={taskDraft.weight}
                                        onChange={(event) => updateTaskDraft("weight", event.target.value)}
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Result Method</p>
                                    <Input
                                        value={taskDraft.resultMethod}
                                        onChange={(event) => updateTaskDraft("resultMethod", event.target.value)}
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Mục tiêu</p>
                                    <Input
                                        value={taskDraft.target ?? ""}
                                        onChange={(event) => updateTaskDraft("target", event.target.value)}
                                        placeholder="Ví dụ: 200 conversations / tuần"
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Tiến độ (%)</p>
                                    <div className="space-y-3">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={taskDraft.progress ?? 0}
                                            onChange={(event) =>
                                                updateTaskDraft(
                                                    "progress",
                                                    Math.min(100, Math.max(0, Number(event.target.value || 0))),
                                                )
                                            }
                                        />
                                        <div className="space-y-2">
                                            <Progress value={taskDraft.progress ?? 0} className="h-2" />
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Hoàn thành {taskDraft.progress ?? 0}% mục tiêu hiện tại
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">KPIs</p>
                                    <div className="border-b border-gray-200 pb-2 dark:border-gray-700">
                                        <Input
                                            value={taskDraft.kpis.join(", ")}
                                            onChange={(event) =>
                                                updateTaskDraft(
                                                    "kpis",
                                                    event.target.value
                                                        .split(",")
                                                        .map((item) => item.trim())
                                                        .filter(Boolean),
                                                )
                                            }
                                        />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Child Goal</p>
                                    <Input
                                        value={taskDraft.childGoal}
                                        onChange={(event) => updateTaskDraft("childGoal", event.target.value)}
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Parent Goal</p>
                                    <Input
                                        value={taskDraft.parentGoal}
                                        onChange={(event) => updateTaskDraft("parentGoal", event.target.value)}
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Mô tả</p>
                                    <Textarea
                                        value={taskDraft.description}
                                        onChange={(event) => updateTaskDraft("description", event.target.value)}
                                        className="min-h-28"
                                    />
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Tệp đính kèm</p>
                                    <div className="border-b border-gray-200 pb-2 dark:border-gray-700">
                                        {taskDraft.attachments.length > 0 ? (
                                            <div className="space-y-2">
                                                {taskDraft.attachments.map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {attachment.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {(attachment.size / 1024).toFixed(1)} KB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {attachment.type || "File"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-700 dark:text-gray-300">-</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedTask(null)
                                            setTaskDraft(null)
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSubmitTaskUpdate}>Update Task</Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
