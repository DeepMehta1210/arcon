"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, Shield, Trash2, Key, CheckCircle, AlertTriangle, X } from "lucide-react";

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "sales" | "viewer";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

interface TeamManagementViewProps {
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
}

export function TeamManagementView({ currentUser }: TeamManagementViewProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "sales" | "viewer">("sales");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setMembers(data.users || []);
      } else {
        setError(data.error || "Failed to load team members");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFullName("");
        setEmail("");
        setPassword("");
        setRole("sales");
        setSuccessMsg(`Successfully created account for ${data.user.email}`);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchMembers();
      } else {
        setModalError(data.error || "Failed to create user");
      }
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (
      !confirm(
        `Are you sure you want to revoke access and delete account for ${member.fullName} (${member.email})?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${member.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Revoked access for ${member.email}`);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchMembers();
      } else {
        alert(data.error || "Could not delete user");
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const adminCount = members.filter((m) => m.role === "admin").length;
  const salesCount = members.filter((m) => m.role === "sales").length;
  const viewerCount = members.filter((m) => m.role === "viewer").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            Team & Role-Based Access Control
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage authorized users, assign operational roles, and enforce cryptographic password security.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
        >
          <UserPlus className="h-4 w-4" />
          Add Team Member
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Total Users</span>
            <Users className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{members.length}</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Administrators</span>
            <span className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-2">{adminCount}</p>
          <span className="text-[10px] text-zinc-500">Full system access & RBAC</span>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Sales Operators</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{salesCount}</p>
          <span className="text-[10px] text-zinc-500">Leads, dossiers & campaigns</span>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Viewers</span>
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-300 mt-2">{viewerCount}</p>
          <span className="text-[10px] text-zinc-500">Read-only pipeline analytics</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Registered Team Members
          </h3>
          <span className="text-xs text-zinc-500">Stored securely in database</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No team members registered yet.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {members.map((member) => {
              const isSuperAdmin = member.email.toLowerCase() === "deep@3dices.com";
              const isCurrentSession = currentUser?.id === member.id || currentUser?.email === member.email;

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200 uppercase">
                      {member.fullName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{member.fullName}</span>
                        {isSuperAdmin && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400 border border-amber-500/20">
                            Super Admin
                          </span>
                        )}
                        {isCurrentSession && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">{member.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role Badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize border ${
                        member.role === "admin"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : member.role === "sales"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {member.role}
                    </span>

                    <span className="text-[11px] text-zinc-500 hidden md:inline">
                      Added {new Date(member.createdAt).toLocaleDateString()}
                    </span>

                    {/* Revoke Action */}
                    <button
                      onClick={() => handleDeleteMember(member)}
                      disabled={isSuperAdmin || isCurrentSession}
                      title={
                        isSuperAdmin
                          ? "Primary super admin cannot be deleted"
                          : isCurrentSession
                          ? "You cannot delete your own account"
                          : "Revoke access"
                      }
                      className="rounded p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-400" />
                Add New Team Member
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 rounded bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@3dices.com"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Operational Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "sales" | "viewer")}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-zinc-600 focus:outline-none"
                >
                  <option value="sales">Sales Operator (Leads, Outreach & Dossiers)</option>
                  <option value="admin">Administrator (Full Access & User Management)</option>
                  <option value="viewer">Viewer (Read-only Analytics)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  The user will use this password to sign into the Arcon portal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !fullName || !email || password.length < 8}
                  className="rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
                >
                  {submitting ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
