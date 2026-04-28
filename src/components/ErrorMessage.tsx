interface Props {
  message?: string
}

export function ErrorMessage({ message = 'Something went wrong.' }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-red-400">
      <span className="text-4xl">⚠</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
