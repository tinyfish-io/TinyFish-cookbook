'use client'

import confetti from 'canvas-confetti'

// Lego brand colors for confetti
const LEGO_COLORS = [
  '#FFED00', // Yellow
  '#E3000B', // Red
  '#006CB7', // Blue
  '#00852B', // Green
  '#FF6D00', // Orange
  '#FFFFFF' // White
]

/**
 * Trigger a Lego brick-themed confetti burst
 */
export function triggerLegoConfetti() {
  // Main burst from center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: LEGO_COLORS,
    shapes: ['square'], // Square shapes look like bricks
    scalar: 1.2,
    ticks: 200,
    gravity: 1.2,
    drift: 0
  })

  // Side bursts for extra effect
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: LEGO_COLORS,
      shapes: ['square'],
      scalar: 1
    })
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: LEGO_COLORS,
      shapes: ['square'],
      scalar: 1
    })
  }, 150)
}

/**
 * Trigger confetti at a specific element position
 */
export function triggerConfettiAtElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const x = (rect.left + rect.width / 2) / window.innerWidth
  const y = (rect.top + rect.height / 2) / window.innerHeight

  confetti({
    particleCount: 60,
    spread: 60,
    origin: { x, y },
    colors: LEGO_COLORS,
    shapes: ['square'],
    scalar: 1,
    ticks: 150
  })
}

/**
 * Trigger a victory confetti rain (for best deal found)
 */
export function triggerVictoryConfetti() {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: LEGO_COLORS,
      shapes: ['square']
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: LEGO_COLORS,
      shapes: ['square']
    })
  }, 250)
}
