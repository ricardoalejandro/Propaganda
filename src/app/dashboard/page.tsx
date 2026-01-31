import { redirect } from 'next/navigation'

export default function DashboardPage() {
    // Redirect to chats by default
    redirect('/dashboard/chats')
}
