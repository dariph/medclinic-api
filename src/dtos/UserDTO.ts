export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
}
