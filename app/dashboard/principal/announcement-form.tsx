"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const roles = ["Teachers", "Parents", "Students"]

export function AnnouncementForm({
  profile,
  initialData,
  onSubmit,
  isPending,
  onCancel,
}: {
  profile: { id: number; full_name: string }
  initialData?: { title: string; body: string; priority: string; target_roles: string[] }
  onSubmit: (data: { title: string; body: string; priority: string; target_roles: string[] }) => void
  isPending: boolean
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [body, setBody] = useState(initialData?.body ?? "")
  const [priority, setPriority] = useState(initialData?.priority ?? "normal")
  const [targetRoles, setTargetRoles] = useState<string[]>(initialData?.target_roles ?? [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title, body, priority, target_roles: targetRoles })
  }

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="font-body text-sm font-medium text-on-surface" htmlFor="title">
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          className="h-11 rounded-xl border-border"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body text-sm font-medium text-on-surface" htmlFor="body">
          Body
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement..."
          rows={5}
          className={cn(
            "h-auto w-full min-w-0 rounded-xl border border-border bg-transparent px-3 py-2.5 text-base transition-colors outline-none",
            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "font-body text-sm resize-y"
          )}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body text-sm font-medium text-on-surface" htmlFor="priority">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-transparent px-3 text-sm transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-body text-sm font-medium text-on-surface">Target Roles</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 font-body text-sm text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={targetRoles.length === 0}
              onChange={() => setTargetRoles([])}
            />
            All
          </label>
          {roles.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 font-body text-sm text-on-surface cursor-pointer"
            >
              <input
                type="checkbox"
                checked={targetRoles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
