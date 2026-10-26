import { Navigate } from "react-router-dom"
import AuthForm from "../components/AuthForm"
import AuthPageLayout from "../components/AuthPageLayout"
import { useAuth } from "../context/AuthContext"

export default function SignUpPage() {
  const { session, loading } = useAuth()
  if (!loading && session) return <Navigate to="/" replace />

  return (
    <AuthPageLayout title="Create your MealKit account">
      <AuthForm initialMode="signup" />
    </AuthPageLayout>
  )
}
