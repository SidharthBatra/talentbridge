import { useEffect, useState } from 'react';
import { aiApi } from '../../api/ai';
import { apiErrorMessage } from '../../api/client';
import { interviewsApi } from '../../api/interviews';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Select, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../../store/toastStore';
import { InterviewType, type Application, type Interview, type InterviewQuestion } from '../../types';

export function InterviewPrepModal({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  // The interview to save the final question list against is looked up by
  // application id — the hiring manager never needs to know or type it.
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [interviewType, setInterviewType] = useState<InterviewType>(InterviewType.TECHNICAL);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    interviewsApi
      .byApplication(application.id)
      .then((interviews) => setInterview(interviews[0] ?? null))
      .catch(() => setInterview(null));
  }, [application.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await aiApi.generateInterviewQuestions(application.id, interviewType);
      setQuestions(result.questions);
      setIsFallback(result.isFallback);
      if (result.isFallback) {
        toast.info('AI unavailable', 'Showing a generic question bank instead.');
      }
    } catch (err) {
      toast.error('Could not generate questions', apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (i: number, field: keyof InterviewQuestion, value: string) => {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  };
  const removeQuestion = (i: number) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const next = [...qs];
      const target = i + dir;
      if (target < 0 || target >= next.length) return qs;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  };
  const addQuestion = () => setQuestions((qs) => [...qs, { question: '', listenFor: '' }]);

  const save = async () => {
    if (!interview) {
      toast.error('No interview found for this application');
      return;
    }
    setSaving(true);
    try {
      await aiApi.saveInterviewQuestions(interview.id, questions);
      toast.success('Question list saved to the interview');
      onClose();
    } catch (err) {
      toast.error('Could not save questions', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Interview Preparation"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={save}
            loading={saving}
            icon="save"
            disabled={questions.length === 0 || !interview}
          >
            Save Final List
          </Button>
        </>
      }
    >
      <div className="space-y-md">
        {interview === null && (
          <p className="text-label-sm text-tertiary-container">
            No interview has been scheduled for this application yet — you can still generate and
            edit questions below, but saving them requires an interview to be proposed first.
          </p>
        )}
        <div className="flex items-end gap-sm">
          <Select
            label="Interview Type"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as InterviewType)}
            className="flex-1"
          >
            <option value={InterviewType.TECHNICAL}>Technical</option>
            <option value={InterviewType.BEHAVIOURAL}>Behavioural</option>
            <option value={InterviewType.FINAL}>Final</option>
          </Select>
          <Button variant="ai" icon="auto_awesome" onClick={generate} loading={generating}>
            Suggest Questions
          </Button>
        </div>

        {isFallback && (
          <p className="text-label-sm text-tertiary-container">
            AI was unavailable — showing a generic question bank you can edit below.
          </p>
        )}

        <div className="space-y-sm">
          {questions.map((q, i) => (
            <div key={i} className="border border-outline-variant rounded-lg p-sm space-y-xs">
              <div className="flex items-start gap-xs">
                <div className="flex flex-col gap-[2px] pt-xs">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                    <Icon name="arrow_upward" size={16} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="disabled:opacity-30">
                    <Icon name="arrow_downward" size={16} />
                  </button>
                </div>
                <div className="flex-1 space-y-xs">
                  <Textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                    placeholder="Question"
                    rows={2}
                  />
                  <Textarea
                    value={q.listenFor}
                    onChange={(e) => updateQuestion(i, 'listenFor', e.target.value)}
                    placeholder="What to listen for in the answer"
                    rows={2}
                  />
                </div>
                <button onClick={() => removeQuestion(i)} className="text-error pt-xs" aria-label="Remove">
                  <Icon name="delete" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" icon="add" onClick={addQuestion}>
          Add Question
        </Button>
      </div>
    </Modal>
  );
}
