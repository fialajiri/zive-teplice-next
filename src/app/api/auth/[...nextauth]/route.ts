/** @format */

import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { db } from '@/db';

const prisma = new PrismaClient();

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        console.log('credential:', credentials);
        if (!credentials?.email || !credentials.password){
            return null;
        }

        const user = await db.user.findUnique({where: {email: credentials.email}})
        console.log('user:', user)

        if(!user) {
            return null;
        }


        // check for password
        const passwordsMatch = await bcrypt.compare(credentials.password, user.hashedPassword);

        if(!passwordsMatch){
            return null;
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions)

export {handler as GET, handler as POST}
