const { AuditLog } = require('../models/AuditLog');

/** Fire-and-forget audit log. Never throws. */
function audit({ actor, action, resource, resourceId, resourceName, parentId, parentName, changedFields, notes, req }) {
  AuditLog.create({
    actorId:      actor?.sub || actor?._id,
    actorName:    actor?.name || String(actor?.sub || ''),
    actorRole:    actor?.role || '',
    action,
    resource,
    resourceId:   resourceId || undefined,
    resourceName: resourceName || '',
    parentId:     parentId || undefined,
    parentName:   parentName || '',
    changedFields: Array.isArray(changedFields) ? changedFields : [],
    notes:        notes || '',
    ip:           req?.ip,
    userAgent:    req?.headers?.['user-agent'],
  }).catch(() => {});
}

/** Detect which top-level scalar fields changed between two plain objects. */
function diffFields(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const k of keys) {
    if (k === '_id' || k === '__v' || k === 'updatedAt') continue;
    const bv = JSON.stringify((before || {})[k]);
    const av = JSON.stringify((after || {})[k]);
    if (bv !== av) changed.push(k);
  }
  return changed;
}

// Legacy helper kept for backward compat
async function writeAuditLog({ req, action, targetUserId, metadata }) {
  AuditLog.create({
    actorId: req?.user?.sub,
    actorName: '',
    actorRole: '',
    action,
    resource: 'user',
    targetUserId,
    metadata,
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  }).catch(() => {});
}

module.exports = { audit, diffFields, writeAuditLog };
