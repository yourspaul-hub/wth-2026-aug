import React, { useEffect, useState } from 'react';
import { X, Ruler } from 'lucide-react';
import { fetchSizeChart } from '../lib/api';

const SizeChartModal = ({ chartId, open, onClose }) => {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !chartId) return;
    setLoading(true);
    fetchSizeChart(chartId).then(setChart).catch(() => setChart(null)).finally(() => setLoading(false));
  }, [open, chartId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-[70]" data-testid="size-chart-backdrop" />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#EBD9CE]">
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-[#EBD9CE] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#B4593F]" />
              <h3 className="font-serif-display text-2xl text-[#213a60]" data-testid="size-chart-title">
                {chart?.name || 'Size Chart'}
              </h3>
            </div>
            <button onClick={onClose} aria-label="Close" data-testid="size-chart-close" className="p-2 rounded-full hover:bg-[#FDF3EB]"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="py-16 text-center text-neutral-500 text-sm">Loading…</div>
            ) : !chart ? (
              <div className="py-16 text-center text-neutral-500 text-sm">Size chart is currently unavailable.</div>
            ) : (
              <div className="space-y-5">
                {chart.section && <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F]">{chart.section}</div>}
                {chart.description && <p className="text-sm text-neutral-700 leading-relaxed">{chart.description}</p>}
                {chart.image && (
                  <div className="rounded-xl overflow-hidden border border-[#EBD9CE] bg-white">
                    <img src={chart.image} alt={chart.name} className="w-full max-h-[420px] object-contain" />
                  </div>
                )}
                {chart.table_headers?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" data-testid="size-chart-table">
                      <thead>
                        <tr className="bg-[#FDF3EB]">
                          {chart.table_headers.map((h, i) => (
                            <th key={i} className="text-left px-3 py-2 text-[#213a60] font-semibold border-b border-[#EBD9CE]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(chart.table_rows || []).map((row, ri) => (
                          <tr key={ri} className="odd:bg-white even:bg-[#FDF3EB]/40">
                            {chart.table_headers.map((_, ci) => (
                              <td key={ci} className="px-3 py-2 border-b border-[#EBD9CE]/50">{row[ci] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                        {(!chart.table_rows || chart.table_rows.length === 0) && (
                          <tr><td colSpan={chart.table_headers.length} className="px-3 py-6 text-center text-neutral-400 text-xs">Table not yet populated.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {chart.notes && <p className="text-xs text-neutral-500 italic">{chart.notes}</p>}
                <p className="text-[11px] text-neutral-500 uppercase tracking-widest pt-3 border-t border-[#EBD9CE]/50">All measurements in {chart.unit === 'cm' ? 'centimetres' : 'inches'} · flat garment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SizeChartModal;
