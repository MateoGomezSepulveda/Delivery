import React, { useState } from 'react';
import { cn } from '@/utils/cn';

export interface UserAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  fallback?: React.ReactNode;
}

function getUserInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}

/**
 * Renderiza el avatar del usuario con referrerPolicy="no-referrer"
 * (necesario para imágenes de Google/Facebook CDN que rechazan el header Referer)
 * y respaldo automático sin ícono de imagen rota si falla la carga.
 */
export function UserAvatar({
  src,
  name,
  className,
  imgClassName,
  fallbackClassName,
  fallback,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const cleanSrc = src?.trim() || '';
  const showImage = Boolean(cleanSrc) && failedSrc !== cleanSrc;

  if (showImage) {
    return (
      <img
        src={cleanSrc}
        alt={name}
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setFailedSrc(cleanSrc)}
        className={cn('object-cover', className, imgClassName)}
      />
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      aria-label={name}
      className={cn(
        'bg-gradient-to-br from-orange-600 to-red-600 text-white font-heading font-extrabold flex items-center justify-center select-none',
        className,
        fallbackClassName,
      )}
    >
      {getUserInitials(name)}
    </div>
  );
}
