import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthState } from '../types';

const initialState: AuthState = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
            state.isAuthenticated = true;
            localStorage.setItem('token', action.payload);
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            localStorage.setItem('user', JSON.stringify(action.payload));
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
                localStorage.setItem('user', JSON.stringify(state.user));
            }
        },
    },
});

export const { setToken, setUser, setLoading, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
