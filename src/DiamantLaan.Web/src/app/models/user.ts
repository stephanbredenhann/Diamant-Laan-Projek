export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isOraniaResident?: boolean;
  roles?: string[];
}
