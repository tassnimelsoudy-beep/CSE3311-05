// Rotate brand mark: two arrows chasing each other around a circle.
// Replace with the logo from Figma once it's exported.
export default function Logo({ size = 32, light = false }) {
  const main = light ? '#F4F7F5' : '#17332F'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M9 16a7 7 0 0 1 11.9-5" fill="none" stroke={main} strokeWidth="3" strokeLinecap="round" />
      <path d="M23 16a7 7 0 0 1-11.9 5" fill="none" stroke="#F2B544" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 7l1.4 4.3-4.4.4" fill="none" stroke={main} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 25l-1.4-4.3 4.4-.4" fill="none" stroke="#F2B544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
