export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}
