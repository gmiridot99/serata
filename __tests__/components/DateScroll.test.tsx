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
