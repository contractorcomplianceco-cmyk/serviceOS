import { createContext, useContext, ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  useLogin,
  useLogout,
  useDevLogin,
  useListDevUsers,
  getGetCurrentUserQueryKey,
  getListDevUsersQueryKey,
  ApiError,
  type AuthUser,
  type DevUser,
} from "@workspace/api-client-react";
import type { User, Role } from "./types";
import { isFieldRole } from "./permissions";

// The dev role switcher is only ever exposed in development builds; production
// bundles never render it and the backend rejects the endpoints with 403.
export const IS_DEV = import.meta.env.DEV;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  devLogin: (userId: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  devUsers: DevUser[];
  loginPending: boolean;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map the backend AuthUser onto the frontend domain `User` shape (nulls → undefined).
export function mapAuthUserToUser(a: AuthUser): User {
  return {
    id: a.id,
    name: a.name,
    role: a.role as Role,
    email: a.email,
    active: a.active,
    phone: a.phone ?? undefined,
    zone: a.zone ?? undefined,
    skills: a.skills ?? undefined,
    restrictedTasks: a.restrictedTasks ?? undefined,
    workloadHours: a.workloadHours ?? undefined,
    capacityHours: a.capacityHours ?? undefined,
    truckId: a.truckId ?? undefined,
    gpsConsent: a.gpsConsent ?? undefined,
    hourlyCost: a.hourlyCost ?? undefined,
  };
}

// Where a role lands right after authenticating.
export function roleHome(role: Role): string {
  if (role === "Customer Portal User") return "/portal";
  return isFieldRole(role) ? "/tech" : "/today";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      // A 401 simply means "not logged in" — don't spam retries for it.
      retry: false,
      staleTime: 30_000,
    },
  });

  const devUsersQuery = useListDevUsers({
    query: {
      queryKey: getListDevUsersQueryKey(),
      enabled: IS_DEV,
      retry: false,
      staleTime: Infinity,
    },
  });

  const loginMutation = useLogin();
  const devLoginMutation = useDevLogin();
  const logoutMutation = useLogout();

  // Treat a 401 as an anonymous session rather than an error state.
  const meError = meQuery.error;
  const isUnauthorized = meError instanceof ApiError && meError.status === 401;
  const user = meQuery.data ?? null;

  const setMe = useCallback(
    (u: AuthUser) => {
      queryClient.setQueryData(getGetCurrentUserQueryKey(), u);
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await loginMutation.mutateAsync({ data: { email, password } });
      setMe(u);
      return u;
    },
    [loginMutation, setMe],
  );

  const devLogin = useCallback(
    async (userId: string) => {
      const u = await devLoginMutation.mutateAsync({ data: { userId } });
      setMe(u);
      return u;
    },
    [devLoginMutation, setMe],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    // Drop all cached data so the next user starts clean.
    queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
    await queryClient.invalidateQueries();
  }, [logoutMutation, queryClient]);

  const loginError =
    loginMutation.error instanceof ApiError
      ? (loginMutation.error.data as { error?: string } | null)?.error ??
        "Login failed"
      : loginMutation.error
        ? "Login failed"
        : null;

  const value: AuthContextType = {
    user,
    isLoading: meQuery.isLoading && !isUnauthorized,
    login,
    devLogin,
    logout,
    devUsers: devUsersQuery.data ?? [],
    loginPending: loginMutation.isPending,
    loginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
