import { Lang } from '../i18n/lang.service';

export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  isOraniaResident?: boolean;
  isOraniaBewegingMember?: boolean;
  receiveBlockProgressEmails?: boolean;
  language?: Lang;
  roles?: string[];
  mustChangePassword?: boolean;
}

export interface ProfileResponse {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  isOraniaResident?: boolean;
  isOraniaBewegingMember?: boolean;
  receiveBlockProgressEmails: boolean;
  language: Lang;
  changesRemaining: number;
  changesAllowed: boolean;
  windowResetsAt?: string | null;
  maxChanges: number;
}
