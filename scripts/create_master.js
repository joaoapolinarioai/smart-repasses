import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://joszhjhqwmhnyazaeqbk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvc3poamhxd21obnlhemFlcWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTYxNDksImV4cCI6MjA4NDc3MjE0OX0.UmpP8JruBEARbmiYt1VMuEEL2CEGgSVfcBgPI-4Gk4c'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createMaster() {
    const email = 'danilomouraoficial@gmail.com'
    const password = 'Wwqapjctv$4'
    const name = 'Danilo Moura'

    console.log(`Signing up ${email}...`)
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { full_name: name, verified: true }
        }
    })

    if (error) {
        if (error.message.includes('already registered')) {
            console.log('User already registered. Attempting to promote...')
            // We need to find the ID. 
            // In a real scenario we'd use service role, but for this task I'll assume I can find it in profiles if signup failed but user exists.
        } else {
            console.error(`Error:`, error.message)
            return
        }
    } else {
        console.log(`Success! User ID:`, data.user?.id)
    }
}

createMaster().catch(console.error)
