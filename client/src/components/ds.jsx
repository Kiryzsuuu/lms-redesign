/* Reusable design-system primitives (ds-*). Use across all in-app
   sidebar pages so sizing/typography stay identical. */
import { Link } from 'react-router-dom';

/** Page wrapper that owns its own scroll inside DashboardLayout content. */
export function DsPage({ title, subtitle, actions, children }) {
  return (
    <div className="ds ds-scroll">
      {(title || actions) && (
        <div className="ds-page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {title && <div className="ds-h1">{title}</div>}
            {subtitle && <div className="ds-sub">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function DsCard({ children, className = '', style, ...rest }) {
  return (
    <div className={`ds-card ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}

export function DsStat({ label, value, sub, color, progress }) {
  return (
    <div className="ds-stat-card">
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-val" style={{ color: color || '#111827' }}>{value}</div>
      {typeof progress === 'number' && (
        <div className="ds-pbar"><div className="ds-pfill" style={{ width: `${progress}%`, background: color || '#0C628D' }} /></div>
      )}
      {sub && <div className="ds-stat-sub" style={{ marginTop: progress != null ? 6 : 0 }}>{sub}</div>}
    </div>
  );
}

export function DsSectionHdr({ title, linkTo, linkLabel, onLink }) {
  const link = linkLabel && (
    <span className="ds-sec-link" onClick={onLink}>
      {linkLabel} <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
    </span>
  );
  return (
    <div className="ds-section-hdr">
      <div className="ds-sec-title">{title}</div>
      {linkTo ? <Link to={linkTo} className="ds-sec-link">{linkLabel} <i className="ti ti-arrow-right" style={{ fontSize: 11 }} /></Link> : link}
    </div>
  );
}

/** Reusable course card. thumb = icon name; pill = {text,kind}. */
export function DsCourseCard({ to, onClick, image, icon = 'ti-book', thumbBg, pill, title, metaLeft, metaRight, progress }) {
  const body = (
    <>
      <div className="ds-c-thumb" style={{ background: thumbBg }}>
        {image ? <img src={image} alt="" /> : <i className={`ti ${icon}`} />}
        {pill && <div className={`ds-c-pill ds-pill-${pill.kind}`}>{pill.text}</div>}
      </div>
      <div className="ds-c-body">
        <div className="ds-c-title">{title}</div>
        {typeof progress === 'number' && (
          <div className="ds-prog-row" style={{ marginBottom: 6 }}>
            <div className="ds-prog-bar"><div className="ds-prog-fill" style={{ width: `${progress}%` }} /></div>
            <div className="ds-prog-pct">{progress}%</div>
          </div>
        )}
        {(metaLeft || metaRight) && (
          <div className="ds-c-meta">
            <span>{metaLeft}</span>
            <span className={metaRight?.rating ? 'ds-c-rating' : ''}>{metaRight?.rating ? `★ ${metaRight.rating}` : metaRight}</span>
          </div>
        )}
      </div>
    </>
  );
  if (to) return <Link to={to} className="ds-c-card">{body}</Link>;
  return <div className="ds-c-card" onClick={onClick}>{body}</div>;
}

export function DsEmpty({ icon = 'ti-inbox', children }) {
  return (
    <div className="ds-empty">
      <i className={`ti ${icon}`} />
      <p>{children}</p>
    </div>
  );
}
