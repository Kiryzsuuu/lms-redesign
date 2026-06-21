import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Label } from '../../components/ui';
import { SidebarShell } from '../../components/SidebarShell';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../lib/auth';

const ROLES = ['student', 'teacher', 'admin'];

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function UserManager() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [skillInputs, setSkillInputs] = useState({});
  const [expandedId, setExpandedId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [generatingCode, setGeneratingCode] = useState('');
  const [copied, setCopied] = useState('');

  const sortedUsers = useMemo(() => [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [users]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users');
      const list = res.data.users || [];
      setUsers(list);
      setDrafts(
        Object.fromEntries(
          list.map((u) => [
            u._id,
            { role: u.role, royaltyRatio: u.royaltyRatio ?? 0, skills: u.skills || [] },
          ])
        )
      );
      setSkillInputs(Object.fromEntries(list.map((u) => [u._id, ''])));
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal memuat users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setDraft(userId, field, value) {
    setDrafts((d) => ({ ...d, [userId]: { ...d[userId], [field]: value } }));
  }

  function addSkill(userId) {
    const val = (skillInputs[userId] || '').trim().toLowerCase();
    if (!val) return;
    setDrafts((d) => {
      const existing = d[userId]?.skills || [];
      if (existing.includes(val)) return d;
      return { ...d, [userId]: { ...d[userId], skills: [...existing, val] } };
    });
    setSkillInputs((s) => ({ ...s, [userId]: '' }));
  }

  function removeSkill(userId, skill) {
    setDrafts((d) => ({
      ...d,
      [userId]: { ...d[userId], skills: (d[userId]?.skills || []).filter((s) => s !== skill) },
    }));
  }

  async function saveUser(userId) {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingId(userId);
    setError('');
    try {
      const res = await api.put(`/admin/users/${userId}`, {
        role: draft.role,
        royaltyRatio: draft.royaltyRatio,
        skills: draft.skills,
      });
      const updated = res.data.user;
      setUsers((prev) =>
        prev.map((u) =>
          u._id === updated._id ? { ...u, ...updated } : u
        )
      );
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal update user');
    } finally {
      setSavingId('');
    }
  }

  async function generateReferralCode(userId) {
    setGeneratingCode(userId);
    setError('');
    try {
      const res = await api.post(`/admin/users/${userId}/referral-code`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, referralCode: res.data.referralCode } : u))
      );
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal generate kode referral');
    } finally {
      setGeneratingCode('');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?._id) return;
    setDeletingId(deleteTarget._id);
    setError('');
    try {
      await api.delete(`/admin/users/${deleteTarget._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.response?.data?.message || e.message || 'Gagal menghapus user');
    } finally {
      setDeletingId('');
    }
  }

  const renderSidebar = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Ringkasan</div>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-medium text-slate-500">Total users</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{users.length}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-blue-50 px-2 py-3 text-blue-900">
              <div className="font-semibold">Student</div>
              <div className="mt-1 text-lg font-extrabold">{users.filter((u) => u.role === 'student').length}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-2 py-3 text-emerald-900">
              <div className="font-semibold">Teacher</div>
              <div className="mt-1 text-lg font-extrabold">{users.filter((u) => u.role === 'teacher').length}</div>
            </div>
            <div className="rounded-2xl bg-orange-50 px-2 py-3 text-orange-900">
              <div className="font-semibold">Admin</div>
              <div className="mt-1 text-lg font-extrabold">{users.filter((u) => u.role === 'admin').length}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const isTeacherOrAdmin = (userId) => {
    const draft = drafts[userId];
    return draft?.role === 'teacher' || draft?.role === 'admin';
  };

  return (
    <>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus user?"
        message={deleteTarget ? `User: ${deleteTarget.name} (${deleteTarget.email}) akan dihapus permanen.` : ''}
        confirmText="Hapus"
        cancelText="Batal"
        confirmVariant="danger"
        onCancel={() => (deletingId ? null : setDeleteTarget(null))}
        onConfirm={confirmDelete}
      />

      <SidebarShell
        title="Kelola Users"
        description="Atur role, royalti, keahlian, dan kode referral untuk setiap akun pengguna."
        actions={<Button variant="outline" onClick={load} disabled={loading} className="rounded-2xl">Refresh</Button>}
        sidebarTitle="Insight pengguna"
        renderSidebar={renderSidebar}
        sidebarWidth="w-80"
      >
        {error ? <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <Card className="p-4 sm:p-6">
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : (
            <div className="grid gap-3">
              {sortedUsers.map((u) => {
                const draft = drafts[u._id] || { role: u.role, royaltyRatio: 0, skills: [] };
                const isExpanded = expandedId === u._id;
                const teacherOrAdmin = isTeacherOrAdmin(u._id);

                return (
                  <div key={u._id} className="border border-slate-200 bg-white">
                    {/* Header row */}
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 break-words">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-sm text-slate-600">{u.email}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>Dibuat: {new Date(u.createdAt).toLocaleDateString('id-ID')}</span>
                          {u.referralCode && (
                            <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-orange-700 font-mono font-semibold">
                              REF: {u.referralCode}
                              <button
                                type="button"
                                title="Salin kode"
                                onClick={() => { copyToClipboard(u.referralCode); setCopied(u._id); setTimeout(() => setCopied(''), 2000); }}
                                className="ml-0.5 text-orange-400 hover:text-orange-700"
                              >
                                {copied === u._id ? '✓' : '⎘'}
                              </button>
                            </span>
                          )}
                          {u.referredBy && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">Referral: {u.referredBy}</span>
                          )}
                        </div>
                        {(u.skills || []).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(u.skills || []).map((s) => (
                              <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? '' : u._id)}
                          className="text-xs text-slate-500 underline hover:text-slate-700"
                        >
                          {isExpanded ? 'Tutup' : 'Edit detail'}
                        </button>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteTarget(u)}
                          disabled={savingId === u._id || deletingId === u._id}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs"
                        >
                          {deletingId === u._id ? 'Menghapus...' : 'Hapus'}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded edit panel */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4 grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Role */}
                          <div>
                            <Label className="text-xs">Role</Label>
                            <select
                              className="mt-1 w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                              value={draft.role}
                              onChange={(e) => setDraft(u._id, 'role', e.target.value)}
                            >
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>

                          {/* Royalty ratio — hanya untuk teacher/admin */}
                          {teacherOrAdmin && (
                            <div>
                              <Label className="text-xs">Rasio Royalti (%)</Label>
                              <div className="mt-1 flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={Math.round((draft.royaltyRatio || 0) * 100)}
                                  onChange={(e) => setDraft(u._id, 'royaltyRatio', Math.min(1, Math.max(0, Number(e.target.value) / 100)))}
                                  className="w-24"
                                />
                                <span className="text-sm text-slate-500">%</span>
                                <span className="text-xs text-slate-400">(mis: 30 = 30%)</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Skills — hanya untuk teacher/admin */}
                        {teacherOrAdmin && (
                          <div>
                            <Label className="text-xs">Keahlian / Skills</Label>
                            <div className="mt-1 flex gap-2">
                              <Input
                                value={skillInputs[u._id] || ''}
                                onChange={(e) => setSkillInputs((s) => ({ ...s, [u._id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(u._id); } }}
                                placeholder="Tambah keahlian, Enter untuk simpan"
                              />
                              <Button type="button" variant="outline" onClick={() => addSkill(u._id)} className="shrink-0 text-xs">Tambah</Button>
                            </div>
                            {(draft.skills || []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(draft.skills || []).map((s) => (
                                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                                    {s}
                                    <button type="button" onClick={() => removeSkill(u._id, s)} className="hover:text-orange-600">&times;</button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Kode Referral */}
                        {teacherOrAdmin && (
                          <div>
                            <Label className="text-xs">Kode Referral</Label>
                            <div className="mt-1 flex items-center gap-2">
                              {u.referralCode ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-bold tracking-widest text-orange-700 bg-orange-50 px-3 py-1.5 border border-orange-200">
                                    {u.referralCode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => { copyToClipboard(u.referralCode); setCopied(`code-${u._id}`); setTimeout(() => setCopied(''), 2000); }}
                                    className="text-xs text-slate-500 underline hover:text-slate-700"
                                  >
                                    {copied === `code-${u._id}` ? 'Tersalin!' : 'Salin'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Belum punya kode referral</span>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => generateReferralCode(u._id)}
                                disabled={generatingCode === u._id}
                                className="text-xs"
                              >
                                {generatingCode === u._id ? 'Generating...' : u.referralCode ? 'Regenerate' : 'Generate Kode'}
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            onClick={() => saveUser(u._id)}
                            disabled={savingId === u._id}
                            className="text-sm"
                          >
                            {savingId === u._id ? 'Menyimpan...' : 'Simpan Perubahan'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {sortedUsers.length === 0 ? <div className="text-sm text-slate-600">Belum ada user.</div> : null}
            </div>
          )}
        </Card>
      </SidebarShell>
    </>
  );
}
