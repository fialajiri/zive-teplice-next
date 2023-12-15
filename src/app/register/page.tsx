

import { useRouter } from "next/router"
import { useEffect } from "react"

export default async function RegisterPage() {
    const router = useRouter()

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({email: 'test@test.com', password: '123456'})
    })

    console.log(response);

    return <>
    <div>Register Page</div>
    <form></form>
    </>
}