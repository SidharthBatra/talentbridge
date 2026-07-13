import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/client';
import { offersApi } from '../../api/offers';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/States';
import { OfferStatusBadge } from '../../components/ui/Badge';
import { useNotificationStore } from '../../store/notificationStore';
import type { Offer, OfferRespondedEvent } from '../../types';

/**
 * Live feed of candidate offer responses. There's no `GET /offers` list
 * endpoint in the API, so this page is necessarily event-driven: it shows
 * every `offer.responded` WebSocket event received since the page mounted
 * (fetching each offer's full detail as it arrives), rather than a
 * persisted history.
 */
export function OfferResponsesPage() {
  const lastOfferResponded = useNotificationStore((s) => s.lastOfferResponded);
  const offerRespondedSeq = useNotificationStore((s) => s.offerRespondedSeq);
  const [events, setEvents] = useState<{ event: OfferRespondedEvent; offer: Offer | null; error?: string }[]>([]);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('applicationId');

  useEffect(() => {
    if (!lastOfferResponded) return;
    offersApi
      .get(lastOfferResponded.offerId)
      .then((offer) => setEvents((prev) => [{ event: lastOfferResponded, offer }, ...prev]))
      .catch((err) =>
        setEvents((prev) => [
          { event: lastOfferResponded, offer: null, error: apiErrorMessage(err) },
          ...prev,
        ]),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerRespondedSeq]);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Offer Responses"
        subtitle="Live feed — updates the instant a candidate responds to an offer."
      />

      <div className="flex items-center gap-xs text-secondary">
        <Icon name="sensors" size={16} />
        <span className="text-label-sm">Listening for real-time updates…</span>
      </div>

      {events.length === 0 && (
        <EmptyState
          icon="request_quote"
          title="No responses yet"
          description="Candidate responses to sent offers will appear here instantly."
        />
      )}

      <div className="space-y-sm">
        {events.map(({ event, offer, error }, i) => (
          <Card
            key={`${event.offerId}-${i}`}
            id={`application-${event.applicationId}`}
            className={`p-md flex items-center justify-between gap-md ${
              highlightId === event.applicationId ? 'ring-2 ring-primary border-primary' : ''
            }`}
          >
            <div>
              <p className="text-body-md font-semibold text-on-surface">
                Offer #{event.offerId.slice(0, 8)}…
              </p>
              {error ? (
                <p className="text-label-sm text-error">{error}</p>
              ) : (
                offer && (
                  <p className="text-label-sm text-on-surface-variant">
                    ${offer.salary.toLocaleString()} · Start {new Date(offer.startDate).toLocaleDateString()}
                  </p>
                )
              )}
              {offer?.counterOffer && (
                <p className="text-label-sm text-tertiary-container mt-xs">
                  Counter: {offer.counterOffer}
                </p>
              )}
            </div>
            {offer && <OfferStatusBadge status={offer.status} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
