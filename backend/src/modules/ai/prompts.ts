/**
 * Every prompt sent to Gemini lives here as a named, exported builder —
 * never inlined at the call site. This is the single source referenced by
 * PROMPTS.md (the AI Integration Report deliverable), so a change to a
 * prompt and its documented rationale never drift apart.
 *
 * Shared conventions across all four prompts:
 *  - Every prompt ends with an explicit "respond with JSON only" instruction
 *    plus the exact shape, because `AiService.generateJson` parses the raw
 *    response text as JSON and has no tolerance for prose wrapping it.
 *  - Every prompt states output constraints as hard numbers (e.g. "exactly
 *    8 questions") rather than "a few" — free-form counts are the #1 cause
 *    of downstream validation failures against Nest DTOs.
 */

export interface JobDescriptionPromptInput {
  jobTitle: string;
  department: string;
  requiredSkills: string[];
  level: 'junior' | 'mid' | 'senior';
  cultureNotes?: string;
}

export function buildJobDescriptionPrompt(input: JobDescriptionPromptInput): string {
  return `You are a technical recruiter writing an inclusive, gender-neutral job description for an SME (small/medium business).

Role: ${input.jobTitle}
Department: ${input.department}
Seniority level: ${input.level}
Required skills: ${input.requiredSkills.join(', ')}
${input.cultureNotes ? `Company culture notes: ${input.cultureNotes}` : ''}

Write the job description using inclusive, gender-neutral language (use "you/they", never "he/she"; avoid gendered or ableist idioms like "rockstar" or "ninja"; avoid unnecessary degree requirements that could exclude non-traditional candidates).

Respond with JSON only, no markdown fences, in exactly this shape:
{
  "roleSummary": "2-3 sentence overview of the role and its impact",
  "keyResponsibilities": ["5 to 7 bullet strings"],
  "requiredQualifications": ["bullet strings — only what's truly required"],
  "preferredQualifications": ["bullet strings — nice-to-haves"],
  "whatWeOffer": ["bullet strings — compensation/culture/benefits framing"]
}`;
}

export interface CvScorePromptInput {
  cvExtractedText: string;
  jobTitle: string;
  requiredSkills: string[];
  responsibilities: string;
}

export function buildCvScorePrompt(input: CvScorePromptInput): string {
  return `You are an unbiased technical recruiter screening a candidate's CV against a specific job. Judge only skills, experience, and demonstrated ability — never infer or comment on age, gender, ethnicity, nationality, or any protected characteristic, even if such details appear in the CV text.

Job title: ${input.jobTitle}
Required skills: ${input.requiredSkills.join(', ')}
Responsibilities: ${input.responsibilities}

Candidate CV (extracted text, formatting may be imperfect):
"""
${input.cvExtractedText}
"""

Extract the candidate's profile and score their fit for this specific job. matchScore is 0-100 based on how well their demonstrated skills/experience align with the required skills and responsibilities above — not a general CV quality score.

Respond with JSON only, no markdown fences, in exactly this shape:
{
  "candidateName": "string, or \\"Unknown\\" if not found in the text",
  "yearsOfExperience": <integer, best estimate from the CV>,
  "topSkills": ["exactly 5 strings, the candidate's strongest relevant skills"],
  "educationLevel": "string, e.g. \\"Bachelor's in Computer Science\\", or \\"Not specified\\"",
  "lastRole": "string, most recent job title (and company if present)",
  "matchScore": <integer 0-100>,
  "topStrengths": ["exactly 3 strings — specific reasons this candidate fits"],
  "topGaps": ["exactly 2 strings — specific gaps against the required skills/responsibilities"]
}`;
}

export interface InterviewQuestionsPromptInput {
  jobTitle: string;
  responsibilities: string;
  requiredSkills: string[];
  cvSummary: string;
  interviewType: 'technical' | 'behavioural' | 'final';
}

export function buildInterviewQuestionsPrompt(input: InterviewQuestionsPromptInput): string {
  const typeGuidance: Record<InterviewQuestionsPromptInput['interviewType'], string> = {
    technical:
      'Focus on hands-on technical depth against the required skills — problem-solving, system design, or coding-adjacent reasoning appropriate to the role.',
    behavioural:
      'Focus on past behaviour and soft skills — collaboration, conflict resolution, ownership, communication. Favor STAR-style prompts ("tell me about a time...").',
    final:
      'Focus on role fit, motivation, culture alignment, and closing-stage concerns (career goals, working style, what would make them decline an offer).',
  };

  return `You are a hiring manager preparing for a ${input.interviewType} interview.

Job title: ${input.jobTitle}
Required skills: ${input.requiredSkills.join(', ')}
Responsibilities: ${input.responsibilities}

Candidate summary (from their CV):
"""
${input.cvSummary}
"""

${typeGuidance[input.interviewType]}

Generate exactly 9 interview questions tailored to this specific candidate and role — reference their actual background where it makes a question sharper, not generic questions that could apply to anyone.

Respond with JSON only, no markdown fences, in exactly this shape:
{
  "questions": [
    { "question": "string", "listenFor": "1-2 sentence note on what a strong answer demonstrates" }
  ]
}`;
}

export interface OfferLetterPromptInput {
  candidateName: string;
  roleTitle: string;
  salary: number;
  startDate: string;
  probationPeriod: string;
  benefits: string[];
  companyName: string;
}

export function buildOfferLetterPrompt(input: OfferLetterPromptInput): string {
  return `You are an HR specialist drafting a formal job offer letter.

Candidate: ${input.candidateName}
Role: ${input.roleTitle}
Company: ${input.companyName}
Annual salary: ${input.salary}
Start date: ${input.startDate}
Probation period: ${input.probationPeriod}
Benefits: ${input.benefits.join(', ')}

Write a complete, formal offer letter. This is a DRAFT for a recruiter to review before sending — do not include any language implying the offer has already been sent or accepted.

Respond with JSON only, no markdown fences, in exactly this shape:
{
  "letterText": "the full offer letter as plain text, with sections for introduction, role details, compensation, benefits, conditions of employment, and acceptance instructions, using \\n for line breaks"
}`;
}
