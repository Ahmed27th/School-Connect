"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  PhoneCall,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

// Free STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
}

type CallState = "idle" | "calling" | "ringing" | "connected" | "ended"

interface VideoCallProps {
  conversationId: number
  recipient: any
  profile: any
  mode: "audio" | "video"
  onEnd: () => void
}

export function VideoCall({
  conversationId,
  recipient,
  profile,
  mode,
  onEnd,
}: VideoCallProps) {
  const [callState, setCallState] = useState<CallState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(mode === "audio")
  const [callDuration, setCallDuration] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Clean up everything
  const cleanup = useCallback(() => {
    // Stop local stream
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null

    // Close peer connection
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null

    // Remove channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
  }, [supabase])

  // End the call
  const endCall = useCallback(() => {
    // Notify the other party
    channelRef.current?.send({
      type: "broadcast",
      event: "call-end",
      payload: { from: profile.id },
    })

    cleanup()
    setCallState("ended")

    // Delay before closing the UI
    setTimeout(onEnd, 1500)
  }, [cleanup, onEnd, profile.id])

  // Create peer connection with event handlers
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Send ICE candidates to the other party
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate.toJSON(),
            from: profile.id,
          },
        })
      }
    }

    // Handle remote track
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected")
        // Start call timer
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        endCall()
      }
    }

    peerConnectionRef.current = pc
    return pc
  }, [endCall, profile.id])

  // Initialize call
  useEffect(() => {
    const channelName = `call:${conversationId}`
    const channel = supabase.channel(channelName)
    channelRef.current = channel

    const initCall = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        })
        localStreamRef.current = stream

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // If audio-only, disable video track
        if (mode === "audio") {
          stream.getVideoTracks().forEach((track) => (track.enabled = false))
        }

        const pc = createPeerConnection()

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })

        // Deterministic role: lower profile ID is always the caller
        const isCaller = profile.id < (recipient?.id ?? Infinity)

        // Set up signaling channel listeners
        channel
          .on("broadcast", { event: "call-offer" }, async (payload: any) => {
            const { sdp, from } = payload.payload
            if (from === profile.id) return

            // Only accept offer if we haven't created one ourselves
            if (pc.signalingState !== "stable") return

            setCallState("ringing")

            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            channel.send({
              type: "broadcast",
              event: "call-answer",
              payload: { sdp: answer, from: profile.id },
            })
          })
          .on("broadcast", { event: "call-answer" }, async (payload: any) => {
            const { sdp, from } = payload.payload
            if (from === profile.id) return

            if (pc.signalingState !== "have-local-offer") return
            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          })
          .on("broadcast", { event: "ice-candidate" }, async (payload: any) => {
            const { candidate, from } = payload.payload
            if (from === profile.id) return

            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (err) {
              console.warn("Failed to add ICE candidate:", err)
            }
          })
          .on("broadcast", { event: "call-end" }, (payload: any) => {
            const { from } = payload.payload
            if (from === profile.id) return
            cleanup()
            setCallState("ended")
            setTimeout(onEnd, 1500)
          })
          .subscribe(async (status: string) => {
            if (status === "SUBSCRIBED") {
              setCallState(isCaller ? "calling" : "ringing")

              if (isCaller) {
                // Brief delay to let callee subscribe before we send offer
                await new Promise((r) => setTimeout(r, 800))
                // Re-check state in case call was ended during delay
                if (pc.signalingState !== "stable") return
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)

                channel.send({
                  type: "broadcast",
                  event: "call-offer",
                  payload: { sdp: offer, from: profile.id },
                })
              }
            }
          })
      } catch (err: any) {
        console.error("Call initialization failed:", err)
        cleanup()
        onEnd()
      }
    }

    initCall()

    return () => {
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode])

  // Toggle mute
  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
    }
  }

  // Toggle camera
  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOff(!videoTrack.enabled)
    }
  }

  return (
    <div className="flex h-[600px] flex-col rounded-xl border border-border bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.2)] overflow-hidden relative">
      {/* Remote Video (full background) */}
      <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay with call status */}
        {callState !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm z-10">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/20 mb-4 animate-pulse">
              <span className="font-display text-3xl font-bold text-white">
                {recipient?.full_name?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-1">
              {recipient?.full_name || "Unknown"}
            </h3>
            <p className="font-body text-sm text-gray-400">
              {callState === "calling" && "Calling..."}
              {callState === "ringing" && "Ringing..."}
              {callState === "ended" && "Call ended"}
              {callState === "idle" && "Setting up..."}
            </p>

            {/* Pulsing ring animation for calling state */}
            {(callState === "calling" || callState === "ringing") && (
              <div className="mt-6 flex items-center gap-3">
                <div className="size-3 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="size-3 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="size-3 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        )}

        {/* Call duration badge */}
        {callState === "connected" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-body text-sm text-white font-medium">
              {formatDuration(callDuration)}
            </span>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-[160px] h-[120px] rounded-xl overflow-hidden border-2 border-white/20 bg-gray-800 z-20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="size-6 text-gray-500" />
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-4 py-5 px-6 bg-gray-900/95 backdrop-blur-sm border-t border-white/5">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`flex size-12 items-center justify-center rounded-full transition-all ${
            isMuted
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>

        {/* Camera toggle (only for video calls) */}
        {mode === "video" && (
          <button
            onClick={toggleCamera}
            className={`flex size-12 items-center justify-center rounded-full transition-all ${
              isCameraOff
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {isCameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
          </button>
        )}

        {/* End call */}
        <button
          onClick={endCall}
          className="flex size-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/25"
          aria-label="End call"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  )
}
