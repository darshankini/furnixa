import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { GuestRoute, ProtectedRoute, RequireRole, StaffOnly } from './components/RouteGuards'
import {
  CLIENT_MANAGE_ROLES,
  LEAD_CREATE_ROLES,
  LEAD_MANAGE_ROLES,
  PAYMENT_ROLES,
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
import { NotFoundPage } from './pages/NotFoundPage'
import { LeadPaymentsPage } from './pages/payments/LeadPaymentsPage'
import { PaymentsListPage } from './pages/payments/PaymentsListPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { UserCreatePage } from './pages/users/UserCreatePage'
import { UserDetailPage } from './pages/users/UserDetailPage'
import { UserEditPage } from './pages/users/UserEditPage'
import { UsersListPage } from './pages/users/UsersListPage'

/**
 * A data router (not <BrowserRouter>), because only it supports errorElement: a page that throws
 * while rendering shows RouteErrorPage instead of blanking the whole app.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    // Last resort for errors outside the app layout (login pages, or the layout itself)
    <Route errorElement={<RouteErrorPage standalone />}>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Signed-in pages share the sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* A page that crashes shows the error here, with the sidebar still working */}
          <Route errorElement={<RouteErrorPage />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Everyone signed in can open leads; the backend only returns the ones they may see */}
            <Route path="/leads" element={<LeadsListPage />} />
            <Route path="/phases/:phase" element={<LeadsListPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />

            {/* Clients only get the dashboard and their own leads above */}
            <Route element={<StaffOnly />}>
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

              <Route element={<RequireRole roles={PAYMENT_ROLES} />}>
                <Route path="/payments" element={<PaymentsListPage />} />
                <Route path="/payments/:leadId" element={<LeadPaymentsPage />} />
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

            {/* No route matched. Inside the signed-in area, so a stranger is sent to log in first */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Route>,
  ),
)

export default function App() {
  return <RouterProvider router={router} />
}
