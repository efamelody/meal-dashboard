import { Navigate } from "react-router-dom"
import AuthForm from "../components/AuthForm"
import AuthPageLayout from "../components/AuthPageLayout"
import { useAuth } from "../context/AuthContext"

export default function LoginPage() {
  const { session, loading } = useAuth()
  if (!loading && session) return <Navigate to="/" replace />

  return (
    <AuthPageLayout title="Sign in to MealKit">
      <AuthForm />
    </AuthPageLayout>
  )
}
