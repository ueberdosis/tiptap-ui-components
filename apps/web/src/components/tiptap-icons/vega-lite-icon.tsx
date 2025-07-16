import * as React from "react"

export const VegaLiteIcon = React.memo(
  ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        width="24"
        height="24"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 17L12 7L17 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="7"
          cy="17"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="12"
          cy="7"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="17"
          cy="12"
          r="1"
          fill="currentColor"
        />
      </svg>
    )
  }
)

VegaLiteIcon.displayName = "VegaLiteIcon"