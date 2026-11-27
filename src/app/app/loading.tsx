export default function Loading() {
  return (
    <div className="grid flex-1 place-items-center py-32">
      <p className="sr-only">Loading</p>
      <div aria-hidden="true" className="flex gap-2">
        {["#ff6b2c", "#1f66db", "#12ac74", "#ffbe0b"].map((ink, i) => (
          <span key={ink} className="tag block size-4" style={{ background: ink, animation: `bob 0.9s ease-in-out ${i * 0.12}s infinite` }} />
        ))}
      </div>
    </div>
  );
}
