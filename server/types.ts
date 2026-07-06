export type Role = 'admin' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Env {
  DB: D1Database;
  AVATARS: R2Bucket;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface Variables {
  user?: AuthUser;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  created_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
}

export interface CvDocument {
  id: string;
  user_id: string;
  template_id: string;
  data_json: string;
  updated_at: number;
}
