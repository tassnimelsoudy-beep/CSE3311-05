import { useState } from 'react'
import { login } from '../services/authService.js'
import './Login.css'

function Login()
{
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event)
    {
        event.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Please enter both your email and password.')
            return
        }

        setLoading(true)

const result = await login(email, password)

setLoading(false)

        if (!result) {
            setError('Invalid email or password.')
            return
        }

        console.log('Login successful:', result.user)
    }

    return (
        <div className="login-container">
            <h1>Rotate</h1>
            <h2>Welcome back</h2>

            <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                />

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                />

                {error && <p className="login-error">{error}</p>}

                <button type="submit" disabled={loading}>
    {loading ? 'Logging in...' : 'Log In'}
</button>
            </form>
        </div>
    )
}

export default Login