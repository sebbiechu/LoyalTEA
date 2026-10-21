/** Small teabag mark, echoing the LoyalTEA logo. Uses currentColor. */
export function Teabag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 17.5 15 12.5h4.2v1.8a1.3 1.3 0 0 0 1.3 1.3h3a1.3 1.3 0 0 0 1.3-1.3v-1.8H28l6 5V44H8Z
           M11 29.5c2-1.6 3.6-1.6 5.4 0s3.6 1.6 5.4 0 3.6-1.6 5.4 0 2.9 1.4 3.8.6V41H11Z"
      />
      <path d="M22 13c0-6 4-9 9-9 6 0 9 4 9 9v14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="35" y="27" width="10" height="10" rx="1" fill="currentColor" transform="rotate(-12 40 32)" />
    </svg>
  );
}
