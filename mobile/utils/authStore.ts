let authToken: string | null = null;
let currentUser: any | null = null;

export const setAuth = (token: string, user: any) => {
  authToken = token;
  currentUser = user;
};

export const clearAuth = () => {
  authToken = null;
  currentUser = null;
};

export const getAuthToken = () => authToken;
export const getCurrentUser = () => currentUser;

