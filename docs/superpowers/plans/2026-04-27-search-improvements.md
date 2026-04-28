# Search Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock keyword/landmark search, add a calendar picker to the date row, and replace radius pills with a drag slider.

**Architecture:** Three isolated component changes — no new files beyond tests, no changes to AppClient or useAppState. Each component's public props interface stays identical.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS 4, Google Maps Places Autocomplete (`@vis.gl/react-google-maps`), Jest + Testing Library (`jsdom`).

---

### Task 1: LocationSearch — unlock landmark/neighborhood autocomplete

**Files:**
- Modify: `src/components/LocationSearch.tsx` (line 26–28)

- [ ] **Step 1: Change the autocomplete types**

In `src/components/LocationSearch.tsx`, find the Autocomplete constructor call and replace the `types` array:

```tsx
autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
  types: ['geocode', 'establishment'],
  fields: ['name', 'geometry', 'address_components', 'formatted_address'],
})
```

`'geocode'` covers cities, neighborhoods, routes, and postal codes. `'establishment'` adds POIs and landmarks (e.g. "Duomo", "Navigli"). The existing name-extraction logic already handles the sublocality+city format so "Navigli, Milano" will resolve correctly.

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LocationSearch.tsx
git commit -m "feat: unlock landmark and neighborhood search in LocationSearch"
```

---

### Task 2: RadiusSelector — drag slider

**Files:**
- Modify: `src/components/RadiusSelector.tsx`
- Create: `__tests__/components/RadiusSelector.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/RadiusSelector.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import RadiusSelector from '@/components/RadiusSelector'

describe('RadiusSelector', () => {
  it('renders a range input with correct bounds', () => {
    render(<RadiusSelector value={10} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '5')
    expect(slider).toHaveAttribute('max', '50')
    expect(slider).toHaveAttribute('step', '5')
  })

  it('shows the current value label', () => {
    render(<RadiusSelector value={25} onChange={() => {}} />)
    expect(screen.getByText('25 km')).toBeInTheDocument()
  })

  it('calls onChange with a number when slider moves', () => {
    const onChange = jest.fn()
    render(<RadiusSelector value={10} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith(15)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/components/RadiusSelector.test.tsx --no-coverage
```
Expected: FAIL — component still renders pills, not a slider.

- [ ] **Step 3: Replace pills with slider**

Replace the entire content of `src/components/RadiusSelector.tsx`:

```tsx
type Props = {
  value: number
  onChange: (km: number) => void
}

export default function RadiusSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-semibold text-accent w-12">
        {value} km
      </span>
      <input
        type="range"
        min={5}
        max={50}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 [accent-color:var(--accent)] cursor-pointer"
        aria-label="Raggio di ricerca"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/components/RadiusSelector.test.tsx --no-coverage
```
Expected: PASS (3 tests).

- [ ] **Step 5: Verify typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/RadiusSelector.tsx __tests__/components/RadiusSelector.test.tsx
git commit -m "feat: replace radius pills with drag slider (5–50 km)"
```

---

### Task 3: DateScroll — calendar icon button

**Files:**
- Modify: `src/components/DateScroll.tsx`
- Create: `__tests__/components/DateScroll.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/DateScroll.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateScroll from '@/components/DateScroll'

describe('DateScroll', () => {
  it('renders 7 date pills plus a calendar button (8 buttons total)', () => {
    render(<DateScroll onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(8)
  })

  it('renders a calendar button', () => {
    render(<DateScroll onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /calendario/i })).toBeInTheDocument()
  })

  it('calls onChange with the ISO date when a date outside the 7-day window is picked', () => {
    const onChange = jest.fn()
    render(<DateScroll onChange={onChange} />)
    const input = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2099-12-31' } })
    expect(onChange).toHaveBeenCalledWith('2099-12-31')
  })

  it('shows a custom active pill when value is outside the 7-day window', () => {
    render(<DateScroll value="2099-12-31" onChange={() => {}} />)
    // calendar button should be gone, replaced by the custom pill
    expect(screen.queryByRole('button', { name: /calendario/i })).not.toBeInTheDocument()
    // × clear button present
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument()
  })

  it('clears the custom pill and calls onChange with undefined on × click', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<DateScroll value="2099-12-31" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('maps calendar selection of today to "today" pill value', () => {
    const onChange = jest.fn()
    render(<DateScroll onChange={onChange} />)
    const now = new Date()
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const input = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: todayIso } })
    expect(onChange).toHaveBeenCalledWith('today')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/components/DateScroll.test.tsx --no-coverage
```
Expected: FAIL — no calendar button exists yet.

- [ ] **Step 3: Implement the updated DateScroll**

Replace the entire content of `src/components/DateScroll.tsx`:

```tsx
'use client'

import { useRef } from 'react'

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Pill = { label: string; sublabel: string; value: string }

function buildPills(): Pill[] {
  const now = new Date()
  const pills: Pill[] = []

  pills.push({
    label: 'Stasera',
    sublabel: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    value: 'today',
  })

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    pills.push({
      label: d.toLocaleDateString('it-IT', { weekday: 'short' }),
      sublabel: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      value: toLocalIsoDate(d),
    })
  }

  return pills
}

type Props = {
  value?: string
  onChange: (date: string | undefined) => void
}

export default function DateScroll({ value, onChange }: Props) {
  const pills = buildPills()
  const dateInputRef = useRef<HTMLInputElement>(null)

  const isCustomDate =
    value !== undefined &&
    value !== 'today' &&
    !pills.some((p) => p.value === value)

  function handleDateInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.value
    if (!picked) return

    // Check if picked date matches 'today'
    const todayIso = toLocalIsoDate(new Date())
    if (picked === todayIso) {
      onChange('today')
      return
    }

    // Check if it matches one of the next-6-days pills
    const matchingPill = pills.find((p) => p.value === picked)
    if (matchingPill) {
      onChange(matchingPill.value)
      return
    }

    onChange(picked)
  }

  function formatCustomPill(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden items-start">
      {pills.map((pill) => {
        const active = value === pill.value
        return (
          <button
            key={pill.value}
            onClick={() => onChange(active ? undefined : pill.value)}
            className={`shrink-0 flex flex-col items-center px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
            }`}
          >
            <span className="font-semibold">{pill.label}</span>
            <span className="opacity-70">{pill.sublabel}</span>
          </button>
        )
      })}

      {isCustomDate ? (
        <button
          onClick={() => onChange(undefined)}
          className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-accent text-white"
          aria-label="×"
        >
          <span>{formatCustomPill(value!)}</span>
          <span aria-hidden>×</span>
        </button>
      ) : (
        <button
          aria-label="calendario"
          onClick={() =>
            dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()
          }
          className="shrink-0 flex items-center justify-center px-3 py-1 rounded-xl bg-bg-card text-text-muted border border-white/10 hover:border-white/30"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      )}

      <input
        ref={dateInputRef}
        type="date"
        className="sr-only"
        tabIndex={-1}
        onChange={handleDateInputChange}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/components/DateScroll.test.tsx --no-coverage
```
Expected: PASS (6 tests).

- [ ] **Step 5: Verify typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/DateScroll.tsx __tests__/components/DateScroll.test.tsx
git commit -m "feat: add calendar icon to DateScroll for picking any date"
```

---

### Task 4: Full suite check

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```
Expected: all tests pass, no regressions.

- [ ] **Step 2: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Searching "Navigli Milano" or "Duomo" resolves to a location with lat/lng
- The date row shows 7 pills + a calendar icon; tapping the icon opens a date picker; picking a far-future date shows a custom pill with ×; clearing it restores the calendar icon
- The radius row shows a label ("10 km") and a draggable slider; dragging updates the label live and triggers a new event search
