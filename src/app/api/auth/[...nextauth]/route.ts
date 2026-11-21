import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Options are built per request so missing secrets fail the request, not the build.
const handler = (request: Request, context: { params: Promise<{ nextauth: string[] }> }) =>
  NextAuth(getAuthOptions())(request, context);

export { handler as GET, handler as POST };
