import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { offersApi } from '../../api/offers';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';
import { OfferStatusBadge } from '../ui/Badge';
import { toast } from '../../store/toastStore';
import { OfferStatus, type Offer } from '../../types';

/** Given a known offer id, lets the candidate accept/reject/counter a sent offer. */
export function OfferResponseCard({ offerId }: { offerId: string }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [counter, setCounter] = useState('');
  const [showCounter, setShowCounter] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    offersApi
      .get(offerId)
      .then(setOffer)
      .catch((err) => setError(apiErrorMessage(err, 'Offer not found')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [offerId]);

  const respond = async (response: 'accepted' | 'rejected' | 'negotiating') => {
    if (response === 'negotiating' && !counter.trim()) {
      setShowCounter(true);
      return;
    }
    setActing(true);
    try {
      const updated = await offersApi.respond(
        offerId,
        response,
        response === 'negotiating' ? counter : undefined,
      );
      setOffer(updated);
      toast.success('Response sent', `Offer marked as ${response}`);
    } catch (err) {
      toast.error('Could not respond to offer', apiErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="text-body-md text-on-surface-variant">Loading offer…</p>;
  if (error) return <p className="text-error text-body-md">{error}</p>;
  if (!offer) return null;

  return (
    <div className="border border-outline-variant rounded-lg p-md space-y-sm">
      <div className="flex items-center justify-between">
        <span className="text-body-md font-semibold text-on-surface">
          ${offer.salary.toLocaleString()} / year
        </span>
        <OfferStatusBadge status={offer.status} />
      </div>
      <p className="text-body-md text-on-surface-variant">
        Start date: {new Date(offer.startDate).toLocaleDateString()}
      </p>
      {offer.benefits.length > 0 && (
        <p className="text-body-md text-on-surface-variant">
          Benefits: {offer.benefits.join(', ')}
        </p>
      )}
      {offer.letterText && (
        <details className="text-body-md text-on-surface-variant">
          <summary className="cursor-pointer text-primary font-semibold">View offer letter</summary>
          <p className="whitespace-pre-line mt-xs">{offer.letterText}</p>
        </details>
      )}

      {offer.status === OfferStatus.SENT && (
        <div className="space-y-xs pt-xs">
          {showCounter && (
            <Textarea
              placeholder="Describe your counter-offer..."
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-xs">
            <Button size="sm" onClick={() => respond('accepted')} disabled={acting}>
              Accept
            </Button>
            <Button size="sm" variant="danger" onClick={() => respond('rejected')} disabled={acting}>
              Reject
            </Button>
            <Button size="sm" variant="secondary" onClick={() => respond('negotiating')} disabled={acting}>
              {showCounter ? 'Send counter-offer' : 'Counter-offer'}
            </Button>
          </div>
        </div>
      )}

      {offer.status === OfferStatus.NEGOTIATING && offer.counterOffer && (
        <p className="text-body-md text-tertiary-container bg-tertiary-fixed px-sm py-xs rounded-md">
          Your counter-offer: {offer.counterOffer}
        </p>
      )}
    </div>
  );
}
