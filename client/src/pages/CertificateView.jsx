import { PageSpinner } from '../components/PageSpinner';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Container } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function CertificateView() {
  const { courseId } = useParams();
  const { api, isAuthed, user } = useAuth();
  const nav = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const certRef = useRef(null);

  useEffect(() => {
    if (!isAuthed) { nav('/login'); return; }
    async function load() {
      try {
        const res = await api.get(`/certificates/course/${courseId}`);
        setCertificate(res.data.certificate);
      } catch (e) {
        if (e?.response?.status === 404) {
          try {
            const genRes = await api.post(`/certificates/generate/${courseId}`);
            setCertificate(genRes.data.certificate);
          } catch (genErr) {
            setError(genErr?.response?.data?.error?.message || 'Sertifikat belum tersedia');
          }
        } else {
          setError(e?.response?.data?.error?.message || 'Gagal memuat sertifikat');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, isAuthed]);

  useEffect(() => {
    if (!certificate?.certificateNumber) return;
    import('qrcode').then(({ default: QRCode }) => {
      const verifyUrl = `${window.location.origin}/verify/${certificate.certificateNumber}`;
      QRCode.toDataURL(verifyUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#0C628D', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }).then(setQrDataUrl).catch(() => {});
    });
  }, [certificate?.certificateNumber]);

  async function handleDownload() {
    if (!certRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 8000,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      const fileName = `Sertifikat-${(certificate?.metadata?.courseName || 'Course').replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 40)}.pdf`;
      pdf.save(fileName);

      // Log download
      try { await api.get(`/certificates/course/${courseId}`); } catch {}
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  const issueDate = certificate?.completionDate
    ? new Date(certificate.completionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  if (loading) {
    return (
      <section className="py-20">
        <Container>
          <PageSpinner />
        </Container>
      </section>
    );
  }

  if (error || !certificate) {
    return (
      <section className="py-10">
        <Container>
          <div className="bg-rose-50 border border-rose-200 rounded-[14px] p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-rose-900 mb-2">Error</h2>
            <p className="text-sm text-rose-700 mb-4">{error || 'Sertifikat tidak ditemukan'}</p>
            <Button variant="outline" onClick={() => nav(`/courses/${courseId}`)}>Kembali ke Course</Button>
          </div>
        </Container>
      </section>
    );
  }

  const signatureUrl = certificate.metadata?.instructorSignatureUrl;

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh' }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cert-printable, #cert-printable * { visibility: visible !important; }
          #cert-printable {
            position: fixed !important; inset: 0 !important; z-index: 9999 !important;
            width: 297mm !important; height: 210mm !important;
          }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      {/* Topbar */}
      <div style={{ background: 'linear-gradient(90deg, #0C628D 0%, #0FADA8 100%)', padding: 0 }}>
        <Container>
          <div className="flex items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo-putih.png" alt="EduPoint" style={{ height: 28 }} />
              <span className="text-white font-semibold text-sm hidden sm:block">Sertifikat Penyelesaian</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-sm"
                style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff', background: 'rgba(255,255,255,0.12)' }}
                onClick={() => nav(`/courses/${courseId}`)}
              >
                Kembali ke Course
              </Button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="text-sm font-semibold px-4 py-2 rounded-[10px] transition-all"
                style={{ background: '#F3921B', color: '#fff', opacity: downloading ? 0.7 : 1, cursor: downloading ? 'not-allowed' : 'pointer' }}
              >
                {downloading ? 'Menyiapkan...' : 'Unduh PDF'}
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Warning banner if fullName is missing */}
      {!user?.fullName && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-800">
          Nama lengkap Anda belum diisi.{' '}
          <a href="/my-profile" className="font-semibold underline hover:text-amber-900">
            Lengkapi profil Anda
          </a>{' '}
          agar nama yang benar muncul di sertifikat ini.
        </div>
      )}

      {/* Certificate wrapper */}
      <div className="py-4 sm:py-8 px-3 sm:px-4">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div id="cert-printable">
            <div
              ref={certRef}
              style={{
                width: '100%',
                aspectRatio: '297/210',
                background: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                borderRadius: 0,
                fontSize: 'clamp(8px, 1.65vw, 16px)',
              }}
            >
              {/* Left accent bar — no rounded */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
                background: 'linear-gradient(180deg, #0C628D 0%, #0FADA8 50%, #F3921B 100%)',
                borderRadius: 0,
              }} />

              {/* Top strip — no rounded */}
              <div style={{
                position: 'absolute', top: 0, left: 10, right: 0, height: 6,
                background: 'linear-gradient(90deg, #0C628D 0%, #0FADA8 60%, #F3921B 100%)',
                borderRadius: 0,
              }} />

              {/* Watermark circles */}
              <div style={{
                position: 'absolute', right: -80, top: -80,
                width: 320, height: 320, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(12,98,141,0.04) 0%, transparent 70%)',
                border: '2px solid rgba(12,98,141,0.05)',
              }} />
              <div style={{
                position: 'absolute', right: -40, top: -40,
                width: 200, height: 200, borderRadius: '50%',
                border: '1.5px solid rgba(243,146,27,0.08)',
              }} />
              <div style={{
                position: 'absolute', left: 30, bottom: -60,
                width: 180, height: 180, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(15,173,168,0.04) 0%, transparent 70%)',
              }} />

              {/* Content area */}
              <div style={{
                position: 'absolute', inset: 0, left: 10, top: 6,
                display: 'flex', flexDirection: 'column',
                padding: '4.5% 6% 4.5% 5.5%',
              }}>
                {/* Header: logo left, cert number right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3.5%' }}>
                  <img
                    src="/logo-inspira.png"
                    alt="EduPoint"
                    style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.52em', fontWeight: 700, letterSpacing: '0.15em', color: '#9CA3AF', textTransform: 'uppercase' }}>
                      No. Sertifikat
                    </div>
                    <div style={{ fontSize: '0.58em', fontWeight: 600, color: '#374151', fontFamily: 'monospace', marginTop: 2 }}>
                      {certificate.certificateNumber}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {/* "Certificate of Completion" label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5%' }}>
                    <div style={{ height: 2, width: 28, background: '#F3921B', borderRadius: 0 }} />
                    <span style={{ fontSize: '0.6em', fontWeight: 700, letterSpacing: '0.2em', color: '#F3921B', textTransform: 'uppercase' }}>
                      Certificate of Completion
                    </span>
                    <div style={{ height: 2, flex: 1, background: 'linear-gradient(90deg, #F3921B, transparent)', borderRadius: 0 }} />
                  </div>

                  <div style={{ fontSize: '0.72em', color: '#6B7280', marginBottom: '1.2%' }}>
                    Dengan bangga diberikan kepada
                  </div>

                  <div style={{
                    fontSize: '2.1em', fontWeight: 800,
                    color: '#0A0E1A', letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                    marginBottom: '1.8%',
                    fontFamily: '"Bricolage Grotesque", "Inter", Arial, sans-serif',
                  }}>
                    {user?.fullName || (
                      <span style={{ color: '#EF4444', fontSize: '0.6em', fontWeight: 600 }}>
                        ⚠ Nama lengkap belum diisi — cek Profil Anda
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.72em', color: '#6B7280', marginBottom: '0.8%' }}>
                    atas keberhasilan menyelesaikan kursus
                  </div>

                  <div style={{
                    fontSize: '1.05em', fontWeight: 700,
                    color: '#0C628D',
                    lineHeight: 1.35,
                    marginBottom: '3.5%',
                    maxWidth: '72%',
                  }}>
                    {certificate.metadata?.courseName || 'Nama Kursus'}
                  </div>

                  {/* Footer row */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                    paddingTop: '2.5%',
                    borderTop: '1px solid #F3F4F6',
                  }}>
                    {/* Date */}
                    <div>
                      <div style={{ fontSize: '0.52em', fontWeight: 600, letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>
                        Tanggal Penyelesaian
                      </div>
                      <div style={{ fontSize: '0.7em', fontWeight: 600, color: '#374151' }}>
                        {issueDate}
                      </div>
                      <div style={{ fontSize: '0.52em', color: '#9CA3AF', marginTop: 5 }}>
                        Platform: EduPoint
                      </div>
                    </div>

                    {/* Instructor signature */}
                    <div style={{ textAlign: 'center' }}>
                      {signatureUrl ? (
                        <img
                          src={signatureUrl}
                          alt="Tanda Tangan"
                          style={{ height: 36, maxWidth: 120, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div style={{ width: 120, height: 1, background: '#D1D5DB', margin: '0 auto 6px' }} />
                      )}
                      <div style={{ fontSize: '0.66em', fontWeight: 600, color: '#374151' }}>
                        {certificate.metadata?.instructorName || 'EduPoint'}
                      </div>
                      <div style={{ fontSize: '0.5em', letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 2 }}>
                        Instruktur / Authorized
                      </div>
                    </div>

                    {/* QR code */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Verifikasi"
                          style={{ width: 64, height: 64, display: 'block' }}
                        />
                      )}
                      <div style={{ fontSize: '0.42em', color: '#9CA3AF', textAlign: 'center' }}>
                        Scan untuk verifikasi
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info below */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Verifikasi sertifikat dengan nomor:{' '}
              <span className="font-mono font-semibold text-gray-700">{certificate.certificateNumber}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Scan QR code pada sertifikat untuk memverifikasi keasliannya
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
