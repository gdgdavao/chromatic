import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import iconUrl from '../assets/icon.svg'

gsap.registerPlugin(useGSAP)

type OnboardingProps = {
  onStart: () => void
}

const SCREENS = [
  {
    id: 'welcome',
    badge: 'How did you get here?',
    title: 'CHROMATIC',
    subtitle: 'Ice Googleyness Breaker',
    content: 'Get ready for an exciting two-player experience that combines strategy, luck, and quick thinking!',
    visual: 'welcome'
  },
  {
    id: 'rps',
    badge: 'Step 1',
    title: 'Rock Paper Scissors',
    subtitle: 'Battle for Control',
    content: 'Two players face off in the classic game. The winner gets to spin the wheel and take control of the round.',
    visual: 'rps'
  },
  {
    id: 'wheel',
    badge: 'Step 2', 
    title: 'Spin the Wheel',
    subtitle: 'Let Fate Decide',
    content: 'The winner spins the colorful wheel. Where it lands determines the color category for your question.',
    visual: 'wheel'
  },
  {
    id: 'question',
    badge: 'Step 3',
    title: 'Answer Fast',
    subtitle: 'Beat the Clock',
    content: 'You have 90 seconds to answer a color-coded question. Think fast and give your best response!',
    visual: 'question'
  }
]

export function Onboarding({ onStart }: OnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const rootRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const subtitleRef = useRef<HTMLHeadingElement | null>(null)
  const contentRef = useRef<HTMLParagraphElement | null>(null)
  const visualRef = useRef<HTMLDivElement | null>(null)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const welcomeIconRef = useRef<HTMLImageElement | null>(null)
  const iconIdleTlRef = useRef<gsap.core.Timeline | null>(null)

  const animateScreenTransition = useCallback((newScreenIndex: number) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (prefersReduced) {
      setCurrentScreen(newScreenIndex)
      setTimeout(() => setIsTransitioning(false), 100)
      return
    }

    const elements = [badgeRef.current, titleRef.current, subtitleRef.current, contentRef.current, visualRef.current]
    
    const tl = gsap.timeline({
      onComplete: () => setIsTransitioning(false)
    })

    // Phase 1: Exit animation - fade out current content
    tl.to(elements, {
      opacity: 0,
      scale: 0.9,
      duration: 0.15,
      ease: 'power2.inOut',
      stagger: 0.02
    })
    
    // Phase 2: Change content during fade (callback happens when elements are invisible)
    .call(() => {
      setCurrentScreen(newScreenIndex)
    })
    
    // Phase 3: Small delay to ensure React has rendered new content
    .to({}, { duration: 0.08 })
    
    // Phase 4: Enter animation - sequential reveal of new content (silly boop)
    .set(elements, { scale: 0.6, opacity: 0, rotate: -8 }) // Ensure playful starting state
    .to(badgeRef.current, {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.36,
      ease: 'elastic.out(1, 0.6)'
    })
    .to(titleRef.current, {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.4,
      ease: 'elastic.out(1, 0.55)'
    })
    .to(subtitleRef.current, {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.36,
      ease: 'elastic.out(1, 0.6)'
    })
    .to(visualRef.current, {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.36,
      ease: 'elastic.out(1, 0.6)'
    })
    .to(contentRef.current, {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.36,
      ease: 'elastic.out(1, 0.6)'
    })
    // Extra welcome icon boop after it enters
    .call(() => {
      const isWelcome = SCREENS[newScreenIndex]?.visual === 'welcome'
      if (!isWelcome) return
      const iconEl = welcomeIconRef.current
      if (!iconEl) return
      gsap.set(iconEl, { transformOrigin: '50% 50%', willChange: 'transform', force3D: true, x: 0.001, y: 0.001, rotation: 0.001 })
      gsap.killTweensOf(iconEl)
      iconIdleTlRef.current?.pause()
      gsap.fromTo(iconEl,
        { scale: 0.9, rotate: -8, y: 0 },
        { scale: 1, rotate: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)', overwrite: 'auto', onComplete: () => { gsap.set(iconEl, { x: 0, y: 0, rotation: 0 }); iconIdleTlRef.current?.play() } }
      )
    })

  }, [isTransitioning])

  const nextScreen = useCallback(() => {
    if (isTransitioning) return
    
    if (currentScreen < SCREENS.length - 1) {
      animateScreenTransition(currentScreen + 1)
    } else {
      setIsTransitioning(true)
      // Start the game with a refined animation
      const tl = gsap.timeline()
      // Silly confetti burst from the card
      const confettiBurst = (container: HTMLElement | null) => {
        if (!container) return
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const colors = ['#ea4335', '#34a853', '#fbbc05', '#4285f4', '#ff6b6b', '#4ecdc4']
        Array.from({ length: 24 }).forEach(() => {
          const el = document.createElement('div')
          el.style.position = 'absolute'
          el.style.left = `${centerX}px`
          el.style.top = `${centerY}px`
          el.style.width = '8px'
          el.style.height = '8px'
          el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
          el.style.background = colors[Math.floor(Math.random() * colors.length)]
          el.style.pointerEvents = 'none'
          el.style.willChange = 'transform, opacity'
          container.appendChild(el)
          const angle = Math.random() * Math.PI * 2
          const dist = 80 + Math.random() * 120
          const duration = 0.7 + Math.random() * 0.6
          gsap.fromTo(el, { scale: 0 }, { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 1, rotation: Math.random() * 360, opacity: 0, duration, ease: 'power2.out', onComplete: () => el.remove() })
        })
      }
      confettiBurst(cardRef.current)
      tl.to(cardRef.current, {
        scale: 1.05,
        duration: 0.15,
        ease: 'power2.out'
      })
      .to(cardRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in'
      })
      .to(rootRef.current, {
        opacity: 0,
        duration: 0.25,
        onComplete: onStart
      }, '-=0.15')
    }
  }, [currentScreen, animateScreenTransition, onStart, isTransitioning])

  const prevScreen = useCallback(() => {
    if (isTransitioning) return
    
    if (currentScreen > 0) {
      animateScreenTransition(currentScreen - 1)
    }
  }, [currentScreen, animateScreenTransition, isTransitioning])

  useEffect(() => {
    // Add CSS keyframes for chromatic gradient animation (once)
    const style = document.createElement('style')
    style.setAttribute('data-chromatic-gradient', 'true')
    style.textContent = `
      @keyframes chromaticGradient {
        0% { background-position: 0% 50%; }
        33% { background-position: 33% 50%; }
        66% { background-position: 66% 50%; }
        100% { background-position: 0% 50%; }
      }
    `
    document.head.appendChild(style)
    return () => {
      const existingStyle = document.querySelector('style[data-chromatic-gradient]')
      if (existingStyle) existingStyle.remove()
    }
  }, [])

  useGSAP(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    // Smooth GPU hint
    if (cardRef.current) gsap.set(cardRef.current, { willChange: 'transform, opacity' })

    // Enhanced floating blobs with more dynamic movement
    gsap.utils.toArray<HTMLElement>('.cg-blob').forEach((el) => {
      const tl = gsap.timeline({ repeat: -1 })
      tl.to(el, {
        x: gsap.utils.random(-20, 20),
        y: gsap.utils.random(-15, 15),
        rotation: gsap.utils.random(-15, 15),
        scale: gsap.utils.random(0.8, 1.2),
        duration: gsap.utils.random(3, 6),
        ease: 'sine.inOut'
      })
      .to(el, {
        x: gsap.utils.random(-25, 25),
        y: gsap.utils.random(-20, 20),
        rotation: gsap.utils.random(-20, 20),
        scale: gsap.utils.random(0.9, 1.1),
        duration: gsap.utils.random(4, 7),
        ease: 'sine.inOut'
      })
      .to(el, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: gsap.utils.random(2, 4),
        ease: 'power2.inOut'
      })

      gsap.to(el, {
        opacity: gsap.utils.random(0.3, 0.6),
        duration: gsap.utils.random(2, 4),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
    })

    // Initial entrance animation (mount-only)
    const entranceTl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    entranceTl.fromTo(cardRef.current, {
      scale: 0.8,
      rotation: 0,
      opacity: 0,
      y: 20
    }, {
      scale: 1,
      rotation: 0,
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'back.out(1.2)',
      immediateRender: false
    })
    .from([badgeRef.current, titleRef.current, subtitleRef.current, contentRef.current], {
      y: 20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.08,
      ease: 'power2.out',
      immediateRender: false
    }, '-=0.3')
    .from(visualRef.current, {
      scale: 0.5,
      rotation: 45,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(1.3)',
      immediateRender: false
    }, '-=0.2')
    .call(() => {
      // Subtle hover wiggle for the welcome icon + idle sway on mount (no entrance animation)
      const iconEl = welcomeIconRef.current
      if (!iconEl) return
      gsap.set(iconEl, { transformOrigin: '50% 50%', willChange: 'transform', force3D: true })

      // Idle gentle sway loop (rotation-only to avoid layout jitter)
      iconIdleTlRef.current?.kill()
      const idleTl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
      iconIdleTlRef.current = idleTl
      idleTl
        .to(iconEl, { rotate: 2, duration: 1.0, ease: 'sine.inOut' })
        .to(iconEl, { rotate: -2, duration: 1.0, ease: 'sine.inOut' })
        .to(iconEl, { rotate: 0, duration: 0.8, ease: 'sine.inOut', onComplete: () => { gsap.set(iconEl, { x: 0, y: 0, rotation: 0 }) } })

      const onEnter = () => {
        iconIdleTlRef.current?.pause()
        gsap.to(iconEl, {
          keyframes: [
            { rotate: 8, scale: 1.05, duration: 0.12 },
            { rotate: -6, duration: 0.12 },
            { rotate: 4, duration: 0.12 },
            { rotate: 0, scale: 1, duration: 0.18 },
          ],
          ease: 'power2.out',
          overwrite: 'auto',
          onComplete: () => { iconIdleTlRef.current?.play() }
        })
      }
      const onLeave = () => {
        gsap.to(iconEl, { rotate: 0, scale: 1, duration: 0.2, ease: 'power2.out', onComplete: () => { gsap.set(iconEl, { x: 0, y: 0, rotation: 0 }) } })
      }
      iconEl.addEventListener('mouseenter', onEnter)
      iconEl.addEventListener('mouseleave', onLeave)
    })
    .fromTo(buttonsRef.current?.children ?? [], {
      y: 15,
      opacity: 0
    }, {
      y: 0,
      opacity: 1,
      duration: 0.3,
      stagger: 0.08,
      ease: 'power2.out'
    }, '-=0.15')
  }, { scope: rootRef })

  const screen = SCREENS[currentScreen]

  const renderVisual = () => {
    switch (screen.visual) {
      case 'welcome':
        return (
          <div className="flex justify-center mb-6">
            <img ref={welcomeIconRef} src={iconUrl} alt="Chromatic Icon" className="cg-welcome-icon w-22 h-22 drop-shadow-md select-none block" draggable={false} />
          </div>
        )
      case 'rps':
        return (
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">🪨</div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">📄</div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">✂️</div>
          </div>
        )
      case 'wheel':
        return (
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full relative overflow-hidden border-4 border-gray-200">
              <div className="absolute inset-0 bg-[#ea4335]" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)' }}></div>
              <div className="absolute inset-0 bg-[#34a853]" style={{ clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)' }}></div>
              <div className="absolute inset-0 bg-[#4285f4]" style={{ clipPath: 'polygon(50% 50%, 50% 100%, 0% 100%, 0% 50%)' }}></div>
              <div className="absolute inset-0 bg-[#fbbc05]" style={{ clipPath: 'polygon(50% 50%, 0% 50%, 0% 0%, 50% 0%)' }}></div>
            </div>
          </div>
        )
      case 'question':
        return (
          <div className="flex justify-center mb-6">
            <div className="w-16 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-8 h-1 bg-gradient-to-r from-[#ea4335] to-[#fbbc05] rounded-full"></div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div ref={rootRef} className="relative overflow-hidden min-h-dvh flex items-center justify-center bg-gradient-to-br from-[#4285f4]/10 via-white to-[#34a853]/10">
      {/* Enhanced decorative animated blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="cg-blob absolute -top-12 -left-12 w-56 h-56 rounded-full opacity-40" style={{ background: `radial-gradient(closest-side, #4285f4, transparent)` }} />
        <div className="cg-blob absolute -bottom-16 -right-10 w-64 h-64 rounded-full opacity-40" style={{ background: `radial-gradient(closest-side, #34a853, transparent)` }} />
        <div className="cg-blob absolute top-10 right-1/3 w-36 h-36 rounded-full opacity-30" style={{ background: `radial-gradient(closest-side, #4285f4, transparent)` }} />
        <div className="cg-blob absolute top-1/4 left-1/4 w-28 h-28 rounded-full opacity-25" style={{ background: `radial-gradient(closest-side, #fbbc05, transparent)` }} />
        <div className="cg-blob absolute bottom-1/3 left-10 w-32 h-32 rounded-full opacity-35" style={{ background: `radial-gradient(closest-side, #ea4335, transparent)` }} />
      </div>

      <div ref={cardRef} className="relative w-[92vw] max-w-md bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100 p-8 text-center">
        <div ref={badgeRef} className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-600">{screen.badge}</div>
        
        <h1 ref={titleRef} className="text-3xl font-extrabold mb-2 relative">
          <span 
            className="chromatic-text bg-clip-text text-transparent"
            style={{
              background: 'linear-gradient(90deg, #ea4335 0%, #fbbc05 25%, #34a853 50%, #4285f4 75%, #ea4335 100%)',
              backgroundSize: '300% 100%',
              animation: 'chromaticGradient 6s ease-in-out infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {screen.title}
          </span>
        </h1>
        
        <h2 ref={subtitleRef} className="text-lg font-semibold text-gray-800 mb-4">
          {screen.subtitle}
        </h2>

        <div ref={visualRef}>
          {renderVisual()}
        </div>
        
        <p ref={contentRef} className="text-sm text-gray-700 leading-relaxed mb-8">
          {screen.content}
        </p>

        <div ref={buttonsRef} className="flex gap-3 justify-center opacity-100">
          {currentScreen > 0 && (
            <button
              className="px-4 py-2 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
              onClick={prevScreen}
              disabled={isTransitioning}
              aria-label="Previous"
            >
              Previous
            </button>
          )}
          
          <button
            className="px-6 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#4285f4] to-[#34a853] hover:from-[#3367d6] hover:to-[#2d7d3a] shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
            onClick={nextScreen}
            disabled={isTransitioning}
            aria-label={currentScreen === SCREENS.length - 1 ? "Start Game" : "Next"}
          >
            {currentScreen === SCREENS.length - 1 ? "Start Game" : "Next"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
