import { useEffect, useState } from 'react'
import { onAuthChange } from './services/authService.js'
import AuthScreen from './Components/AuthScreen.jsx'
import Home from './Components/Home.jsx'
import Logo from './Components/Logo.jsx'

function App() {
  // undefined = still checking for a saved login, null = logged out
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Fires once right away with any saved session, then on every login/logout.
    return onAuthChange(setSession)
  }, [])

  if (session === undefined) {
    return (
      <div className="splash" role="status">
        <Logo size={48} />
        <span className="visually-hidden">Loading</span>
      </div>
    )
  }

  return session ? <Home user={session.user} /> : <AuthScreen />
}

export default App
