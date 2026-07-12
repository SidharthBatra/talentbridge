import { ApplicationStage } from '../../types';
import { Icon } from './Icon';

const PIPELINE: ApplicationStage[] = [
  ApplicationStage.APPLIED,
  ApplicationStage.SCREENED,
  ApplicationStage.SHORTLISTED,
  ApplicationStage.INTERVIEW_SCHEDULED,
  ApplicationStage.OFFER,
  ApplicationStage.HIRED,
];

const LABELS: Record<ApplicationStage, string> = {
  [ApplicationStage.APPLIED]: 'Applied',
  [ApplicationStage.SCREENED]: 'Screened',
  [ApplicationStage.SHORTLISTED]: 'Shortlisted',
  [ApplicationStage.INTERVIEW_SCHEDULED]: 'Interview',
  [ApplicationStage.OFFER]: 'Offer',
  [ApplicationStage.HIRED]: 'Hired',
  [ApplicationStage.REJECTED]: 'Rejected',
};

/** Horizontal pipeline visualization: applied -> ... -> hired/rejected. */
export function StageStepper({ stage }: { stage: ApplicationStage }) {
  const rejected = stage === ApplicationStage.REJECTED;
  const currentIndex = rejected ? PIPELINE.length : PIPELINE.indexOf(stage);

  return (
    <div className="flex items-center w-full overflow-x-auto scrollbar-thin py-xs">
      {PIPELINE.map((step, i) => {
        const done = i < currentIndex || (rejected && i < PIPELINE.length);
        const active = i === currentIndex && !rejected;
        const isLast = i === PIPELINE.length - 1;

        return (
          <div key={step} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-xs min-w-[76px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  rejected
                    ? 'bg-error-container border-error text-on-error-container'
                    : active
                      ? 'bg-primary border-primary text-on-primary'
                      : done
                        ? 'bg-secondary-container border-secondary text-on-secondary-container'
                        : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant'
                }`}
              >
                {done && !active ? (
                  <Icon name={rejected ? 'close' : 'check'} size={16} />
                ) : (
                  <span className="text-label-sm font-bold">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-label-sm text-center ${active ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}
              >
                {LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-[2px] w-8 md:w-12 mb-lg ${done ? 'bg-secondary' : 'bg-outline-variant'}`}
              />
            )}
          </div>
        );
      })}
      {rejected && (
        <div className="flex items-center shrink-0">
          <div className="h-[2px] w-8 md:w-12 mb-lg bg-error" />
          <div className="flex flex-col items-center gap-xs min-w-[76px]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 bg-error border-error text-on-error">
              <Icon name="close" size={16} />
            </div>
            <span className="text-label-sm text-center text-error font-semibold">Rejected</span>
          </div>
        </div>
      )}
    </div>
  );
}
