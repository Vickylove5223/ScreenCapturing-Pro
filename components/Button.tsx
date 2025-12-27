/** Fix: Added DOM library reference to resolve missing browser global types like HTMLButtonElement */
/// <reference lib="dom" />
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'secondary';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  fullWidth = false,
  className = '', 
  ...props 
}) => {
  
  const variants = {
    // Primary: Dark Green bg, Light Text (High contrast on #DAD7CD)
    primary: "bg-[#344E41] hover:bg-[#3A5A40] text-[#DAD7CD] shadow-lg shadow-[#344E41]/20 border border-transparent",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/10 border border-rose-400/20",
    success: "bg-[#588157] hover:bg-[#3A5A40] text-white shadow-lg shadow-[#588157]/20 border border-[#588157]/30",
    // Secondary: Sage bg, Dark text
    secondary: "bg-[#A3B18A] hover:bg-[#588157] text-[#344E41] hover:text-[#DAD7CD] border border-[#588157] shadow-sm",
  };

  return (
    <button
      className={`
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        flex items-center justify-center gap-2 px-8 py-4 rounded-2xl
        font-bold text-sm transition-all duration-300 
        transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {icon && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};