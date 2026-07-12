import { InterviewQuestionDto } from './dto/interview-questions.dto';

/**
 * Static generic question bank used when the AI service fails/is
 * unavailable for POST /ai/interview-questions. Not candidate-specific,
 * but keeps the hiring manager unblocked rather than returning an error —
 * the fallback path for this feature.
 */
export const INTERVIEW_QUESTION_FALLBACKS: Record<
  'technical' | 'behavioural' | 'final',
  InterviewQuestionDto[]
> = {
  technical: [
    { question: 'Walk me through a recent project you built end-to-end.', listenFor: 'Depth of ownership and clarity of technical explanation.' },
    { question: 'How would you debug a production issue you cannot reproduce locally?', listenFor: 'Systematic troubleshooting approach, use of logs/monitoring.' },
    { question: 'Describe a time you had to choose between two technical approaches. How did you decide?', listenFor: 'Trade-off reasoning, not just tool preference.' },
    { question: 'How do you approach testing your code?', listenFor: 'Understanding of test coverage vs. test value, not just "I write tests".' },
    { question: 'What would you do differently in a past project, knowing what you know now?', listenFor: 'Self-awareness and technical growth.' },
    { question: 'How do you stay current with new tools or practices in your field?', listenFor: 'Genuine curiosity vs. rehearsed buzzwords.' },
    { question: 'Describe how you would design a system to handle a sudden 10x traffic spike.', listenFor: 'Scalability thinking — caching, queuing, horizontal scaling.' },
    { question: 'Tell me about a time you had to learn an unfamiliar technology quickly.', listenFor: 'Learning strategy and adaptability under time pressure.' },
    { question: 'How do you balance code quality with shipping speed?', listenFor: 'Pragmatism — knowing when "good enough" is the right call.' },
  ],
  behavioural: [
    { question: 'Tell me about a time you disagreed with a teammate. How did you handle it?', listenFor: 'Constructive conflict resolution, not avoidance or escalation.' },
    { question: 'Describe a situation where you had to meet a tight deadline.', listenFor: 'Prioritization and communication under pressure.' },
    { question: 'Tell me about a time you made a mistake at work. What happened next?', listenFor: 'Accountability and follow-through on fixing it.' },
    { question: 'How do you handle receiving critical feedback?', listenFor: 'Openness vs. defensiveness.' },
    { question: 'Describe a time you had to influence someone without direct authority.', listenFor: 'Persuasion via reasoning, not just insistence.' },
    { question: 'Tell me about a project that failed. What did you learn?', listenFor: 'Genuine reflection, not blame-shifting.' },
    { question: 'How do you prioritize when everything feels urgent?', listenFor: 'A concrete method, not just "I just get it done".' },
    { question: 'Describe how you support a struggling teammate.', listenFor: 'Empathy balanced with accountability.' },
    { question: 'Tell me about a time you went beyond your job description.', listenFor: 'Initiative and ownership mindset.' },
  ],
  final: [
    { question: 'What drew you to apply for this specific role?', listenFor: 'Genuine motivation vs. generic interest.' },
    { question: 'Where do you see your career heading in the next few years?', listenFor: 'Alignment between their goals and the role\'s growth path.' },
    { question: 'What kind of work environment brings out your best work?', listenFor: 'Fit with the actual team culture, not a rehearsed answer.' },
    { question: 'What would make you turn down an offer?', listenFor: 'Honest deal-breakers surfaced early, saving both sides time.' },
    { question: 'How do you like to receive feedback and recognition?', listenFor: 'Practical management-style compatibility.' },
    { question: 'What questions do you have for us about the team or company?', listenFor: 'Depth of engagement and due diligence on their end.' },
    { question: 'What are you hoping to learn or grow into in this role?', listenFor: 'Realistic expectations vs. role scope.' },
    { question: 'How do you typically ramp up in a new job?', listenFor: 'Self-directed onboarding approach.' },
    { question: 'Is there anything about this role or team that gives you pause?', listenFor: 'Surfaces unspoken concerns before an offer is made.' },
  ],
};
