import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// ... other imports ...

export const authOptions = {
  providers: [
    CredentialsProvider({
      // ... provider configuration ...
    }),
  ],
  // ... other NextAuth options ...
};

export default NextAuth(authOptions);