import { useState } from 'react';
import { cx } from '../../lib/cx';
import styles from './ItemImage.module.css';

export interface ItemImageProps {
  src: string | null;
  alt: string;
  className?: string | undefined;
  priority?: boolean | undefined;
}

function ItemImageContent({
  src,
  alt,
  className,
  priority = false,
}: ItemImageProps) {
  const [missing, setMissing] = useState(false);
  if (src === null || src === '' || missing) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cx(styles.missing, className)}
        data-missing-media=""
      >
        Image indisponible
      </span>
    );
  }
  return (
    <img
      className={cx(styles.image, className)}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => {
        setMissing(true);
      }}
    />
  );
}

/** An item media image with the missing-media state of the museum. */
export function ItemImage(props: ItemImageProps) {
  return <ItemImageContent key={props.src ?? 'missing'} {...props} />;
}
