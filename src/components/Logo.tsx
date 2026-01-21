import { useTheme } from '@/hooks/useTheme';
import logoLight from '@/assets/logo-light.png';

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
  
  // Para dark mode, aplicamos um filtro para inverter/clarear a logo
  // Quando uma versão dark for fornecida, podemos trocar aqui
  const darkModeFilter = theme === 'dark' ? 'brightness(0) invert(1)' : undefined;
  
  return (
    <img 
      src={logoLight}
      alt="Connect CRM"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
      style={{ filter: darkModeFilter }}
    />
  );
}
