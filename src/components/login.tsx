
'use client';
/** @format */

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';


export default function Login() {
  const router = useRouter();
  // const response = await fetch('http://localhost:3000/api/register', {
  //   method: 'POST',
  //   headers: {
  //     'content-type': 'application/json',
  //   },
  //   body: JSON.stringify({ email: 'test@test.com', password: '123456' }),
  // });
  // console.log(response);
  const loginUser = async () => {
    await signIn('credentials', { email: 'test@test.com', password: '123456', redirect: false });
    router.push('/dashboard');
  };

  return (
    <main>
      <button onClick={loginUser}>Sign in</button>
    </main>
  );
}