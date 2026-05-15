// ============================================
// services/authService.ts
// ============================================

export interface User {
  fullName: string;
  email: string;
  phone: string;
  client: string;
  password: string;
  role: string;
}

const USERS_KEY = "abc_users";

// ============================================
// DUMMY USERS
// ============================================

const dummyUsers: User[] = [
  {
    fullName: "Admin User",
    email: "admin@abc.com",
    phone: "9999999999",
    client: "ABC",
    password: "admin123",
    role: "admin",
  },
  {
    // ✅ NEW: Samsung HR Manager added here
    fullName: "Samsung HR Admin",
    email: "hr@samsung.com",
    phone: "7777777777", 
    client: "Samsung",
    password: "samsung123",
    role: "b_manager", 
  },
  {
    fullName: "John Employee",
    email: "john@infosys.com",
    phone: "8888888888",
    client: "Infosys",
    password: "john123",
    role: "user",
  },
];

// ============================================
// REGISTER USER
// ============================================

export const registerUser = (user: User) => {
  const users: User[] = JSON.parse(
    localStorage.getItem(USERS_KEY) || "[]"
  );

  users.push(user);

  localStorage.setItem(
    USERS_KEY,
    JSON.stringify(users)
  );
};

// ============================================
// LOGIN USER
// ============================================

export const loginUser = (
  username: string,
  password: string
) => {
  const localUsers: User[] = JSON.parse(
    localStorage.getItem(USERS_KEY) || "[]"
  );

  // Combine hardcoded dummies with any users registered via the Signup page
  const allUsers = [
    ...dummyUsers,
    ...localUsers,
  ];

  // Find matching user by email OR phone
  return allUsers.find(
    (user) =>
      (
        user.email === username ||
        user.phone === username
      ) &&
      user.password === password
  );
};