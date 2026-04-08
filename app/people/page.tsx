"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useDirectory } from "@/components/directory-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { isAdminLikeRole } from "@/lib/auth"
import { findPersonForAuthUser, getTeamById, isPersonWorking, personDisplayRoles, type Person } from "@/lib/people"
import {
    ChevronDown,
    Clock,
    Filter,
    Grid3X3,
    List,
    Mail,
    Moon,
    Pencil,
    Search,
    Trash2,
    UserPlus,
    Users,
} from "lucide-react"

type ViewMode = "list" | "grid" | "teams"

type PersonFormState = {
    name: string
    role: string
    email: string
    team: string
    imageURL: string
    start: string
    end: string
    timezone: string
}

const DEFAULT_FORM: PersonFormState = {
    name: "",
    role: personDisplayRoles[0],
    email: "",
    team: "marketing",
    imageURL: "",
    start: "09:00",
    end: "17:00",
    timezone: "UTC+7",
}

export default function PeoplePage() {
    const { user } = useAuth()
    const { people, teams, refresh } = useDirectory()
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>("list")
    const [selectedTeam, setSelectedTeam] = useState<string>("all")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPerson, setEditingPerson] = useState<Person | null>(null)
    const [personForm, setPersonForm] = useState<PersonFormState>(DEFAULT_FORM)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const isAdmin = isAdminLikeRole(user?.role)
    const currentUser = findPersonForAuthUser(user, people)
    const currentTeamId = currentUser?.team ?? ""
    const accessiblePeople = isAdmin
        ? people
        : currentTeamId
            ? people.filter((person) => person.team === currentTeamId)
            : []
    const visibleTeams = isAdmin ? teams : teams.filter((team) => team.id === currentTeamId)

    const filteredPeople = accessiblePeople.filter((person) => {
        const matchesSearch =
            person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            person.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTeam = selectedTeam === "all" || person.team === selectedTeam
        return matchesSearch && matchesTeam
    })

    const peopleByTeams = teams.reduce(
        (acc, team) => {
            acc[team.id] = filteredPeople.filter((person) => person.team === team.id)
            return acc
        },
        {} as Record<string, Person[]>,
    )

    const updatePersonForm = <K extends keyof PersonFormState>(key: K, value: PersonFormState[K]) => {
        setPersonForm((prev) => ({ ...prev, [key]: value }))
    }

    const openCreateDialog = () => {
        setEditingPerson(null)
        setPersonForm({
            ...DEFAULT_FORM,
            team: teams[0]?.id ?? "marketing",
        })
        setIsDialogOpen(true)
    }

    const openEditDialog = (person: Person) => {
        setEditingPerson(person)
        const normalizedRole = personDisplayRoles.includes(person.role as (typeof personDisplayRoles)[number])
            ? person.role
            : personDisplayRoles[0]
        setPersonForm({
            name: person.name,
            role: normalizedRole,
            email: person.email,
            team: person.team,
            imageURL: person.imageURL === "/placeholder.svg" ? "" : person.imageURL,
            start: person.workingHours.start,
            end: person.workingHours.end,
            timezone: person.workingHours.timezone,
        })
        setIsDialogOpen(true)
    }

    const handleSubmitPerson = async () => {
        if (!personForm.name.trim() || !personForm.role.trim() || !personForm.email.trim() || !personForm.team.trim()) {
            toast({
                title: "Thiếu thông tin",
                description: "Vui lòng nhập tên, email, vai trò và team.",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch(editingPerson ? `/api/people/${editingPerson.id}` : "/api/people", {
                method: editingPerson ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: personForm.name,
                    role: personForm.role,
                    email: personForm.email,
                    team: personForm.team,
                    imageURL: personForm.imageURL,
                    workingHours: {
                        start: personForm.start,
                        end: personForm.end,
                        timezone: personForm.timezone,
                    },
                }),
            })

            const payload = (await response.json()) as { ok: boolean; message?: string }
            if (!response.ok || !payload.ok) {
                throw new Error(payload.message || "Không thể lưu nhân sự.")
            }

            await refresh()
            setIsDialogOpen(false)
            setEditingPerson(null)
            setPersonForm(DEFAULT_FORM)
            toast({
                title: editingPerson ? "Cập nhật nhân sự thành công" : "Thêm nhân sự thành công",
                description: editingPerson
                    ? "Thông tin nhân sự đã được cập nhật."
                    : "Nhân sự mới đã được thêm vào hệ thống.",
            })
        } catch (error) {
            toast({
                title: "Không thể lưu nhân sự",
                description: error instanceof Error ? error.message : "Server từ chối thao tác này.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeletePerson = async (person: Person) => {
        const confirmed = window.confirm(`Xóa nhân sự ${person.name}? Thao tác này sẽ xóa cả dữ liệu liên quan.`)
        if (!confirmed) {
            return
        }

        try {
            const response = await fetch(`/api/people/${person.id}`, {
                method: "DELETE",
                credentials: "include",
            })
            const payload = (await response.json()) as { ok: boolean; message?: string }
            if (!response.ok || !payload.ok) {
                throw new Error(payload.message || "Không thể xóa nhân sự.")
            }

            await refresh()
            toast({
                title: "Xóa nhân sự thành công",
                description: `${person.name} đã được xóa khỏi hệ thống.`,
            })
        } catch (error) {
            toast({
                title: "Không thể xóa nhân sự",
                description: error instanceof Error ? error.message : "Server từ chối thao tác này.",
                variant: "destructive",
            })
        }
    }

    const PersonCard = ({ person, compact = false }: { person: Person; compact?: boolean }) => {
        const team = getTeamById(person.team, teams)
        const isWorking = isPersonWorking(person)

        return (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <CardContent className={`${compact ? "p-4" : "p-6"}`}>
                    <div className="flex items-start space-x-4">
                        <div className="relative">
                            <Avatar className={`${compact ? "w-10 h-10" : "w-12 h-12"}`}>
                                <AvatarImage src={person.imageURL || "/placeholder.svg"} />
                                <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">
                                    {person.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </AvatarFallback>
                            </Avatar>
                            {!isWorking && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                    <Moon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                                <h3
                                    className={`${compact ? "text-sm" : "text-base"} font-semibold text-gray-900 dark:text-white truncate`}
                                >
                                    {person.name}
                                </h3>
                                <div className="flex items-start gap-2">
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        {team && <Badge className={`${team.color} text-xs`}>{team.name}</Badge>}
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                                            {person.role}
                                        </Badge>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500"
                                                onClick={() => openEditDialog(person)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => handleDeletePerson(person)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-1 space-y-1">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Mail className="w-3 h-3 mr-1" />
                                    <span className="truncate">{person.email}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>
                                        {person.workingHours.start} - {person.workingHours.end} {person.workingHours.timezone}
                                    </span>
                                    {isWorking ? (
                                        <span className="ml-2 text-green-600 dark:text-green-400">• Online</span>
                                    ) : (
                                        <span className="ml-2 text-gray-400 dark:text-gray-500">• Offline</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const listContent = (
        <div className="space-y-4">
            {filteredPeople.map((person) => (
                <PersonCard key={person.id} person={person} />
            ))}
        </div>
    )

    const gridContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeople.map((person) => (
                <PersonCard key={person.id} person={person} compact />
            ))}
        </div>
    )

    const teamsContent = (
        <div className="space-y-6">
            {visibleTeams.map((team) => {
                const teamPeople = peopleByTeams[team.id]
                if (teamPeople.length === 0) return null

                return (
                    <div key={team.id}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                                <Badge className={team.color}>
                                    {teamPeople.length} member{teamPeople.length !== 1 ? "s" : ""}
                                </Badge>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teamPeople.map((person) => (
                                <PersonCard key={person.id} person={person} compact />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">People</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage your team members and view their availability
                        </p>
                    </div>
                    {isAdmin && (
                        <Button onClick={openCreateDialog}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Thêm nhân sự
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                        <Input
                            placeholder="Search people by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent"
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                {selectedTeam === "all"
                                    ? isAdmin
                                        ? "All Teams"
                                        : getTeamById(currentTeamId, teams)?.name ?? "My Team"
                                    : getTeamById(selectedTeam, teams)?.name}
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <DropdownMenuItem
                                onClick={() => setSelectedTeam("all")}
                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {isAdmin ? "All Teams" : getTeamById(currentTeamId, teams)?.name ?? "My Team"}
                            </DropdownMenuItem>
                            {visibleTeams.map((team) => (
                                <DropdownMenuItem
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team.id)}
                                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {team.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
                        <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 px-3">
                            <List className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-8 px-3">
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === "teams" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("teams")} className="h-8 px-3">
                            <Users className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredPeople.length} of {accessiblePeople.length} people
                    {selectedTeam !== "all" && ` in ${getTeamById(selectedTeam, teams)?.name}`}
                </p>
            </div>

            <div className="min-h-[400px]">
                {filteredPeople.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No people found</h3>
                        <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <>
                        {viewMode === "list" && listContent}
                        {viewMode === "grid" && gridContent}
                        {viewMode === "teams" && teamsContent}
                    </>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingPerson ? "Chỉnh sửa nhân sự" : "Thêm nhân sự mới"}</DialogTitle>
                        <DialogDescription>
                            {editingPerson
                                ? "Cập nhật thông tin nhân sự trong hệ thống."
                                : "Tạo hồ sơ nhân sự mới để admin quản lý trong data."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="person-name">Họ và tên</Label>
                            <Input id="person-name" value={personForm.name} onChange={(event) => updatePersonForm("name", event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="person-email">Email</Label>
                            <Input id="person-email" type="email" value={personForm.email} onChange={(event) => updatePersonForm("email", event.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="person-role">Role hiển thị</Label>
                                <Select value={personForm.role} onValueChange={(value) => updatePersonForm("role", value)}>
                                    <SelectTrigger id="person-role">
                                        <SelectValue placeholder="Chọn role hiển thị" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {personDisplayRoles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Team</Label>
                                <Select value={personForm.team} onValueChange={(value) => updatePersonForm("team", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="person-image">Avatar URL</Label>
                            <Input id="person-image" value={personForm.imageURL} onChange={(event) => updatePersonForm("imageURL", event.target.value)} placeholder="https://..." />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="person-start">Bắt đầu</Label>
                                <Input id="person-start" value={personForm.start} onChange={(event) => updatePersonForm("start", event.target.value)} placeholder="09:00" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="person-end">Kết thúc</Label>
                                <Input id="person-end" value={personForm.end} onChange={(event) => updatePersonForm("end", event.target.value)} placeholder="17:00" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="person-timezone">Timezone</Label>
                                <Input id="person-timezone" value={personForm.timezone} onChange={(event) => updatePersonForm("timezone", event.target.value)} placeholder="UTC+7" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmitPerson} disabled={isSubmitting}>
                            {isSubmitting ? "Đang lưu..." : editingPerson ? "Cập nhật" : "Thêm nhân sự"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
