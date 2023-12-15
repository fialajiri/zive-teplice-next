/** @format */

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  console.log(email, password);
  // validate email and password

  if (!email || !password) {
    return new NextResponse('Missing email or password', { status: 400 });
  }

  const exist = await db.user.findUnique({ where: { email } });

  if (exist) {
    return new NextResponse('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      name: 'test',
      hashedPassword,
    },
  });

  return NextResponse.json(user);
}
