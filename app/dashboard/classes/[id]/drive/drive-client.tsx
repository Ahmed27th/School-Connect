"use client"

import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFolders, getResources, createFolder, deleteFolder, createResourceRecord, deleteResourceRecord } from "./actions"
import { createClient } from "@/lib/supabase/client"
import { Folder, FileText, Plus, Upload, Trash2, ArrowLeft, Loader2, Download } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function DriveClient({
  classId,
  folderId,
  userRole
}: {
  classId: string
  folderId?: string
  userRole: string
}) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isTeacherOrPrincipal = userRole === "teacher" || userRole === "principal"

  const { data: folders, isLoading: isLoadingFolders } = useQuery({
    queryKey: ["folders", classId],
    queryFn: () => getFolders(classId),
    enabled: !folderId // Only fetch folders if we are at the root
  })

  const { data: resources, isLoading: isLoadingResources } = useQuery({
    queryKey: ["resources", folderId],
    queryFn: () => getResources(folderId!),
    enabled: !!folderId // Only fetch resources if we are inside a folder
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder(classId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", classId] })
      setIsCreatingFolder(false)
      setNewFolderName("")
      toast.success("Folder created successfully")
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", classId] })
      toast.success("Folder deleted")
    },
    onError: (err: any) => toast.error(err.message)
  })

  const createResourceMutation = useMutation({
    mutationFn: (params: { name: string, path: string, size: number, type: string }) => 
      createResourceRecord(folderId!, params.name, params.path, params.size, params.type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources", folderId] })
      toast.success("File uploaded successfully")
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteResourceMutation = useMutation({
    mutationFn: (id: string) => deleteResourceRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources", folderId] })
      toast.success("File deleted")
    },
    onError: (err: any) => toast.error(err.message)
  })

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    createFolderMutation.mutate(newFolderName)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 10MB limit")
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const storagePath = `${classId}/${folderId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("class_resources")
        .upload(storagePath, file, { upsert: false })

      if (uploadError) throw uploadError

      createResourceMutation.mutate({
        name: file.name,
        path: storagePath,
        size: file.size,
        type: file.type || "application/octet-stream"
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDownload = async (path: string, name: string) => {
    try {
      const { data, error } = await supabase.storage.from("class_resources").download(path)
      if (error) throw error
      
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      toast.error("Failed to download file")
    }
  }

  if (!folderId) {
    return (
      <div className="flex flex-col gap-6">
        {isTeacherOrPrincipal && (
          <div className="flex justify-between items-center rounded-xl bg-surface p-4 shadow-sm border border-border">
            <h2 className="font-display font-semibold text-on-surface">Folders</h2>
            <form onSubmit={handleCreateFolder} className="flex gap-2">
              {isCreatingFolder ? (
                <>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={createFolderMutation.isPending}
                    className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors shadow-md shadow-primary/20"
                >
                  <Plus className="size-4" />
                  New Folder
                </button>
              )}
            </form>
          </div>
        )}

        {isLoadingFolders ? (
          <div className="flex justify-center p-12">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders?.map((folder) => (
              <div
                key={folder.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
              >
                <Link href={`/dashboard/classes/${classId}/drive?folderId=${folder.id}`} className="absolute inset-0 z-0" />
                <div className="flex items-start justify-between z-10 pointer-events-none">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Folder className="size-6 fill-primary/20" />
                  </div>
                  {isTeacherOrPrincipal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Are you sure you want to delete this folder? All contents will be lost.")) {
                          deleteFolderMutation.mutate(folder.id.toString())
                        }
                      }}
                      disabled={deleteFolderMutation.isPending}
                      className="pointer-events-auto rounded-full p-2 text-on-surface-muted opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4 z-10 pointer-events-none">
                  <h3 className="font-display font-semibold text-on-surface line-clamp-1">{folder.name}</h3>
                  <p className="font-body text-xs text-on-surface-muted mt-1">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {folders?.length === 0 && (
              <div className="col-span-full py-12 text-center text-on-surface-muted font-body">
                No folders have been created yet.
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Inside Folder View
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center rounded-xl bg-surface p-4 shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/classes/${classId}/drive`} className="rounded-full p-2 hover:bg-surface-hover transition-colors text-on-surface-muted">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2 font-display font-semibold text-on-surface">
            <Folder className="size-5 text-primary" />
            Folder Contents
          </div>
        </div>

        {isTeacherOrPrincipal && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/pdf, image/*"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || createResourceMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload File
            </button>
          </div>
        )}
      </div>

      {isLoadingResources ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-background/50 text-on-surface-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Uploaded</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resources?.map((res) => (
                <tr key={res.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                        <FileText className="size-4" />
                      </div>
                      <span className="font-medium text-on-surface">{res.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-muted">
                    {(res.size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="px-6 py-4 text-on-surface-muted">
                    {new Date(res.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(res.storage_path, res.name)}
                        className="rounded-lg p-2 text-on-surface-muted hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Download"
                      >
                        <Download className="size-4" />
                      </button>
                      {isTeacherOrPrincipal && (
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this file?")) {
                              deleteResourceMutation.mutate(res.id.toString())
                            }
                          }}
                          disabled={deleteResourceMutation.isPending}
                          className="rounded-lg p-2 text-on-surface-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {resources?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-on-surface-muted">
                    No files uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
