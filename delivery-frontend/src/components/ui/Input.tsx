import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      leftIcon,
      rightElement,
      type = 'text',
      id,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const isPassword = type === 'password';
    const resolvedType = isPassword
      ? showPassword
        ? 'text'
        : 'password'
      : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={Boolean(error)}
            className={cn(
              'w-full h-11 rounded-xl border bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              (isPassword || rightElement) && 'pr-10',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-slate-200 dark:border-slate-700',
              className,
            )}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              tabIndex={-1}
              aria-label={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          ) : (
            rightElement && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {rightElement}
              </div>
            )
          )}
        </div>

        {error ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : (
          helperText && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {helperText}
            </p>
          )
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
