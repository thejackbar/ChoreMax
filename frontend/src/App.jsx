import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChildProvider } from './context/ChildContext'
import { api } from './api/client'
import PinModal from './components/PinModal'
import Layout from './components/Layout'
import ParentLayout from './components/ParentLayout'

// Pages
import Auth from './pages/Auth'
import Home from './pages/Home'
import ChildDailyChores from './pages/ChildDailyChores'
import ChildWeeklyChores from './pages/ChildWeeklyChores'
import ChildDashboard from './pages/ChildDashboard'
import ParentDashboard from './pages/ParentDashboard'
import ManageChores from './pages/ManageChores'
import ManageChildren from './pages/ManageChildren'
import AccountSettings from './pages/AccountSettings'
import ManageMeals from './pages/ManageMeals'
import ManageGoals from './pages/ManageGoals'
import FamilyDailyView from './pages/FamilyDailyView'
import MealPlan from './pages/MealPlan'
import ShoppingList from './pages/ShoppingList'
import TodoList from './pages/TodoList'
import Wishlist from './pages/Wishlist'
import MemberHub from './pages/MemberHub'
import FamilyCalendar from './pages/FamilyCalendar'
import Landing from './pages/Landing'
import ManageSite from './pages/ManageSite'
import ManageCalendar from './pages/ManageCalendar'
import AdminLogin from './pages/AdminLogin'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children || <Outlet />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}>Loading...</div>
  if (user) return <Navigate to="/" replace />
  return children
}

function PinGate({ children }) {
  const { user } = useAuth()
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(null)

  // Check if PIN is already verified in session
  const storedPin = sessionStorage.getItem('parentPin')
  if (storedPin && !verified) {
    setVerified(true)
  }

  if (!user?.has_pin) {
    // No PIN set - show setup prompt
    return (
      <PinSetup onComplete={() => setVerified(true)} />
    )
  }

  if (!verified) {
    return (
      <PinModal
        title="Enter Parent PIN"
        error={error}
        onSubmit={async (pin) => {
          try {
            await api.settings.verifyPin({ pin })
            sessionStorage.setItem('parentPin', pin)
            setVerified(true)
            setError(null)
          } catch {
            setError('Incorrect PIN')
          }
        }}
        onCancel={() => window.history.back()}
      />
    )
  }

  return children || <Outlet />
}

function PinSetup({ onComplete }) {
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1)
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (entered) => {
    if (step === 1) {
      setFirstPin(entered)
      setStep(2)
      setPin('')
      setError(null)
    } else {
      if (entered !== firstPin) {
        setError('PINs do not match. Try again.')
        setStep(1)
        setFirstPin('')
        return
      }
      try {
        await api.settings.setPin({ pin: entered })
        sessionStorage.setItem('parentPin', entered)
        window.location.reload()
      } catch (e) {
        setError(e.message)
      }
    }
  }

  return (
    <PinModal
      title={step === 1 ? 'Create a Parent PIN' : 'Confirm your PIN'}
      error={error}
      onSubmit={handleSubmit}
      onCancel={() => window.history.back()}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ChildProvider>
        <BrowserRouter>
          <Routes>
            {/* Public - no auth required */}
            <Route path="/welcome" element={<Landing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/site" element={<ManageSite />} />

            {/* Kid-facing (no PIN) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<FamilyDailyView />} />
              <Route path="/family" element={<FamilyDailyView />} />
              <Route path="/child/:childId" element={<MemberHub />} />
              <Route path="/child/:childId/daily" element={<ChildDailyChores />} />
              <Route path="/child/:childId/weekly" element={<ChildWeeklyChores />} />
              <Route path="/child/:childId/dashboard" element={<ChildDashboard />} />
              <Route path="/meals/plan" element={<MealPlan />} />
              <Route path="/lists/shopping" element={<ShoppingList />} />
              <Route path="/lists/todos" element={<TodoList />} />
              <Route path="/lists/wishlist" element={<Wishlist />} />
              <Route path="/calendar" element={<FamilyCalendar />} />
            </Route>

            {/* Parent-facing (PIN protected) */}
            <Route element={<ProtectedRoute><PinGate><ParentLayout /></PinGate></ProtectedRoute>}>
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/chores" element={<ManageChores />} />
              <Route path="/parent/children" element={<ManageChildren />} />
              <Route path="/parent/meals" element={<ManageMeals />} />
              <Route path="/parent/goals" element={<ManageGoals />} />
              <Route path="/parent/calendar" element={<ManageCalendar />} />
              <Route path="/parent/settings" element={<AccountSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ChildProvider>
    </AuthProvider>
  )
}
