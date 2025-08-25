export interface User {
    _id?: string;
    name: string;
    email: string;
    role?: string;
    phone?: string;
    address?: string;
    profilePicture?: string;
}

export interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
    message?: string;
}
