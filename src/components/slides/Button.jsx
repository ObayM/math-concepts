import { Loader2 } from "lucide-react";

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading = false,
  icon,
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-2xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_0_0_rgb(29,78,216)] active:shadow-none active:translate-y-1",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-[0_4px_0_0_rgb(148,163,184)] active:shadow-none active:translate-y-1",
    outline: "border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
