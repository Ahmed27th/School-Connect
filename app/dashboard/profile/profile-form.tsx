"use client"

import * as React from "react"
import { User, Mail, Phone, Shield, Building2, Save, Camera, Lock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Profile {
  id: number
  full_name: string
  email: string
  phone: string | null
  role: string
  school_id: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = React.useState(false)
  const [fullName, setFullName] = React.useState(profile.full_name)
  const [phone, setPhone] = React.useState(profile.phone || "")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [changingPassword, setChangingPassword] = React.useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set("full_name", fullName)
      formData.set("phone", phone)
      const { updateProfile } = await import("./actions")
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success("Profile updated")
        setEditing(false)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    try {
      const formData = new FormData()
      formData.set("current_password", currentPassword)
      formData.set("new_password", newPassword)
      const { changePassword } = await import("./actions")
      const result = await changePassword(formData)
      if (result.success) {
        toast.success("Password changed")
        setCurrentPassword("")
        setNewPassword("")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.set("avatar", file)
    try {
      const { uploadAvatar } = await import("./actions")
      const result = await uploadAvatar(formData)
      if (result.url) {
        toast.success("Avatar updated")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="relative group">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary-light font-display text-2xl font-bold text-primary overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="size-full object-cover" />
              ) : (
                profile.full_name.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera className="size-5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <h3 className="font-display font-semibold text-on-surface text-lg">
              {profile.full_name}
            </h3>
            <p className="font-body text-xs text-on-surface-muted capitalize">{profile.role}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className="font-body text-xs font-medium text-on-surface-muted">Full Name</label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!editing}
                className={!editing ? "opacity-70" : ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="font-body text-xs font-medium text-on-surface-muted">Email</label>
              <Input id="email" value={profile.email} disabled className="opacity-70" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="font-body text-xs font-medium text-on-surface-muted">Phone</label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editing}
                className={!editing ? "opacity-70" : ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-xs font-medium text-on-surface-muted">Role</label>
              <Input value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} disabled className="opacity-70" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span className="font-body text-sm text-on-surface-muted">School ID: {profile.school_id}</span>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => {
                    setEditing(false)
                    setFullName(profile.full_name)
                    setPhone(profile.phone || "")
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="size-4 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="size-5 text-primary" />
          <h3 className="font-display font-semibold text-on-surface">Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new_password" className="font-body text-xs font-medium text-on-surface-muted">New Password</label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={changingPassword || !newPassword}>
            <CheckCircle className="size-4 mr-1" />
            {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
