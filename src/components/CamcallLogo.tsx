export const CAMCALL_LOGO_SRC = '/assets/aistudio/logo_c0bef363.png';

interface CamcallLogoProps {
  variant?: 'icon' | 'badge' | 'hero' | 'splash';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CamcallLogoProps['size']>, string> = {
  xs: 'w-7 h-7 rounded-lg p-0.5',
  sm: 'w-9 h-9 rounded-xl p-0.5',
  md: 'w-11 h-11 rounded-2xl p-1',
  lg: 'w-16 h-16 rounded-2xl p-1.5',
  xl: 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-2',
};

export function CamcallLogo({
  variant = 'icon',
  size = 'sm',
  showWordmark = false,
  subtitle,
  className = '',
}: CamcallLogoProps) {
  const frameSize =
    variant === 'hero'
      ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1'
      : variant === 'splash'
        ? 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1.5'
        : SIZE_CLASSES[size];

  const isFramed = variant === 'badge' || variant === 'hero' || variant === 'splash';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span
        className={`relative shrink-0 inline-flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#fff5fa] via-[#ffe6f2] to-[#f8d8ea] border border-[#f3c6de] shadow-sm shadow-[#db2777]/15 ${frameSize} ${
          variant === 'splash' ? 'ring-4 ring-[#fce7f3]' : ''
        }`}
      >
        <img
          src={CAMCALL_LOGO_SRC}
          alt="CAMCALL Official Logo"
          className={`w-full h-full object-contain aspect-square ${isFramed ? 'rounded-xl' : 'rounded-lg'}`}
          draggable={false}
        />
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none text-left">
          <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-inherit">
            CAMCALL
          </span>
          {subtitle && (
            <span className="text-[10px] font-medium opacity-75 tracking-wide mt-0.5">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
