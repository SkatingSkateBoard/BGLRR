import { logout } from "../actions/auth"

export default function UnauthorizedPage() {
  return (
    <main>
      <h1>Access denied</h1>
      <p>You do not have permission to view this page.</p>
      <p>Please go back to previous page.</p>
      <p>If stuck please logout here</p>
      <button onClick={logout}>Logout</button>
    </main>
  )
}