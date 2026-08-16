"use client";

import type { SizeGuideDTO } from "@/lib/types";

export default function SizeGuideModal({ guide, onClose }: { guide: SizeGuideDTO; onClose: () => void }) {
  return (
    <div className="modal open">
      <div className="modal-box wide">
        <div className="modal-head">
          <h3>{guide.name}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close size guide">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {guide.description && <p className="qv-desc">{guide.description}</p>}
          <div className="size-guide-table-wrap">
            <table className="data-table size-guide-table">
              <thead>
                <tr>
                  <th>Size</th>
                  {guide.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.entries.map((entry) => (
                  <tr key={entry.size}>
                    <td>
                      <strong>{entry.size}</strong>
                    </td>
                    {guide.columns.map((col) => (
                      <td key={col}>{entry.values[col] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="note" style={{ marginTop: 14 }}>
            Measurements are in inches unless noted otherwise. For a between-sizes fit, we recommend sizing up.
          </div>
        </div>
      </div>
    </div>
  );
}
