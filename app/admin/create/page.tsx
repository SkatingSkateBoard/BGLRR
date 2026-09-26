// app/admin/create-operator/page.tsx
'use client'

import { useState } from 'react'
import { createOperator } from '@/app/actions/admin'

export default function CreateOperatorPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const formData = new FormData(event.currentTarget)
    const result = await createOperator(formData)

    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Failed to create operator.')
    } else {
      setMessage(result.message || 'Success!')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Create New Operator</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        This will create an account with <strong>role: 'operator'</strong> metadata. It will bypass the resident trigger.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '4px' }}>Email</label>
          <input type="email" id="email" name="email" required style={{ width: '100%', padding: '8px' }} />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '4px' }}>Password</label>
          <input type="password" id="password" name="password" required minLength={6} style={{ width: '100%', padding: '8px' }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Creating...' : 'Create Operator'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '12px' }}>{error}</p>}
      {message && <p style={{ color: 'green', marginTop: '12px' }}>{message}</p>}
    </div>
  )
}
