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
}

const urlCache = new Map<string, string>();

export const UserAvatar: React.FC<UserAvatarProps> = ({
  displayName,
  profileMediaId,
  avatarUrl: directAvatarUrl,
  avatar: fallbackAvatar,
  size = 'md',
  className = '',
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
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate deterministic gradient background based on name
  const getGradient = (name: string) => {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-pink-500 to-rose-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-cyan-500 to-blue-600',
      'from-violet-500 to-fuchsia-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeClasses[size]} rounded-full object-cover shadow-sm border border-slate-700/50 flex-shrink-0 ${className}`}
        onError={() => setAvatarUrl(null)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getGradient(
        displayName
      )} flex items-center justify-center text-white font-bold shadow-sm border border-slate-700/30 flex-shrink-0 ${className}`}
    >
      {getInitials(displayName)}
    </div>
  );
};
