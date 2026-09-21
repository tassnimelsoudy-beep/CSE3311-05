import { getInitials, getAvatarColor } from '../utils/avatar.js'

export default function Avatar({ name, size = 32 }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: getAvatarColor(name),
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}
