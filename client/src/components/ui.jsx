import clsx from 'clsx';

export function Container({ className, ...props }) {
  return (
    <div
      className={clsx('mx-auto w-full max-w-[1200px] px-4 sm:px-6', className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-gray-200 overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const base = clsx(
    'inline-flex items-center justify-center gap-[0.4rem]',
    'font-semibold leading-none whitespace-nowrap cursor-pointer',
    'border-none transition-all duration-150',
    'disabled:opacity-50 disabled:pointer-events-none focus:outline-none',
  );

  const sizes = {
    sm: 'text-[0.78rem] px-[0.9rem] py-[0.5rem] rounded-[7px]',
    md: 'text-[0.85rem] px-5 py-[0.6rem] rounded-[8px]',
    lg: 'text-[0.9rem] px-7 py-[0.75rem] rounded-[10px]',
  };

  const variants = {
    primary: clsx(
      'bg-[#0C628D] text-white',
      'hover:bg-[#0A527A] hover:-translate-y-[1px]',
    ),
    orange: clsx(
      'bg-[#F3921B] text-white',
      'hover:bg-[#D97C0D] hover:-translate-y-[1px]',
    ),
    white: clsx(
      'bg-white text-gray-900 border border-gray-200',
      'hover:border-gray-300 hover:-translate-y-[1px]',
    ),
    outline: clsx(
      'bg-transparent text-gray-700 border border-gray-200',
      'hover:border-gray-300 hover:bg-gray-50',
    ),
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    danger: clsx(
      'bg-red-600 text-white',
      'hover:bg-red-700 hover:-translate-y-[1px]',
    ),
    secondary: clsx(
      'bg-gray-100 text-gray-700',
      'hover:bg-gray-200',
    ),
  };

  return (
    <button
      className={clsx(base, sizes[size] ?? sizes.md, variants[variant] ?? variants.primary, className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'w-full rounded-[8px] border border-gray-200 bg-white px-3 py-[0.45rem] text-sm text-gray-900',
        'placeholder:text-gray-400 font-[inherit]',
        'focus:outline-none focus:border-[#0C628D] focus:ring-2 focus:ring-[rgba(12,98,141,.12)]',
        'transition-colors duration-150',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-[8px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900',
        'placeholder:text-gray-400 font-[inherit]',
        'focus:outline-none focus:border-[#0C628D] focus:ring-2 focus:ring-[rgba(12,98,141,.12)]',
        'transition-colors duration-150',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }) {
  return (
    <label
      className={clsx(
        'text-[0.72rem] font-semibold text-gray-500 tracking-[.05em] uppercase',
        className
      )}
      {...props}
    />
  );
}
