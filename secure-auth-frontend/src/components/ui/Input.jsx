import { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = forwardRef(({ 
  type = 'text', 
  label, 
  error, 
  showPasswordToggle = false, 
  passwordVisible = false, 
  onTogglePassword, 
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={type === 'password' && passwordVisible ? 'text' : type}
          className={`
            w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 
            transition-all duration-200 bg-white
            ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'}
            ${className}
          `}
          {...props}
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={onTogglePassword}
          >
            {passwordVisible ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

