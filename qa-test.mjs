import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://afennmwocszugfuxfmih.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZW5ubXdvY3N6dWdmdXhmbWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Mzc5ODIsImV4cCI6MjA5NTMxMzk4Mn0.-jS2toW6o5yVABadbnjUL-jZukWjloGcMj9pqXFO3Ko'

const supabase = createClient(supabaseUrl, supabaseKey)

const users = [
  { role: 'principal', email: 'sarah@sunrise.edu', password: 'Demo@123' },
  { role: 'teacher', email: 'emily@sunrise.edu', password: 'Demo@123' },
  { role: 'parent', email: 'alice.parent@sunrise.edu', password: 'Demo@123' },
  { role: 'student', email: 'student1@sunrise.edu', password: 'Demo@123' }
]

const pages = [
  '/dashboard',
  '/dashboard/students',
  '/dashboard/classes',
  '/dashboard/attendance',
  '/dashboard/messages',
  '/dashboard/announcements',
  '/dashboard/classes/1/drive'
]

async function runTests() {
  let allPassed = true
  
  for (const user of users) {
    console.log(`\n===========================================`)
    console.log(`🧪 Testing as ${user.role.toUpperCase()} (${user.email})`)
    console.log(`===========================================`)
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    })
    
    if (authError) {
      console.error(`❌ Failed to login: ${authError.message}`)
      allPassed = false
      continue
    }

    const token = authData.session.access_token
    const refreshToken = authData.session.refresh_token
    
    const projectId = 'afennmwocszugfuxfmih'
    const cookieString = `sb-${projectId}-auth-token=${encodeURIComponent(JSON.stringify([token, refreshToken, null, null, null]))};`

    for (const page of pages) {
      try {
        const res = await fetch(`http://localhost:3001${page}`, {
          headers: {
            'Cookie': cookieString
          }
        })
        
        if (res.ok) {
          console.log(`✅ [${res.status}] ${page}`)
        } else {
          const text = await res.text()
          console.log(`❌ [${res.status}] ${page}`)
          const snippet = text.replace(/\n/g, ' ').substring(0, 200)
          console.log(`   Error Snippet: ${snippet}`)
          allPassed = false
        }
      } catch (err) {
        console.error(`💥 Request failed for ${page}:`, err.message)
        allPassed = false
      }
    }
    
    await supabase.auth.signOut()
  }
  
  if (allPassed) {
    console.log(`\n🎉 All smoke tests passed successfully!`)
  } else {
    console.log(`\n⚠️ Some tests failed. Check the logs above.`)
  }
}

runTests()
