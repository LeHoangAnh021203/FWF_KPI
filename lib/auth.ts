export type UserRole = "ceo" | "leader" | "employee" | "admin";

export type Department =
  | "Hành chính - Nhân sự"
  | "IT"
  | "Sales"
  | "Marketing"
  | "Kế toán"
  | "Vận hành";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  personId?: string;
  role: UserRole;
  department: Department;
  verified: boolean;
};

export const COMPANY_DOMAIN = "@facewashfox.com";

export const departments: Department[] = [
  "Hành chính - Nhân sự",
  "IT",
  "Marketing",
  "Sales",
  "Kế toán",
  "Vận hành"
];

export const registrationRoles: UserRole[] = ["employee", "leader", "ceo", "admin"];

export const seededUsers: UserAccount[] = [
  {
    id: "u-people-0",
    name: "Kiều Anh",
    email: "anh@facewashfox.com",
    password: "123",
    personId: "people_0",
    role: "employee",
    department: "Marketing",
    verified: true
  },

  {
    id: "u-people-3",
    name: "Minh Hieu",
    email: "hieu@facewashfox.com",
    password: "123",
    personId: "people_3",
    role: "leader",
    department: "Marketing",
    verified: true
  }
];

export function isCompanyEmail(email: string) {
  return email.trim().toLowerCase().endsWith(COMPANY_DOMAIN);
}
