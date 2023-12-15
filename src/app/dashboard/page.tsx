'use client'
import { useSession } from "next-auth/react"
export default function Dashboard() {
    const {data, status} = useSession()
    console.log(data, status)
    return <div>
        Dashboard
    </div>
}