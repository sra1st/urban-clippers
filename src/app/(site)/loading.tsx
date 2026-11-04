/** Shown while a page streams in: a thin animated bar under the header, nothing jumpy. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="pole-bar h-1" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-12 sm:px-6" aria-hidden="true">
        <div className="skeleton h-10 w-2/3 max-w-md rounded-control" />
        <div className="skeleton h-5 w-full max-w-xl rounded" />
        <div className="skeleton h-5 w-4/5 max-w-lg rounded" />
      </div>
    </div>
  );
}
