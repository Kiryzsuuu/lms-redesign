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
              <img src="/logo-putih.png" alt="Edulyfe" style={{ height: 28 }} />
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
          <a href="/dashboard/profile" className="font-semibold underline hover:text-amber-900">
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
                aspectRatio: '2000/1414',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                backgroundImage: 'url(/certificate-template.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                fontSize: 'clamp(8px, 1.9vw, 18px)',
              }}
            >
              {/* No. Sertifikat (label + value) */}
              <div style={{
                position: 'absolute', left: '16.25%', top: '42.5%',
                fontSize: '0.7em', fontWeight: 700, color: '#0d2f52', letterSpacing: '0.02em',
              }}>
                NO. SERTIFIKAT
              </div>
              <div style={{
                position: 'absolute', left: '16.25%', top: '46.2%',
                fontSize: '0.7em', fontWeight: 600, color: '#4B5563', fontFamily: 'monospace',
              }}>
                {certificate.certificateNumber}
              </div>

              {/* Dengan bangga diberikan kepada */}
              <div style={{
                position: 'absolute', left: '16.25%', top: '52%',
                fontSize: '0.78em', fontWeight: 700, color: '#0d2f52',
              }}>
                Dengan bangga diberikan kepada:
              </div>

              {/* Nama penerima */}
              <div style={{
                position: 'absolute', left: '16.1%', top: '55.5%', maxWidth: '50%',
                fontSize: '1.7em', fontWeight: 700, color: '#0d2f52', lineHeight: 1.1,
                fontFamily: '"Bricolage Grotesque", "Inter", Arial, sans-serif',
              }}>
                {user?.fullName || (
                  <span style={{ color: '#EF4444', fontSize: '0.55em', fontWeight: 600 }}>
                    ⚠ Nama lengkap belum diisi — cek Profil Anda
                  </span>
                )}
              </div>

              {/* atas keberhasilan menyelesaikan kursus */}
              <div style={{
                position: 'absolute', left: '16.25%', top: '64%',
                fontSize: '0.78em', fontWeight: 600, color: '#0d2f52',
              }}>
                atas keberhasilan menyelesaikan kursus
              </div>

              {/* Nama kursus */}
              <div style={{
                position: 'absolute', left: '16.25%', top: '67.5%', maxWidth: '68%',
                fontSize: '0.9em', fontWeight: 700, color: '#0C628D', lineHeight: 1.3,
              }}>
                {certificate.metadata?.courseName || 'Nama Kursus'}
              </div>

              {/* Tanggal penyelesaian (label sudah ada di template, isi nilai di bawahnya) */}
              <div style={{
                position: 'absolute', left: '16.25%', top: '79.2%',
                fontSize: '0.8em', fontWeight: 700, color: '#0d2f52',
              }}>
                {issueDate}
              </div>

              {/* Instruktur (di atas label INSTRUKTUR/AUTHORIZED) */}
              <div style={{
                position: 'absolute', left: '41%', top: '76%', width: '22%', textAlign: 'center',
              }}>
                {signatureUrl && (
                  <img
                    src={signatureUrl}
                    alt="Tanda Tangan"
                    style={{ height: 34, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 2px' }}
                    crossOrigin="anonymous"
                  />
                )}
                <div style={{ fontSize: '0.72em', fontWeight: 700, color: '#0d2f52' }}>
                  {certificate.metadata?.instructorName || 'Edulyfe'}
                </div>
              </div>

              {/* QR code (di atas label Scan untuk verifikasi) */}
              <div style={{
                position: 'absolute', left: '76%', top: '64%', width: '8.5%', transform: 'translateX(-50%)',
              }}>
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Verifikasi"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                )}
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
