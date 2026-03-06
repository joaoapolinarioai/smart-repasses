import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://joszhjhqwmhnyazaeqbk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvc3poamhxd21obnlhemFlcWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTYxNDksImV4cCI6MjA4NDc3MjE0OX0.UmpP8JruBEARbmiYt1VMuEEL2CEGgSVfcBgPI-4Gk4c'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
    const users = [
        { email: 'premium@smart.com.br', password: 'smart123', name: 'Ricardo Santos' },
        { email: 'elite@smart.com.br', password: 'smart123', name: 'Fabio Lima' },
        { email: 'luxury@smart.com.br', password: 'smart123', name: 'Mariana Costa' },
        { email: 'select@smart.com.br', password: 'smart123', name: 'Bruno Oliveira' },
        { email: 'prime@smart.com.br', password: 'smart123', name: 'Leticia Silva' }
    ]

    for (const u of users) {
        console.log(`Signing up ${u.email}...`)
        const { data, error } = await supabase.auth.signUp({
            email: u.email,
            password: u.password,
            options: {
                data: { full_name: u.name, verified: true }
            }
        })
        if (error) {
            console.error(`Error for ${u.email}:`, error.message)
        } else {
            console.log(`Success for ${u.email}:`, data.user?.id)
        }
    }
}

main().catch(console.error)
