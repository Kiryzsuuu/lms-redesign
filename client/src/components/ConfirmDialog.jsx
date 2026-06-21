import { Card, Button } from './ui';

export function ConfirmDialog({
  open,
  title = 'Konfirmasi',
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-lg font-extrabold tracking-tight text-slate-900">{title}</div>
          {message ? <div className="mt-2 text-sm text-slate-600">{message}</div> : null}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
