const H2HIcon = ({ size = 48, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 120 80"
    width={size}
    height={Math.round(size * 0.67)}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Head to head"
    role="img"
  >
    {/* Left jersey — blue */}
    <path
      d="M8 12 L2 24 L14 28 L14 62 L38 62 L38 28 L50 24 L44 12 L36 20 L23 20 Z"
      fill="#185FA5"
    />
    {/* Left jersey collar */}
    <path
      d="M23 12 Q28 18 33 12"
      stroke="#0C447C"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Left jersey letter */}
    <text
      x="26"
      y="50"
      textAnchor="middle"
      fontSize="18"
      fontWeight="600"
      fill="white"
      fontFamily="system-ui, sans-serif"
    >A</text>

    {/* VS badge in center */}
    <rect x="46" y="28" width="28" height="22" rx="4" fill="#BA7517" />
    <text
      x="60"
      y="43"
      textAnchor="middle"
      fontSize="13"
      fontWeight="700"
      fill="white"
      fontFamily="system-ui, sans-serif"
    >VS</text>

    {/* Right jersey — red */}
    <path
      d="M70 12 L64 24 L76 28 L76 62 L100 62 L100 28 L112 24 L106 12 L98 20 L85 20 Z"
      fill="#A32D2D"
    />
    {/* Right jersey collar */}
    <path
      d="M85 12 Q90 18 95 12"
      stroke="#791F1F"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Right jersey letter */}
    <text
      x="88"
      y="50"
      textAnchor="middle"
      fontSize="18"
      fontWeight="600"
      fill="white"
      fontFamily="system-ui, sans-serif"
    >B</text>
  </svg>
)

export default H2HIcon
