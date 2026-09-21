import { supabase } from '../lib/supabase.js'

// Signs a user into the application using their email and password
async function login(email, password)
{
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if (error) {
            throw error
        }

        console.log("Successfully logged in")
        return data

    } catch (error) {
        console.error("Error logging in:", error.message)
        return null
    }
}

export { login }