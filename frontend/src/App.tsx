import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { GuestRoute, ProtectedRoute, RequireRole } from './components/RouteGuards'
import { CLIENT_MANAGE_ROLES, USER_CREATE_ROLES, USER_EDIT_ROLES, USER_VIEW_ROLES } from './data/roles'
import { ClientCreatePage } from './pages/clients/ClientCreatePage'
import { ClientDetailPage } from './pages/clients/ClientDetailPage'
import { ClientEditPage } from './pages/clients/ClientEditPage'
import { ClientsListPage } from './pages/clients/ClientsListPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { UserCreatePage } from './pages/users/UserCreatePage'
import { UserDetailPage } from './pages/users/UserDetailPage'
import { UserEditPage } from './pages/users/UserEditPage'
import { UsersListPage } from './pages/users/UsersListPage'

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Signed-in pages share the sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<PlaceholderPage title="All Leads" />} />
          <Route path="/phases/:phase" element={<PlaceholderPage />} />

          {/* Everyone signed in can view clients */}
          <Route path="/clients" element={<ClientsListPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route element={<RequireRole roles={CLIENT_MANAGE_ROLES} />}>
            <Route path="/clients/new" element={<ClientCreatePage />} />
            <Route path="/clients/:id/edit" element={<ClientEditPage />} />
          </Route>

          <Route element={<RequireRole roles={USER_VIEW_ROLES} />}>
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
          </Route>
          <Route element={<RequireRole roles={USER_CREATE_ROLES} />}>
            <Route path="/users/new" element={<UserCreatePage />} />
          </Route>
          <Route element={<RequireRole roles={USER_EDIT_ROLES} />}>
            <Route path="/users/:id/edit" element={<UserEditPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
