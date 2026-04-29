/* eslint-disable no-undef, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
//
// Password gate — extracted from inline <script> in map.html.
// Wrapped in initPasswordGate() so React can call it after mounting the DOM.
//
// DO NOT refactor the internals. This is a direct lift of the inline code.

export function initPasswordGate() {
  ;(function () {
    var SITE_HASH = '__SITE_PASSWORD_HASH__'
    var isDevMode = SITE_HASH === '__SITE_' + 'PASSWORD_HASH__'
    var isUnlocked = isDevMode || localStorage.getItem('siteUnlocked') === '1'

    // Always show disclaimer
    var disclaimerOv = document.getElementById('disclaimer-overlay')
    var lockOv = document.getElementById('lock-overlay')
    var passwordOv = document.getElementById('password-overlay')

    document.getElementById('disclaimer-dismiss').addEventListener('click', function () {
      disclaimerOv.style.display = 'none'
      if (!isUnlocked) {
        lockOv.style.display = 'block'
      }
    })
    disclaimerOv.addEventListener('click', function (e) {
      if (e.target === disclaimerOv) {
        disclaimerOv.style.display = 'none'
        if (!isUnlocked) {
          lockOv.style.display = 'block'
        }
      }
    })

    // Lock overlay click → show password prompt
    lockOv.addEventListener('click', function () {
      passwordOv.style.display = 'flex'
      document.getElementById('gate-password').focus()
    })

    // Brute-force protection: 5 attempts allowed, then 30s lockout
    var MAX_ATTEMPTS = 5
    var LOCKOUT_MS = 30000
    var attempts = parseInt(sessionStorage.getItem('gateAttempts') || '0', 10)
    var lockedUntil = parseInt(sessionStorage.getItem('gateLockUntil') || '0', 10)

    function isLockedOut() {
      return Date.now() < lockedUntil
    }

    function setLockoutMessage(remaining) {
      var errEl = document.getElementById('gate-error')
      errEl.textContent = 'Too many attempts. Try again in ' + remaining + 's.'
      errEl.style.display = 'block'
    }

    // Countdown ticker while locked out
    var lockoutTimer = null
    function startLockoutCountdown() {
      clearInterval(lockoutTimer)
      lockoutTimer = setInterval(function () {
        var remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
        if (remaining <= 0) {
          clearInterval(lockoutTimer)
          document.getElementById('gate-error').style.display = 'none'
          document.getElementById('gate-submit').disabled = false
          document.getElementById('gate-password').disabled = false
        } else {
          setLockoutMessage(remaining)
        }
      }, 500)
    }

    if (isLockedOut()) {
      document.getElementById('gate-submit').disabled = true
      document.getElementById('gate-password').disabled = true
      startLockoutCountdown()
    }

    // Password submission
    async function tryUnlock() {
      if (isLockedOut()) return
      var input = document.getElementById('gate-password').value
      if (!input) return
      var encoded = new TextEncoder().encode(input)
      var hashBuf = await crypto.subtle.digest('SHA-256', encoded)
      var hashHex = Array.from(new Uint8Array(hashBuf))
        .map(function (b) {
          return b.toString(16).padStart(2, '0')
        })
        .join('')
      if (hashHex === SITE_HASH) {
        sessionStorage.removeItem('gateAttempts')
        sessionStorage.removeItem('gateLockUntil')
        localStorage.setItem('siteUnlocked', '1')
        isUnlocked = true
        lockOv.style.display = 'none'
        passwordOv.style.display = 'none'
        document.body.classList.remove('locked')
        var savedMode = localStorage.getItem('mapMode') || 'plot'
        window.dispatchEvent(new CustomEvent('map:viewModeChange', { detail: { viewMode: savedMode } }))
      } else {
        attempts++
        sessionStorage.setItem('gateAttempts', attempts)
        if (attempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + LOCKOUT_MS
          sessionStorage.setItem('gateLockUntil', lockedUntil)
          document.getElementById('gate-submit').disabled = true
          document.getElementById('gate-password').disabled = true
          startLockoutCountdown()
        } else {
          var errEl = document.getElementById('gate-error')
          errEl.textContent =
            'Incorrect password (' +
            (MAX_ATTEMPTS - attempts) +
            ' attempt' +
            (MAX_ATTEMPTS - attempts === 1 ? '' : 's') +
            ' remaining)'
          errEl.style.display = 'block'
        }
        document.getElementById('gate-password').value = ''
        document.getElementById('gate-password').focus()
      }
    }
    document.getElementById('gate-submit').addEventListener('click', tryUnlock)
    document.getElementById('gate-password').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tryUnlock()
    })
    passwordOv.addEventListener('click', function (e) {
      if (e.target === passwordOv) {
        passwordOv.style.display = 'none'
      }
    })

    // Apply locked state
    if (!isUnlocked) {
      document.body.classList.add('locked')
    }
  })()
}
