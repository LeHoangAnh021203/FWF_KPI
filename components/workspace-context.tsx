"use client"

import * as React from "react"
import { useAuth } from "@/components/auth-provider"
import { findPersonForAuthUser } from "@/lib/people"

export interface Project {
    id: string
    name: string
    color: string
    memberIds: string[]
}

export interface Task {
    id: number
    projectId: string
    name: string
    comments: number
    likes: number
    assigneeId: string
    status: string
    statusColor: string
    executionPeriod: string
    audience: string
    weight: string
    resultMethod: string
    target?: string
    progress?: number
    kpis: string[]
    childGoal: string
    parentGoal: string
    description: string
    attachments: TaskAttachment[]
}

export interface TaskAttachment {
    id: string
    name: string
    size: number
    type: string
}

export type TimePeriod = "This Week" | "Last Week" | "This Month"

export type TaskGroups = Record<TimePeriod, Task[]>

export interface NewTaskInput {
    projectId: string
    timePeriod: TimePeriod
    name: string
    assigneeId: string
    status: Task["status"]
    executionPeriod: string
    audience: string
    weight: string
    resultMethod: string
    target: string
    progress: number
    kpis: string[]
    childGoal: string
    parentGoal: string
    description: string
    attachments: TaskAttachment[]
}

type WorkspaceContextValue = {
    currentUserId: string
    projects: Project[]
    projectTasks: Record<string, TaskGroups>
    isReady: boolean
    addProject: (project: Omit<Project, "id">) => Promise<Project>
    addTask: (input: NewTaskInput) => Promise<Task>
    updateTask: (taskId: number, updates: Partial<Omit<Task, "id" | "projectId">>, projectId?: string) => Promise<Task | null>
    updateTaskAssignee: (taskId: number, newAssigneeId: string, projectId?: string) => Promise<void>
}

const CURRENT_USER_ID = "people_11"

const createEmptyTaskGroups = (): TaskGroups => ({
    "This Week": [],
    "Last Week": [],
    "This Month": [],
})

const initialProjects: Project[] = [
    { id: "1", name: "Digital Marketing", color: "bg-pink-200", memberIds: ["people_0", "people_1", "people_2", "people_3"] },
    { id: "2", name: "Content Creator", color: "bg-blue-200 dark:bg-blue-800", memberIds: ["people_2", "people_3"] },
]

const initialProjectTasks: Record<string, TaskGroups> = {
    "1": {
        "This Week": [
            {
                id: 10,
                projectId: "1",
                name: "Số lượng Mess (Messaging conversations started)",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "15%",
                resultMethod: "Manual Entry",
                kpis: ["Số lượng Mess"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI",
                description: "Theo dõi số lượng cuộc hội thoại nhắn tin được khởi tạo theo mục tiêu tháng.",
                attachments: [],
            },
            {
                id: 11,
                projectId: "1",
                name: "Cost per Mess (Chi phí/cuộc hội thoại)",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Cost per Mess"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI",
                description: "Kiểm soát chi phí trên mỗi cuộc hội thoại nhắn tin theo mục tiêu tháng.",
                attachments: [],
            },
            {
                id: 12,
                projectId: "1",
                name: "Số lượng Checkout (Initiate Checkout)",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Số lượng Checkout"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI",
                description: "Đạt số lượng initiate checkout theo mục tiêu tháng của chiến dịch.",
                attachments: [],
            },
            {
                id: 13,
                projectId: "1",
                name: "Cost per Checkout (Chi phí/lượt checkout)",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Cost per Checkout"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI",
                description: "Tối ưu chi phí trên mỗi lượt checkout theo mục tiêu tháng.",
                attachments: [],
            },
            {
                id: 14,
                projectId: "1",
                name: "Tỷ lệ ngân sách sử dụng đúng kế hoạch",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Tỷ lệ ngân sách sử dụng đúng kế hoạch"],
                childGoal: "Nhóm 2: Quản lý ngân sách & tối ưu",
                parentGoal: "Marketing Performance KPI",
                description: "Đảm bảo ngân sách quảng cáo được sử dụng đúng theo kế hoạch đã duyệt.",
                attachments: [],
            },
            {
                id: 15,
                projectId: "1",
                name: "Tỷ lệ Ads Account không bị gián đoạn hoặc có lỗi phân phối",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "8%",
                resultMethod: "Manual Entry",
                kpis: ["Ads Account Stability"],
                childGoal: "Nhóm 2: Quản lý ngân sách & tối ưu",
                parentGoal: "Marketing Performance KPI",
                description: "Giữ tài khoản quảng cáo hoạt động ổn định, không lỗi phân phối hoặc gián đoạn.",
                attachments: [],
            },
            {
                id: 16,
                projectId: "1",
                name: "CPM trung bình tài khoản",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "7%",
                resultMethod: "Manual Entry",
                kpis: ["CPM trung bình tài khoản"],
                childGoal: "Nhóm 2: Quản lý ngân sách & tối ưu",
                parentGoal: "Marketing Performance KPI",
                description: "Theo dõi CPM trung bình để phản ánh chất lượng targeting và creative.",
                attachments: [],
            },
            {
                id: 17,
                projectId: "1",
                name: "Gắn tag tracking người dùng nhắn tin trên Meta",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Tracking tagged users"],
                childGoal: "Nhóm 2: Quản lý ngân sách & tối ưu",
                parentGoal: "Marketing Performance KPI",
                description: "Gắn tag tracking cho người dùng nhắn tin trên Meta, mục tiêu tối thiểu >= 70% total Mess.",
                attachments: [],
            },
            {
                id: 18,
                projectId: "1",
                name: "Báo cáo hiệu quả quảng cáo nộp đúng hạn",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["On-time ads report"],
                childGoal: "Nhóm 3: Báo cáo & phân tích",
                parentGoal: "Marketing Performance KPI",
                description: "Nộp báo cáo hiệu quả quảng cáo đúng hạn với tỷ lệ hoàn thành mục tiêu 100%.",
                attachments: [],
            },
            {
                id: 19,
                projectId: "1",
                name: "Chất lượng báo cáo (đầy đủ insight + đề xuất)",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Báo cáo chất lượng"],
                childGoal: "Nhóm 3: Báo cáo & phân tích",
                parentGoal: "Marketing Performance KPI",
                description: "Đảm bảo báo cáo có đủ insight, nhận định và đề xuất hành động rõ ràng.",
                attachments: [],
            },
            {
                id: 20,
                projectId: "1",
                name: "Đưa ra idea / ref để team video editor / content creator sản xuất",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Creative ideas / ref"],
                childGoal: "Nhóm 4: Sáng tạo nội dung về content chạy ads",
                parentGoal: "Marketing Performance KPI",
                description: "Đề xuất idea và reference để team sản xuất video/content ads theo mục tiêu tháng.",
                attachments: [],
            },
            {
                id: 21,
                projectId: "1",
                name: "Brief thiết kế dựa trên idea / ref để sản xuất Content Ads",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Creative brief completion"],
                childGoal: "Nhóm 4: Sáng tạo nội dung về content chạy ads",
                parentGoal: "Marketing Performance KPI",
                description: "Hoàn thiện brief thiết kế dựa trên idea và reference để sản xuất content ads.",
                attachments: [],
            },
            {
                id: 22,
                projectId: "1",
                name: "Tuân thủ quy trình, nội quy công ty",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Process compliance"],
                childGoal: "Nhóm 5: Thái độ & kỷ luật",
                parentGoal: "Marketing Performance KPI",
                description: "Đảm bảo tuân thủ quy trình vận hành, nội quy và quy định công ty.",
                attachments: [],
            },
            {
                id: 23,
                projectId: "1",
                name: "Cập nhật xu hướng, thuật toán nền tảng hoặc nghiên cứu đối thủ",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Trend and competitor update"],
                childGoal: "Nhóm 5: Thái độ & kỷ luật",
                parentGoal: "Marketing Performance KPI",
                description: "Chủ động cập nhật xu hướng, thay đổi thuật toán nền tảng và nghiên cứu đối thủ cạnh tranh.",
                attachments: [],
            },
            {
                id: 24,
                projectId: "1",
                name: "Linh động theo sự sắp xếp của Ban Giám Đốc và Quản lý",
                comments: 0,
                likes: 0,
                assigneeId: "people_0",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Management-assigned achievements"],
                childGoal: "Nhóm 6: Các thành tựu nổi bật được ghi nhận",
                parentGoal: "Marketing Performance KPI",
                description: "Thực hiện linh động các đầu việc phát sinh theo sắp xếp của Ban Giám Đốc và Quản lý.",
                attachments: [],
            },
            {
                id: 25,
                projectId: "1",
                name: "Số lượng Mess (Messaging conversations started)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Số lượng Mess"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Theo dõi số lượng cuộc hội thoại nhắn tin được khởi tạo theo mục tiêu tháng cho Lâm.",
                attachments: [],
            },
            {
                id: 26,
                projectId: "1",
                name: "Cost per Mess (Chi phí/cuộc hội thoại)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Cost per Mess"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Kiểm soát chi phí trên mỗi cuộc hội thoại nhắn tin theo KPI tuần của Lâm.",
                attachments: [],
            },
            {
                id: 27,
                projectId: "1",
                name: "Số lượng Checkout (Initiate Checkout)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Số lượng Checkout"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Đạt số lượng initiate checkout theo kế hoạch nội dung và KPI quảng cáo.",
                attachments: [],
            },
            {
                id: 28,
                projectId: "1",
                name: "Cost per Checkout (Chi phí/lượt checkout)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Cost per Checkout"],
                childGoal: "Nhóm 1: Hiệu quả chiến dịch",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Tối ưu chi phí trên mỗi lượt checkout của các chiến dịch ads có dùng video.",
                attachments: [],
            },
            {
                id: 29,
                projectId: "1",
                name: "Tỷ lệ ngân sách sử dụng đúng kế hoạch",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Budget adherence"],
                childGoal: "Nhóm 2: Quản lý ngân sách & tối ưu",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Theo dõi việc sử dụng ngân sách video ads theo đúng kế hoạch được duyệt.",
                attachments: [],
            },
            {
                id: 30,
                projectId: "1",
                name: "Tỷ lệ Ads Account không bị gián đoạn hoặc có lỗi phân phối",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Ads Account Stability"],
                childGoal: "Nhóm 2: Quản lý ngân sách & tối ưu",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Đảm bảo tài khoản ads phục vụ video campaign không bị gián đoạn hoặc lỗi phân phối.",
                attachments: [],
            },
            {
                id: 31,
                projectId: "1",
                name: "Đưa ra idea / ref để team video editor / content creator sản xuất",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "15%",
                resultMethod: "Manual Entry",
                kpis: ["Creative idea / ref"],
                childGoal: "Nhóm 3: Sáng tạo nội dung về content chạy ads",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Đưa ra idea và reference cho team video editor/content creator phục vụ content ads.",
                attachments: [],
            },
            {
                id: 32,
                projectId: "1",
                name: "Brief thiết kế dựa trên idea / ref để sản xuất Content Ads",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Creative brief"],
                childGoal: "Nhóm 3: Sáng tạo nội dung về content chạy ads",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Hoàn thiện brief thiết kế cho các nội dung ads dựa trên idea và reference đã chọn.",
                attachments: [],
            },
            {
                id: 33,
                projectId: "1",
                name: "Tuân thủ quy trình, nội quy công ty",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Process compliance"],
                childGoal: "Nhóm 4: Thái độ & kỷ luật",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Đảm bảo tuân thủ quy trình, nội quy công ty trong suốt quá trình sản xuất và vận hành.",
                attachments: [],
            },
            {
                id: 34,
                projectId: "1",
                name: "Cập nhật xu hướng, thuật toán nền tảng hoặc nghiên cứu đối thủ",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Trend research"],
                childGoal: "Nhóm 4: Thái độ & kỷ luật",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Chủ động cập nhật xu hướng nội dung, thay đổi thuật toán nền tảng và nghiên cứu đối thủ.",
                attachments: [],
            },
            {
                id: 35,
                projectId: "1",
                name: "Số lượng video sản xuất/tháng (đạt chuẩn chất lượng)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Video production volume"],
                childGoal: "Nhóm 5: Video editor — sản xuất video quảng cáo",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Đảm bảo số lượng video sản xuất trong tháng đạt chuẩn chất lượng yêu cầu.",
                attachments: [],
            },
            {
                id: 36,
                projectId: "1",
                name: "Hoàn thành video đúng deadline theo kế hoạch content",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["On-time video delivery"],
                childGoal: "Nhóm 5: Video editor — sản xuất video quảng cáo",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Bàn giao video đúng deadline theo kế hoạch content đã thống nhất.",
                attachments: [],
            },
            {
                id: 37,
                projectId: "1",
                name: "Hook rate (% người xem giữ lại sau 3 giây đầu)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "2%",
                resultMethod: "Manual Entry",
                kpis: ["Hook rate"],
                childGoal: "Nhóm 5: Video editor — sản xuất video quảng cáo",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Theo dõi tỷ lệ giữ chân người xem sau 3 giây đầu của video quảng cáo.",
                attachments: [],
            },
            {
                id: 38,
                projectId: "1",
                name: "ThruPlay rate (% xem hết hoặc ≥15s)",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "2%",
                resultMethod: "Manual Entry",
                kpis: ["ThruPlay rate"],
                childGoal: "Nhóm 5: Video editor — sản xuất video quảng cáo",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Đánh giá tỷ lệ người xem hết video hoặc xem tối thiểu 15 giây.",
                attachments: [],
            },
            {
                id: 39,
                projectId: "1",
                name: "Tỷ lệ video đạt CTR khi chạy Ads",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "1%",
                resultMethod: "Manual Entry",
                kpis: ["Video CTR"],
                childGoal: "Nhóm 5: Video editor — sản xuất video quảng cáo",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Theo dõi tỷ lệ click-through-rate của video khi triển khai chạy ads.",
                attachments: [],
            },
            {
                id: 40,
                projectId: "1",
                name: "Linh động theo sự sắp xếp của Ban Giám Đốc và Quản lý",
                comments: 0,
                likes: 0,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Management-assigned work"],
                childGoal: "Nhóm 6: Các công việc được giao thêm",
                parentGoal: "Marketing Performance KPI - Video Ads",
                description: "Thực hiện linh động các công việc phát sinh được Ban Giám Đốc và Quản lý giao thêm.",
                attachments: [],
            },
            {
                id: 41,
                projectId: "1",
                name: "Số lượng video hoàn thành/tháng đạt chuẩn chất lượng",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "15%",
                resultMethod: "Manual Entry",
                kpis: ["Video output quality"],
                childGoal: "Nhóm 1: Sản xuất video",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Đảm bảo số lượng video hoàn thành trong tháng đạt chuẩn về phân giải, màu sắc và âm thanh.",
                attachments: [],
            },
            {
                id: 42,
                projectId: "1",
                name: "Hoàn thành video đúng deadline theo kế hoạch content",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["On-time video delivery"],
                childGoal: "Nhóm 1: Sản xuất video",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Bàn giao video đúng deadline theo kế hoạch content đã thống nhất với team.",
                attachments: [],
            },
            {
                id: 43,
                projectId: "1",
                name: "Tỷ lệ video được duyệt không cần sửa lại lần đầu",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["First-pass approval rate"],
                childGoal: "Nhóm 1: Sản xuất video",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Nâng tỷ lệ video được duyệt ngay từ lần đầu, hạn chế chỉnh sửa lặp lại.",
                attachments: [],
            },
            {
                id: 44,
                projectId: "1",
                name: "Số vòng sửa trung bình/video ≤ 2 vòng",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Revision rounds per video"],
                childGoal: "Nhóm 2: Revise & phản hồi",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Giữ số vòng sửa trung bình mỗi video ở mức tối đa 2 vòng, phản ánh khả năng hiểu brief và chất lượng bản dựng đầu tiên.",
                attachments: [],
            },
            {
                id: 45,
                projectId: "1",
                name: "Thời gian phản hồi feedback trong vòng 24 giờ làm việc",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "8%",
                resultMethod: "Manual Entry",
                kpis: ["Feedback response time"],
                childGoal: "Nhóm 2: Revise & phản hồi",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Phản hồi các yêu cầu chỉnh sửa trong vòng 24 giờ làm việc kể từ khi nhận feedback.",
                attachments: [],
            },
            {
                id: 46,
                projectId: "1",
                name: "Tỷ lệ hoàn thành sửa đúng yêu cầu ngay lần đầu",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "7%",
                resultMethod: "Manual Entry",
                kpis: ["First-revision accuracy"],
                childGoal: "Nhóm 2: Revise & phản hồi",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Hoàn thành chỉnh sửa đúng yêu cầu ngay lần đầu, không để sót lỗi đã được góp ý.",
                attachments: [],
            },
            {
                id: 47,
                projectId: "1",
                name: "Đề xuất lại source / kịch bản quay với team content creator",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "8%",
                resultMethod: "Manual Entry",
                kpis: ["Source / script proposals"],
                childGoal: "Nhóm 3: Sáng tạo & ý tưởng",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Chủ động đề xuất source hoặc kịch bản quay với team content creator, mục tiêu 2 lần mỗi tuần.",
                attachments: [],
            },
            {
                id: 48,
                projectId: "1",
                name: "Cập nhật và ứng dụng xu hướng dựng mới trên thị trường chung",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "7%",
                resultMethod: "Manual Entry",
                kpis: ["Trend application"],
                childGoal: "Nhóm 3: Sáng tạo & ý tưởng",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Cập nhật và áp dụng xu hướng dựng mới trên thị trường chung, mục tiêu 2 lần mỗi tuần.",
                attachments: [],
            },
            {
                id: 49,
                projectId: "1",
                name: "Tuân thủ quy trình giao nhận, brief và vòng sửa đổi đúng quy định",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Workflow compliance"],
                childGoal: "Nhóm 4: Quy trình & cột mốc",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Tuân thủ đầy đủ quy trình giao nhận, nhận brief và revision đúng quy định của team.",
                attachments: [],
            },
            {
                id: 50,
                projectId: "1",
                name: "Phối hợp với team Content/Ads đúng tiến độ, phản hồi kịp thời",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Team coordination"],
                childGoal: "Nhóm 4: Quy trình & cột mốc",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Phối hợp với team Content/Ads đúng tiến độ và phản hồi kịp thời trong quá trình sản xuất.",
                attachments: [],
            },
            {
                id: 51,
                projectId: "1",
                name: "Quản lý và lưu trữ file dự án đúng cấu trúc thư mục quy định",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Project file management"],
                childGoal: "Nhóm 4: Quy trình & cột mốc",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Quản lý và lưu trữ file dự án theo đúng cấu trúc thư mục quy định của team.",
                attachments: [],
            },
            {
                id: 52,
                projectId: "1",
                name: "Tuân thủ nội quy, giờ giấc, tác phong chuyên nghiệp",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "5%",
                resultMethod: "Manual Entry",
                kpis: ["Professional discipline"],
                childGoal: "Nhóm 5: Thái độ & kỷ luật",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Giữ đúng giờ, tuân thủ nội quy và tác phong làm việc chuyên nghiệp.",
                attachments: [],
            },
            {
                id: 53,
                projectId: "1",
                name: "Linh động theo sự sắp xếp của Ban Giám Đốc và Quản lý",
                comments: 0,
                likes: 0,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/04 - 07/04/2026)",
                audience: "Personal",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Management-assigned work"],
                childGoal: "Nhóm 6: Các công việc được giao thêm",
                parentGoal: "Marketing Performance KPI - Video Production",
                description: "Thực hiện linh động các công việc phát sinh được Ban Giám Đốc và Quản lý giao thêm.",
                attachments: [],
            },
            {
                id: 1,
                projectId: "1",
                name: "Finalize event landing page",
                comments: 7,
                likes: 2,
                assigneeId: CURRENT_USER_ID,
                status: "In Progress",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                executionPeriod: "Week 1 (01/03 - 07/03/2026)",
                audience: "Personal",
                weight: "35%",
                resultMethod: "Manual Entry",
                kpis: ["Event Leads", "Landing Page Conversion"],
                childGoal: "Finalize planning assets",
                parentGoal: "Q1 Event Launch",
                description: "Coordinate the main event landing experience and campaign readiness.",
                attachments: [],
            },
            {
                id: 2,
                projectId: "1",
                name: "Confirm speaker schedule",
                comments: 4,
                likes: 1,
                assigneeId: "people_1",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/03 - 07/03/2026)",
                audience: "Team",
                weight: "20%",
                resultMethod: "Manual Entry",
                kpis: ["Confirmed Speakers"],
                childGoal: "Speaker communication",
                parentGoal: "Q1 Event Launch",
                description: "Lock the confirmed session lineup and align with event agenda.",
                attachments: [],
            },
        ],
        "Last Week": [
            {
                id: 3,
                projectId: "1",
                name: "Prepare event budget sheet",
                comments: 5,
                likes: 3,
                assigneeId: CURRENT_USER_ID,
                status: "Completed",
                statusColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                executionPeriod: "Week 4 (22/02 - 28/02/2026)",
                audience: "Personal",
                weight: "15%",
                resultMethod: "Manual Entry",
                kpis: ["Budget Accuracy"],
                childGoal: "Budget draft",
                parentGoal: "Q1 Event Launch",
                description: "Completed the event budget baseline for stakeholder review.",
                attachments: [],
            },
        ],
        "This Month": [
            {
                id: 9,
                projectId: "1",
                name: "Triển khai KPI Marketing Ads tháng cho Kiều Anh",
                comments: 12,
                likes: 7,
                assigneeId: "people_0",
                status: "In Progress",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                executionPeriod: "April 2026",
                audience: "Personal",
                weight: "110%",
                resultMethod: "Manual Entry",
                kpis: [
                    "Số lượng Mess",
                    "Cost per Mess",
                    "Số lượng Checkout",
                    "Cost per Checkout",
                    "Tỷ lệ ngân sách sử dụng đúng kế hoạch",
                    "Tỷ lệ Ads Account không bị gián đoạn hoặc có lỗi phân phối",
                    "CPM trung bình tài khoản",
                    "Gắn tag tracking người dùng nhắn tin trên Meta",
                    "Báo cáo hiệu quả quảng cáo nộp đúng hạn",
                    "Chất lượng báo cáo",
                    "Đưa ra idea / ref cho team video editor / content creator",
                    "Brief thiết kế dựa trên idea / ref để sản xuất Content Ads",
                    "Tuân thủ quy trình, nội quy công ty",
                    "Cập nhật xu hướng, thuật toán nền tảng hoặc nghiên cứu đối thủ",
                    "Linh động theo sự sắp xếp của Ban Giám Đốc và Quản lý",
                ],
                childGoal: "Đảm bảo hiệu quả chiến dịch Ads, tối ưu ngân sách và chất lượng báo cáo tháng",
                parentGoal: "Marketing Performance KPI",
                description:
                    "Task tổng hợp KPI tháng của Kiều Anh theo 6 nhóm chỉ tiêu: hiệu quả chiến dịch, quản lý ngân sách, báo cáo và phân tích, sáng tạo nội dung, thái độ kỷ luật và các thành tựu nổi bật được ghi nhận.",
                attachments: [],
            },
            {
                id: 4,
                projectId: "1",
                name: "Coordinate venue checklist",
                comments: 8,
                likes: 6,
                assigneeId: CURRENT_USER_ID,
                status: "In Progress",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                executionPeriod: "March 2026",
                audience: "Team",
                weight: "30%",
                resultMethod: "Manual Entry",
                kpis: ["Checklist Completion"],
                childGoal: "Venue operations",
                parentGoal: "Q1 Event Launch",
                description: "Track all venue requirements, vendors, and readiness checkpoints.",
                attachments: [],
            },
        ],
    },
    "2": {
        "This Week": [
            {
                id: 5,
                projectId: "2",
                name: "Build KPI breakfast report",
                comments: 10,
                likes: 5,
                assigneeId: CURRENT_USER_ID,
                status: "In Progress",
                statusColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                executionPeriod: "Week 1 (01/03 - 07/03/2026)",
                audience: "Personal",
                weight: "40%",
                resultMethod: "Manual Entry",
                kpis: ["KPI Report Completion", "Accuracy Rate"],
                childGoal: "Weekly KPI pack",
                parentGoal: "Breakfast Operations",
                description: "Build the weekly KPI report used in the breakfast planning review.",
                attachments: [],
            },
            {
                id: 6,
                projectId: "2",
                name: "Review supplier options",
                comments: 2,
                likes: 1,
                assigneeId: "people_2",
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "Week 1 (01/03 - 07/03/2026)",
                audience: "Department",
                weight: "10%",
                resultMethod: "Manual Entry",
                kpis: ["Supplier Coverage"],
                childGoal: "Vendor shortlist",
                parentGoal: "Breakfast Operations",
                description: "Evaluate breakfast vendors and shortlist options for the next sprint.",
                attachments: [],
            },
        ],
        "Last Week": [
            {
                id: 7,
                projectId: "2",
                name: "Document breakfast workflow",
                comments: 3,
                likes: 2,
                assigneeId: CURRENT_USER_ID,
                status: "Completed",
                statusColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                executionPeriod: "Week 4 (22/02 - 28/02/2026)",
                audience: "Team",
                weight: "15%",
                resultMethod: "Manual Entry",
                kpis: ["Documentation Coverage"],
                childGoal: "Ops documentation",
                parentGoal: "Breakfast Operations",
                description: "Documented the breakfast workflow for easier handoff and tracking.",
                attachments: [],
            },
        ],
        "This Month": [
            {
                id: 8,
                projectId: "2",
                name: "Optimize cost tracking sheet",
                comments: 6,
                likes: 4,
                assigneeId: CURRENT_USER_ID,
                status: "Pending",
                statusColor: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
                executionPeriod: "March 2026",
                audience: "Personal",
                weight: "20%",
                resultMethod: "Manual Entry",
                kpis: ["Cost Variance"],
                childGoal: "Cost controls",
                parentGoal: "Breakfast Operations",
                description: "Optimize tracking logic for breakfast operational costs and variance.",
                attachments: [],
            },
        ],
    },
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)
const PROJECTS_STORAGE_KEY = "fwf-workspace-projects"
const PROJECT_TASKS_STORAGE_KEY = "fwf-workspace-project-tasks"

function normalizeProject(project: Project): Project {
    return {
        ...project,
        memberIds: Array.isArray(project.memberIds) ? project.memberIds : [],
    }
}

function readStoredProjects() {
    if (typeof window === "undefined") {
        return initialProjects
    }

    try {
        const rawValue = window.localStorage.getItem(PROJECTS_STORAGE_KEY)
        if (!rawValue) {
            return initialProjects
        }

        const parsedValue = JSON.parse(rawValue) as Project[]
        return parsedValue.map(normalizeProject)
    } catch {
        return initialProjects
    }
}

function readStoredProjectTasks() {
    if (typeof window === "undefined") {
        return initialProjectTasks
    }

    try {
        const rawValue = window.localStorage.getItem(PROJECT_TASKS_STORAGE_KEY)
        if (!rawValue) {
            return initialProjectTasks
        }

        return JSON.parse(rawValue) as Record<string, TaskGroups>
    } catch {
        return initialProjectTasks
    }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [projects, setProjects] = React.useState<Project[]>([])
    const [projectTasks, setProjectTasks] = React.useState<Record<string, TaskGroups>>({})
    const [currentUserId, setCurrentUserId] = React.useState("")
    const [isReady, setIsReady] = React.useState(false)

    const refreshWorkspace = React.useCallback(async () => {
        const response = await fetch("/api/workspace", {
            credentials: "include",
            cache: "no-store",
        })

        if (!response.ok) {
            throw new Error("Failed to load workspace.")
        }

        const payload = (await response.json()) as {
            currentUserId: string
            projects: Project[]
            projectTasks: Record<string, TaskGroups>
        }

        setCurrentUserId(payload.currentUserId)
        setProjects(payload.projects.map(normalizeProject))
        setProjectTasks(payload.projectTasks)
    }, [])

    React.useEffect(() => {
        let isMounted = true

        refreshWorkspace()
            .catch(() => {
                if (!isMounted) {
                    return
                }

                setCurrentUserId(findPersonForAuthUser(user)?.id ?? "")
                setProjects(initialProjects)
                setProjectTasks(initialProjectTasks)
            })
            .finally(() => {
                if (isMounted) {
                    setIsReady(true)
                }
            })

        return () => {
            isMounted = false
        }
    }, [refreshWorkspace, user])

    const addProject = React.useCallback(async (project: Omit<Project, "id">) => {
        const response = await fetch("/api/workspace/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(project),
        })

        if (!response.ok) {
            throw new Error("Failed to create team.")
        }

        const payload = (await response.json()) as { ok: boolean; project: Project }
        const newProject = normalizeProject(payload.project)

        setProjects((prevProjects) => [...prevProjects, newProject])
        setProjectTasks((prevTasks) => ({
            ...prevTasks,
            [newProject.id]: createEmptyTaskGroups(),
        }))

        return newProject
    }, [])

    const addTask = React.useCallback(async (input: NewTaskInput) => {
        const response = await fetch("/api/workspace/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(input),
        })

        if (!response.ok) {
            throw new Error("Failed to create task.")
        }

        const payload = (await response.json()) as { ok: boolean; task: Task }
        const newTask = payload.task

        setProjectTasks((prevTasks) => {
            const currentProjectTasks = prevTasks[input.projectId] ?? createEmptyTaskGroups()

            return {
                ...prevTasks,
                [input.projectId]: {
                    ...currentProjectTasks,
                    [input.timePeriod]: [newTask, ...currentProjectTasks[input.timePeriod]],
                },
            }
        })

        return newTask
    }, [])

    const updateTask = React.useCallback(
        async (taskId: number, updates: Partial<Omit<Task, "id" | "projectId">>, projectId?: string) => {
            const response = await fetch(`/api/workspace/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updates),
            })

            if (!response.ok) {
                return null
            }

            const payload = (await response.json()) as { ok: boolean; task: Task }
            const updatedTask = payload.task

            setProjectTasks((prevTasks) => {
                const targetProjectIds = projectId ? [projectId] : Object.keys(prevTasks)
                const nextTasks = { ...prevTasks }

                targetProjectIds.forEach((currentProjectId) => {
                    const taskGroups = prevTasks[currentProjectId]

                    if (!taskGroups) {
                        return
                    }

                    const updateTaskInList = (tasks: Task[]) =>
                        tasks.map((task) => (task.id === taskId ? updatedTask : task))

                    nextTasks[currentProjectId] = {
                        "This Week": updateTaskInList(taskGroups["This Week"]),
                        "Last Week": updateTaskInList(taskGroups["Last Week"]),
                        "This Month": updateTaskInList(taskGroups["This Month"]),
                    }
                })

                return nextTasks
            })

            return updatedTask
        },
        [],
    )

    const updateTaskAssignee = React.useCallback(
        async (taskId: number, newAssigneeId: string, projectId?: string) => {
            await updateTask(taskId, { assigneeId: newAssigneeId }, projectId)
        },
        [updateTask],
    )

    return (
        <WorkspaceContext.Provider
            value={{
                currentUserId,
                projects,
                projectTasks,
                isReady,
                addProject,
                addTask,
                updateTask,
                updateTaskAssignee,
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const context = React.useContext(WorkspaceContext)

    if (!context) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider")
    }

    return context
}
