import React, { useState, useEffect } from 'react';
import { mediaApi } from '../../services/api';

interface UserAvatarProps {
  userId?: string;
  displayName: string;
  profileMediaId?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isOnline?: boolean;
  showStatus?: boolean;
}

const urlCache = new Map<string, string>();

export const UserAvatar: React.FC<UserAvatarProps> = ({
  displayName,
  profileMediaId,
  avatarUrl: directAvatarUrl,
  avatar: fallbackAvatar,
  size = 'md',
  className = '',
  isOnline,
  showStatus = false,
}) => {
  const initialUrl = () => {
    if (profileMediaId && urlCache.has(profileMediaId)) {
      return urlCache.get(profileMediaId) || null;
    }
    const candidate = directAvatarUrl || fallbackAvatar;
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
    return null;
  };

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl);

  useEffect(() => {
    let isMounted = true;

    if (profileMediaId) {
      if (urlCache.has(profileMediaId)) {
        setAvatarUrl(urlCache.get(profileMediaId) || null);
      } else {
        mediaApi
          .getMediaAccessUrl(profileMediaId)
          .then((res) => {
            if (isMounted) {
              const url = res.thumbnailUrl || res.downloadUrl;
              urlCache.set(profileMediaId, url);
              setAvatarUrl(url);
            }
          })
          .catch(() => {
            if (isMounted) {
              const candidate = directAvatarUrl || fallbackAvatar;
              setAvatarUrl(candidate || null);
            }
          });
      }
    } else {
      const candidate = directAvatarUrl || fallbackAvatar;
      setAvatarUrl(candidate || null);
    }

    return () => {
      isMounted = false;
    };
  }, [profileMediaId, directAvatarUrl, fallbackAvatar]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-20 h-20 text-2xl font-bold',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 bottom-0 right-0',
    sm: 'w-2 h-2 bottom-0 right-0',
    md: 'w-2.5 h-2.5 bottom-0 right-0',
    lg: 'w-3 h-3 bottom-0.5 right-0.5',
    xl: 'w-4 h-4 bottom-1 right-1',
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Clean, sophisticated palette
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-600 text-white',
      'bg-slate-700 text-white',
      'bg-teal-600 text-white',
      'bg-emerald-600 text-white',
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
      'bg-sky-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 dark:border-slate-700/60 shadow-xs`}
          onError={() => setAvatarUrl(null)}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full ${getAvatarColor(
            displayName
          )} flex items-center justify-center font-medium border border-black/5 dark:border-white/10 shadow-xs`}
        >
          {getInitials(displayName)}
        </div>
      )}

      {showStatus && typeof isOnline === 'boolean' && (
        <span
          className={`absolute rounded-full ring-2 ring-white dark:ring-slate-900 ${statusSizeClasses[size]} ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
