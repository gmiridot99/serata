import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterDrawer from '@/components/FilterDrawer'

describe('FilterDrawer', () => {
  it('does not render when closed', () => {
    render(
      <FilterDrawer
        open={false}
        timeOfDay={[]}
        eventType={[]}
        setting={undefined}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText(/Tipo serata/i)).not.toBeInTheDocument()
  })

  it('renders all sections when open', () => {
    render(
      <FilterDrawer
        open
        timeOfDay={[]}
        eventType={[]}
        setting={undefined}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/Quando/i)).toBeInTheDocument()
    expect(screen.getByText(/Tipo serata/i)).toBeInTheDocument()
    expect(screen.getByText(/Ambiente/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /live/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /silent disco/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aperitivo/i })).toBeInTheDocument()
  })

  it('calls onApply with selected state on Applica click', async () => {
    const onApply = jest.fn()
    render(
      <FilterDrawer
        open
        timeOfDay={[]}
        eventType={[]}
        setting={undefined}
        onApply={onApply}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^DJ$/i }))
    await userEvent.click(screen.getByRole('button', { name: /Indoor/i }))
    await userEvent.click(screen.getByRole('button', { name: /Applica/i }))
    expect(onApply).toHaveBeenCalledWith({ timeOfDay: [], eventType: ['dj'], setting: 'indoor' })
  })

  it('Pulisci tutto resets local selection', async () => {
    render(
      <FilterDrawer
        open
        timeOfDay={['late']}
        eventType={['dj']}
        setting="outdoor"
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Pulisci tutto/i }))
    const applyMock = jest.fn()
    render(
      <FilterDrawer
        open
        timeOfDay={[]}
        eventType={[]}
        setting={undefined}
        onApply={applyMock}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getAllByRole('button', { name: /Applica/i })[1])
    expect(applyMock).toHaveBeenCalledWith({ timeOfDay: [], eventType: [], setting: undefined })
  })
})
