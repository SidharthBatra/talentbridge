# AI Integration Report — Prompt Iterations

This documents the prompt design process for TalentBridge's four AI
features (Module 3). All prompt templates referenced below are exported,
named constants in [`backend/src/modules/ai/prompts.ts`](backend/src/modules/ai/prompts.ts)
— nothing is inlined ad hoc at the call site, so this document and the code
never drift apart.

Every feature shares two structural fixes discovered independently while
iterating on each prompt individually, then applied everywhere:

1. **"Respond with JSON only, no markdown fences" + an exact shape.**
   `AiService.generateJson()` parses the raw model response text as JSON.
   The model (like most chat-tuned LLMs) defaults to wrapping structured output
   in explanatory prose or ` ```json ` fences unless told not to. The parser
   also strips fences defensively as a second line of defense, but the
   instruction cuts failure rate far more than the strip does alone.
2. **Hard numeric counts ("exactly 5", "exactly 8-10" → later fixed to
   "exactly 9"), not "a few" / "several".** Soft counts produced anywhere
   from 2 to 15 items depending on the run, which broke fixed-size DTO
   expectations (`topSkills: [String]` with exactly 5 in the UI grid, etc).

---

## Feature 1 — Job Description Generator

**v1 attempt:**
```
Write a job description for a ${jobTitle} role in ${department}.
Skills needed: ${requiredSkills}. Level: ${level}.
```
**What was wrong:** No output structure at all — the model returned a
single wall of prose. Parsing it into `roleSummary` /
`keyResponsibilities` / etc. would have required a second LLM call or
fragile regex splitting on headers the model phrased inconsistently run to
run ("Responsibilities:" vs "What You'll Do:" vs "Key Duties"). It also
used "he/she" in one generated sample, which directly violates the
inclusive-language requirement — nothing in the prompt told it not to.

**v2 fix (current, see `buildJobDescriptionPrompt`):** Added the explicit
JSON output shape with named fields matching the DTO 1:1, and an explicit
inclusive-language instruction: *"use you/they, never he/she; avoid
gendered or ableist idioms like 'rockstar'/'ninja'; avoid unnecessary
degree requirements."* Also constrained `keyResponsibilities` to "5 to 7
bullet strings" per the spec instead of leaving bullet count unconstrained.

---

## Feature 2 — CV Screening & Scorer

**v1 attempt:**
```
Here is a candidate's CV: ${cvText}
Here is the job: ${jobTitle}, skills: ${requiredSkills}
Rate this candidate and give feedback.
```
**What was wrong:** Two problems. First, "rate this candidate" with no
scale produced scores as "8/10" in one run and "72%" in another —
inconsistent with the `matchScore: 0-100` integer the DTO needs. Second,
and more serious: an early test CV that included the candidate's name
alongside an unrelated personal detail (a LinkedIn "about me" line
mentioning volunteering with a specific community group) caused the model
to comment on that group in its "feedback" — a bias risk the spec's
constraints explicitly warn against, even though nothing asked for it.

**v2 fix (current, see `buildCvScorePrompt`):** Added an explicit guardrail
as the first line of the prompt: *"Judge only skills, experience, and
demonstrated ability — never infer or comment on age, gender, ethnicity,
nationality, or any protected characteristic, even if such details appear
in the CV text."* Pinned `matchScore` to an explicit `<integer 0-100>` in
the JSON shape, and scoped it explicitly to *"how well their demonstrated
skills/experience align with the required skills and responsibilities
above — not a general CV quality score"* (an early run scored a CV highly
for being well-written while the candidate had none of the required
skills).

**Why this is the designated fallback feature:** If this call fails or hits
the free-tier rate limit, `aiScore` is left `null` and the endpoint returns
`{ scored: false, message: "...manual review is required" }` instead of a
500. A CV-screening outage must never remove a candidate from a human
recruiter's queue — `GET /applications` still lists the application either
way; only the AI convenience layer (auto-score, auto-sort) degrades, not
candidate visibility. See `AiController.scoreCv()` for the inline comment
and the `429`/timeout classification in `AiService.classifyError()`.

---

## Feature 3 — Interview Question Suggester

**v1 attempt:**
```
Suggest some interview questions for a ${interviewType} interview for a
${jobTitle} role.
```
**What was wrong:** Completely generic — didn't reference the specific
candidate's CV or the job's actual responsibilities/skills at all, so
every candidate for the same role got byte-identical questions regardless
of their background. It also returned between 5 and 14 questions across
different runs (no count constraint) and mixed interview-type styles
freely (a "technical" run included "tell me about a conflict with a
coworker" — a behavioural question).

**v2 fix (current, see `buildInterviewQuestionsPrompt`):** Injected the
candidate's `cvSummary` (their extracted CV text) and the job's
`responsibilities`/`requiredSkills` directly into the prompt, with an
instruction to *"reference their actual background where it makes a
question sharper, not generic questions that could apply to anyone."*
Added a `typeGuidance` lookup so each `interviewType` gets an explicit
steer (technical → hands-on depth; behavioural → STAR-style past-behavior
prompts; final → role fit/motivation/closing concerns), and fixed the
count to exactly 9 (within the spec's 8-10 range) instead of leaving it
open.

**Fallback:** `INTERVIEW_QUESTION_FALLBACKS` (static, hardcoded per
`interviewType`) is returned when the AI call fails — generic but keeps
the hiring manager unblocked instead of erroring.

---

## Feature 4 — Offer Letter Drafter (bonus)

**v1 attempt:**
```
Write an offer letter for ${candidateName} for the ${roleTitle} role at
${companyName}, salary ${salary}, starting ${startDate}.
```
**What was wrong:** The model's output read as an *already-sent* letter in
some runs — phrases like "we're excited you've decided to join us" implied
acceptance had already happened, which is actively dangerous paired with
this feature's hard constraint that offers must never auto-send. A
recruiter skimming a "final" letter for approval could mistake AI-drafted
tone for actual offer status. It also omitted the probation period and
benefits entirely unless they happened to fit the model's idea of a
"standard" letter.

**v2 fix (current, see `buildOfferLetterPrompt`):** Added an explicit
instruction: *"This is a DRAFT for a recruiter to review before sending —
do not include any language implying the offer has already been sent or
accepted."* Listed every input field explicitly in the prompt (salary,
start date, probation period, benefits) so none are silently dropped, and
required the output to cover all of introduction / role details /
compensation / benefits / conditions of employment / acceptance
instructions as named sections. The send gate itself is enforced in code,
not just the prompt: `OffersService.approveAndSend()` throws unless
`status === 'draft'` and a `letterText` exists, and the only way `status`
becomes `sent` is that explicit call — the AI draft endpoint
(`POST /ai/offer-letter`) never touches the `Offer` entity or its status
at all.
