// @flow
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

// Updates editable fields on the signed-in Supabase Auth account.
async function updateAccount({ email, password, name, currentPassword, userId }) {
    const attributes = {}
    if (email) attributes.email = email
    if (password) attributes.password = password
    if (name) attributes.data = { name }

    if (password && password.length < 6) {
        return { data: null, error: friendlyAuthError('Password should be at least 6 characters') }
    }

    if (Object.keys(attributes).length === 0) {
        return { data: null, error: null }
    }

    try {
        if (email || password) {
            if (!currentPassword) {
                return {
                    data: null,
                    error: 'Enter your current password to change your email or password.',
                }
            }

            const { data: current, error: currentError } = await supabase.auth.getUser()
            if (currentError || !current.user || (userId && current.user.id !== userId)) {
                return { data: null, error: 'Could not verify the signed-in account. Please sign in again.' }
            }

            const { data: verified, error: verifyError } = await supabase.auth.signInWithPassword({
                email: current.user.email,
                password: currentPassword,
            })
            if (verifyError) {
                console.error("Could not verify current password:", verifyError.message)
                return {
                    data: null,
                    error: verifyError.message.includes('Invalid login credentials')
                        ? 'Your current password is incorrect.'
                        : friendlyAuthError(verifyError.message),
                }
            }
            if (verified.user?.id !== current.user.id) {
                return { data: null, error: 'Could not verify the signed-in account. Please sign in again.' }
            }
        }

        const { data, error } = await supabase.auth.updateUser(attributes)
        if (error) {
            console.error("Error updating account:", error.message)
            return { data: null, error: friendlyAuthError(error.message) }
        }

        return { data, error: null }
    } catch (error) {
        console.error("Error updating account:", error.message)
        return { data: null, error: friendlyAuthError(error.message) }
    }
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

export { login, signUp, updateAccount, logout, onAuthChange }
