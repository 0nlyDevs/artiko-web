import { useEffect, useState } from 'react';

/*
 * In mock mode a model lives in an object URL, which dies with the page that
 * made it, while the draft that points to it is kept. A step checks that the
 * file can still be read before it shows a viewer on it.
 */

export type ModelAvailability = 'none' | 'checking' | 'available' | 'gone';

async function isReadable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    // Only the answer matters: the file itself is not read here.
    void response.body?.cancel().catch(() => undefined);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Whether the file behind a model URL can be read. Only object URLs are
 * checked: any other address is served by the application or the gateway.
 */
export function useModelAvailability(url: string | null): ModelAvailability {
  const [checked, setChecked] = useState<{
    url: string;
    readable: boolean;
  } | null>(null);
  const sessionOnly = url !== null && url.startsWith('blob:');

  useEffect(() => {
    if (url === null || !sessionOnly) {
      return;
    }
    let current = true;
    void isReadable(url).then((readable) => {
      if (current) {
        setChecked({ url, readable });
      }
    });
    return () => {
      current = false;
    };
  }, [url, sessionOnly]);

  if (url === null) {
    return 'none';
  }
  if (!sessionOnly) {
    return 'available';
  }
  if (checked === null || checked.url !== url) {
    return 'checking';
  }
  return checked.readable ? 'available' : 'gone';
}
