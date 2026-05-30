import { CloudUpload } from "lucide-react";
import { useState } from "react";
import { importPolygonPackage } from "../lib/api";

export function PolygonImporter({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<string>("Ready to sync sample Polygon package");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    setStatus("Parsing problem.xml, statements, tests, and checker");
    try {
      const result = await importPolygonPackage();
      setStatus(`${result.taskTitle} imported into the task bank`);
      onImported();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Polygon import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl2 border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Polygon integration</p>
          <p className="mt-1 text-sm leading-6 text-muted">{status}</p>
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CloudUpload size={16} />
          {loading ? "Importing" : "Import package"}
        </button>
      </div>
    </section>
  );
}
