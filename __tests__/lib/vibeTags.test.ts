import { deriveTimeOfDay } from '@/lib/vibeTags'

describe('deriveTimeOfDay', () => {
  it('returns afternoon for hours <18', () => {
    expect(deriveTimeOfDay('15:00')).toBe('afternoon')
    expect(deriveTimeOfDay('17:59')).toBe('afternoon')
  })

  it('returns aperitivo for hours 18 to 20:59', () => {
    expect(deriveTimeOfDay('18:00')).toBe('aperitivo')
    expect(deriveTimeOfDay('19:30')).toBe('aperitivo')
    expect(deriveTimeOfDay('20:59')).toBe('aperitivo')
  })

  it('returns dinner for hours 21 to 22:59', () => {
    expect(deriveTimeOfDay('21:00')).toBe('dinner')
    expect(deriveTimeOfDay('22:59')).toBe('dinner')
  })

  it('returns late for hours >=23 and early morning', () => {
    expect(deriveTimeOfDay('23:00')).toBe('late')
    expect(deriveTimeOfDay('01:30')).toBe('late')
    expect(deriveTimeOfDay('05:00')).toBe('late')
  })

  it('handles malformed input as afternoon', () => {
    expect(deriveTimeOfDay('')).toBe('afternoon')
    expect(deriveTimeOfDay('xx:yy')).toBe('afternoon')
  })
})
