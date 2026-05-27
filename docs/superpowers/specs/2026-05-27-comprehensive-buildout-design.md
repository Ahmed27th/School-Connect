# School Connect — Comprehensive Buildout Design

## Overview
Fill all existing gaps in the School Connect SaaS: parent dashboard, student dashboard, dashboard home, notifications, editable profile, and remaining fixes. Uses existing DB schema only (no new tables).

## Sections

### 1. Parent Dashboard (`app/dashboard/parent/page.tsx`)
- Server component that queries `enrollments` where `parent_id = current profile` to get children
- For each child, queries `attendance_records` for recent stats (last 30 days)
- Cards per child showing: name, class, attendance summary (present/absent/late/excused counts)
- Quick actions: "Message Teacher" → opens messaging with child's teacher, "View Attendance" → filters attendance page
- Also fetches recent `announcements` for the school

### 2. Student Dashboard (`app/dashboard/student/page.tsx`)
- Server component that queries `enrollments` where `student_id = current profile`
- Shows enrolled classes with links to class drive
- Attendance summary for current month (present/absent/late/excused counts)
- Recent announcements
- Quick links: "My Attendance", "My Classes"

### 3. Dashboard Home (`app/dashboard/page.tsx`)
- Role-based widget grid instead of redirect
- Components per role with key metrics
- Uses `getStudentsData()`, `getClassesData()`, recent messages, recent announcements
- Each widget is a `DashboardCard` with icon, value, label

### 4. Notifications System
- New server action: `getAlerts()` in `app/dashboard/actions.ts` — queries `attendance_alerts` for current user
- Parent sees alerts about children's absences with student name and date
- "Mark as read" action
- Notification bell in `sidebar.tsx` with unread count badge
- Real-time message toasts via Supabase Realtime `messages` channel
- New client component: `notification-bell.tsx`

### 5. Profile & Settings (`app/dashboard/profile/page.tsx`)
- Make profile editable: name, phone, avatar upload
- Avatar uploads to Supabase storage bucket `avatars`
- Change password via `supabase.auth.updateUser()`
- Server action: `updateProfile()`, `uploadAvatar()`

### 6. Fixes
- Add TURN server config to `video-call.tsx` (using free Twilio TURN or Cloudflare TURN)
- Loading skeletons for all dashboard pages
- Error boundaries per section
- Chat-attachments storage bucket initialization helper
- Unread message count badge on sidebar messages nav item

## File Changes Summary

| File | Change |
|------|--------|
| `app/dashboard/parent/page.tsx` | Rewrite with full parent dashboard |
| `app/dashboard/parent/actions.ts` | New: getParentDashboardData |
| `app/dashboard/student/page.tsx` | Rewrite with full student dashboard |
| `app/dashboard/student/actions.ts` | New: getStudentDashboardData |
| `app/dashboard/page.tsx` | Rewrite with role-based widget grid |
| `app/dashboard/actions.ts` | Add getAlerts, markAlertRead, getUnreadMessageCount |
| `app/dashboard/profile/page.tsx` | Add edit mode with form |
| `app/dashboard/profile/actions.ts` | New: updateProfile, uploadAvatar, changePassword |
| `components/layout/sidebar.tsx` | Add notification bell, unread badges |
| `components/notification-bell.tsx` | New: real-time notification dropdown |
| `app/dashboard/messages/video-call.tsx` | Add TURN servers |
| Various pages | Add loading.tsx / error.tsx |

## Success Criteria
- Parent logs in → sees children's attendance at a glance
- Student logs in → sees own classes and attendance summary
- Dashboard home → shows role-appropriate metrics
- Parent sees attendance alerts in bell icon
- Profile page allows editing name/phone/avatar
- Video calls work on restrictive networks (TURN fallback)
