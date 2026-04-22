"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useDirectory } from "@/components/directory-provider"
import { useAuth } from "@/components/auth-provider"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { documentTypes, formatFileSize, formatDate, type Document, type Folder } from "@/lib/documents"
import type { UserAccount } from "@/lib/auth"
import {
    Search,
    Filter,
    Grid3X3,
    List,
    FolderPlus,
    FolderOpen,
    Folder as FolderIcon,
    ChevronDown,
    ChevronLeft,
    Star,
    StarOff,
    Trash2,
    Edit,
    Move,
    Eye,
    FileText,
    Tag,
    MoreHorizontal,
    Link,
    Globe,
    Store,
    Building2,
    X,
    Plus,
} from "lucide-react"

type SortBy = "name" | "date" | "size" | "type" | "owner"
type GroupBy = "none" | "type" | "date" | "owner" | "folder"
type ViewMode = "grid" | "list"
type DocVisibility = "team" | "office" | "store"

interface ContextMenuPosition {
    x: number
    y: number
}

interface NewFolderDialogState {
    open: boolean
    name: string
}

interface CreateDocumentDialogState {
    open: boolean
    name: string
    link: string
    thumbnail: string
    visibility: DocVisibility
    file: File | null
    selectedOfficePersonIds: string[]
}

interface VisibilityDialogState {
    open: boolean
    docId: string
    visibility: DocVisibility
    selectedOfficePersonIds: string[]
}

function getDefaultVisibility(user: UserAccount | null): DocVisibility {
    if (user?.role === "ceo" || user?.role === "admin") return "office"
    return "team"
}

function buildDefaultCreateDocumentDialog(user: UserAccount | null): CreateDocumentDialogState {
    return {
        open: false,
        name: "",
        link: "",
        thumbnail: "",
        visibility: getDefaultVisibility(user),
        file: null,
        selectedOfficePersonIds: [],
    }
}

function buildDefaultVisibilityDialog(user: UserAccount | null): VisibilityDialogState {
    return {
        open: false,
        docId: "",
        visibility: getDefaultVisibility(user),
        selectedOfficePersonIds: [],
    }
}

export default function DocumentsPage() {
    const { people } = useDirectory()
    const { user } = useAuth()
    const isLeaderOrAdmin = user?.role === "leader" || user?.role === "admin" || user?.role === "ceo"

    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<SortBy>("date")
    const [groupBy, setGroupBy] = useState<GroupBy>("none")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [drawerPreviewImageFailed, setDrawerPreviewImageFailed] = useState(false)
    const [contextMenu, setContextMenu] = useState<{ document: Document; position: ContextMenuPosition } | null>(null)
    const [documentsData, setDocumentsData] = useState<Document[]>([])
    const [folders, setFolders] = useState<Folder[]>([])
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [newFolderDialog, setNewFolderDialog] = useState<NewFolderDialogState>({ open: false, name: "" })
    const [createDocumentDialog, setCreateDocumentDialog] = useState<CreateDocumentDialogState>(
        buildDefaultCreateDocumentDialog(user)
    )
    const [visibilityDialog, setVisibilityDialog] = useState<VisibilityDialogState>(
        buildDefaultVisibilityDialog(user)
    )
    const [isSubmitting, setIsSubmitting] = useState(false)

    const contextMenuRef = useRef<HTMLDivElement>(null)

    const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null
    const currentPerson = people.find((person) => person.id === user?.personId) ?? null
    const officeSelectablePeople = currentPerson
        ? people.filter((person) => person.team === currentPerson.team)
        : []

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        loadFolders()
        loadDocuments()
    }, [])

    useEffect(() => {
        loadDocuments()
    }, [activeFolderId])

    useEffect(() => {
        setDrawerPreviewImageFailed(false)
    }, [selectedDocument?.id])

    useEffect(() => {
        setCreateDocumentDialog((state) => ({
            ...state,
            visibility: getDefaultVisibility(user),
        }))
    }, [user])

    const loadFolders = async () => {
        try {
            const res = await fetch("/api/documents/folders", { credentials: "include", cache: "no-store" })
            if (!res.ok) return
            const payload = (await res.json()) as { folders: Folder[] }
            setFolders(payload.folders)
        } catch { /* ignore */ }
    }

    const loadDocuments = async () => {
        try {
            const url = activeFolderId
                ? `/api/documents?folderId=${activeFolderId}`
                : "/api/documents"
            const res = await fetch(url, { credentials: "include", cache: "no-store" })
            if (!res.ok) return
            const payload = (await res.json()) as { documents: Document[] }
            setDocumentsData(payload.documents)
        } catch { /* ignore */ }
    }

    const patchDocument = async (documentId: string, updates: Partial<Document>) => {
        const res = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error("Failed to update document.")
        const payload = (await res.json()) as { ok: boolean; document: Document }
        return payload.document
    }

    const inferDocumentType = (fileName: string): Document["type"] => {
        const ext = fileName.split(".").pop()?.toLowerCase()
        switch (ext) {
            case "pdf": case "docx": case "xlsx": case "pptx": case "txt":
            case "jpg": case "png": case "mp4": case "zip": return ext
            case "fig": case "figma": return "figma"
            default: return "txt"
        }
    }

    // ── Folder handlers ──────────────────────────────────────────────

    const handleCreateFolder = async () => {
        if (!newFolderDialog.name.trim()) return
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/documents/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: newFolderDialog.name.trim() }),
            })
            const payload = (await res.json()) as { ok: boolean; folder: Folder }
            if (!res.ok) throw new Error(payload.folder as unknown as string)
            setFolders((prev) => [payload.folder, ...prev])
            setNewFolderDialog({ open: false, name: "" })
            toast({ title: "Tạo folder thành công" })
        } catch {
            toast({ title: "Không thể tạo folder", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm("Xóa folder này? Các file bên trong sẽ không bị xóa.")) return
        try {
            const res = await fetch(`/api/documents/folders/${folderId}`, { method: "DELETE", credentials: "include" })
            const payload = (await res.json()) as { ok: boolean; message?: string }
            if (!res.ok || !payload.ok) throw new Error(payload.message || "Không thể xóa folder")
            setFolders((prev) => prev.filter((f) => f.id !== folderId))
            if (activeFolderId === folderId) {
                setActiveFolderId(null)
                await loadDocuments()
            }
            toast({ title: "Đã xóa folder" })
        } catch {
            toast({ title: "Không thể xóa folder", variant: "destructive" })
        }
    }

    const openCreateDocumentDialog = () => {
        setCreateDocumentDialog({
            ...buildDefaultCreateDocumentDialog(user),
            open: true,
        })
    }

    const closeCreateDocumentDialog = () => {
        setCreateDocumentDialog(buildDefaultCreateDocumentDialog(user))
    }

    const handleCreateDocument = async () => {
        const { file, name, link, thumbnail, visibility } = createDocumentDialog
        const selectedOfficePersonIds = createDocumentDialog.selectedOfficePersonIds ?? []

        const normalizedLink = link.trim()
        const normalizedThumbnail = thumbnail.trim()
        const normalizedName = name.trim()
        const safeLink =
            normalizedLink.startsWith("http://") || normalizedLink.startsWith("https://")
                ? normalizedLink
                : undefined
        const safeThumbnail =
            normalizedThumbnail.startsWith("http://") ||
            normalizedThumbnail.startsWith("https://") ||
            normalizedThumbnail.startsWith("data:image/")
                ? normalizedThumbnail
                : undefined
        const canSubmit = Boolean(file || normalizedName || safeLink || safeThumbnail)
        if (!canSubmit) return

        setIsSubmitting(true)
        try {
            const requestVisibility: Document["visibility"] =
                (visibility === "team" || visibility === "office") && selectedOfficePersonIds.length > 0
                    ? "specific"
                    : visibility

            const requestPayload = file
                ? {
                    name: normalizedName || file.name,
                    type: inferDocumentType(file.name),
                    size: file.size,
                    folderId: activeFolderId ?? undefined,
                    tags: ["uploaded"],
                    visibility: requestVisibility,
                    visibleToPersonIds: requestVisibility === "specific" ? selectedOfficePersonIds : [],
                    description: `Uploaded on ${new Date().toLocaleDateString("vi-VN")}`,
                    url: safeLink,
                    thumbnail: safeThumbnail,
                }
                : {
                    name:
                        normalizedName ||
                        (safeLink ? safeLink : safeThumbnail ? "Image" : "Untitled"),
                    type: safeLink ? ("link" as const) : safeThumbnail ? ("image" as const) : ("txt" as const),
                    size: 0,
                    folderId: activeFolderId ?? undefined,
                    tags: [safeLink ? "link" : safeThumbnail ? "image" : "note"],
                    visibility: requestVisibility,
                    visibleToPersonIds: requestVisibility === "specific" ? selectedOfficePersonIds : [],
                    description: `Created on ${new Date().toLocaleDateString("vi-VN")}`,
                    url: safeLink,
                    thumbnail: safeThumbnail,
                }

            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(requestPayload),
            })

            const responsePayload = (await res.json()) as { ok: boolean; document: Document }
            if (!res.ok) throw new Error()

            setDocumentsData((prev) => [responsePayload.document, ...prev])
            closeCreateDocumentDialog()
            toast({ title: "Tạo file thành công" })
        } catch {
            toast({ title: "Không thể tạo tài liệu", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Visibility handler ───────────────────────────────────────────

    const handleSaveVisibility = async () => {
        try {
            const selectedOfficePersonIds = visibilityDialog.selectedOfficePersonIds ?? []
            const requestVisibility: Document["visibility"] =
                (visibilityDialog.visibility === "team" || visibilityDialog.visibility === "office") &&
                    selectedOfficePersonIds.length > 0
                    ? "specific"
                    : visibilityDialog.visibility
            const updated = await patchDocument(visibilityDialog.docId, {
                visibility: requestVisibility,
                visibleToPersonIds:
                    requestVisibility === "specific" ? selectedOfficePersonIds : [],
            })
            setDocumentsData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
            if (selectedDocument?.id === updated.id) setSelectedDocument(updated)
            setVisibilityDialog(buildDefaultVisibilityDialog(user))
            toast({ title: "Đã cập nhật quyền xem" })
        } catch {
            toast({ title: "Không thể cập nhật quyền xem", variant: "destructive" })
        }
    }

    // ── Document handlers ────────────────────────────────────────────

    const handleDocumentClick = (doc: Document) => {
        setSelectedDocument(doc)
        setIsDrawerOpen(true)
    }

    const handleContextMenu = (e: React.MouseEvent, doc: Document) => {
        e.preventDefault()
        setContextMenu({ document: doc, position: { x: e.clientX, y: e.clientY } })
    }

    const handleStarToggle = async (docId: string) => {
        const target = documentsData.find((d) => d.id === docId)
        if (!target) return
        try {
            const updated = await patchDocument(docId, { isStarred: !target.isStarred })
            setDocumentsData((prev) => prev.map((d) => (d.id === docId ? updated : d)))
            if (selectedDocument?.id === docId) setSelectedDocument(updated)
        } catch {
            toast({ title: "Không thể cập nhật", variant: "destructive" })
        }
    }

    const handleDeleteDocument = async (docId: string) => {
        try {
            await fetch(`/api/documents/${docId}`, { method: "DELETE", credentials: "include" })
            setDocumentsData((prev) => prev.filter((d) => d.id !== docId))
            setContextMenu(null)
            if (selectedDocument?.id === docId) { setSelectedDocument(null); setIsDrawerOpen(false) }
        } catch {
            toast({ title: "Không thể xóa file", variant: "destructive" })
        }
    }

    const handleRenameDocument = async (doc: Document) => {
        const next = window.prompt("Nhập tên mới", doc.name)?.trim()
        if (!next || next === doc.name) return
        try {
            const updated = await patchDocument(doc.id, { name: next })
            setDocumentsData((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
            setContextMenu(null)
            if (selectedDocument?.id === doc.id) setSelectedDocument(updated)
        } catch {
            toast({ title: "Không thể đổi tên", variant: "destructive" })
        }
    }

    const handleMoveDocument = async (doc: Document) => {
        const next = window.prompt("Nhập tên folder mới", doc.folder ?? "")?.trim()
        if (next === undefined) return
        try {
            const updated = await patchDocument(doc.id, { folder: next || undefined })
            setDocumentsData((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
            setContextMenu(null)
            if (selectedDocument?.id === doc.id) setSelectedDocument(updated)
        } catch {
            toast({ title: "Không thể di chuyển", variant: "destructive" })
        }
    }

    // ── Filtering & sorting ──────────────────────────────────────────

    const filteredDocuments = documentsData.filter(
        (doc) =>
            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
            doc.folder?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
        switch (sortBy) {
            case "name": return a.name.localeCompare(b.name)
            case "date": return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
            case "size": return b.size - a.size
            case "type": return a.type.localeCompare(b.type)
            case "owner": {
                const na = people.find((p) => p.id === a.ownerId)?.name || ""
                const nb = people.find((p) => p.id === b.ownerId)?.name || ""
                return na.localeCompare(nb)
            }
            default: return 0
        }
    })

    const groupedDocuments = () => {
        if (groupBy === "none") return { "Tất cả": sortedDocuments }
        const groups: Record<string, Document[]> = {}
        sortedDocuments.forEach((doc) => {
            let key = ""
            switch (groupBy) {
                case "type": key = doc.type.toUpperCase(); break
                case "date": {
                    const diff = Math.ceil(Math.abs(Date.now() - new Date(doc.modifiedAt).getTime()) / 86400000)
                    key = diff <= 1 ? "Hôm nay" : diff <= 7 ? "Tuần này" : diff <= 30 ? "Tháng này" : "Cũ hơn"
                    break
                }
                case "owner": key = people.find((p) => p.id === doc.ownerId)?.name || "Không rõ"; break
                case "folder": key = doc.folder || "Chưa có folder"; break
            }
            if (!groups[key]) groups[key] = []
            groups[key].push(doc)
        })
        return groups
    }

    const groups = groupedDocuments()

    // ── Sub-components ───────────────────────────────────────────────

    const VisibilityBadge = ({ doc }: { doc: Document }) => {
        if (doc.visibility === "store") {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                    <Store className="w-3 h-3" />
                    Cửa hàng
                </span>
            )
        }
        if (doc.visibility === "office") {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Building2 className="w-3 h-3" />
                    Văn phòng
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Globe className="w-3 h-3" />
                Phòng ban
            </span>
        )
    }

    const DocumentCard = ({ doc }: { doc: Document }) => {
        const owner = people.find((p) => p.id === doc.ownerId)
        const docType = documentTypes[doc.type] ?? documentTypes.txt

        return (
            <Card
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer group"
                onDoubleClick={() => handleDocumentClick(doc)}
                onContextMenu={(e) => handleContextMenu(e, doc)}
            >
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-lg ${docType.bgColor} flex items-center justify-center text-2xl overflow-hidden`}>
                            {doc.thumbnail ? (
                                <img src={doc.thumbnail} alt={doc.name} className="w-full h-full object-cover rounded-lg" />
                            ) : doc.type === "link" ? (
                                <Link className="w-6 h-6 text-cyan-500" />
                            ) : (
                                <span>{docType.icon}</span>
                            )}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); void handleStarToggle(doc.id) }}>
                                {doc.isStarred
                                    ? <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                    : <StarOff className="w-3 h-3 text-gray-400" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={(e) => handleContextMenu(e, doc)}>
                                <MoreHorizontal className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate" title={doc.name}>
                            {doc.name}
                        </h3>
                        {doc.type === "link" && doc.url && (
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 truncate">{doc.url}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatFileSize(doc.size)}</span>
                            <VisibilityBadge doc={doc} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Avatar className="w-5 h-5">
                                <AvatarImage src={owner?.imageURL || "/placeholder.svg"} />
                                <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-xs">
                                    {owner?.name.split(" ").map((n) => n[0]).join("") || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{owner?.name || "Unknown"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const DocumentListItem = ({ doc }: { doc: Document }) => {
        const owner = people.find((p) => p.id === doc.ownerId)
        const docType = documentTypes[doc.type] ?? documentTypes.txt

        return (
            <div
                className="flex items-center space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer group"
                onDoubleClick={() => handleDocumentClick(doc)}
                onContextMenu={(e) => handleContextMenu(e, doc)}
            >
                <div className={`w-10 h-10 rounded-lg ${docType.bgColor} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                    {doc.thumbnail ? (
                        <img src={doc.thumbnail} alt={doc.name} className="w-full h-full object-cover rounded-lg" />
                    ) : doc.type === "link" ? (
                        <Link className="w-5 h-5 text-cyan-500" />
                    ) : (
                        <span className="text-lg">{docType.icon}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</h3>
                        {doc.isStarred && <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>{formatDate(doc.modifiedAt)}</span>
                        <VisibilityBadge doc={doc} />
                    </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                    <Avatar className="w-6 h-6">
                        <AvatarImage src={owner?.imageURL || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-xs">
                            {owner?.name.split(" ").map((n) => n[0]).join("") || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">{owner?.name || "Unknown"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleContextMenu(e, doc)}>
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )
    }

    // ── Render ───────────────────────────────────────────────────────

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Documents</h1>
                <p className="text-gray-600 dark:text-gray-400">Quản lý và tổ chức tài liệu của phòng ban</p>
            </div>

            {/* Folders section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Folders</h2>
                    {isLeaderOrAdmin && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                            onClick={() => setNewFolderDialog({ open: true, name: "" })}
                        >
                            <FolderPlus className="w-4 h-4 mr-1" />
                            Tạo folder
                        </Button>
                    )}
                </div>

                {folders.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {isLeaderOrAdmin ? "Chưa có folder nào. Tạo folder đầu tiên." : "Chưa có folder nào."}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                    activeFolderId === folder.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 text-gray-700 dark:text-gray-300"
                                }`}
                                onClick={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)}
                            >
                                {activeFolderId === folder.id
                                    ? <FolderOpen className="w-4 h-4" />
                                    : <FolderIcon className="w-4 h-4" />}
                                <span className="text-sm font-medium">{folder.name}</span>
                                {isLeaderOrAdmin && (
                                    <button
                                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                        onClick={(e) => { e.stopPropagation(); void handleDeleteFolder(folder.id) }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active folder bar */}
            {activeFolderId && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 dark:text-blue-400 h-7 px-2"
                        onClick={() => setActiveFolderId(null)}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Tất cả
                    </Button>
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">/ {activeFolder?.name}</span>

                    {/* Actions inside folder — leader/admin only */}
                    {isLeaderOrAdmin && (
                        <div className="ml-auto flex gap-2">
                            <Button size="sm" variant="outline"
                                className="border-blue-300 text-blue-700 dark:text-blue-300 bg-transparent"
                                onClick={openCreateDocumentDialog}>
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Tạo tài liệu
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Tìm kiếm tài liệu, tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-gray-700"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-transparent">
                                Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {(["name", "date", "size", "type", "owner"] as SortBy[]).map((s) => (
                                <DropdownMenuItem key={s} onClick={() => setSortBy(s)}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-transparent">
                                <Filter className="w-4 h-4 mr-2" />
                                Group: {groupBy === "none" ? "None" : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {(["none", "type", "date", "owner", "folder"] as GroupBy[]).map((g) => (
                                <DropdownMenuItem key={g} onClick={() => setGroupBy(g)}>
                                    {g === "none" ? "None" : g.charAt(0).toUpperCase() + g.slice(1)}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center border rounded-lg p-1 bg-white dark:bg-gray-800">
                        <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-8 px-3">
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 px-3">
                            <List className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Create document outside folder — leader/admin only */}
                    {!activeFolderId && isLeaderOrAdmin && (
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDocumentDialog}>
                            <Plus className="w-4 h-4 mr-2" />
                            Tạo tài liệu
                        </Button>
                    )}
                </div>
            </div>

            {/* Results count */}
            <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredDocuments.length} / {documentsData.length} tài liệu
                    {activeFolder ? ` trong "${activeFolder.name}"` : ""}
                </p>
            </div>

            {/* Document list */}
            <div className="space-y-8">
                {Object.entries(groups).map(([groupName, groupDocs]) => (
                    <div key={groupName}>
                        {groupBy !== "none" && (
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                {groupName}
                                <Badge variant="secondary" className="ml-2">{groupDocs.length}</Badge>
                            </h2>
                        )}
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {groupDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {groupDocs.map((doc) => <DocumentListItem key={doc.id} doc={doc} />)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Không có tài liệu</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        {activeFolder ? `Folder "${activeFolder.name}" chưa có file nào.` : "Thử thay đổi bộ lọc hoặc tìm kiếm."}
                    </p>
                </div>
            )}

            {/* ── Context Menu ─────────────────────────────────────────── */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[180px]"
                    style={{ left: contextMenu.position.x, top: contextMenu.position.y }}
                >
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onClick={() => { handleDocumentClick(contextMenu.document); setContextMenu(null) }}>
                        <Eye className="w-4 h-4 mr-2" />Chi tiết
                    </button>
                    {contextMenu.document.type === "link" && contextMenu.document.url && (
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            onClick={() => { window.open(contextMenu.document.url, "_blank"); setContextMenu(null) }}>
                            <Link className="w-4 h-4 mr-2" />Mở link
                        </button>
                    )}
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onClick={() => { void handleStarToggle(contextMenu.document.id); setContextMenu(null) }}>
                        {contextMenu.document.isStarred ? <><StarOff className="w-4 h-4 mr-2" />Bỏ star</> : <><Star className="w-4 h-4 mr-2" />Star</>}
                    </button>
                    {isLeaderOrAdmin && (
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            onClick={() => {
                                const vis = contextMenu.document.visibility ?? "team"
                                setVisibilityDialog({
                                    open: true,
                                    docId: contextMenu.document.id,
                                    visibility: vis === "specific" ? "team" : (vis as DocVisibility),
                                    selectedOfficePersonIds: contextMenu.document.visibleToPersonIds ?? [],
                                })
                                setContextMenu(null)
                            }}>
                            <Globe className="w-4 h-4 mr-2" />Quyền xem
                        </button>
                    )}
                    {isLeaderOrAdmin && (
                        <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                onClick={() => void handleRenameDocument(contextMenu.document)}>
                                <Edit className="w-4 h-4 mr-2" />Đổi tên
                            </button>
                            <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                onClick={() => void handleMoveDocument(contextMenu.document)}>
                                <Move className="w-4 h-4 mr-2" />Di chuyển
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                onClick={() => void handleDeleteDocument(contextMenu.document.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />Xóa
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Document Details Drawer ──────────────────────────────── */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SheetHeader>
                        <SheetTitle className="text-gray-900 dark:text-white">Chi tiết tài liệu</SheetTitle>
                    </SheetHeader>
                    {selectedDocument && (() => {
                        const docType = documentTypes[selectedDocument.type] ?? documentTypes.txt
                        const owner = people.find((p) => p.id === selectedDocument.ownerId)
                        return (
                            <div className="mt-6 space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Xem trước</h3>
                                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                        {selectedDocument.type === "mp4" && selectedDocument.url ? (
                                            <video
                                                src={selectedDocument.url}
                                                controls
                                                className="max-w-full max-h-full rounded-lg"
                                            />
                                        ) : selectedDocument.thumbnail && !drawerPreviewImageFailed ? (
                                            <img
                                                src={selectedDocument.thumbnail}
                                                alt={selectedDocument.name}
                                                className="max-w-full max-h-full object-contain rounded-lg"
                                                onError={() => setDrawerPreviewImageFailed(true)}
                                            />
                                        ) : selectedDocument.type === "link" ? (
                                            <div className="text-center">
                                                <Link className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
                                                <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-sm text-cyan-600 dark:text-cyan-400 underline break-all px-4">
                                                    {selectedDocument.url}
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-4xl mb-2 block">{docType.icon}</span>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {selectedDocument.type === "mp4"
                                                        ? "Chưa có link video để xem trước"
                                                        : "Không có xem trước"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Thông tin file</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tên</span>
                                            <span className="text-gray-900 dark:text-white font-medium text-right max-w-[250px] break-words">{selectedDocument.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Loại</span>
                                            <Badge className={`${docType.color} bg-transparent border`}>{selectedDocument.type.toUpperCase()}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Kích thước</span>
                                            <span className="text-gray-900 dark:text-white">{formatFileSize(selectedDocument.size)}</span>
                                        </div>
                                        {selectedDocument.url && (
                                            <div className="flex justify-between items-start gap-3">
                                                <span className="text-gray-500">Link đính kèm</span>
                                                <a
                                                    href={selectedDocument.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-cyan-600 dark:text-cyan-400 underline text-right max-w-[250px] break-all"
                                                >
                                                    {selectedDocument.url}
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Quyền xem</span>
                                            <VisibilityBadge doc={selectedDocument} />
                                        </div>
                                        {selectedDocument.folder && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Folder</span>
                                                <span className="text-gray-900 dark:text-white">{selectedDocument.folder}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Chủ sở hữu</h3>
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={owner?.imageURL || "/placeholder.svg"} />
                                            <AvatarFallback>{owner?.name.split(" ").map((n) => n[0]).join("") || "U"}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{owner?.name || "Unknown"}</p>
                                            <p className="text-xs text-gray-500">{owner?.email || ""}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tạo lúc</span>
                                        <span className="text-gray-900 dark:text-white">{formatDate(selectedDocument.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Sửa lúc</span>
                                        <span className="text-gray-900 dark:text-white">{formatDate(selectedDocument.modifiedAt)}</span>
                                    </div>
                                </div>

                                {selectedDocument.tags.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDocument.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary"><Tag className="w-3 h-3 mr-1" />{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedDocument.description && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Mô tả</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectedDocument.description}</p>
                                    </div>
                                )}

                                <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Button variant="outline" className="flex-1 bg-transparent"
                                        onClick={() => void handleStarToggle(selectedDocument.id)}>
                                        {selectedDocument.isStarred ? <><StarOff className="w-4 h-4 mr-2" />Bỏ star</> : <><Star className="w-4 h-4 mr-2" />Star</>}
                                    </Button>
                                    {isLeaderOrAdmin && (
                                        <Button variant="outline" className="flex-1 bg-transparent"
                                            onClick={() => {
                                                const vis = selectedDocument.visibility ?? "team"
                                                setVisibilityDialog({
                                                    open: true,
                                                    docId: selectedDocument.id,
                                                    visibility: vis === "specific" ? "team" : (vis as DocVisibility),
                                                    selectedOfficePersonIds: selectedDocument.visibleToPersonIds ?? [],
                                                })
                                            }}>
                                            <Globe className="w-4 h-4 mr-2" />Quyền xem
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })()}
                </SheetContent>
            </Sheet>

            {/* ── New Folder Dialog ────────────────────────────────────── */}
            {newFolderDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tạo folder mới</h2>
                        <Input
                            autoFocus
                            placeholder="Tên folder..."
                            value={newFolderDialog.name}
                            onChange={(e) => setNewFolderDialog((s) => ({ ...s, name: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") void handleCreateFolder() }}
                            className="mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" className="bg-transparent"
                                onClick={() => setNewFolderDialog({ open: false, name: "" })}>Huỷ</Button>
                            <Button disabled={!newFolderDialog.name.trim() || isSubmitting}
                                onClick={() => void handleCreateFolder()}>Tạo</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Document Dialog ──────────────────────────────── */}
            {createDocumentDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tạo tài liệu</h2>

                        <div className="space-y-3">
                            <Input
                                type="file"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null
                                    setCreateDocumentDialog((s) => ({
                                        ...s,
                                        file,
                                        name: file ? file.name : s.name,
                                    }))
                                }}
                            />
                            <Input
                                placeholder="Tên file (tuỳ chọn, mặc định lấy theo file đã chọn)"
                                value={createDocumentDialog.name}
                                onChange={(e) => setCreateDocumentDialog((s) => ({ ...s, name: e.target.value }))}
                            />
                            <Input
                                placeholder="Link đính kèm (tuỳ chọn) - https://..."
                                value={createDocumentDialog.link}
                                onChange={(e) => setCreateDocumentDialog((s) => ({ ...s, link: e.target.value }))}
                            />
                            <Input
                                placeholder="Ảnh xem trước URL (tuỳ chọn) - https://..."
                                value={createDocumentDialog.thumbnail}
                                onChange={(e) => setCreateDocumentDialog((s) => ({ ...s, thumbnail: e.target.value }))}
                            />
                        </div>

                        {createDocumentDialog.thumbnail && (
                            <img src={createDocumentDialog.thumbnail} alt="preview" className="w-full h-40 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = "none")} />
                        )}
                        <VisibilityPicker
                            user={user}
                            visibility={createDocumentDialog.visibility}
                            onChange={(v) => setCreateDocumentDialog((s) => ({
                                ...s,
                                visibility: v,
                                selectedOfficePersonIds: (v === "team" || v === "office") ? (s.selectedOfficePersonIds ?? []) : [],
                            }))}
                        />
                        {(createDocumentDialog.visibility === "team" || createDocumentDialog.visibility === "office") && officeSelectablePeople.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nhân viên trực thuộc phòng ban
                                </p>
                                <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-2 bg-white/60 dark:bg-gray-900/20">
                                    <button
                                        type="button"
                                        onClick={() => setCreateDocumentDialog((s) => ({ ...s, selectedOfficePersonIds: [] }))}
                                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                            (createDocumentDialog.selectedOfficePersonIds ?? []).length === 0
                                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                                : "border-gray-300 text-gray-600 hover:border-blue-300 dark:border-gray-600 dark:text-gray-300"
                                        }`}
                                    >
                                        Tất cả
                                    </button>
                                    {officeSelectablePeople.map((person) => {
                                        const selected = (createDocumentDialog.selectedOfficePersonIds ?? []).includes(person.id)
                                        return (
                                            <button
                                                key={person.id}
                                                type="button"
                                                onClick={() => setCreateDocumentDialog((s) => {
                                                    const selectedIds = s.selectedOfficePersonIds ?? []
                                                    const exists = selectedIds.includes(person.id)
                                                    return {
                                                        ...s,
                                                        selectedOfficePersonIds: exists
                                                            ? selectedIds.filter((id) => id !== person.id)
                                                            : [...selectedIds, person.id],
                                                    }
                                                })}
                                                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                                    selected
                                                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                                        : "border-gray-300 text-gray-600 hover:border-blue-300 dark:border-gray-600 dark:text-gray-300"
                                                }`}
                                            >
                                                {person.name}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Chọn &quot;Tất cả&quot; để chia sẻ cho toàn bộ phòng ban, hoặc chọn từng nhân viên cụ thể.
                                </p>
                            </div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" className="bg-transparent"
                                onClick={closeCreateDocumentDialog}>Huỷ</Button>
                            <Button
                                disabled={
                                    isSubmitting ||
                                    !(
                                        createDocumentDialog.file ||
                                        createDocumentDialog.name.trim() ||
                                        createDocumentDialog.link.trim() ||
                                        createDocumentDialog.thumbnail.trim()
                                    )
                                }
                                onClick={() => void handleCreateDocument()}
                            >
                                Tạo
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Visibility Dialog ────────────────────────────────────── */}
            {visibilityDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cài đặt quyền xem</h2>
                        <VisibilityPicker
                            user={user}
                            visibility={visibilityDialog.visibility}
                            onChange={(v) => setVisibilityDialog((s) => ({
                                ...s,
                                visibility: v,
                                selectedOfficePersonIds: (v === "team" || v === "office") ? (s.selectedOfficePersonIds ?? []) : [],
                            }))}
                        />
                        {(visibilityDialog.visibility === "team" || visibilityDialog.visibility === "office") && officeSelectablePeople.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nhân viên trực thuộc phòng ban
                                </p>
                                <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-2 bg-white/60 dark:bg-gray-900/20">
                                    <button
                                        type="button"
                                        onClick={() => setVisibilityDialog((s) => ({ ...s, selectedOfficePersonIds: [] }))}
                                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                            (visibilityDialog.selectedOfficePersonIds ?? []).length === 0
                                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                                : "border-gray-300 text-gray-600 hover:border-blue-300 dark:border-gray-600 dark:text-gray-300"
                                        }`}
                                    >
                                        Tất cả
                                    </button>
                                    {officeSelectablePeople.map((person) => {
                                        const selected = (visibilityDialog.selectedOfficePersonIds ?? []).includes(person.id)
                                        return (
                                            <button
                                                key={person.id}
                                                type="button"
                                                onClick={() => setVisibilityDialog((s) => {
                                                    const selectedIds = s.selectedOfficePersonIds ?? []
                                                    const exists = selectedIds.includes(person.id)
                                                    return {
                                                        ...s,
                                                        selectedOfficePersonIds: exists
                                                            ? selectedIds.filter((id) => id !== person.id)
                                                            : [...selectedIds, person.id],
                                                    }
                                                })}
                                                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                                    selected
                                                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                                        : "border-gray-300 text-gray-600 hover:border-blue-300 dark:border-gray-600 dark:text-gray-300"
                                                }`}
                                            >
                                                {person.name}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Chọn &quot;Tất cả&quot; để chia sẻ cho toàn bộ phòng ban, hoặc chọn từng nhân viên cụ thể.
                                </p>
                            </div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" className="bg-transparent"
                                onClick={() => setVisibilityDialog(buildDefaultVisibilityDialog(user))}>Huỷ</Button>
                            <Button onClick={() => void handleSaveVisibility()}>Lưu</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── VisibilityPicker component ───────────────────────────────────────

function VisibilityPicker({
    user, visibility, onChange
}: {
    user: UserAccount | null
    visibility: DocVisibility
    onChange: (visibility: DocVisibility) => void
}) {
    const isCeoOrAdmin = user?.role === "ceo" || user?.role === "admin"
    const isVanHanhLeader = user?.role === "leader" && user?.department === "Vận hành"
    const showGroupPicker = isCeoOrAdmin || isVanHanhLeader

    if (!showGroupPicker) {
        // Regular leader: auto "team", no choice
        return (
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ai có thể xem?</p>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                    <Globe className="w-4 h-4" />
                    <div>
                        <p className="text-sm font-medium">Phòng ban của bạn</p>
                        <p className="text-xs opacity-70">Chỉ nhân viên cùng phòng ban với leader tạo tài liệu</p>
                    </div>
                </div>
            </div>
        )
    }

    const officeLabel = isCeoOrAdmin ? "Tất cả nhân viên văn phòng" : "Nhân viên văn phòng (Vận hành)"
    const officeDesc = isCeoOrAdmin ? "Tất cả các phòng ban trừ cửa hàng" : "Nhân viên trong phòng Vận hành"
    const officeValue: DocVisibility = isCeoOrAdmin ? "office" : "team"

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ai có thể xem?</p>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => onChange(officeValue)}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        visibility === officeValue
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
                    }`}
                >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                        <p className="text-sm font-medium">Nhân viên văn phòng</p>
                        <p className="text-xs opacity-70">{officeDesc}</p>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => onChange("store")}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        visibility === "store"
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-teal-300"
                    }`}
                >
                    <Store className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                        <p className="text-sm font-medium">Nhân viên cửa hàng</p>
                        <p className="text-xs opacity-70">Nhân viên thuộc phòng Cửa hàng</p>
                    </div>
                </button>
            </div>
            {isCeoOrAdmin && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    Văn phòng: tất cả phòng ban trừ Cửa hàng · Cửa hàng: nhân viên thuộc team Cửa hàng
                </p>
            )}
        </div>
    )
}
