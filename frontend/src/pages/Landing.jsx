import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '✅',
    title: 'Daily & Weekly Chores',
    desc: 'Kids tap their avatar to see what needs doing. Simple checkboxes make completing chores satisfying and fun.',
  },
  {
    icon: '🐷',
    title: 'Piggy Bank & Savings',
    desc: 'Every chore earns virtual money toward goals they choose. Watch their eyes light up as savings grow.',
  },
  {
    icon: '📅',
    title: 'Family Calendar',
    desc: 'Google Calendar and iCal sync keeps everyone on the same page. Add, edit, and manage events in one place.',
  },
  {
    icon: '🍽️',
    title: 'Meal Planning',
    desc: 'Drag-and-drop weekly meal planner with automatic shopping lists scaled to your family size.',
  },
  {
    icon: '🎨',
    title: 'Beautiful Themes',
    desc: 'Choose from Warm, Ocean, Forest, Sunset, or Midnight themes. Every child gets their own colour too.',
  },
  {
    icon: '🔒',
    title: 'Parent PIN Protection',
    desc: 'Kids browse freely while settings, finances, and management stay behind your secure PIN.',
  },
]

const STEPS = [
  { num: '1', title: 'Set up your family', desc: 'Add your children, pick their avatars, and configure chores in minutes.' },
  { num: '2', title: 'Kids tap & complete', desc: 'Children tap their avatar on the home screen — no login needed. They see their chores and check them off.' },
  { num: '3', title: 'Watch them thrive', desc: 'Track progress, celebrate streaks, and watch savings grow toward goals they care about.' },
]

const TESTIMONIALS = [
  { quote: 'My kids actually fight over who gets to do chores first now. Never thought I\'d see the day.', name: 'Sarah M.', role: 'Mum of 3' },
  { quote: 'The meal planner alone saves us hours every week. The chore tracking is the cherry on top.', name: 'James & Priya K.', role: 'Parents of 2' },
  { quote: 'No more "I forgot" excuses. The kids can see exactly what they need to do and what they\'ll earn.', name: 'Michelle T.', role: 'Mum of 4' },
]

const FEATURE_OPTIONS = [
  'Chore tracking & completion',
  'Piggy bank & savings goals',
  'Family calendar',
  'Meal planning & shopping lists',
  'Multiple themes',
  'All of the above!',
]

function useOnScreen(ref) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef()
  const visible = useOnScreen(ref)
  return (
    <div
      ref={ref}
      className={`land-animate ${visible ? 'land-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function Landing() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [feature, setFeature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const formRef = useRef()

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !feature) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), feature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="land">
      {/* Nav */}
      <nav className="land-nav">
        <div className="land-nav-inner">
          <div className="land-logo">
            <span className="land-logo-icon">&#x2728;</span>
            <span className="land-logo-text">ChoreMax</span>
          </div>
          <div className="land-nav-links">
            <Link to="/login" className="land-nav-login">Log in</Link>
            <button className="land-nav-cta" onClick={scrollToForm}>Join Waitlist</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="land-hero">
        <div className="land-hero-bg" />
        <div className="land-hero-content">
          <AnimatedSection>
            <p className="land-hero-eyebrow">The family organiser that kids actually enjoy</p>
            <h1 className="land-hero-title">
              Chores done.<br />
              <span className="land-hero-accent">Family thriving.</span>
            </h1>
            <p className="land-hero-sub">
              ChoreMax turns daily responsibilities into rewarding habits. Kids earn, save, and learn — while parents get a calmer, more organised home.
            </p>
            <div className="land-hero-actions">
              <button className="land-btn land-btn-primary" onClick={scrollToForm}>
                Join the Waitlist
              </button>
              <a href="#features" className="land-btn land-btn-ghost">See how it works</a>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <div className="land-hero-visual">
              <div className="land-hero-card land-hero-card-1">
                <div className="land-hero-card-avatar">🧒</div>
                <div className="land-hero-card-info">
                  <div className="land-hero-card-name">Liam</div>
                  <div className="land-hero-card-stat">4/5 chores done</div>
                  <div className="land-hero-card-bar"><div className="land-hero-card-fill" style={{ width: '80%' }} /></div>
                </div>
              </div>
              <div className="land-hero-card land-hero-card-2">
                <div className="land-hero-card-avatar">👧</div>
                <div className="land-hero-card-info">
                  <div className="land-hero-card-name">Emma</div>
                  <div className="land-hero-card-stat">5/5 chores done</div>
                  <div className="land-hero-card-bar"><div className="land-hero-card-fill land-hero-card-fill--done" style={{ width: '100%' }} /></div>
                </div>
              </div>
              <div className="land-hero-card land-hero-card-3">
                <div className="land-hero-card-piggy">🐷</div>
                <div className="land-hero-card-info">
                  <div className="land-hero-card-name">Emma's Savings</div>
                  <div className="land-hero-card-stat land-hero-card-stat--money">$24.50 / $50.00</div>
                  <div className="land-hero-card-bar"><div className="land-hero-card-fill land-hero-card-fill--piggy" style={{ width: '49%' }} /></div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="land-proof">
        <AnimatedSection>
          <div className="land-proof-inner">
            <div className="land-proof-item">
              <span className="land-proof-num">6</span>
              <span className="land-proof-label">Built-in features</span>
            </div>
            <div className="land-proof-sep" />
            <div className="land-proof-item">
              <span className="land-proof-num">5</span>
              <span className="land-proof-label">Beautiful themes</span>
            </div>
            <div className="land-proof-sep" />
            <div className="land-proof-item">
              <span className="land-proof-num">0</span>
              <span className="land-proof-label">Child logins needed</span>
            </div>
            <div className="land-proof-sep" />
            <div className="land-proof-item">
              <span className="land-proof-num">&infin;</span>
              <span className="land-proof-label">Family peace</span>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Features */}
      <section className="land-features" id="features">
        <AnimatedSection>
          <h2 className="land-section-title">Everything your family needs</h2>
          <p className="land-section-sub">One app to manage chores, savings, meals, and schedules — beautifully.</p>
        </AnimatedSection>
        <div className="land-features-grid">
          {FEATURES.map((f, i) => (
            <AnimatedSection key={i} delay={i * 80} className="land-feature-card">
              <span className="land-feature-icon">{f.icon}</span>
              <h3 className="land-feature-title">{f.title}</h3>
              <p className="land-feature-desc">{f.desc}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA mid-page */}
      <section className="land-mid-cta">
        <AnimatedSection>
          <div className="land-mid-cta-inner">
            <h2>Ready to transform your family's routine?</h2>
            <p>Join hundreds of families waiting for ChoreMax. Be first in line when we launch.</p>
            <button className="land-btn land-btn-primary land-btn-lg" onClick={scrollToForm}>Get Early Access</button>
          </div>
        </AnimatedSection>
      </section>

      {/* How it works */}
      <section className="land-steps">
        <AnimatedSection>
          <h2 className="land-section-title">Up and running in minutes</h2>
          <p className="land-section-sub">No complicated setup. No child accounts. No friction.</p>
        </AnimatedSection>
        <div className="land-steps-grid">
          {STEPS.map((s, i) => (
            <AnimatedSection key={i} delay={i * 120} className="land-step">
              <div className="land-step-num">{s.num}</div>
              <h3 className="land-step-title">{s.title}</h3>
              <p className="land-step-desc">{s.desc}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="land-testimonials">
        <AnimatedSection>
          <h2 className="land-section-title">Families love ChoreMax</h2>
        </AnimatedSection>
        <div className="land-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={i} delay={i * 100} className="land-testimonial">
              <div className="land-testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <blockquote className="land-testimonial-quote">&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="land-testimonial-author">
                <span className="land-testimonial-name">{t.name}</span>
                <span className="land-testimonial-role">{t.role}</span>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Waitlist Form */}
      <section className="land-waitlist" ref={formRef} id="waitlist">
        <AnimatedSection>
          <div className="land-waitlist-inner">
            <h2 className="land-section-title">Join the Waitlist</h2>
            <p className="land-section-sub">Be the first to know when ChoreMax launches. Early members get exclusive pricing.</p>

            {submitted ? (
              <div className="land-waitlist-success">
                <span className="land-waitlist-success-icon">&#x1F389;</span>
                <h3>You're on the list!</h3>
                <p>We'll be in touch as soon as ChoreMax is ready. Thanks for your interest!</p>
              </div>
            ) : (
              <form className="land-waitlist-form" onSubmit={handleSubmit}>
                {error && <div className="land-waitlist-error">{error}</div>}
                <div className="land-waitlist-fields">
                  <div className="land-waitlist-field">
                    <label htmlFor="wl-name">Your name</label>
                    <input
                      id="wl-name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div className="land-waitlist-field">
                    <label htmlFor="wl-email">Email address</label>
                    <input
                      id="wl-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="land-waitlist-field land-waitlist-field--full">
                    <label htmlFor="wl-feature">What are you most excited about?</label>
                    <select id="wl-feature" value={feature} onChange={e => setFeature(e.target.value)} required>
                      <option value="" disabled>Pick a feature...</option>
                      {FEATURE_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="land-btn land-btn-primary land-btn-lg land-btn-full" disabled={submitting}>
                  {submitting ? 'Joining...' : 'Join the Waitlist'}
                </button>
                <p className="land-waitlist-fine">No spam, ever. Unsubscribe anytime.</p>
              </form>
            )}
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="land-footer-brand">
            <span className="land-logo-icon">&#x2728;</span>
            <span className="land-logo-text">ChoreMax</span>
            <p className="land-footer-tagline">The family organiser that kids actually enjoy.</p>
          </div>
          <div className="land-footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/login">Log in</Link>
          </div>
          <div className="land-footer-copy">
            &copy; {new Date().getFullYear()} ChoreMax. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
