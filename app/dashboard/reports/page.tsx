"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwbhwfxpncrsfhttimna.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface AuditReport {
  id: string;
  brand_slug: string;
  audited_at: string;
  functional: boolean | null;
  visual: boolean | null;
  performance: boolean | null;
  accessibility: boolean | null;
  standards: boolean | null;
  summary: string;
  issues_found: string[];
  next_steps: string[];
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from("brand_audit_reports")
        .select("*")
        .order("audited_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Failed to load audit reports:", err);
    } finally {
      setLoading(false);
    }
  }

  const CheckBadge = ({ pass }: { pass: boolean | null }) => {
    if (pass === null) return <span className="check-pending">—</span>;
    return <span className={pass ? "check-pass" : "check-fail"}>{pass ? "✓" : "✗"}</span>;
  };

  return (
    <div className="reports-container">
      <style>{`
        .reports-container {
          padding: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .reports-header {
          margin-bottom: 32px;
        }
        .reports-header h1 {
          font-size: 32px;
          font-weight: 900;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .reports-header p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }
        .reports-table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .reports-table th {
          background: rgba(255, 255, 255, 0.08);
          padding: 14px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.7);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .reports-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 13px;
        }
        .reports-table tr:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .report-row {
          cursor: pointer;
        }
        .brand-name {
          font-weight: 700;
          color: #fff;
        }
        .audit-date {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
        .checks-grid {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .check-pass {
          color: #00e676;
          font-weight: 700;
        }
        .check-fail {
          color: #ff5252;
          font-weight: 700;
        }
        .check-pending {
          color: rgba(255, 255, 255, 0.3);
          font-weight: 700;
        }
        .report-expand {
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .report-expand:hover {
          color: #fff;
        }
        .report-detail {
          grid-column: 1 / -1;
          padding: 24px;
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .report-detail h3 {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 12px;
        }
        .report-detail p {
          margin: 0 0 16px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
        }
        .issues-list, .next-steps-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .issues-list li, .next-steps-list li {
          padding: 8px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
        }
        .issues-list li:before {
          content: "⚠ ";
          color: #ff9800;
          margin-right: 8px;
        }
        .next-steps-list li:before {
          content: "→ ";
          color: rgba(255, 255, 255, 0.4);
          margin-right: 8px;
        }
        .loading {
          padding: 32px;
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="reports-header">
        <h1>Audit Reports</h1>
        <p>Monthly brand quality audits</p>
      </div>

      {loading ? (
        <div className="loading">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="loading">No audit reports yet.</div>
      ) : (
        <table className="reports-table">
          <thead>
            <tr>
              <th style={{ width: "20%" }}>Brand</th>
              <th style={{ width: "15%" }}>Audited</th>
              <th style={{ width: "55%" }}>Checks</th>
              <th style={{ width: "10%" }}></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <>
                <tr key={report.id} className="report-row" onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}>
                  <td>
                    <div className="brand-name">{report.brand_slug}</div>
                  </td>
                  <td>
                    <div className="audit-date">
                      {new Date(report.audited_at).toLocaleDateString()} {new Date(report.audited_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <div className="checks-grid">
                      <span title="Functional"><CheckBadge pass={report.functional} /></span>
                      <span title="Visual"><CheckBadge pass={report.visual} /></span>
                      <span title="Performance"><CheckBadge pass={report.performance} /></span>
                      <span title="Accessibility"><CheckBadge pass={report.accessibility} /></span>
                      <span title="Standards"><CheckBadge pass={report.standards} /></span>
                    </div>
                  </td>
                  <td>
                    <button className="report-expand">{expandedId === report.id ? "−" : "+"}</button>
                  </td>
                </tr>
                {expandedId === report.id && (
                  <tr key={`detail-${report.id}`}>
                    <td colSpan={4} className="report-detail">
                      <h3>Summary</h3>
                      <p>{report.summary}</p>
                      
                      {report.issues_found && report.issues_found.length > 0 && (
                        <>
                          <h3>Issues Found</h3>
                          <ul className="issues-list">
                            {report.issues_found.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      
                      {report.next_steps && report.next_steps.length > 0 && (
                        <>
                          <h3>Next Steps</h3>
                          <ul className="next-steps-list">
                            {report.next_steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
