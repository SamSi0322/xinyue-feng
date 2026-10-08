import { useCallback, useRef, useState } from 'react';

/**
 * Messages for the polite screen-reader live region. Each message is a new DOM
 * node, so quick successive updates ("Image ready: ...") are all read out.
 */
export function useAnnouncer(keep = 4) {
  const [messages, setMessages] = useState([]);
  const nextId = useRef(0);

  const announce = useCallback(
    (text) => {
      nextId.current += 1;
      const message = { id: nextId.current, text };
      setMessages((previous) => [...previous.slice(-(keep - 1)), message]);
    },
    [keep],
  );

  return { messages, announce };
}
