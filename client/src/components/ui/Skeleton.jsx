import React from 'react';

/** Shimmer placeholders used while the channel list or directory loads. */
export const Skeleton = ({ width = '100%', height = 12, radius, className = '', style }) => (
  <span
    className={`skeleton ${className}`.trim()}
    style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

export const SkeletonText = ({ lines = 2, width = '100%' }) => (
  <span style={{ display: 'flex', flexDirection: 'column', gap: 6, width }}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton key={index} height={9} width={index === lines - 1 ? '62%' : '100%'} />
    ))}
  </span>
);

/** Channel list placeholder that matches the real row height. */
export const ChannelListSkeleton = ({ rows = 6 }) => (
  <div className="skeleton-list" aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div className="skeleton-list__row" key={index}>
        <Skeleton width={20} height={20} radius={5} />
        <div className="skeleton-list__lines">
          <Skeleton height={9} width={`${70 - (index % 3) * 12}%`} />
          <Skeleton height={7} width="45%" />
        </div>
      </div>
    ))}
  </div>
);

/** Member directory placeholder. */
export const UserListSkeleton = ({ rows = 5 }) => (
  <div className="skeleton-list" aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div className="skeleton-list__row" key={index}>
        <Skeleton width={34} height={34} radius="50%" />
        <div className="skeleton-list__lines">
          <Skeleton height={9} width={`${58 - (index % 2) * 14}%`} />
          <Skeleton height={7} width="34%" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
