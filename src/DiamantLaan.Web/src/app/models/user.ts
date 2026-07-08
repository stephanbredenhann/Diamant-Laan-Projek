export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  isOraniaResident?: boolean;
  receiveBlockProgressEmails?: boolean;
  roles?: string[];
}

export interface ProfileResponse {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  isOraniaResident?: boolean;
  receiveBlockProgressEmails: boolean;
  changesRemaining: number;
  changesAllowed: boolean;
  windowResetsAt?: string | null;
  maxChanges: number;
}
