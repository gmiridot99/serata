import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeOfDayChips from '@/components/TimeOfDayChips'

describe('TimeOfDayChips', () => {
  it('renders 4 chips', () => {
    render(<TimeOfDayChips value={[]} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /pomeriggio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aperitivo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cena/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tarda sera/i })).toBeInTheDocument()
  })

  it('toggles on click (add)', async () => {
    const onChange = jest.fn()
    render(<TimeOfDayChips value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /aperitivo/i }))
    expect(onChange).toHaveBeenCalledWith(['aperitivo'])
  })

  it('toggles off on click when already selected', async () => {
    const onChange = jest.fn()
    render(<TimeOfDayChips value={['aperitivo']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /aperitivo/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
