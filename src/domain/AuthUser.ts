import { AppConstants } from "../constants/AppConstants.js";

export class AuthUser {
  constructor(
    public readonly id: string,
    public readonly roles: string[],
  ) {}

  isAdmin(): boolean {
    return this.roles.includes(AppConstants.ROLES.ADMIN);
  }

  isDoctor(): boolean {
    return this.roles.includes(AppConstants.ROLES.DOCTOR);
  }

  isSecretary(): boolean {
    return this.roles.includes(AppConstants.ROLES.SECRETARY);
  }

  isOnlyDoctor(): boolean {
    return this.isDoctor() && !this.isAdmin();
  }
}
