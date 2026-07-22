// Iconos SVG inline (stroke). Sin dependencias externas.
const S = ({ children, size = 24, className = '', strokeWidth = 1.8, ...p }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...p}
  >
    {children}
  </svg>
)

export const Check = (p) => <S {...p}><path d="M20 6 9 17l-5-5" /></S>
export const Clock = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
export const Coffee = (p) => (
  <S {...p}><path d="M17 8h1a3 3 0 0 1 0 6h-1" /><path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" /><path d="M6 2v2M10 2v2M14 2v2" /></S>
)
export const Utensils = (p) => (
  <S {...p}><path d="M4 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2M6 2v9M6 11v11" /><path d="M18 2c-1.5 0-3 1.5-3 4v6h3m0-10v20" /></S>
)
export const Power = (p) => <S {...p}><path d="M12 3v9" /><path d="M5.6 7a8 8 0 1 0 12.8 0" /></S>
export const LogOut = (p) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></S>
export const Plus = (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>
export const Send = (p) => <S {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></S>
export const Chat = (p) => <S {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></S>
export const X = (p) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>
export const Alert = (p) => (
  <S {...p}><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></S>
)
export const Wrench = (p) => (
  <S {...p}><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.8-.7-.7-2.8 2.6-2.1Z" /></S>
)
export const Spray = (p) => (
  <S {...p}><path d="M9 11h6v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9Z" /><path d="M9 11V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" /><path d="M12 5V3M16 4h.01M19 3h.01M16 8h.01M19 7h.01M19 11h.01" /></S>
)
export const Megaphone = (p) => (
  <S {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l4 3V8L6 11H4a1 1 0 0 0-1 1Z" /><path d="M10 8l9-5v18l-9-5" /><path d="M19 9a3 3 0 0 1 0 6" /></S>
)
export const Chevron = (p) => <S {...p}><path d="m9 18 6-6-6-6" /></S>
export const ChevronDown = (p) => <S {...p}><path d="m6 9 6 6 6-6" /></S>
export const GripVertical = (p) => <S {...p}><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/></S>
export const Dumbbell = (p) => (
  <S {...p}><path d="m6.5 6.5 11 11" /><path d="M21 21l-1-1M3 3l1 1" /><path d="m18 22 4-4M2 6l4-4" /><path d="m7 17-5-5M22 12l-5-5" /></S>
)
export const Bell = (p) => (
  <S {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></S>
)
export const Sunrise = (p) => (
  <S {...p}><path d="M12 2v6M4.9 10.9l1.4 1.4M2 18h2M20 18h2M17.7 12.3l1.4-1.4M22 22H2" /><path d="M16 18a4 4 0 0 0-8 0" /></S>
)
export const Moon = (p) => <S {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></S>
export const Star = (p) => <S {...p}><path d="M12 2.5l2.9 5.9 6.6 1-4.8 4.6 1.1 6.5L12 17.9 6.2 20.5l1.1-6.5L2.5 9.4l6.6-1Z" /></S>
export const Refresh = (p) => (
  <S {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></S>
)
export const User = (p) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>
export const Lock = (p) => (
  <S {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></S>
)
export const Camera = (p) => (
  <S {...p}><path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L18 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" /><circle cx="12" cy="13" r="3.5" /></S>
)
export const Key = (p) => (
  <S {...p}><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.5 12.5 8-8M16 5l3 3M14.5 6.5l2.5 2.5" /></S>
)
export const Settings = (p) => (
  <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></S>
)
export const Trash = (p) => (
  <S {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></S>
)
export const Map = (p) => (
  <S {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></S>
)
export const MapPin = (p) => (
  <S {...p}><path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></S>
)
export const Activity = (p) => <S {...p}><path d="M3 12h4l3 8 4-16 3 8h4" /></S>
export const Pencil = (p) => (
  <S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></S>
)
export const Book = (p) => (
  <S {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M19 17H6a2 2 0 0 0-2 2" /></S>
)
export const Search = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>
export const Calendar = (p) => (
  <S {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></S>
)
export const BarChart = (p) => (
  <S {...p}><path d="M3 21h18" /><rect x="5" y="11" width="3.5" height="7" rx="1" /><rect x="10.25" y="7" width="3.5" height="11" rx="1" /><rect x="15.5" y="13" width="3.5" height="5" rx="1" /></S>
)
