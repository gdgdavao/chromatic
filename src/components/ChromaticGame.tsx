import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

type RpsChoice = 'rock' | 'paper' | 'scissors'

type Question = {
  color: 'red' | 'green' | 'blue' | 'yellow'
  text: string
}

const GOOGLE_QUESTIONS: Question[] = [
  { color: 'red', text: 'What is your favorite Google product and why?' },
  { color: 'red', text: 'Share a time Google Maps saved your day.' },
  { color: 'red', text: 'If you could design a Google Doodle, what theme?' },
  { color: 'green', text: 'Best Chrome extension for productivity?' },
  { color: 'green', text: 'Android or iOS: what would you improve?' },
  { color: 'green', text: 'How do you stay organized with Google Drive?' },
  { color: 'blue', text: 'What was your first search on Google you remember?' },
  { color: 'blue', text: 'Favorite YouTube channel and why?' },
  { color: 'blue', text: 'If Search had a superpower, what would it be?' },
  { color: 'yellow', text: 'What Google service changed your life the most?' },
  { color: 'yellow', text: 'Best Google Easter egg you have discovered?' },
  { color: 'yellow', text: 'How do you use Google Photos creatively?' },
]

const COLOR_TO_HEX: Record<Question['color'], string> = {
  red: '#ea4335',
  green: '#34a853',
  blue: '#4285f4',
  yellow: '#fbbc05',
}

const RPS_ORDER: RpsChoice[] = ['rock', 'paper', 'scissors']

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

export function ChromaticGame() {
  const [phase, setPhase] = useState<'intro' | 'rps' | 'spin' | 'answering'>('intro')
  const [topChoice, setTopChoice] = useState<RpsChoice | null>(null)
  const [bottomChoice, setBottomChoice] = useState<RpsChoice | null>(null)
  const [rpsResult, setRpsResult] = useState<'top' | 'bottom' | 'tie' | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(90)
  const [isSpinning, setIsSpinning] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number>(5)
  const [displayTop, setDisplayTop] = useState<RpsChoice>('rock')
  const [displayBottom, setDisplayBottom] = useState<RpsChoice>('rock')
  const [rpsWinMessage, setRpsWinMessage] = useState<string | null>(null)
  const [rpsRunId, setRpsRunId] = useState<number>(0)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const wheelContainerRef = useRef<HTMLDivElement | null>(null)

  // Create custom wheel with GSAP
  useEffect(() => {
    if (!wheelContainerRef.current) return
    
    const container = wheelContainerRef.current
    container.innerHTML = '' // Clear any existing content
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('viewBox', '0 0 200 200')
    
    // Define the 4 color segments (90 degrees each)
    // Arrow points to TOP (0°), so we arrange colors clockwise from there
    const colors = [
      { color: '#ea4335', name: 'red' },     // 315-45° (top, where arrow points)
      { color: '#fbbc05', name: 'yellow' },  // 45-135° (right)
      { color: '#34a853', name: 'green' },   // 135-225° (bottom)
      { color: '#4285f4', name: 'blue' }     // 225-315° (left)
    ]
    
    colors.forEach((colorInfo, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      
      // Calculate path for each 90-degree segment
      // Start from -45° so red is centered at top (0°) where arrow points
      const startAngle = (index * 90) - 45
      const endAngle = ((index + 1) * 90) - 45
      const startAngleRad = (startAngle * Math.PI) / 180
      const endAngleRad = (endAngle * Math.PI) / 180
      
      const centerX = 100
      const centerY = 100
      const radius = 80
      
      const x1 = centerX + radius * Math.cos(startAngleRad)
      const y1 = centerY + radius * Math.sin(startAngleRad)
      const x2 = centerX + radius * Math.cos(endAngleRad)
      const y2 = centerY + radius * Math.sin(endAngleRad)
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
        'Z'
      ].join(' ')
      
      path.setAttribute('d', pathData)
      path.setAttribute('fill', colorInfo.color)
      path.setAttribute('stroke', '#ffffff')
      path.setAttribute('stroke-width', '2')
      
      svg.appendChild(path)
    })
    
    // Add center circle
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    centerCircle.setAttribute('cx', '100')
    centerCircle.setAttribute('cy', '100')
    centerCircle.setAttribute('r', '15')
    centerCircle.setAttribute('fill', '#ffffff')
    centerCircle.setAttribute('stroke', '#cccccc')
    centerCircle.setAttribute('stroke-width', '2')
    svg.appendChild(centerCircle)
    
    container.appendChild(svg)
  }, [])
  const spinTl = useRef<gsap.core.Tween | null>(null)
  const topPulseRef = useRef<HTMLSpanElement | null>(null)
  const bottomPulseRef = useRef<HTMLSpanElement | null>(null)
  const arrowRef = useRef<HTMLDivElement | null>(null)
  const rpsCountdownRef = useRef<HTMLDivElement | null>(null)
  const answeringModalRef = useRef<HTMLDivElement | null>(null)
  const rpsModalRef = useRef<HTMLDivElement | null>(null)
  const introModalRef = useRef<HTMLDivElement | null>(null)
  const rpsOverlayRef = useRef<HTMLDivElement | null>(null)
  const bgLayerRef = useRef<HTMLDivElement | null>(null)

  const byColor = useMemo(() => ({
    red: GOOGLE_QUESTIONS.filter(q => q.color === 'red'),
    green: GOOGLE_QUESTIONS.filter(q => q.color === 'green'),
    blue: GOOGLE_QUESTIONS.filter(q => q.color === 'blue'),
    yellow: GOOGLE_QUESTIONS.filter(q => q.color === 'yellow'),
  }), [])

  useEffect(() => {
    if (phase !== 'answering') return
    if (secondsLeft <= 0) return
  const id = setInterval(() => setSecondsLeft((s: number) => s - 1), 1000)
    return () => clearInterval(id)
  }, [phase, secondsLeft])

  const decideRps = (a: RpsChoice, b: RpsChoice): 'top' | 'bottom' | 'tie' => {
    if (a === b) return 'tie'
    const beats: Record<RpsChoice, RpsChoice> = { rock: 'scissors', paper: 'rock', scissors: 'paper' }
    return beats[a] === b ? 'top' : 'bottom'
  }

  // RPS automated sequence: cycle hands + countdown, then lock in choices
  useEffect(() => {
    if (phase !== 'rps') return
    setTopChoice(null)
    setBottomChoice(null)
    setRpsResult(null)
    setCountdown(5)

    const cycle = setInterval(() => {
      setDisplayTop(prev => RPS_ORDER[(RPS_ORDER.indexOf(prev) + 1) % RPS_ORDER.length])
      setDisplayBottom(prev => RPS_ORDER[(RPS_ORDER.indexOf(prev) + 1) % RPS_ORDER.length])
      if (topPulseRef.current) {
        gsap.fromTo(topPulseRef.current,
          { scaleX: 1.15, scaleY: 0.85, rotate: -6 },
          { scaleX: 1, scaleY: 1, rotate: 0, duration: 0.18, ease: 'back.out(2)', force3D: true, overwrite: 'auto', transformOrigin: '50% 60%' })
      }
      if (bottomPulseRef.current) {
        gsap.fromTo(bottomPulseRef.current,
          { scaleX: 1.15, scaleY: 0.85, rotate: 6 },
          { scaleX: 1, scaleY: 1, rotate: 0, duration: 0.18, ease: 'back.out(2)', force3D: true, overwrite: 'auto', transformOrigin: '50% 40%' })
      }
    }, 250)

    const cd = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(cd)
          clearInterval(cycle)
          // lock in random choices
          const a = pickRandom(RPS_ORDER)
          const b = pickRandom(RPS_ORDER)
          setTopChoice(a)
          setBottomChoice(b)
          setDisplayTop(a)
          setDisplayBottom(b)
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => {
      clearInterval(cycle)
      clearInterval(cd)
    }
  }, [phase, rpsRunId])

  const startSpin = useCallback((): void => {
    // Spin the wheel and guarantee the arrow aligns to a color segment center.
    if (!wheelContainerRef.current) return
    setIsSpinning(true)

    const wheel = wheelContainerRef.current
    gsap.set(wheel, { willChange: 'transform', force3D: true, transformOrigin: '50% 50%' })

  // Randomly choose which color to land on, then compute the exact angle.
  const COLORS: Question['color'][] = ['red', 'yellow', 'green', 'blue']
  const chosenColor = pickRandom(COLORS)

    // Segment centers relative to arrow at 0° (top)
    const segmentCenter: Record<Question['color'], number> = {
      red: 0,
      yellow: 90,
      green: 180,
      blue: 270,
    }

    const getNorm = (v: number): number => ((v % 360) + 360) % 360
    const currentRotation = (gsap.getProperty(wheel, 'rotation') as number) || 0
    const currentNorm = getNorm(currentRotation)

  // Arrow is on the RIGHT side now (90° clockwise from top)
  // Let arrowAngle = 90°. We want the angle under the arrow (pointerAngle)
  // to equal the segment center for the chosen color.
  // pointerAngle = (360 - rotation) - arrowAngle
  // => rotation % 360 should equal 360 - (targetAngle + arrowAngle)
  const arrowAngle = 90
    const targetAngle = segmentCenter[chosenColor]
  const desiredMod = getNorm(360 - (targetAngle + arrowAngle))
    const deltaMod = getNorm(desiredMod - currentNorm)

    const minSpins = 8
    const maxSpins = 12
    const spins = minSpins + Math.random() * (maxSpins - minSpins)
    const finalRotation = currentRotation + 360 * spins + deltaMod

    spinTl.current?.kill()

    spinTl.current = gsap.to(wheel, {
      rotation: finalRotation,
      duration: 6.0,
      ease: 'power4.out',
      overwrite: 'auto',
      onComplete: () => {
        setIsSpinning(false)

        // Read actual final rotation and derive the segment under the RIGHT-side arrow.
        const readRotation = (gsap.getProperty(wheel, 'rotation') as number) || 0
        const norm = getNorm(readRotation)
        const normalizedAngleTop = getNorm(360 - norm) // 0 -> top, 90 -> right, etc.
        const pointerAngle = getNorm(normalizedAngleTop - arrowAngle)

        // Compute nearest segment center (multiples of 90deg) under the arrow
        const segIndex = Math.round(pointerAngle / 90) % 4 // 0..3
        const segCenterAngle = (segIndex * 90) % 360

        // Snap to exact center if off by > 0.5deg to guarantee visual alignment
        const desiredModNow = getNorm(360 - (segCenterAngle + arrowAngle))
        const correctionDelta = getNorm(desiredModNow - norm)
        const needsSnap = Math.min(correctionDelta, 360 - correctionDelta) > 0.5

        const finalize = () => {
          const colorFromIndex: Question['color'][] = ['red', 'yellow', 'green', 'blue']
          const landedColor = colorFromIndex[segIndex]
          const pool = byColor[landedColor]
          const question = pickRandom(pool)
          setActiveQuestion(question)
          setSecondsLeft(90)
          setTimeout(() => setPhase('answering'), 100)
        }

        if (needsSnap) {
          gsap.to(wheel, {
            rotation: readRotation + correctionDelta,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => { finalize(); gsap.set(wheel, { clearProps: 'will-change' }) },
          })
        } else {
          finalize()
          gsap.set(wheel, { clearProps: 'will-change' })
        }
        // Silly arrow wiggle and confetti burst
        if (arrowRef.current) {
          const arrow = arrowRef.current
          gsap.fromTo(arrow, { rotate: -8, y: -2 }, { rotate: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
          // confetti originating from arrow tip
          const container = arrow.parentElement as HTMLElement | null
          if (container) {
            const bounds = container.getBoundingClientRect()
            const localX = bounds.width / 2
            const localY = 0
            const colors = ['#ea4335', '#34a853', '#fbbc05', '#4285f4', '#ff6b6b', '#4ecdc4']
            Array.from({ length: 18 }).forEach(() => {
              const el = document.createElement('div')
              el.style.position = 'absolute'
              el.style.left = `${localX}px`
              el.style.top = `${localY}px`
              el.style.width = '6px'
              el.style.height = '6px'
              el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
              el.style.background = colors[Math.floor(Math.random() * colors.length)]
              el.style.pointerEvents = 'none'
              el.style.willChange = 'transform, opacity'
              container.appendChild(el)
              const angle = (Math.random() * Math.PI) + Math.PI / 2 // spray downwards
              const dist = 60 + Math.random() * 100
              const duration = 0.6 + Math.random() * 0.6
              gsap.fromTo(el, { scale: 0 }, {
                x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 1,
                rotation: Math.random() * 360, opacity: 0, duration, ease: 'power2.out', onComplete: () => el.remove()
              })
            })
          }
        }
      },
    })
  }, [byColor])

  useGSAP(() => {
    // Scope-only setup for smoother transforms
    if (topPulseRef.current) gsap.set(topPulseRef.current, { willChange: 'transform' })
    if (bottomPulseRef.current) gsap.set(bottomPulseRef.current, { willChange: 'transform' })
    if (rpsCountdownRef.current) {
      gsap.fromTo(rpsCountdownRef.current, { scale: 0.8, rotate: -8, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.8)' })
    }
    if (answeringModalRef.current) {
      gsap.fromTo(answeringModalRef.current, { y: 24, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' })
    }
    if (rpsModalRef.current) {
      gsap.fromTo(rpsModalRef.current, { y: 24, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' })
    }
    if (introModalRef.current) {
      gsap.fromTo(introModalRef.current, { y: 28, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' })
    }
    if (rpsOverlayRef.current) {
      gsap.fromTo(rpsOverlayRef.current, { y: 18, scale: 0.98, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' })
    }

    // Silly idle bob for hands
    if (topPulseRef.current) {
      gsap.to(topPulseRef.current, { y: -3, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }
    if (bottomPulseRef.current) {
      gsap.to(bottomPulseRef.current, { y: 3, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }

    // Background blobs / sparkles
    if (bgLayerRef.current) {
      const layer = bgLayerRef.current
      layer.innerHTML = ''
      const blobColors = ['#e8f0fe', '#e6f4ea', '#fef7e0', '#fde7e7']
      const blobs: HTMLDivElement[] = []
      for (let i = 0; i < 4; i += 1) {
        const blob = document.createElement('div')
        blob.style.position = 'absolute'
        blob.style.width = `${140 + Math.random() * 140}px`
        blob.style.height = blob.style.width
        blob.style.left = `${Math.random() * 80 + 5}%`
        blob.style.top = `${Math.random() * 80 + 5}%`
        blob.style.borderRadius = '50%'
        blob.style.filter = 'blur(30px)'
        blob.style.opacity = '0.6'
        blob.style.background = blobColors[i % blobColors.length]
        layer.appendChild(blob)
        blobs.push(blob)
        gsap.to(blob, {
          x: () => (Math.random() * 60 - 30),
          y: () => (Math.random() * 60 - 30),
          scale: () => (0.9 + Math.random() * 0.3),
          duration: 6 + Math.random() * 4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
      }
      // sparkles
      for (let i = 0; i < 18; i += 1) {
        const s = document.createElement('div')
        s.style.position = 'absolute'
        s.style.width = '6px'
        s.style.height = '6px'
        s.style.left = `${Math.random() * 100}%`
        s.style.top = `${Math.random() * 100}%`
        s.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%'
        s.style.background = ['#1a73e8', '#34a853', '#fbbc05', '#ea4335'][Math.floor(Math.random() * 4)]
        s.style.opacity = '0.5'
        layer.appendChild(s)
        gsap.fromTo(s, { scale: 0, y: -4 }, {
          scale: 1,
          y: 4,
          duration: 1.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 1.5,
        })
      }
    }
  }, { scope: rootRef })

  useEffect(() => {
    if (phase !== 'rps') return
    if (!topChoice || !bottomChoice) return
    const outcome = decideRps(topChoice, bottomChoice)
    setRpsResult(outcome)
    // announce winner via dialog
    if (outcome === 'top') setRpsWinMessage('Player One wins!')
    if (outcome === 'bottom') setRpsWinMessage('Player Two wins!')
    if (outcome === 'tie') setRpsWinMessage('Tie!')
    // small burst on winner side
    const burst = (container: Element | null) => {
      if (!container) return
      const dots = Array.from({ length: 15 }).map(() => {
        const el = document.createElement('div')
        el.style.position = 'absolute'
        el.style.width = '8px'
        el.style.height = '8px'
        el.style.borderRadius = '9999px'
        const colors = ['#ea4335', '#34a853', '#fbbc05', '#1a73e8', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24']
        el.style.background = colors[Math.floor(Math.random() * colors.length)]
        el.style.left = '50%'
        el.style.top = '50%'
        el.style.pointerEvents = 'none'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        container.appendChild(el)
        const angle = Math.random() * Math.PI * 2
        const dist = 30 + Math.random() * 60
        gsap.set(el, { scale: 0 })
        gsap.to(el, { 
          x: Math.cos(angle) * dist, 
          y: Math.sin(angle) * dist, 
          opacity: 0, 
          scale: 1,
          duration: 0.8, 
          ease: 'power2.out',
          onComplete: () => el.remove() 
        })
        return el
      })
      return dots
    }

    if (outcome === 'top') burst(document.querySelector('#top-panel'))
    if (outcome === 'bottom') burst(document.querySelector('#bottom-panel'))

    if (outcome === 'tie') {
      // Keep dialog open; user will choose to play again. Do not auto-reset.
    } else {
      // For wins, keep dialog open and wait for user to press Spin in the dialog
      // No auto-transition or auto-spin here.
    }
  }, [topChoice, bottomChoice, phase, startSpin])

  const endRound = (): void => {
    if (phase !== 'answering') return
    setPhase('intro')
    setTopChoice(null)
    setBottomChoice(null)
    setRpsResult(null)
    setActiveQuestion(null)
    setSecondsLeft(90)
  }

  const getEmoji = (choice: RpsChoice): string => (choice === 'rock' ? '✊🏽' : choice === 'paper' ? '✋🏽' : '✌🏽')

  const EmojiHand = ({ choice, facing, refCb }: { choice: RpsChoice, facing: 'up' | 'down', refCb?: (el: HTMLSpanElement | null) => void }) => (
    <div 
      className="text-7xl sm:text-8xl select-none filter drop-shadow-lg" 
      aria-label={choice} 
      style={{ 
        transform: facing === 'down' ? 'rotate(180deg)' : undefined,
        textShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}
    >
      <span ref={refCb} className="inline-block will-change-transform">{getEmoji(choice)}</span>
    </div>
  )

  return (
    <div ref={rootRef} className="mx-auto max-w-md sm:max-w-lg md:max-w-xl relative h-dvh">
      <div ref={bgLayerRef} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" />
      {/* Top Player Panel */}
      <section id="top-panel" className="relative flex flex-col items-center justify-center gap-4 p-5 h-1/3 bg-gradient-to-b from-blue-50/30 to-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-blue-100">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse"></div>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Player One</h2>
          </div>
        </div>
        <div className="transform hover:scale-105 transition-transform duration-300 drop-shadow-lg">
          <EmojiHand choice={displayTop} facing="down" refCb={el => (topPulseRef.current = el)} />
        </div>
      </section>

      {/* Center Game Area */}
      <section className="relative flex flex-col items-center justify-center gap-5 h-1/3 bg-gradient-to-br from-blue-50 via-white to-green-50 border-y-2 border-blue-200">
        {/* Wheel */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex-shrink-0">
          {/* Outer wrapper handles hover scale only */}
          <div className="w-full h-full transform hover:scale-105 transition-transform duration-300">
            {/* Inner element rotates via GSAP and hosts the SVG */}
            <div ref={wheelContainerRef} className="w-full h-full rounded-full shadow-2xl border-4 border-white overflow-hidden bg-white">
              {/* Custom GSAP wheel will be rendered here */}
            </div>
          </div>
          {/* Arrow moved to TOP side */}
            <div ref={arrowRef} className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent shadow-lg" style={{ borderTopColor: '#1a73e8' }}  />
            </div>
        </div>
        {/* Spin phase does not render a button here; spin is initiated from the dialog */}
      </section>

      {/* Bottom Player Panel */}
      <section id="bottom-panel" className="relative flex flex-col items-center justify-center gap-4 p-5 h-1/3 bg-gradient-to-t from-green-50/30 to-white/50 backdrop-blur-sm">
        <div className="transform hover:scale-105 transition-transform duration-300 drop-shadow-lg">
          <EmojiHand choice={displayBottom} facing="up" refCb={el => (bottomPulseRef.current = el)} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-green-100">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 animate-pulse"></div>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">Player Two</h2>
          </div>
        </div>
      </section>

      {/* Modal for Question/Answering */}
      {phase === 'answering' && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div ref={answeringModalRef} className="bg-white rounded-3xl shadow-2xl p-7 w-[92vw] max-w-md text-center border border-gray-100">
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Answer Time</div>
            <div className="mb-3">
              <span
                className={`inline-block text-xs font-bold px-2 py-1 rounded-full ${
                  rpsResult === 'top'
                    ? 'bg-blue-100 text-blue-700'
                    : rpsResult === 'bottom'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {rpsResult === 'top' ? 'Player One' : rpsResult === 'bottom' ? 'Player Two' : 'Player'}
              </span>
            </div>
            <div
              className="text-3xl font-extrabold mb-4"
              style={{ color: activeQuestion ? COLOR_TO_HEX[activeQuestion.color] : '#202124' }}
            >
              {secondsLeft}s
            </div>
            <div className="text-center px-4 py-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 shadow-sm mb-4">
              <div
                className="text-sm uppercase tracking-wide mb-1 font-bold"
                style={{ color: activeQuestion ? COLOR_TO_HEX[activeQuestion.color] : '#5f6368' }}
              >
                {activeQuestion?.color} Question
              </div>
              <p className="text-base font-medium leading-relaxed text-gray-800">{activeQuestion?.text}</p>
            </div>
            {secondsLeft <= 0 && (
              <button
                className="px-6 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transform hover:scale-105 transition-all duration-200"
                onClick={endRound}
              >
                Next Round
              </button>
            )}
          </div>
        </div>
      )}

      {/* Intro Modal */}
      {phase === 'intro' && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div ref={introModalRef} className="bg-white rounded-3xl shadow-2xl p-7 w-[92vw] max-w-md text-center border border-gray-100">
            <div className="text-3xl font-extrabold mb-2">Find a Partner!</div>
            <p className="text-base text-gray-600 mb-5">Get ready for Rock • Paper • Scissors, then spin for a colorful question!</p>
            <div className="flex justify-center">
              <button
                className="px-6 py-3 rounded-2xl text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 shadow-md transform hover:scale-105 transition-all duration-200"
                onClick={() => {
                  setRpsWinMessage(null)
                  setTopChoice(null)
                  setBottomChoice(null)
                  setRpsResult(null)
                  setCountdown(5)
                  setPhase('rps')
                  setRpsRunId(id => id + 1)
                }}
              >
                Bato Bato Pick!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RPS Countdown Overlay */}
      {phase === 'rps' && !rpsWinMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-40">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Rectangle behind */}
            <div className="w-48 h-32 sm:w-56 sm:h-36 bg-gray-200/70 rounded-2xl shadow-lg" />
          </div>
          <div ref={rpsOverlayRef} className="text-center relative">
            {/* Rectangle in front */}
            <div className="w-48 h-32 sm:w-56 sm:h-36 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-0">
              <div
                ref={rpsCountdownRef}
                className="text-6xl sm:text-7xl font-black tracking-wide"
                style={{ color: countdown === 0 ? '#1a73e8' : '#202124' }}
              >
                {countdown === 0 ? 'Shoot!' : countdown}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for RPS Result */}
      {rpsWinMessage && phase === 'rps' && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div ref={rpsModalRef} className="bg-white rounded-3xl shadow-2xl p-7 w-[90vw] max-w-md text-center border border-gray-100">
            <div className="text-3xl mb-3">
              {rpsResult === 'top' && '🎉'}
              {rpsResult === 'bottom' && '🎉'}
              {rpsResult === 'tie' && '🤝'}
            </div>
            <div className="text-2xl font-extrabold mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{rpsWinMessage}</div>
            {/* Show player hands */}
            <div className="mb-2 text-lg flex items-center justify-center gap-2 font-mono">
              <span>Player 1&nbsp;-&nbsp;
                {topChoice === 'rock' && '🪨'}
                {topChoice === 'paper' && '📄'}
                {topChoice === 'scissors' && '✂️'}
              </span>
              <span className="text-gray-400">|</span>
              <span>
                {bottomChoice === 'rock' && '🪨'}
                {bottomChoice === 'paper' && '📄'}
                {bottomChoice === 'scissors' && '✂️'}
                &nbsp;-&nbsp;Player 2
              </span>
            </div>
            <p className="text-base mb-4 text-gray-600">
              {rpsResult === 'tie' ? 'Let\'s try that again!' : 'Ready to spin the wheel? 🎯'}
            </p>
            {rpsResult === 'tie' && (
              <div className="flex gap-3 justify-center">
                <button
                  className="px-6 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transform hover:scale-105 transition-all duration-200"
                  onClick={() => {
                    // Clear dialog and restart RPS cycle cleanly
                    setRpsWinMessage(null)
                    setTopChoice(null)
                    setBottomChoice(null)
                    setRpsResult(null)
                    setPhase('rps')
                    setRpsRunId(id => id + 1)
                  }}
                >
                  Play Again
                </button>
              </div>
            )}
            {rpsResult !== 'tie' && (
              <div className="flex gap-3 justify-center">
                <button
                  className="px-6 py-3 rounded-2xl text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    setRpsWinMessage(null)
                    setPhase('spin')
                    // start spin on user action
                    requestAnimationFrame(() => startSpin())
                  }}
                  disabled={isSpinning}
                >
                  {isSpinning ? 'Spinning…' : 'Spin the Wheel'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


