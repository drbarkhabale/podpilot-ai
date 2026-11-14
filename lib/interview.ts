import type { EpisodeContent, InterviewConfig, InterviewMode, TranscriptEntry } from './types';

const QUESTIONS: Record<InterviewMode, string[]> = {
  'Unpopular Opinions':['What is your most unpopular opinion?','Which experience led you to that belief?','What is the strongest argument against it?','When has your opinion been tested?','Who might see this differently, and why?','What would change your mind?'],
  'Hot Takes':["What is your hot take?",'What makes that view worth debating?','Can you give us a concrete example?','Where might that take go too far?','What is something you believe in despite the pushback?','What should listeners think about next?'],
  'Deep Dive': [
    'What first drew you into this topic?',
    'Which experience changed the way you think about it?',
    'What part do people usually misunderstand?',
    'What did you have to unlearn along the way?',
    'What tension or uncertainty are you still working through?',
    'What would you like someone listening to take away?'
  ],
  'Startup Founder': [
    'What problem made you decide this needed to exist?',
    'What did your first users teach you that surprised you?',
    'Which assumption have you tested with real customers?',
    'What has been your hardest tradeoff so far?',
    'What would have to be true for this to grow sustainably?',
    'What is the next milestone that would meaningfully change the business?'
  ],
  'Debate Mode': [
    'What is the central claim you want to defend?',
    'What is the strongest evidence supporting that claim?',
    'What would a thoughtful critic say you are overlooking?',
    'What evidence would make you change your mind?',
    'Where does your argument stop being applicable?',
    'What common ground can you find with someone who disagrees?'
  ],
  'Personal Story': [
    'Which moment would you choose as the beginning of this story?',
    'What did that moment feel like from the inside?',
    'Who or what helped you through the difficult part?',
    'What changed in the way you saw yourself?',
    'What would you tell the version of yourself at the beginning?',
    'What part of this experience do you want to carry forward?'
  ],
  'Expert Interview': [
    'What is the most useful idea a listener should understand first?',
    'What concrete example makes that idea easier to understand?',
    'Where does the standard explanation break down?',
    'Which evidence or method do you trust most in this area?',
    'What important question remains unresolved?',
    'What should a curious listener explore next?'
  ]
};

function clean(value: string, maximum = 140): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum).replace(/\s+\S*$/, '')}…`;
}

function quoted(value: string, maximum = 100): string {
  return `“${clean(value, maximum).replace(/[?]/g, '').replace(/[“”]/g, '"')}”`;
}

function guestEntries(transcript: TranscriptEntry[]): TranscriptEntry[] {
  return transcript.filter(entry => entry.role === 'guest' && entry.text.trim());
}

export function opening(config: InterviewConfig): string {
  const greeting = config.guest.trim() ? ` Welcome, ${clean(config.guest, 50)}.` : ' Welcome to the studio.';
  const topic = config.topic.trim() ? ` We're exploring ${clean(config.topic, 140).replace(/[?]/g, '')}.` : '';
  return `I'm NOAH, your AI host character. This is Demo Mode: my questions use local interview rules, not an OpenAI model.${greeting}${topic} ${QUESTIONS[config.mode][0]}`;
}

export function followUp(config: InterviewConfig, transcript: TranscriptEntry[], skip = false): string {
  const answers = guestEntries(transcript);
  const hostTurns = transcript.filter(entry => entry.role === 'host').length;
  const index = Math.max(1, hostTurns) % QUESTIONS[config.mode].length;
  if (skip) return `Of course, let's move on. ${QUESTIONS[config.mode][index]}`;
  const last = answers.at(-1);
  if (!last) return QUESTIONS[config.mode][index];

  // These rules intentionally quote only material the guest actually supplied.
  // They are a transparent deterministic demo, not semantic understanding.
  const lead = config.personality === 'Warm' ? 'Thank you for sharing that.' : config.personality === 'Challenging' ? 'Let’s examine that a little more closely.' : 'There’s a thread worth exploring there.';
  const reference = answers.length > 2 && hostTurns % 3 === 0 ? answers[0] : last;
  const anchor = `${reference === last ? 'You mentioned' : 'Earlier, you mentioned'} ${quoted(reference.text)}.`;
  let question = QUESTIONS[config.mode][index];
  if (config.mode === 'Expert Interview' && config.expertise === 'Beginner' && index === 2) question = 'How would you explain that to someone encountering it for the first time?';
  if (config.mode === 'Expert Interview' && config.expertise === 'Expert' && index === 2) question = 'Which boundary condition would make that explanation fail?';
  if (config.mode === 'Debate Mode' && /\b(always|never|everyone|nobody|all|none)\b/i.test(last.text)) question = 'What is one plausible exception to that claim?';
  else if (config.mode !== 'Debate Mode' && /\b(surpris|unexpected|shock)/i.test(last.text) && hostTurns % 2 === 1) question = 'What had you expected to happen instead?';
  else if (config.personality === 'Challenging' && index === 4) question = 'What evidence would persuade someone who sees it differently?';
  return `${lead} ${anchor} ${question}`;
}

export function closing(config: InterviewConfig, transcript: TranscriptEntry[]): string {
  const answers = guestEntries(transcript);
  const name = config.guest.trim() ? `, ${clean(config.guest, 50)}` : '';
  if (!answers.length) return `Thank you for spending time in the studio${name}. We opened a conversation about ${clean(config.topic || 'your story', 120)}. There are no guest answers to summarize yet. Your next interview can start whenever you're ready.`;
  const first = quoted(answers[0].text, 160);
  const last = answers.length > 1 ? ` Your final reflection was ${quoted(answers.at(-1)!.text, 160)}.` : '';
  return `Thank you${name}. You began with ${first}.${last} Those are your words and a useful starting point for the episode. I appreciate the perspective you brought to ${clean(config.topic || 'this conversation', 100)}. This closes our scripted Demo Mode interview.`;
}

export function appendTranscript(entries: TranscriptEntry[], entry: TranscriptEntry): TranscriptEntry[] {
  if (!entry.id?.trim() || !['host', 'guest'].includes(entry.role) || typeof entry.text !== 'string' || !entry.text.trim() || !Number.isFinite(entry.timestamp) || entry.timestamp < 0) {
    throw new Error('Transcript entries need an ID, speaker, nonempty text, and a valid timestamp.');
  }
  if (entries.some(existing => existing.id === entry.id)) return entries;
  return [...entries, { ...entry, text: entry.text.trim() }].sort((a, b) => a.timestamp - b.timestamp);
}

export function generateContent(config: InterviewConfig, transcript: TranscriptEntry[], duration: number): EpisodeContent {
  const answers = guestEntries(transcript);
  const topic = clean(config.topic || 'An open conversation', 110);
  const guest = clean(config.guest || 'our guest', 60);
  const title = `${topic} — a conversation with ${guest}`;
  const excerpts = answers.slice(0, 5).map(entry => clean(entry.text, 220));
  const summary = answers.length ? `Demo template based on ${guest}'s ${answers.length} captured transcript answer${answers.length === 1 ? '' : 's'} about ${topic}. Opening reflection: ${quoted(answers[0].text, 220)}${answers.length > 1 ? ` Closing reflection: ${quoted(answers.at(-1)!.text, 220)}` : ''}` : `Demo template for a conversation about ${topic}. No guest answers were captured, so there is no interview substance to summarize.`;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const highlights = answers.filter(entry => entry.timestamp < safeDuration).slice(0, 3).map((entry, index) => {
    const next = transcript.find(candidate => candidate.timestamp > entry.timestamp);
    const end = Math.min(safeDuration, next?.timestamp ?? safeDuration, entry.timestamp + 45);
    return { title: `Guest reflection ${index + 1}`, start: entry.timestamp, end, reason: `Demo recommendation from transcript order: ${quoted(entry.text, 130)}. Preview the actual recording before sharing.` };
  }).filter(highlight => highlight.end > highlight.start);
  const showNotes = [title, '', 'DEMO TEMPLATE · Built locally from the actual transcript.', '', summary, '', 'Guest reflections', ...(excerpts.length ? excerpts.map((text, index) => `${index + 1}. ${text}`) : ['No guest answers were captured.']), '', 'Review wording and context before publishing. Transcript times are approximate session times, not word-level media alignment.'].join('\n');
  const interviewDescription = config.engine === 'elevenlabs' ? 'for an ElevenLabs-powered interview in PodPilot' : config.engine === 'openai' ? 'for an OpenAI-powered interview in PodPilot' : 'in PodPilot’s scripted Demo Mode';
  const captionInterviewLabel = config.engine === 'elevenlabs' ? 'Interviewed with ElevenLabs in PodPilot.' : config.engine === 'openai' ? 'Interviewed with OpenAI in PodPilot.' : 'Interviewed in PodPilot Demo Mode.';
  const linkedin = answers.length ? `I sat down with NOAH ${interviewDescription} to explore ${topic}.\n\nOne reflection from the conversation:\n${quoted(answers[0].text, 300)}\n\nWhat has your experience been?\n\n#PodPilot #Storytelling` : `I'm exploring ${topic} with PodPilot. This is a draft caption; complete an interview before sharing episode insights.`;
  return {title, summary, takeaways: excerpts, showNotes, linkedin, captions: answers.length ? [`A conversation about ${topic}. ${quoted(answers[0].text, 180)}`, `Behind the story: ${topic}. ${captionInterviewLabel}`] : [], highlights, source:'demo'};
}
