import { useTheme } from '@/hooks/useTheme';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const { theme } = useTheme();
  
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-10',
    xl: 'h-12'
  };
  
  const logoSrc = theme === 'dark' ? logoDark : logoLight;
  
  return (
    <img 
      src={logoSrc}
      alt="Connect CRM"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
}
