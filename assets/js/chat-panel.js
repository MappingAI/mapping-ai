/* "Ask the map" chat panel — vanilla JS, mounted into map.html when ?chat=1.
 *
 * v1 (this file): UI scaffold + STUBBED SSE response so the panel can be reviewed
 * before the real /chat Lambda exists. The stub lives entirely client-side and
 * does not call any backend.
 *
 * In U9 the stub will be replaced with a real fetch+ReadableStream SSE consumer
 * targeting the chat Function URL. The render functions, directive dispatcher,
 * snapshot/reset wiring, and mutual-exclusion logic stay.
 */

;(function () {
  'use strict'

  // Feature flag: only mount the panel UI behind ?chat=1 or chat-beta=on.
  // window.MapControl is always available (set by map.html); chat-panel.js
  // is the gated piece.
  const chatEnabled =
    new URLSearchParams(window.location.search).get('chat') === '1' || localStorage.getItem('chat-beta') === 'on'
  if (!chatEnabled) return

  // ─────────────────────────────────────────────────────────────────────────
  // Mount + DOM construction
  // ─────────────────────────────────────────────────────────────────────────

  function mountChatPanel() {
    if (document.getElementById('chat-panel')) return // already mounted

    const triggerHtml = `
      <button id="chat-btn" aria-label="Ask the map">
        <span class="chat-btn-icon" aria-hidden="true">◐</span>
        <span>Ask the map</span>
      </button>
    `

    const panelHtml = `
      <aside id="chat-panel" role="dialog" aria-label="Chat with the map" aria-modal="false">
        <header id="chat-header">
          <span class="chat-title">Ask the map</span>
          <span class="chat-budget" id="chat-budget" title="Daily query budget">30 / 30 today</span>
          <button class="chat-action" id="chat-reset" title="Restore the map to how it was when you opened the chat">Reset map</button>
          <button class="chat-action" id="chat-close" aria-label="Close chat">✕</button>
        </header>
        <div id="chat-transcript" aria-live="polite" aria-atomic="false"></div>
        <footer id="chat-composer">
          <div id="chat-starter" class="chat-starter">
            <p class="chat-greeting">I can find people, orgs, and resources, compare beliefs, and drive the map for you.</p>
            <div class="chat-chips" role="group" aria-label="Example queries">
              <button type="button" class="chat-chip" data-query="Critics of OpenAI">Critics of OpenAI</button>
              <button type="button" class="chat-chip" data-query="Funders of AI safety">Funders of AI safety</button>
              <button type="button" class="chat-chip" data-query="People at frontier labs AND government">People at frontier labs AND gov</button>
              <button type="button" class="chat-chip" data-query="Tell me about Anthropic">Tell me about Anthropic</button>
            </div>
          </div>
          <form id="chat-form" autocomplete="off">
            <textarea id="chat-input" rows="2" maxlength="2000" placeholder="Ask anything about the map…"></textarea>
            <button type="submit" id="chat-send" aria-label="Send">↑</button>
          </form>
        </footer>
      </aside>
    `

    const wrap = document.createElement('div')
    wrap.innerHTML = triggerHtml + panelHtml
    document.body.appendChild(wrap)

    wireChatPanel()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wiring: open/close, starter chips, composer, mutual exclusion
  // ─────────────────────────────────────────────────────────────────────────

  let openingSnapshot = null
  let mapControlUnsubscribe = null
  let appliedChip = null
  let appliedChipTimer = null

  function wireChatPanel() {
    const btn = document.getElementById('chat-btn')
    const panel = document.getElementById('chat-panel')
    const closeBtn = document.getElementById('chat-close')
    const resetBtn = document.getElementById('chat-reset')
    const form = document.getElementById('chat-form')
    const input = document.getElementById('chat-input')
    const starter = document.getElementById('chat-starter')
    const contribPanel = document.getElementById('contribute-panel')
    const contribBtn = document.getElementById('contribute-btn')

    btn.addEventListener('click', openPanel)
    closeBtn.addEventListener('click', closePanel)
    resetBtn.addEventListener('click', () => {
      if (openingSnapshot && window.MapControl) window.MapControl.restoreSnapshot(openingSnapshot)
      hideAppliedChip()
    })

    document.querySelectorAll('.chat-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query || chip.textContent.trim()
        input.value = q
        input.focus()
      })
    })

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const message = input.value.trim()
      if (!message) return
      starter.classList.add('hidden')
      sendMessage(message)
      input.value = ''
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        form.requestSubmit()
      }
    })

    // ESC closes the panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel()
    })

    // Mutual exclusion with contribute panel
    if (contribBtn) {
      contribBtn.addEventListener('click', () => {
        if (panel.classList.contains('open')) closePanel({ silent: true })
      })
    }

    function openPanel() {
      // Close contribute if open
      if (contribPanel && contribPanel.classList.contains('open')) {
        contribPanel.classList.remove('open')
        if (contribBtn) contribBtn.classList.remove('hidden')
        const mapContainer = document.querySelector('.map-container')
        if (mapContainer) mapContainer.classList.remove('shifted')
      }
      panel.classList.add('open')
      btn.classList.add('hidden')
      // Capture state for Reset Map
      if (window.MapControl) {
        openingSnapshot = window.MapControl.snapshot()
        // Subscribe to user interactions to dismiss "Applied by assistant" chip
        if (mapControlUnsubscribe) mapControlUnsubscribe()
        mapControlUnsubscribe = window.MapControl.onUserInteraction(hideAppliedChip)
      }
      input.focus()
    }

    function closePanel({ silent } = {}) {
      panel.classList.remove('open')
      btn.classList.remove('hidden')
      if (mapControlUnsubscribe) {
        mapControlUnsubscribe()
        mapControlUnsubscribe = null
      }
      hideAppliedChip()
      if (!silent && openingSnapshot && window.MapControl) {
        // Optional: restore on close. Keeping current behavior to NOT auto-restore;
        // user explicitly invokes Reset Map. This avoids surprising state changes.
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transcript rendering
  // ─────────────────────────────────────────────────────────────────────────

  function renderUserMessage(text) {
    const transcript = document.getElementById('chat-transcript')
    const msg = document.createElement('div')
    msg.className = 'chat-msg chat-msg-user'
    msg.textContent = text
    transcript.appendChild(msg)
    scrollToBottom()
    return msg
  }

  function startAssistantMessage() {
    const transcript = document.getElementById('chat-transcript')
    const msg = document.createElement('div')
    msg.className = 'chat-msg chat-msg-assistant'
    const textEl = document.createElement('div')
    textEl.className = 'chat-msg-text'
    msg.appendChild(textEl)
    transcript.appendChild(msg)
    scrollToBottom()
    return { msg, textEl }
  }

  function appendDelta(textEl, delta) {
    textEl.textContent += delta
    scrollToBottom()
  }

  function renderToolCall(name, summary) {
    const transcript = document.getElementById('chat-transcript')
    const bubble = document.createElement('div')
    bubble.className = 'chat-tool-bubble thinking'
    bubble.dataset.toolName = name
    bubble.textContent = summary
    transcript.appendChild(bubble)
    scrollToBottom()
    return bubble
  }

  function settleToolCall(bubble) {
    bubble.classList.remove('thinking')
  }

  function renderFootnotes(msgEl, footnotes) {
    if (!footnotes || footnotes.length === 0) return
    const sources = document.createElement('details')
    sources.className = 'chat-sources'
    const summary = document.createElement('summary')
    summary.textContent = `Sources (${footnotes.length})`
    sources.appendChild(summary)
    const list = document.createElement('ol')
    footnotes.forEach((fn) => {
      const li = document.createElement('li')
      const entity = document.createElement('span')
      entity.className = 'chat-source-entity'
      entity.textContent = fn.entity_name || `Entity ${fn.entity_id}`
      const snippet = document.createElement('span')
      snippet.className = 'chat-source-snippet'
      snippet.textContent = fn.chunk_text || ''
      li.appendChild(entity)
      li.appendChild(snippet)
      list.appendChild(li)
    })
    sources.appendChild(list)
    msgEl.appendChild(sources)
    scrollToBottom()
  }

  function renderError(message, retryable, onRetry) {
    const transcript = document.getElementById('chat-transcript')
    const err = document.createElement('div')
    err.className = 'chat-error'
    err.textContent = message
    if (retryable && typeof onRetry === 'function') {
      const retry = document.createElement('button')
      retry.className = 'chat-retry'
      retry.textContent = 'Retry'
      retry.addEventListener('click', () => {
        err.remove()
        onRetry()
      })
      err.appendChild(retry)
    }
    transcript.appendChild(err)
    scrollToBottom()
  }

  function scrollToBottom() {
    const transcript = document.getElementById('chat-transcript')
    transcript.scrollTop = transcript.scrollHeight
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Directive dispatcher → window.MapControl.*
  // ─────────────────────────────────────────────────────────────────────────

  function applyDirective(name, args) {
    if (!window.MapControl) return false
    try {
      switch (name) {
        case 'highlight_on_map':
          window.MapControl.highlight(args.entity_ids || [])
          return true
        case 'clear_highlight':
          window.MapControl.clearHighlight()
          return true
        case 'zoom_to':
          window.MapControl.zoomTo(args.entity_id)
          return true
        case 'set_view':
          window.MapControl.setViewMode(args.mode, args.sub_view)
          return true
        case 'set_plot_axes':
          window.MapControl.setAxes(args.x, args.y)
          return true
        case 'set_filters':
          window.MapControl.setFilterState(args)
          return true
        case 'open_detail':
          window.MapControl.openDetail(args.entity_id)
          return true
        default:
          console.warn('chat-panel: unknown directive', name)
          return false
      }
    } catch (e) {
      console.error('chat-panel: directive failed', name, args, e)
      return false
    }
  }

  function showAppliedChip() {
    if (appliedChipTimer) clearTimeout(appliedChipTimer)
    if (!appliedChip) {
      appliedChip = document.createElement('div')
      appliedChip.className = 'chat-applied-chip'
      appliedChip.textContent = 'Applied by assistant'
      document.body.appendChild(appliedChip)
    }
    requestAnimationFrame(() => appliedChip.classList.add('visible'))
  }

  function hideAppliedChip() {
    if (!appliedChip) return
    appliedChip.classList.remove('visible')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stubbed SSE: simulate the chat Lambda response shape
  //
  // This is the v1 placeholder. In U9 the body of sendMessage() is replaced
  // with a real fetch+ReadableStream SSE consumer targeting the chat Function
  // URL. The render + directive dispatch code above is unchanged in U9.
  // ─────────────────────────────────────────────────────────────────────────

  let inFlight = false
  let stubBudget = 30

  function sendMessage(message) {
    if (inFlight) return
    inFlight = true
    document.getElementById('chat-send').disabled = true
    renderUserMessage(message)
    runStubResponse(message)
      .catch((e) => renderError('Stub error: ' + e.message, true, () => sendMessage(message)))
      .finally(() => {
        inFlight = false
        document.getElementById('chat-send').disabled = false
      })
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }

  // Fixture data — what each starter chip produces. Matches PR #23 / plan tool shape.
  function buildStubScript(message) {
    const m = message.toLowerCase()
    const allEntities = collectAllEntities()

    if (m.includes('critic') && m.includes('openai')) {
      return {
        intro: 'Three of the most visible critics of OpenAI in this map are ',
        outro:
          ', who have all published positions arguing for stronger oversight, slower deployment, or restructured governance of frontier labs.',
        toolCall: { name: 'search_entities', summary: 'searched 1,425 entities for "critic of OpenAI"' },
        targets: ['Center on Long-Term Risk', 'Redwood Research', 'Brookings Institution'],
        footnoteSnippets: [
          'has called OpenAI’s safety team turnover “a structural failure of voluntary self-governance.”',
          'argues for hard compute caps and pre-deployment evals on frontier-class models.',
          'published a 2025 brief recommending statutory liability for AGI-class deployments.',
        ],
      }
    }
    if (m.includes('funder') && m.includes('safety')) {
      return {
        intro: 'The largest known funders of AI safety work in this map include ',
        outro:
          '. Their grants total roughly nine figures across the last five years, concentrated on alignment research, evals, and governance.',
        toolCall: { name: 'filter_by_category', summary: 'filtered to "VC / Funder" + known safety grantmakers' },
        targets: ['Coefficient Giving (formerly Open Philanthropy)', 'Survival and Flourishing Fund'],
        footnoteSnippets: [
          'historical grantmaking concentrated on alignment research at MIRI, Redwood, and ARC.',
          'speculation grants to early-career safety researchers; primary funder of multiple new orgs.',
        ],
      }
    }
    if (m.includes('frontier') && m.includes('government')) {
      return {
        intro: 'I found a small intersection of people who have worked at frontier labs AND in government: ',
        outro: '. The intersection is rare; most policymakers come from think tanks or academia rather than industry.',
        toolCall: { name: 'search_entities', summary: 'cross-referenced affiliations across sectors' },
        targets: ['Heidy Khlaaf'],
        footnoteSnippets: [
          'affiliated with Trail of Bits, NIST [Government], and prior work at Google [Frontier Lab].',
        ],
      }
    }
    if (m.includes('anthropic')) {
      return {
        intro:
          'Anthropic is a frontier AI lab founded in 2021 by former OpenAI researchers, focused on safety research. ',
        outro:
          ' Their public stance favors evals, RSPs, and constitutional AI as governance mechanisms. I’ve opened the detail panel.',
        toolCall: { name: 'get_entity_details', summary: 'pulled Anthropic + key affiliations' },
        targets: ['Anthropic'],
        directives: (ids) => [
          { name: 'open_detail', args: { entity_id: ids[0] } },
          { name: 'highlight_on_map', args: { entity_ids: ids } },
        ],
        footnoteSnippets: ['founded 2021; major safety-focused frontier lab; publishes Responsible Scaling Policy.'],
      }
    }

    // Fallback: generic search demo
    const sample = allEntities.slice(0, 3)
    return {
      intro: 'Here are a few entities related to your query: ',
      outro:
        '. (Heads up: this is the v1 stub — the real assistant will use Claude Haiku 4.5 with tool use against the live database.)',
      toolCall: { name: 'search_entities', summary: 'sampled the corpus' },
      targets: sample.map((e) => e.name),
      footnoteSnippets: sample.map(() => 'sample fixture text — actual notes appear here in v1 of the real backend.'),
    }
  }

  function collectAllEntities() {
    if (typeof allData !== 'object' || !allData) return []
    return [...(allData.people || []), ...(allData.organizations || []), ...(allData.resources || [])]
  }

  function findEntityByName(name) {
    return collectAllEntities().find((e) => e.name === name) || null
  }

  async function runStubResponse(message) {
    await delay(200) // simulated round-trip

    // If the user is in plot view (SVG), the highlight directive can't paint
    // because _canvasNodes is empty. The real backend will see this via
    // map_state and emit set_view('all') first. Stub mirrors that behavior.
    if (typeof viewMode !== 'undefined' && viewMode !== 'network') {
      applyDirective('set_view', { mode: 'all' })
      await delay(400) // let the render settle so _canvasNodes populates
    }

    const { msg, textEl } = startAssistantMessage()
    const script = buildStubScript(message)

    // Stream the intro
    await streamText(textEl, script.intro, 18)

    // Tool call
    const bubble = renderToolCall(script.toolCall.name, '🔍 ' + script.toolCall.summary)
    await delay(900)
    settleToolCall(bubble)

    // Resolve targets to live entity ids; drop any not found
    const found = script.targets.map((n) => findEntityByName(n)).filter((e) => e)
    const ids = found.map((e) => e.id)

    // Stream the entity-named portion with footnote refs
    if (found.length > 0) {
      const items = found.map((e, i) => `${e.name}<sup class="chat-footnote-ref">[${i + 1}]</sup>`)
      let namedList
      if (items.length === 1) namedList = items[0]
      else if (items.length === 2) namedList = `${items[0]} and ${items[1]}`
      else namedList = items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
      await streamHtml(textEl, namedList, 14)
    }

    // Stream the outro
    await streamText(textEl, script.outro, 16)

    // Apply directives
    let appliedAny = false
    if (script.directives) {
      script.directives(ids).forEach((d) => {
        if (applyDirective(d.name, d.args)) appliedAny = true
      })
    } else if (ids.length > 0) {
      if (applyDirective('highlight_on_map', { entity_ids: ids })) appliedAny = true
    }
    if (appliedAny) showAppliedChip()

    // Footnotes
    const footnotes = found.map((e, i) => ({
      entity_id: e.id,
      entity_name: e.name,
      chunk_text: script.footnoteSnippets[i] || '',
    }))
    renderFootnotes(msg, footnotes)

    // Update budget pill
    stubBudget = Math.max(0, stubBudget - 1)
    const pill = document.getElementById('chat-budget')
    if (pill) {
      pill.textContent = `${stubBudget} / 30 today`
      pill.classList.toggle('cap-near', stubBudget <= 5)
    }
  }

  function streamText(el, text, charsPerTick) {
    return new Promise((resolve) => {
      let i = 0
      function tick() {
        if (i >= text.length) return resolve()
        const next = Math.min(i + charsPerTick, text.length)
        el.appendChild(document.createTextNode(text.slice(i, next)))
        i = next
        scrollToBottom()
        setTimeout(tick, 40)
      }
      tick()
    })
  }

  function streamHtml(el, html, charsPerTick) {
    // For simplicity in the stub: chunk by characters but parse the final result.
    // In v1 backend, deltas will be plain text and footnote refs come as separate events.
    const tmp = document.createElement('span')
    return new Promise((resolve) => {
      let i = 0
      function tick() {
        if (i >= html.length) {
          // Replace tmp with parsed HTML at the end (avoids tag-split flicker)
          tmp.innerHTML = html
          resolve()
          return
        }
        const next = Math.min(i + charsPerTick, html.length)
        tmp.textContent = html.slice(0, next).replace(/<[^>]*>/g, '') // strip partial tags during stream
        if (!tmp.parentNode) el.appendChild(tmp)
        i = next
        scrollToBottom()
        setTimeout(tick, 40)
      }
      tick()
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChatPanel)
  } else {
    mountChatPanel()
  }
})()
