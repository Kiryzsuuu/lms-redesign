export function Toggle({ checked, onChange, label, id, disabled = false }) {
  const uid = id || Math.random().toString(36).slice(2);
  return (
    <label htmlFor={uid} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
      <span style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, flexShrink: 0 }}>
        <input
          id={uid}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
        <span style={{
          position: 'absolute', inset: 0,
          background: checked ? '#0C628D' : '#D1D5DB',
          borderRadius: 99,
          transition: 'background .2s',
          opacity: disabled ? 0.5 : 1,
        }} />
        <span style={{
          position: 'absolute',
          top: 2, left: checked ? 18 : 2,
          width: 16, height: 16,
          background: '#fff',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          transition: 'left .2s',
        }} />
      </span>
      {label && <span style={{ fontSize: 13, color: disabled ? '#9CA3AF' : '#374151', fontWeight: 500 }}>{label}</span>}
    </label>
  );
}
