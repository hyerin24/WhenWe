import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Field({ label, id, className = '', ...props }: Props) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        id={id}
        {...props}
        className={`w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 ${className}`}
      />
    </label>
  )
}
