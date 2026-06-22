import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function StudentCertificates() {
  const { api } = useAuth();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    api.get('/certificates/my-certificates')
      .then(r => setCerts(r.data.certificates || []))
      .catch(() => setCerts([]))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <PageSpinner fullPage />;

  return (
    <DsPage title="Sertifikat Saya" subtitle={`${certs.length} sertifikat diterbitkan`}>
      {certs.length === 0 ? (
        <DsCard>
          <DsEmpty icon="ti-award">
            Belum ada sertifikat. Selesaikan kursusmu untuk mendapatkan sertifikat resmi!
          </DsEmpty>
        </DsCard>
      ) : (
        <DsCard>
          {certs.map((cert, i) => (
            <div
              key={cert._id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < certs.length - 1 ? '1px solid #F9FAFB' : 'none' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-certificate" style={{ fontSize: 18, color: '#0C628D' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{cert.courseId?.title || 'Kursus'}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                  No. {cert.certificateNumber} · {fmtDate(cert.issuedAt)}
                </div>
              </div>
              <Link
                to={`/certificate/${cert.courseId?._id || cert.courseId}`}
                className="ds-sec-link"
                style={{ flexShrink: 0 }}
              >
                <i className="ti ti-eye" /> Lihat
              </Link>
            </div>
          ))}
        </DsCard>
      )}
    </DsPage>
  );
}
