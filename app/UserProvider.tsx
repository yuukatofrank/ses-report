"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Member } from "@/types";

type UserContextValue = {
  userId: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  member: Member | null;
  setMember: (member: Member | null) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  initialUserId,
  initialUserEmail,
  initialMember,
  isAdmin,
  children,
}: {
  initialUserId: string | null;
  initialUserEmail: string | null;
  initialMember: Member | null;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [member, setMember] = useState<Member | null>(initialMember);

  return (
    <UserContext.Provider
      value={{
        userId: initialUserId,
        userEmail: initialUserEmail,
        isAdmin,
        member,
        setMember,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
