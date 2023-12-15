
/** @format */
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { redirect } from 'next/navigation';
import Login from '@/components/login';

export default function Home() {  

  return (
    <main>
      <Login />
    </main>
  );
}
