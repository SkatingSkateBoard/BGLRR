import {logout} from "../../../actions/auth";

export default async function ResidentDashboardPage() {
  return (
    <main>
      <h1>Resident Dashboard</h1>
      <p>Welcome to the resident dashboard.</p>
      <a href="/resident/report" className="text-blue-600 underline hover:text-blue-800">Ask for an emergency here</a>
      <button onClick={logout} className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
      >Logout</button>
    </main>
  )
}