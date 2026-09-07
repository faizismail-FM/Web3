import type { MemberRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      role: MemberRole | null;
      walletAddress: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    organizationId: string | null;
    role: MemberRole | null;
    walletAddress: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string | null;
    role?: MemberRole | null;
    walletAddress?: string | null;
  }
}
