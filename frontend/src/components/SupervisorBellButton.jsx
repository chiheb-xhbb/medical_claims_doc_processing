import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingEscalations } from '../services/dossierWorkflow';
import { formatShortDate } from '../utils/formatters';

const POLL_INTERVAL_MS = 60_000;

const truncate = (text, max = 60) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

function SupervisorBellButton() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef(null);

  const fetchEscalations = useCallback(async () => {
    try {
      const result = await getPendingEscalations();
      setItems(result.items);
      setTotal(result.total);
    } catch {
      // Silently ignore: bell is non-critical; network errors should not break the navbar.
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(fetchEscalations, POLL_INTERVAL_MS);
    const initialFetchTimeoutId = setTimeout(() => {
      fetchEscalations();
    }, 0);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialFetchTimeoutId);
    };
  }, [fetchEscalations]);

  useEffect(() => {
    if (!panelOpen) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const handleDossierClick = (id) => {
    setPanelOpen(false);
    navigate(`/dossiers/${id}`);
  };

  const displayCount = total > 99 ? '99+' : total;

  return (
    <div className="position-relative" ref={containerRef}>
      <button
        type="button"
        className="nb-bell"
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-label={`Supervisor review alerts${total > 0 ? `, ${total} pending` : ''}`}
        aria-expanded={panelOpen}
        aria-haspopup="true"
        id="nb-bell-btn"
      >
        <i className={`bi ${total > 0 ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" />
        {total > 0 && (
          <span className="nb-bell__badge" aria-hidden="true">
            {displayCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <div
          className="nb-bell-panel"
          role="dialog"
          aria-label="Pending escalations"
          aria-labelledby="nb-bell-btn"
        >
          <div className="nb-bell-panel__header">
            <span className="nb-bell-panel__title">Pending Escalations</span>
            {total > 0 && (
              <span className="nb-bell-panel__count">{total} pending</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="nb-bell-panel__empty">
              <i className="bi bi-check-circle nb-bell-panel__empty-icon" aria-hidden="true" />
              <p className="nb-bell-panel__empty-text mb-0">No pending escalations</p>
            </div>
          ) : (
            <div className="nb-bell-panel__list" role="list">
              {items.map((dossier) => (
                <button
                  key={dossier.id}
                  type="button"
                  className="nb-bell-item w-100 text-start"
                  onClick={() => handleDossierClick(dossier.id)}
                  role="listitem"
                >
                  <span className="nb-bell-item__number">
                    {dossier.numero_dossier || `#${dossier.id}`}
                  </span>
                  <span className="nb-bell-item__meta">
                    {dossier.assured_identifier && (
                      <span className="nb-bell-item__assured">{dossier.assured_identifier}</span>
                    )}
                    {dossier.escalated_at && (
                      <span className="nb-bell-item__date">{formatShortDate(dossier.escalated_at, '')}</span>
                    )}
                  </span>
                  {dossier.escalation_reason && (
                    <span className="nb-bell-item__reason">
                      {truncate(dossier.escalation_reason)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SupervisorBellButton;
