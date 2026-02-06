import { useTheme } from '@/hooks/useTheme';
import logoLightSvg from '@/assets/logo-light.svg';
import logoDarkSvg from '@/assets/logo-dark.svg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const { theme } = useTheme();
  
  const sizeClasses = {
    sm: 'h-[42px]',
    md: 'h-[50px]', 
    lg: 'h-[58px]',
    xl: 'h-[74px]'
  };
  
  const logoSrc = theme === 'dark' ? logoDarkSvg : logoLightSvg;
  
  return (
    <img 
      src={logoSrc}
      alt="Kordian"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
}
