export interface User {
  id: number;
  username: string;
  email?: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface UserCreateInput {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
}

export interface UserLoginInput {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}
