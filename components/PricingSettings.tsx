'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, AudioLines, Check, CheckCircle2, ChevronRight, HardDrive, Headphones, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles, Trash2, Volume2 } from 'lucide-react';
import {loadHostProfile,saveHostProfile} from '@/lib/host-settings';
import { clearEpisodes, listEpisodes } from '@/lib/storage';

const plans = [
  { name: 'Free', price: '$0', cadence: 'to explore', intro: 'Find your voice. Tell your first story.', items: ['Browser Demo Mode', 'NOAH + three camera layouts', 'Five interview formats', 'Local transcripts, video & clips'], cta: 'Start a free interview', href: '/setup/', available: true },
  { name: 'Creator', price: '$19', cadence: '/ month · proposed', intro: 'A consistent rhythm for your content.', items: ['Everything in Free', 'Planned: hosted AI interviews', 'Planned: content workspace', 'Planned: cloud episode backup'], cta: 'Explore the current demo', href: '/setup/', featured: true },
  { name: 'Pro', price: '$49', cadence: '/ month · proposed', intro: 'A studio that grows with your ambition.', items: ['Everything in Creator', 'Planned: brand presets', 'Planned: batch clip exports', 'Planned: advanced episode tools'], cta: 'Explore the current demo', href: '/setup/' },
  { name: 'Business', price: 'Let’s build', cadence: 'custom · proposed', intro: 'A home for your team’s best thinking.', items: ['Everything in Pro', 'Planned: shared workspaces', 'Planned: team permissions', 'Planned: organization controls'], cta: 'Review privacy & setup', href: '/settings/' },
];

export function PricingPage() {
  return <div className="page-wrap">
    <div className="page-heading pricing-heading" style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 42px' }}>
      <div className="eyebrow">YOUR STORY, YOUR PACE</div>
      <h1>A seat at the microphone.<br /><span style={{ color: 'var(--amber, #eab47b)' }}>For every storyteller.</span></h1>
      <p className="muted">Start with the free browser demo. These future paid plans are a product proposal, with no checkout or subscription currently available.</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 16 }}>
      {plans.map(plan => <section key={plan.name} className="card" style={{ padding: 26, position: 'relative', display: 'flex', flexDirection: 'column', borderColor: plan.featured ? '#bb8b58' : undefined, background: plan.featured ? 'linear-gradient(150deg, #2a231e, #19171e)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 24 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>{plan.name}</h2>
          <span className="chip" style={{ fontSize: 15 }}>{plan.available ? 'AVAILABLE NOW' : 'PROPOSED'}</span>
        </div>
        <div style={{ margin: '24px 0 6px', fontSize: plan.name === 'Business' ? 32 : 40, fontWeight: 600, letterSpacing: '-.04em' }}>{plan.price}</div>
        <div className="muted" style={{ fontSize: 15 }}>{plan.cadence}</div>
        <p className="muted" style={{ fontSize: 18, minHeight: 44, lineHeight: 1.7 }}>{plan.intro}</p>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', margin: '12px 0 22px' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px', display: 'grid', gap: 16, fontSize: 15, flex: 1 }}>
          {plan.items.map(item => <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}><Check size={15} color="#FF9B45" style={{ flexShrink: 0, marginTop: 2 }} /><span>{item}</span></li>)}
        </ul>
        <Link href={plan.href} className={`btn ${plan.featured || plan.available ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 15, justifyContent: 'center' }}>{plan.cta}<ArrowRight size={14} /></Link>
      </section>)}
    </div>
    <div className="notice" style={{ marginTop: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <Sparkles size={21} style={{ color: '#d9b180', flexShrink: 0 }} />
      <div><strong>Clear about what powers your interview.</strong><p className="muted" style={{ marginBottom: 0 }}>Demo Mode uses scripted questions and browser speech with zero OpenAI API cost. The optional OpenAI mode requires separately configured API access and usage billing. ChatGPT Pro does not include those API costs or deployment hosting.</p></div>
    </div>
    <div className="grid-3" style={{ marginTop: 44, gap: 28 }}>
      <div><Headphones size={22} color="#FF9B45" /><h3>Start without a microphone</h3><p className="muted">Every interview supports typed answers. Voice and recording work where your browser supports them and you grant permission.</p></div>
      <div><LockKeyhole size={22} color="#FF9B45" /><h3>Your studio stays yours</h3><p className="muted">The MVP saves episodes on this browser. Cloud backup and collaboration are future features.</p></div>
      <div><AudioLines size={22} color="#FF9B45" /><h3>Only real recorded media</h3><p className="muted">Audio and video downloads come from captured media. A transcript is always labeled as a transcript.</p></div>
    </div>
  </div>;
}

interface Preferences { voiceEnabled: boolean; theme: 'blue' | 'amber' | 'violet' | 'teal' }
const defaultPreferences: Preferences = { voiceEnabled: true, theme: 'blue' };

export function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [episodeCount, setEpisodeCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('podpilot-settings') || '{}') as Partial<Preferences>;
      setPreferences({
        voiceEnabled: typeof stored.voiceEnabled === 'boolean' ? stored.voiceEnabled : true,
        theme: ['blue', 'amber', 'violet', 'teal'].includes(stored.theme || '') ? stored.theme as Preferences['theme'] : 'blue',
      });
      setEpisodeCount(listEpisodes().length);
    } catch { setError('Your browser could not load saved preferences. These defaults apply until you can save.'); }
    setLoaded(true);
  }, []);

  async function savePreferences() {
    setMessage(''); setError('');
    try {
      localStorage.setItem('podpilot-settings', JSON.stringify(preferences));
      const host=await loadHostProfile();await saveHostProfile({...host,settings:{...host.settings,theme:preferences.theme}});
      window.dispatchEvent(new Event('podpilot-settings-changed'));
      setMessage('Preferences saved for new interviews.');
    } catch { setError('Preferences could not be saved. Please allow this site to use browser storage.'); }
  }

  async function removeEpisodes() {
    if (!acknowledged) return;
    setDeleting(true); setError(''); setMessage('');
    try {
      await clearEpisodes();
      setEpisodeCount(0); setConfirmDelete(false); setAcknowledged(false);
      setMessage('Saved episodes and recordings have been removed from this browser.');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not remove your episodes. Please try again.'); }
    finally { setDeleting(false); }
  }

  return <div className="page-wrap" style={{ maxWidth: 1060 }}>
    <div className="page-heading settings-heading"><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Your studio. Your rules.</h1><p className="muted">Choose how NOAH sounds, how your studio feels, and what stays on your device.</p></div>
    {error && <div role="alert" className="notice" style={{ borderColor: '#b66e67', marginBottom: 20 }}>{error}</div>}
    {message && <div role="status" className="notice" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}><CheckCircle2 size={18} />{message}</div>}
    <Link className="btn btn-secondary" href="/host/" style={{marginBottom:24}}>NOAH image, video & voice settings →</Link>
    <div className="grid-2" style={{ gap: 22, alignItems: 'start' }}>
      <section className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Volume2 size={21} color="#FF9B45" /><h2 className="section-title" style={{ margin: 0 }}>Studio preferences</h2></div>
        <p className="muted" style={{ fontSize: 18 }}>These defaults apply when you set up a new interview.</p>
        <label style={{ display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <span><strong style={{ display: 'block' }}>Spoken host responses</strong><span className="muted" style={{ fontSize: 15 }}>Use your browser’s voice in Demo Mode.</span></span>
          <input type="checkbox" checked={preferences.voiceEnabled} disabled={!loaded} onChange={event => setPreferences({ ...preferences, voiceEnabled: event.target.checked })} style={{ width: 19, height: 19, accentColor: '#d9b180' }} />
        </label>
        <fieldset style={{ border: 0, margin: '24px 0', padding: 0 }}><legend style={{ fontWeight: 600, marginBottom: 12 }}>NOAH’s studio palette</legend>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{(['blue', 'amber', 'violet', 'teal'] as const).map((theme, index) => <label key={theme} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', border: `1px solid ${preferences.theme === theme ? ['#399CFA', '#FF9B45', '#b49aee', '#80cec1'][index] : 'rgba(255,255,255,.12)'}`, borderRadius: 9 }}><input type="radio" name="studio-theme" value={theme} checked={preferences.theme === theme} disabled={!loaded} onChange={() => setPreferences({ ...preferences, theme })} style={{ accentColor: ['#399CFA', '#FF9B45', '#b49aee', '#80cec1'][index] }} /><span style={{ textTransform: 'capitalize', fontSize: 15 }}>{theme}</span></label>)}</div>
        </fieldset>
        <button className="btn btn-primary" onClick={savePreferences} disabled={!loaded} style={{ marginTop: 12 }}>Save preferences<Check size={16} /></button>
      </section>
      <section className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><ShieldCheck size={21} color="#FF9B45" /><h2 className="section-title" style={{ margin: 0 }}>Privacy, in plain language</h2></div>
        <div style={{ display: 'grid', gap: 20, marginTop: 25, fontSize: 17, lineHeight: 1.7 }}>
          <div><strong>Demo text stays in your browser</strong><p className="muted" style={{ margin: '5px 0 0' }}>Scripted questions and content templates run locally. Web Speech recognition may send audio to your browser provider for processing; availability and privacy depend on your browser.</p></div>
          <div><strong>Recording always asks for consent</strong><p className="muted" style={{ margin: '5px 0 0' }}>Your microphone and supported studio media are captured only after you agree and grant permission. Completed episodes and captured media are saved on this browser until you delete them or clear site data. Your enabled webcam, NOAH, and camera-angle changes are part of the composited studio video. Camera and microphone are separately controlled. Browser-generated NOAH speech is excluded unless a supported tab-audio stream is explicitly shared.</p></div>
          <div><strong>OpenAI mode sends data to OpenAI</strong><p className="muted" style={{ margin: '5px 0 0' }}>When you choose and connect OpenAI mode, your interview audio and conversation data are processed by OpenAI. Improving episode outputs sends the transcript. API usage is billed separately.</p></div>
          <div><strong>ElevenLabs processes live agent audio</strong><p className="muted" style={{margin:'5px 0 0'}}>When you start a configured ElevenLabs session, microphone audio and conversation text go to that provider. Its billing, retention and account settings apply. Uploaded voice references stay in this browser and are not automatically used for cloning.</p></div><div><strong>No cloud backup in this MVP</strong><p className="muted" style={{ margin: '5px 0 0' }}>Clearing site data, private browsing, storage limits, or changing devices may remove access to episodes. Download anything you want to keep.</p></div>
        </div>
      </section>
    </div>
    <section className="card" style={{ padding: 28, marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><HardDrive size={23} color="#FF9B45" /><div><h2 className="section-title" style={{ margin: 0 }}>Your local episode data</h2><p className="muted" style={{ fontSize: 18, margin: '5px 0 0' }}>{loaded ? `${episodeCount} saved ${episodeCount === 1 ? 'episode' : 'episodes'} on this browser` : 'Loading your local library…'}</p></div></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link className="btn btn-secondary" href="/library/">Open library<ChevronRight size={15} /></Link><button className="btn btn-secondary" onClick={() => { setConfirmDelete(true); setAcknowledged(false); }} disabled={!loaded} style={{ color: '#e0a49d' }}><Trash2 size={15} />Delete all episodes</button></div>
      </div>
      {confirmDelete && <div role="region" aria-label="Confirm episode deletion" style={{ marginTop: 22, padding: 20, border: '1px solid rgba(220,130,120,.3)', borderRadius: 10, background: 'rgba(140,50,50,.08)' }}>
        <strong>Delete every saved episode and recording?</strong><p className="muted" style={{ fontSize: 18 }}>This removes PodPilot’s local transcripts, episode outputs, and media from this browser. Downloaded files are unaffected. This action cannot be undone.</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} style={{ accentColor: '#d9b180' }} />I understand and want to delete my saved episodes.</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}><button className="btn btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button><button className="btn btn-primary" onClick={removeEpisodes} disabled={!acknowledged || deleting}>{deleting ? <LoaderCircle size={15} /> : <Trash2 size={15} />}{deleting ? 'Deleting…' : 'Delete permanently'}</button></div>
      </div>}
    </section>
    <p className="muted" style={{ textAlign: 'center', marginTop: 30, fontSize: 15 }}>Your long-lived API key belongs on the server. PodPilot never asks you to paste it into this page.</p>
  </div>;
}
