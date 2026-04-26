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
