import { supabase } from '../lib/supabase.js'

// Turns Supabase's error messages into plain sentences for the auth screen.
function friendlyAuthError(message)
{
    if (!message) {
        return 'Something went wrong. Try again.'
    }
    if (message.includes('Invalid login credentials')) {
        return "That email and password don't match an account."
    }
    if (message.includes('already registered')) {
        return 'An account with this email already exists. Log in instead.'
    }
    if (message.includes('Password should be')) {
        return 'Password must be at least 6 characters.'
    }
    if (message.includes('valid email') || message.includes('invalid format')) {
        return 'Enter a valid email address.'
    }
    return message
}

// Signs a user into the application using their email and password.
// Returns { data, error } where error is a readable message or null.
async function login(email, password)
{
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    })

    if (error) {
        console.error("Error logging in:", error.message)
        return { data: null, error: friendlyAuthError(error.message) }
    }

    console.log("Successfully logged in")
    return { data, error: null }
}

// Creates a new account. "name" is stored in the account's metadata, and the
// on_auth_user_created database trigger copies it into the participants table.
// Returns { data, error } where error is a readable message or null.
async function signUp(email, password, name)
{
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { name: name } }
    })

    if (error) {
        console.error("Error signing up:", error.message)
        return { data: null, error: friendlyAuthError(error.message) }
    }

    console.log("Successfully signed up")
    return { data, error: null }
}

// Signs the current user out.
async function logout()
{
    const { error } = await supabase.auth.signOut()
    if (error) {
        console.error("Error logging out:", error.message)
    }
}

// Calls "callback" with the current session (or null) right away, and again
// every time the user logs in or out. Returns a function that stops listening.
// Note: don't await other Supabase calls directly inside the callback.
function onAuthChange(callback)
{
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session)
    })
    return () => data.subscription.unsubscribe()
}

export { login, signUp, logout, onAuthChange }
