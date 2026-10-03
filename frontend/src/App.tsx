import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { GuestRoute, ProtectedRoute, RequireRole } from './components/RouteGuards'
import {
  CLIENT_MANAGE_ROLES,
  LEAD_CREATE_ROLES,
  LEAD_MANAGE_ROLES,
  USER_CREATE_ROLES,
  USER_EDIT_ROLES,
  USER_VIEW_ROLES,
} from './data/roles'
import { ClientCreatePage } from './pages/clients/ClientCreatePage'
import { ClientDetailPage } from './pages/clients/ClientDetailPage'
import { ClientEditPage } from './pages/clients/ClientEditPage'
import { ClientsListPage } from './pages/clients/ClientsListPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LeadCreatePage } from './pages/leads/LeadCreatePage'
import { LeadDetailPage } from './pages/leads/LeadDetailPage'
import { LeadEditPage } from './pages/leads/LeadEditPage'
import { LeadsListPage } from './pages/leads/LeadsListPage'
import { LoginPage } from './pages/LoginPage'
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

          {/* Everyone signed in can open leads; the backend only returns the ones they may see */}
          <Route path="/leads" element={<LeadsListPage />} />
          <Route path="/phases/:phase" element={<LeadsListPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route element={<RequireRole roles={LEAD_CREATE_ROLES} />}>
            <Route path="/leads/new" element={<LeadCreatePage />} />
          </Route>
          <Route element={<RequireRole roles={LEAD_MANAGE_ROLES} />}>
            <Route path="/leads/:id/edit" element={<LeadEditPage />} />
          </Route>

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
