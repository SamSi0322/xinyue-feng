/**
 * Screen-reader announcements ("Generating recipes…", "3 recipes ready",
 * "Image ready: <title>"). Each message is its own node so none get swallowed.
 */
export default function LiveRegion({ messages }) {
  return (
    <div className="sr-only" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((message) => (
        <p key={message.id}>{message.text}</p>
      ))}
    </div>
  );
}
