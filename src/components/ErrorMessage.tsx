interface Props {
  message?: string
  title?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorMessage({
  message = 'Something went wrong.',
  title,
  onRetry,
  retryLabel = 'Try again',
}: Props) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-16 text-red-400"
      role="alert"
      aria-live="polite"
    >
      <span className="text-4xl" aria-hidden>
        ⚠
      </span>
      {title ? <h2 className="text-base font-bold text-white">{title}</h2> : null}
      <p className="text-sm font-medium text-center max-w-md">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-xl border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10 transition-colors"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
