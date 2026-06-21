import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ConfirmDialog } from '../../components/ConfirmDialog';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    draft:     { label: 'Draft',    cls: 'badge-draft' },
    sent:      { label: 'Menunggu Respons', cls: 'badge-contract-pending' },
    accepted:  { label: 'Aktif',    cls: 'badge-contract-accepted' },
    rejected:  { label: 'Ditolak', cls: 'badge-contract-rejected' },
    expired:   { label: 'Kadaluarsa', cls: 'badge-contract-expired' },
    completed: { label: 'Selesai', cls: 'badge-published' },
  };
  const m = map[status] || { label: status, cls: 'badge-draft' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ── MODAL: Full Contract Viewer ── */
function ContractModal({ contract, role, onClose, onAccept, onReject }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!contract) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div className="modal-title">{contract.courseId?.title || 'Kontrak Kerjasama'}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
              {contract.companyName} · {fmtDate(contract.createdAt)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatusBadge status={contract.status} />
            {contract.ndaActive && <span className="badge badge-pending"><i className="ti ti-shield" style={{ fontSize: 9 }} /> NDA Berlaku</span>}
          </div>

          {/* Key terms */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Perusahaan', value: contract.companyName },
              { label: 'Royalti Teacher', value: `${Math.round((contract.royaltyRatio || 0) * 100)}%` },
              { label: 'Berlaku Mulai', value: fmtDate(contract.validFrom) },
              { label: 'Berlaku Hingga', value: fmtDate(contract.validUntil) },
              { label: 'Batas Respons', value: fmtDate(contract.responseDeadline) },
              { label: 'Kursus', value: contract.courseId?.title || '—' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--gray-50)', borderRadius: 'var(--r-md)', padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-900)' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Scope */}
          {contract.scopeHtml && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-900)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Lingkup Pekerjaan</div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 14 }}
                dangerouslySetInnerHTML={{ __html: contract.scopeHtml }} />
            </>
          )}

          {/* IP Clause */}
          {contract.ipClause && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-900)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Hak Kekayaan Intelektual</div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 14 }}>{contract.ipClause}</div>
            </>
          )}

          {/* Bonus */}
          {contract.bonusClause && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-900)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Bonus & Klausul Tambahan</div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 14 }}>{contract.bonusClause}</div>
            </>
          )}

          {/* Acceptance warning */}
          {role === 'teacher' && contract.status === 'sent' && (
            <div style={{ background: 'var(--amber-100)', border: '1px solid #FCD34D', borderRadius: 'var(--r-md)', padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#92400E' }}>
              <strong>⚠️ Penting:</strong> Dengan menekan "Setuju & Tandatangani", kamu terikat secara hukum dengan seluruh klausul di atas. Baca semua isi kontrak dengan seksama.
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div style={{ marginTop: 12 }}>
              <div className="form-label">Alasan Penolakan (opsional)</div>
              <textarea
                className="form-textarea"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="mis: Jadwal bentrok, lingkup tidak sesuai, dll."
              />
            </div>
          )}

          {/* Acceptance timeline (if already responded) */}
          {contract.acceptedAt && (
            <div style={{ background: 'var(--green-100)', borderRadius: 'var(--r-md)', padding: '8px 12px', fontSize: 11, color: 'var(--green)' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 11 }} /> Disetujui pada {fmtDate(contract.acceptedAt)}
            </div>
          )}
          {contract.rejectedAt && (
            <div style={{ background: 'var(--red-100)', borderRadius: 'var(--r-md)', padding: '8px 12px', fontSize: 11, color: 'var(--red)' }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} /> Ditolak pada {fmtDate(contract.rejectedAt)}
              {contract.rejectionReason && <div style={{ marginTop: 3, color: 'var(--red)' }}>Alasan: {contract.rejectionReason}</div>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          {role === 'teacher' && contract.status === 'sent' && (
            <>
              {!showRejectForm ? (
                <button className="btn btn-danger" onClick={() => setShowRejectForm(true)}>Tolak Kontrak</button>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => setShowRejectForm(false)}>Batal Tolak</button>
                  <button className="btn btn-danger" onClick={() => onReject(contract._id, rejectReason)}>Ya, Tolak</button>
                </>
              )}
              {!showRejectForm && (
                <button className="btn btn-success" onClick={() => onAccept(contract._id)}>
                  <i className="ti ti-check" style={{ fontSize: 12 }} /> Setuju & Tandatangani
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── MODAL: Admin Create Contract ── */
function CreateContractModal({ onClose, onCreated, api }) {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    courseId: '',
    teacherId: '',
    companyName: '',
    royaltyRatio: 0.7,
    validFrom: '',
    validUntil: '',
    responseDeadline: '',
    scopeHtml: '',
    ipClause: '',
    ndaActive: false,
    bonusClause: '',
    adminNotes: '',
  });

  useEffect(() => {
    api.get('/admin/users').then(r => {
      setTeachers((r.data.users || []).filter(u => u.role === 'teacher'));
    }).catch(() => {});
    api.get('/courses/owned').then(r => setCourses(r.data.courses || [])).catch(() => {});
  }, [api]);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.courseId || !form.teacherId || !form.companyName || !form.validFrom || !form.validUntil || !form.responseDeadline) {
      setError('Isi semua field yang wajib');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/contracts', { ...form, royaltyRatio: Number(form.royaltyRatio) });
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Gagal membuat kontrak');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div className="modal-title">Buat Kontrak Kerjasama Baru</div>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'var(--red-100)', border: '1px solid #FECACA', borderRadius: 'var(--r-md)', padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>{error}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div className="form-label">Kursus <span style={{ color: 'var(--red)' }}>*</span></div>
                <select className="form-select" value={form.courseId} onChange={e => set('courseId', e.target.value)} required>
                  <option value="">— Pilih kursus —</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <div className="form-label">Assign Teacher <span style={{ color: 'var(--red)' }}>*</span></div>
                <select className="form-select" value={form.teacherId} onChange={e => set('teacherId', e.target.value)} required>
                  <option value="">— Pilih teacher —</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({(t.skills || []).join(', ') || 'no skills'})</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="form-label">Nama Perusahaan Mitra <span style={{ color: 'var(--red)' }}>*</span></div>
              <input className="form-input" type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="mis: PT Gojek Indonesia" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div className="form-label">Berlaku Mulai <span style={{ color: 'var(--red)' }}>*</span></div>
                <input className="form-input" type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} required />
              </div>
              <div>
                <div className="form-label">Berlaku Hingga <span style={{ color: 'var(--red)' }}>*</span></div>
                <input className="form-input" type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} required />
              </div>
              <div>
                <div className="form-label">Batas Respons <span style={{ color: 'var(--red)' }}>*</span></div>
                <input className="form-input" type="date" value={form.responseDeadline} onChange={e => set('responseDeadline', e.target.value)} required />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="form-label">Royalti Teacher (0–1, mis: 0.7 = 70%)</div>
              <input className="form-input" type="number" min="0" max="1" step="0.01" value={form.royaltyRatio} onChange={e => set('royaltyRatio', e.target.value)} style={{ width: 120 }} />
              <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 8 }}>= {Math.round(form.royaltyRatio * 100)}% ke teacher, {100 - Math.round(form.royaltyRatio * 100)}% platform fee</span>
            </div>
            <div className="divider" />
            <div style={{ marginBottom: 10 }}>
              <div className="form-label">Lingkup Pekerjaan (HTML diperbolehkan)</div>
              <textarea className="form-textarea" rows={4} value={form.scopeHtml} onChange={e => set('scopeHtml', e.target.value)} placeholder="• Min. 20 sesi video&#10;• 5 quiz per modul&#10;• Deadline: ..." />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="form-label">Klausul HKI</div>
              <textarea className="form-textarea" rows={2} value={form.ipClause} onChange={e => set('ipClause', e.target.value)} placeholder="Konten tetap milik instruktur. Perusahaan mendapat lisensi eksklusif 12 bulan..." />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="form-label">Bonus & Klausul Tambahan</div>
              <input className="form-input" type="text" value={form.bonusClause} onChange={e => set('bonusClause', e.target.value)} placeholder="mis: Bonus Rp 5jt jika rating ≥ 4.5" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input type="checkbox" id="ndaActive" checked={form.ndaActive} onChange={e => set('ndaActive', e.target.checked)} />
              <label htmlFor="ndaActive" style={{ fontSize: 12, color: 'var(--gray-600)', cursor: 'pointer' }}>Kontrak ini mencakup NDA (Non-Disclosure Agreement)</label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="ti ti-send" style={{ fontSize: 12 }} />
              {loading ? 'Mengirim...' : 'Buat & Kirim ke Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function ContractManager() {
  const { api, role } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewContract, setViewContract] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const confirmRef = useRef(() => {});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const endpoint = role === 'admin' ? '/contracts' : '/contracts/mine';
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await api.get(endpoint + params);
      setContracts(res.data.contracts || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat kontrak');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function handleAccept(id) {
    setError('');
    try {
      await api.post(`/contracts/${id}/accept`);
      setViewContract(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menyetujui kontrak');
    }
  }

  async function handleReject(id, reason) {
    setError('');
    try {
      await api.post(`/contracts/${id}/reject`, { rejectionReason: reason });
      setViewContract(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menolak kontrak');
    }
  }

  async function handleCancel(id) {
    setError('');
    try {
      await api.delete(`/contracts/${id}`);
      setConfirmCancel(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal membatalkan kontrak');
    }
  }

  const pendingCount = contracts.filter(c => c.status === 'sent').length;

  return (
    <>
      {viewContract && (
        <ContractModal
          contract={viewContract}
          role={role}
          onClose={() => setViewContract(null)}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
      {showCreate && role === 'admin' && (
        <CreateContractModal
          api={api}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        title="Batalkan Kontrak?"
        message="Kontrak akan ditandai sebagai kadaluarsa. Tindakan ini tidak bisa dibatalkan."
        confirmText="Ya, Batalkan"
        confirmVariant="danger"
        onCancel={() => setConfirmCancel(null)}
        onConfirm={async () => { if (confirmCancel) await handleCancel(confirmCancel); }}
      />

      <div style={{ padding: 24 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 3 }}>Kontrak Kerjasama</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {role === 'admin'
                ? 'Buat dan kelola kontrak kerjasama dengan teacher dari perusahaan mitra.'
                : 'Baca dan setujui kontrak dari perusahaan mitra sebelum bisa mengisi materi kursus.'}
            </div>
          </div>
          {role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Buat Kontrak Baru
            </button>
          )}
        </div>

        {/* HOW IT WORKS (teacher only) */}
        {role === 'teacher' && (
          <div style={{ background: 'var(--blue-50)', border: '1px solid #BEE3F8', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>Cara Kerja Kontrak</div>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { n: '1', c: 'var(--blue)', label: 'Admin Buat', desc: 'Admin membuat kursus & kontrak atas nama perusahaan mitra' },
                { n: '2', c: 'var(--orange)', label: 'Kamu Terima', desc: 'Notifikasi masuk, baca isi kontrak dengan teliti' },
                { n: '3', c: 'var(--amber)', label: 'Setuju', desc: 'Tandatangani digital — kursus terbuka untuk diisi' },
                { n: '4', c: 'var(--green)', label: 'Isi Materi', desc: 'Upload konten, admin publish, siswa beli, royalti tercatat' },
              ].map((step, i) => (
                <div key={step.n} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0 }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px' }}>{step.n}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-900)' }}>{step.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{step.desc}</div>
                  </div>
                  {i < 3 && <div style={{ padding: '0 4px' }}><i className="ti ti-arrow-right" style={{ fontSize: 12, color: 'var(--gray-300)' }} /></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending banner */}
        {pendingCount > 0 && (
          <div style={{ background: 'var(--amber-100)', border: '1px solid #FCD34D', borderRadius: 'var(--r-lg)', padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: 'var(--amber)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>
                {pendingCount} kontrak menunggu {role === 'teacher' ? 'persetujuanmu' : 'respons teacher'}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--red-100)', border: '1px solid #FECACA', borderRadius: 'var(--r-md)', padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>{error}</div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[
            { v: '', l: `Semua (${contracts.length})` },
            { v: 'sent', l: 'Menunggu' },
            { v: 'accepted', l: 'Aktif' },
            { v: 'rejected', l: 'Ditolak' },
            { v: 'expired', l: 'Kadaluarsa' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setFilterStatus(opt.v)}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: filterStatus === opt.v ? 700 : 500,
                border: filterStatus === opt.v ? '1px solid var(--blue)' : '1px solid var(--gray-200)',
                borderRadius: 'var(--r-full)', cursor: 'pointer', fontFamily: 'inherit',
                background: filterStatus === opt.v ? 'var(--blue-50)' : 'var(--surface)',
                color: filterStatus === opt.v ? 'var(--blue)' : 'var(--gray-500)',
              }}
            >{opt.l}</button>
          ))}
        </div>

        {/* Contract list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)', fontSize: 13 }}>Memuat kontrak…</div>
        ) : contracts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)', fontSize: 13 }}>
            <i className="ti ti-file-contract" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            Belum ada kontrak
            {role === 'teacher' ? ' yang ditujukan untukmu.' : '. Buat kontrak pertama.'}
          </div>
        ) : (
          <div>
            {contracts.map(c => (
              <div
                key={c._id}
                className="contract-card"
                style={{ borderColor: c.status === 'accepted' ? '#BBF7D0' : c.status === 'sent' ? '#FCD34D' : 'var(--gray-200)' }}
              >
                <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Company logo placeholder */}
                  <div style={{ width: 42, height: 42, borderRadius: 9, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(c.companyName || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 3 }}>
                      {c.courseId?.title || 'Kursus tidak diketahui'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 6 }}>{c.companyName}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--gray-400)' }}>
                      {role === 'admin' && c.teacherId && (
                        <span><i className="ti ti-user" style={{ fontSize: 10 }} /> {c.teacherId.name}</span>
                      )}
                      <span><i className="ti ti-coin" style={{ fontSize: 10 }} /> Royalti {Math.round((c.royaltyRatio || 0) * 100)}%</span>
                      <span><i className="ti ti-calendar" style={{ fontSize: 10 }} /> {fmtDate(c.validFrom)} – {fmtDate(c.validUntil)}</span>
                      {c.status === 'sent' && (
                        <span style={{ color: 'var(--red)' }}><i className="ti ti-clock" style={{ fontSize: 10 }} /> Batas respons: {fmtDate(c.responseDeadline)}</span>
                      )}
                      {c.ndaActive && <span><i className="ti ti-shield" style={{ fontSize: 10 }} /> NDA</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <StatusBadge status={c.status} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setViewContract(c)}>
                        <i className="ti ti-eye" style={{ fontSize: 11 }} /> Lihat
                      </button>
                      {role === 'teacher' && c.status === 'sent' && (
                        <button className="btn btn-success" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setViewContract(c)}>
                          Tinjau & Setuju
                        </button>
                      )}
                      {role === 'admin' && ['sent', 'draft'].includes(c.status) && (
                        <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setConfirmCancel(c._id)}>
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
