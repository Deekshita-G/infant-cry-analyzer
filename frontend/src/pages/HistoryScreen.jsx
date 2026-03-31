import { Link } from 'react-router-dom'
import { Clock3, ChevronRight } from 'lucide-react'
import { loadHistory } from '../lib/resultModel'

function formatTime(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString()
}

export function HistoryScreen() {
  const items = loadHistory()

  return (
    <div className="ica-page-stack">
      <section className="ica-page-hero">
        <div>
          <span className="ica-kicker">Local device history</span>
          <h1 className="ica-section-title">History</h1>
          <p className="ica-lead">Review past analyses with date, result, confidence, and possible cause.</p>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="ica-card ica-empty-state">
          <div className="ica-card-pad">
            <Clock3 size={38} aria-hidden />
            <h2>No analyses saved yet</h2>
            <p>Your recent results will appear here after you analyze an audio sample.</p>
            <Link to="/analyze" className="ica-btn ica-btn--primary">
              Analyze Cry
              <ChevronRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="ica-card ica-history-card">
          <div className="ica-history-table" role="table" aria-label="Saved analysis history">
            <div className="ica-history-row ica-history-row--head" role="row">
              <span role="columnheader">Date</span>
              <span role="columnheader">Result</span>
              <span role="columnheader">Confidence</span>
              <span role="columnheader">Cause</span>
            </div>

            {items.map((item, index) => (
              <div className="ica-history-row" role="row" key={`${item.at}-${index}`}>
                <span role="cell" data-label="Date">
                  {formatTime(item.at)}
                </span>
                <span role="cell" data-label="Result">
                  {item.classification || 'Unavailable'}
                </span>
                <span role="cell" data-label="Confidence">
                  {typeof item.confidence === 'number' ? `${(item.confidence * 100).toFixed(1)}%` : '--'}
                </span>
                <span role="cell" data-label="Cause">
                  {item.possible_cause || '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
