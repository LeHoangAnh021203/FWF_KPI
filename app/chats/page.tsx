"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useDirectory } from "@/components/directory-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { findPersonForAuthUser, isPersonWorking } from "@/lib/people"
import {
    Search,
    Send,
    Paperclip,
    Smile,
    MoreVertical,
    Phone,
    Video,
    Info,
    Users,
    ImageIcon,
    Trash2,
    Check,
    CheckCheck,
} from "lucide-react"

interface Message {
    id: string
    senderId: string
    content: string
    type: "text" | "image"
    timestamp: string
    status: "sent" | "delivered" | "read"
}

interface Chat {
    id: string
    type: "individual"
    name: string
    participants: string[]
    lastMessage: string
    lastMessageTime: string
    unreadCount: number
    avatar?: string
    messages: Message[]
    isOnline?: boolean
}

function getUnreadCount(messages: Message[], currentUserId: string) {
    return messages.filter((message) => message.senderId !== currentUserId && message.status !== "read").length
}

export default function ChatsPage() {
    const { user } = useAuth()
    const { people, teams } = useDirectory()
    const currentUser =
        findPersonForAuthUser(user, people) ??
        people[0] ?? {
            id: user?.personId ?? "guest-user",
            name: user?.name ?? "Guest User",
            role: "Member",
            imageURL: "/placeholder.svg",
            email: user?.email ?? "",
            workingHours: { start: "09:00", end: "17:00", timezone: "UTC" },
            team: "marketing",
        }
    const [chats, setChats] = useState<Chat[]>([])
    const [selectedChatId, setSelectedChatId] = useState<string>("")
    const [searchQuery, setSearchQuery] = useState("")
    const [newMessage, setNewMessage] = useState("")

    const loadChats = async () => {
        const response = await fetch("/api/chats", {
            credentials: "include",
            cache: "no-store",
        })

        if (!response.ok) {
            throw new Error("Failed to load chats.")
        }

        const payload = (await response.json()) as {
            currentUserId: string
            threads: Array<{
                id: string
                participantIds: string[]
                messages: Message[]
                lastMessage: string
                lastMessageAt: string
            }>
        }

        const nextChats = payload.threads.map((thread) => {
            const teammate = people.find(
                (person) => thread.participantIds.includes(person.id) && person.id !== payload.currentUserId,
            )

            return {
                id: thread.id,
                type: "individual" as const,
                name: teammate?.name ?? "Unknown",
                participants: thread.participantIds,
                lastMessage: thread.lastMessage,
                lastMessageTime: thread.lastMessageAt,
                unreadCount: getUnreadCount(thread.messages, payload.currentUserId),
                avatar: teammate?.imageURL,
                isOnline: teammate ? isPersonWorking(teammate) : false,
                messages: thread.messages,
            }
        })

        setChats(nextChats)
    }

    useEffect(() => {
        if (!currentUser?.id || people.length === 0) {
            return
        }

        loadChats().catch(() => {
            setChats([])
        })
    }, [currentUser?.id, people])

    const filteredChats = useMemo(
        () =>
            chats.filter(
                (chat) =>
                    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        [chats, searchQuery],
    )

    useEffect(() => {
        if (!filteredChats.some((chat) => chat.id === selectedChatId)) {
            setSelectedChatId(filteredChats[0]?.id ?? "")
        }
    }, [filteredChats, selectedChatId])

    useEffect(() => {
        if (!selectedChatId) {
            return
        }

        const targetChat = chats.find((chat) => chat.id === selectedChatId)
        if (!targetChat) {
            return
        }

        const hasUnreadMessages = targetChat.messages.some(
            (message) => message.senderId !== currentUser.id && message.status !== "read",
        )

        if (!hasUnreadMessages) {
            return
        }

        fetch("/api/chats", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ threadId: selectedChatId }),
        }).then(() => loadChats())
    }, [chats, currentUser.id, selectedChatId])

    const selectedChat = filteredChats.find((chat) => chat.id === selectedChatId)

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) {
            return
        }

        await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                threadId: selectedChat.id,
                content: newMessage.trim(),
            }),
        })

        await loadChats()
        setNewMessage("")
    }

    const getMessageStatus = (status: Message["status"]) => {
        switch (status) {
            case "sent":
                return <Check className="w-3 h-3 text-gray-400" />
            case "delivered":
                return <CheckCheck className="w-3 h-3 text-gray-400" />
            case "read":
                return <CheckCheck className="w-3 h-3 text-blue-500" />
            default:
                return null
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!selectedChat) {
            return
        }

        const response = await fetch("/api/chats", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                threadId: selectedChat.id,
                messageId,
            }),
        })

        if (!response.ok) {
            return
        }

        await loadChats()
    }

    return (
        <div className="flex h-[calc(100vh-120px)]">
            <div className="flex w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Chats</h1>
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        Chỉ hiển thị thành viên cùng team {teams.find((team) => team.id === currentUser.team)?.name ?? "Marketing"}.
                    </p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-500" />
                        <Input
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white pl-10 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredChats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => setSelectedChatId(chat.id)}
                            className={`cursor-pointer border-b border-gray-100 p-4 transition-colors dark:border-gray-700 ${selectedChatId === chat.id ? "border-r-2 border-r-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className="relative">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={chat.avatar || "/placeholder.svg"} />
                                        <AvatarFallback className="bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white">
                                            {chat.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                    {chat.isOnline && (
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-gray-800" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{chat.name}</h3>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{chat.lastMessageTime}</span>
                                            {chat.unreadCount > 0 && (
                                                <Badge className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                                                    {chat.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{chat.lastMessage}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-900">
                {selectedChat ? (
                    <>
                        <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={selectedChat.avatar || "/placeholder.svg"} />
                                            <AvatarFallback className="bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white">
                                                {selectedChat.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        {selectedChat.isOnline && (
                                            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-800" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedChat.name}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {selectedChat.isOnline ? "Online" : "Last seen recently"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="icon">
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Video className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Info className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            {selectedChat.messages.map((message) => {
                                const sender = people.find((p) => p.id === message.senderId)
                                const isCurrentUser = message.senderId === currentUser.id
                                const senderName = sender?.name || "Unknown"

                                return (
                                    <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                                        <div className="flex max-w-xs items-end space-x-2 lg:max-w-md">
                                            {!isCurrentUser && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={sender?.imageURL || "/placeholder.svg"} />
                                                    <AvatarFallback className="bg-gray-200 text-xs text-gray-900 dark:bg-gray-600 dark:text-white">
                                                        {senderName
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                                                <div className="flex items-start gap-2">
                                                    <div
                                                    className={`rounded-2xl px-4 py-2 ${isCurrentUser
                                                            ? "bg-blue-500 text-white"
                                                            : "border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                        }`}
                                                    >
                                                        {message.type === "text" ? (
                                                            <p className="text-sm">{message.content}</p>
                                                        ) : (
                                                            <div className="overflow-hidden rounded-lg">
                                                                <img
                                                                    src={message.content || "/placeholder.svg"}
                                                                    alt="Shared image"
                                                                    className="h-auto max-w-full rounded-lg"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isCurrentUser ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0 text-gray-400 hover:text-red-500"
                                                            onClick={() => void handleDeleteMessage(message.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                                <div className={`mt-1 flex items-center space-x-1 ${isCurrentUser ? "flex-row-reverse space-x-reverse" : ""}`}>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{message.timestamp}</span>
                                                    {isCurrentUser && getMessageStatus(message.status)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="icon">
                                    <Paperclip className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                    <ImageIcon className="w-4 h-4" />
                                </Button>
                                <div className="relative flex-1">
                                    <Input
                                        placeholder={`Nhắn cho ${selectedChat.name}...`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                        className="bg-gray-100 pr-10 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 transform">
                                        <Smile className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                                <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">No team conversations</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Tài khoản này chưa có teammate nào trong cùng team để bắt đầu chat.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
