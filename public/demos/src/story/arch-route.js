// "Our story so far": ARCH route for the page threadline.
// Uses the optional route hook in src/story/main.js (window.storyThreadRoute.route), which lets a
// page re-route thread segment 3 without touching the thread code. Segment 3 is kept exactly as the
// site draws it down to the Performance chapter; after that the thread runs down the margin to the
// timeline, bows out to the right in one smooth arch through the milestones, sweeps back, and ends
// on Pria's pointing fingertip in the finale. The milestone dots and text are then laid out along
// the arch, so the thread never crosses text. Every y along the route only increases, as the
// thread's scroll-drawing requires.
(() => {
  const r2 = n => Math.round(n * 100) / 100
  const FINGER = { x: .95, y: .43 } // Pria's pointing fingertip in pria-point.webp (398×788)
  let probe

  function sampleX(d) {
    // Fast path: sample from the path data (path-sample.js) instead of O(n²) getPointAtLength.
    const probeLen = window.storySamplePath?.(d, 1)?.length
    const fast = probeLen > 0 && (() => {
      const n = Math.max(40, Math.ceil(probeLen / 6)), s = window.storySamplePath(d, n), pts = []
      for (let i = 0; i <= n; i++) pts.push({ x: s.xs[i], y: s.ys[i] })
      return pts
    })()
    if (fast) {
      const pts = fast
      const xAt = y => { let best = pts[0]; for (const p of pts) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p; return best.x }
      const maxX = (a, b) => pts.reduce((m, p) => p.y >= a && p.y <= b ? Math.max(m, p.x) : m, -Infinity)
      return { xAt, maxX }
    }
    if (!probe) { probe = document.createElementNS('http://www.w3.org/2000/svg', 'path'); const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden'); s.append(probe); document.body.append(s) }
    probe.setAttribute('d', d)
    const L = probe.getTotalLength(), n = Math.max(40, Math.ceil(L / 6)), pts = []
    for (let i = 0; i <= n; i++) pts.push(probe.getPointAtLength(L * i / n))
    // x at a given y (y rises monotonically along the route); max x over a y-range
    const xAt = y => { let best = pts[0]; for (const p of pts) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p; return best.x }
    const maxX = (a, b) => pts.reduce((m, p) => p.y >= a && p.y <= b ? Math.max(m, p.x) : m, -Infinity)
    return { xAt, maxX }
  }

  function route(ctx) {
    const section = document.querySelector('.story-so-far.sf-arch')
    const perfPin = document.querySelector('#performance .chapter-pin')
    const finale = document.querySelector('.finale'), fp = finale?.querySelector('.final-pria'), img = fp?.querySelector('img'), end = finale?.querySelector('.sf-end')
    if (!section || !perfPin || !img || !end) return null
    const { rect, storyTop, x: gutter, width, mobile } = ctx
    const toStory = r => ({ left: r.left - rect.left, right: r.right - rect.left, top: r.top + scrollY - storyTop, bottom: r.bottom + scrollY - storyTop })

    // 1 · keep the site's own route down to the Performance pin (same arithmetic as main.js pin())
    const pr = perfPin.getBoundingClientRect()
    const perf = { x: pr.left + pr.width / 2 - rect.left, y: pr.top + scrollY - storyTop + pr.height / 2 }
    const key = `${r2(perf.x)} ${r2(perf.y)}`, cut = ctx.d[2].indexOf(key)
    if (cut < 0) return null
    let d3 = ctx.d[2].slice(0, cut + key.length)

    // 2 · geometry: timeline stops (their heights never depend on the arch) and Pria's fingertip
    const stops = [...section.querySelectorAll('.sf-stop')]
    const boxes = stops.map(li => toStory(li.getBoundingClientRect()))
    const pinY = stops.map(li => { const r = toStory(li.querySelector('.sf-pin').getBoundingClientRect()); return (r.top + r.bottom) / 2 })
    const fr = toStory(finale.getBoundingClientRect())
    const tip = { x: fr.left + fp.offsetLeft + img.offsetLeft + img.offsetWidth * FINGER.x, y: fr.top + fp.offsetTop + img.offsetTop + img.offsetHeight * FINGER.y }
    end.style.left = `${r2(tip.x - fr.left - 7)}px`; end.style.top = `${r2(tip.y - fr.top - 7)}px`

    // 3 · the arch: margin → out to the right (apex at the middle milestone) → back into the fingertip
    const contentW = parseFloat(getComputedStyle(section).getPropertyValue('--sf-content')) || 642
    const railR = width - boxes[0].left                       // content column's right limit (symmetric rail)
    const A = mobile ? 0 : Math.max(0, Math.min(width * .42, railR - gutter - contentW - 60))
    const start = { x: gutter, y: pinY[0] - 60 }
    const apex = { x: gutter + A, y: pinY[Math.floor(stops.length / 2)] }
    // the finale's words (eyebrow, heading, line, Talk to Team), wherever the layout puts them
    const words = [...finale.querySelectorAll(':is(h2, p, .button)')].filter(e => !e.closest('.final-pria') && !e.classList.contains('sf-you-label')).map(e => toStory(e.getBoundingClientRect()))
    const cr = words.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), bottom: Math.max(u.bottom, r.bottom) }), { left: Infinity, top: Infinity, bottom: -Infinity })
    const cta = { bottom: cr.bottom }
    // Wide layouts: the arch sweeps back and levels off above Pria's finger. Narrow layouts (copy
    // above Pria): return to the margin, pass the copy, then cross over above her fingertip.
    const tight = mobile || cr.bottom < tip.y || cr.left < tip.x + 12 // copy stacked above Pria / would sit on the drop line
    const k1 = apex.y - start.y
    let arch = ` L ${r2(start.x)} ${r2(start.y)}`
    if (A > 0) arch += ` C ${r2(start.x)} ${r2(start.y + k1 * .55)}, ${r2(apex.x)} ${r2(apex.y - k1 * .45)}, ${r2(apex.x)} ${r2(apex.y)}`
    else arch += ` L ${r2(apex.x)} ${r2(apex.y)}`
    // Every route ends the same way: the curve levels off directly above Pria's fingertip and the
    // thread comes straight down onto it. (The space above her outstretched hand is clear.)
    if (!tight) {
      const drop = Math.max(apex.y + 80, Math.min(tip.y - 200, fr.top - 20)) // where the straight fall begins
      const k2 = drop - apex.y
      arch += ` C ${r2(apex.x)} ${r2(apex.y + k2 * .5)}, ${r2(tip.x)} ${r2(drop - k2 * .5)}, ${r2(tip.x)} ${r2(drop)}`
      arch += ` L ${r2(tip.x)} ${r2(tip.y)}`
    } else {
      const yA = cta.bottom + 14, back = { x: gutter, y: Math.max(boxes.at(-1).bottom + 40, apex.y + 1) }
      if (A > 0) { const k = back.y - apex.y; arch += ` C ${r2(apex.x)} ${r2(apex.y + k * .55)}, ${r2(back.x)} ${r2(back.y - k * .45)}, ${r2(back.x)} ${r2(back.y)}` }
      const y0 = Math.max(yA, back.y), turn = Math.min(tip.y - 30, y0 + 44)
      arch += ` L ${r2(gutter)} ${r2(y0)}`
      arch += ` C ${r2(gutter)} ${r2((y0 + turn) / 2)}, ${r2(tip.x)} ${r2((y0 + turn) / 2)}, ${r2(tip.x)} ${r2(turn)}`
      arch += ` L ${r2(tip.x)} ${r2(Math.max(turn, tip.y))}`
    }
    d3 += arch

    // "You." sits right beside Pria's fingertip, where the thread lands, whenever there is room
    // between her hand and the finale copy; otherwise (stacked/narrow layouts) it stays at the top
    // of the copy.
    const label = finale.querySelector('.sf-you-label')
    if (label) {
      label.classList.remove('sf-by-pria'); label.style.left = label.style.top = label.style.fontSize = ''
      if (!tight) {
        const range = document.createRange(); range.selectNodeContents(label)
        const textW = range.getBoundingClientRect().width, fs = parseFloat(getComputedStyle(label).fontSize)
        const gap = 24, room = cr.left - (tip.x + gap) - 20
        if (room >= 110) {
          const size = Math.min(fs, fs * room / textW)
          label.classList.add('sf-by-pria')
          label.style.fontSize = `${r2(size)}px`
          const box = toStory((label.offsetParent || finale).getBoundingClientRect()) // its positioned parent (the copy column)
          label.style.left = `${r2(tip.x - box.left + gap)}px`
          label.style.top = `${r2(tip.y - box.top - size * .5)}px`
        }
      }
    }

    // 4 · lay the milestones out along the arch: dot on the line, text clear of it
    const { xAt, maxX } = sampleX(`M ${r2(start.x)} ${r2(start.y)}` + arch.replace(/^ L [-\d.]+ [-\d.]+/, ''))
    stops.forEach((li, i) => {
      const b = boxes[i], railLeft = boxes[0].left // every milestone box starts on the content rail
      const pin = li.querySelector('.sf-pin')
      pin.style.left = `${r2(xAt(pinY[i]) - railLeft - 6.5)}px`
      li.style.paddingLeft = `${r2(Math.max(0, maxX(b.top - 10, b.bottom + 10) - railLeft + 34))}px`
    })
    const more = section.querySelector(':scope > .sf-more')
    if (more) { const m = toStory(more.getBoundingClientRect()); more.style.marginLeft = `${r2(Math.max(0, maxX(m.top - 20, m.bottom + 20) - boxes[0].left + 34))}px` }
    return { d: [ctx.d[0], ctx.d[1], d3] }
  }
  window.storyThreadRoute = Object.assign(window.storyThreadRoute || {}, { route: ctx => { try { return route(ctx) } catch (e) { console.warn('arch route', e); return null } } })
})()
