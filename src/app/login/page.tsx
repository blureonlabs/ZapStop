import { LoginForm } from './LoginForm'

export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Zap Stop</h1>
          <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
