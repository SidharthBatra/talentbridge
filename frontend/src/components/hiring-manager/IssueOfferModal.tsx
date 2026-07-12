import { useState } from 'react';
import { aiApi } from '../../api/ai';
import { apiErrorMessage } from '../../api/client';
import { offersApi } from '../../api/offers';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../../store/toastStore';
import type { Application, JobPosting } from '../../types';

export function IssueOfferModal({
  application,
  job,
  onClose,
  onSent,
}: {
  application: Application;
  job: JobPosting;
  onClose: () => void;
  onSent: () => void;
}) {
  const [candidateName, setCandidateName] = useState('');
  const [salary, setSalary] = useState(job.salaryBandMax);
  const [startDate, setStartDate] = useState('');
  const [probationPeriod, setProbationPeriod] = useState('90 days');
  const [benefitsInput, setBenefitsInput] = useState('Health insurance, 25 days PTO');
  const [companyName, setCompanyName] = useState('TalentBridge Client Co.');
  const [letterText, setLetterText] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const [drafting, setDrafting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);

  const benefits = () =>
    benefitsInput.split(',').map((b) => b.trim()).filter(Boolean);

  const handleDraft = async () => {
    if (!candidateName || !startDate) {
      toast.error('Missing details', 'Candidate name and start date are required to draft a letter.');
      return;
    }
    setDrafting(true);
    try {
      const result = await aiApi.generateOfferLetter({
        candidateName,
        roleTitle: job.title,
        salary,
        startDate,
        probationPeriod,
        benefits: benefits(),
        companyName,
      });
      setLetterText(result.letterText);
      setIsFallback(result.isFallback);
      toast[result.isFallback ? 'info' : 'success'](
        result.isFallback ? 'AI unavailable' : 'Letter drafted',
        result.isFallback ? 'A placeholder draft was inserted — please edit it.' : 'Review before sending.',
      );
    } catch (err) {
      toast.error('Could not draft letter', apiErrorMessage(err));
    } finally {
      setDrafting(false);
    }
  };

  const handleCreate = async () => {
    if (!startDate) {
      toast.error('Start date is required');
      return;
    }
    setCreating(true);
    try {
      const offer = await offersApi.create({
        applicationId: application.id,
        salary,
        startDate,
        benefits: benefits(),
        letterText: letterText || undefined,
      });
      setOfferId(offer.id);
      toast.success('Draft offer created', 'Review the letter, then approve to send.');
    } catch (err) {
      toast.error('Could not create offer', apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!offerId) return;
    setSending(true);
    try {
      await offersApi.approveAndSend(offerId);
      toast.success('Offer sent', 'The candidate has been notified.');
      onSent();
    } catch (err) {
      toast.error('Could not send offer', apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Issue Offer"
      size="lg"
      footer={
        !offerId ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating} icon="drafts">
              Save as Draft
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleApproveAndSend} loading={sending} icon="send">
              Approve &amp; Send
            </Button>
          </>
        )
      }
    >
      <div className="space-y-md">
        {offerId && (
          <div className="bg-secondary-container text-on-secondary-container p-sm rounded-lg text-body-md flex items-center gap-xs">
            <Icon name="check_circle" filled size={18} />
            Draft saved (#{offerId.slice(0, 8)}…). Sending requires your explicit approval below —
            it is never sent automatically.
          </div>
        )}

        <Input
          label="Candidate Name"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          disabled={!!offerId}
        />
        <div className="grid grid-cols-2 gap-md">
          <Input
            label="Annual Salary"
            type="number"
            min={0}
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            disabled={!!offerId}
          />
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!!offerId}
          />
        </div>
        <div className="grid grid-cols-2 gap-md">
          <Input
            label="Probation Period"
            value={probationPeriod}
            onChange={(e) => setProbationPeriod(e.target.value)}
            disabled={!!offerId}
          />
          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={!!offerId}
          />
        </div>
        <Input
          label="Benefits (comma-separated)"
          value={benefitsInput}
          onChange={(e) => setBenefitsInput(e.target.value)}
          disabled={!!offerId}
        />

        {!offerId && (
          <Button type="button" variant="ai" icon="auto_awesome" onClick={handleDraft} loading={drafting}>
            Draft with AI
          </Button>
        )}
        {isFallback && (
          <p className="text-label-sm text-tertiary-container">
            AI was unavailable — a placeholder letter was inserted for manual editing.
          </p>
        )}

        <Textarea
          label="Offer Letter"
          rows={10}
          value={letterText}
          onChange={(e) => setLetterText(e.target.value)}
          disabled={!!offerId}
        />
      </div>
    </Modal>
  );
}
