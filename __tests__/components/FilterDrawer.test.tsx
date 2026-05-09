import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterDrawer from '@/components/FilterDrawer'

describe('FilterDrawer', () => {
  it('does not render when closed', () => {
    render(
      <FilterDrawer
        open={false}
        eventType={[]}
        setting={undefined}
        previewCount={10}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText(/Tipo serata/i)).not.toBeInTheDocument()
  })

  it('renders with chips when open', () => {
    render(
      <FilterDrawer
        open
        eventType={[]}
        setting={undefined}
        previewCount={10}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/Tipo serata/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /live/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /silent disco/i })).toBeInTheDocument()
  })

  it('calls onApply with selected state on Applica click', async () => {
    const onApply = jest.fn()
    render(
      <FilterDrawer
        open
        eventType={[]}
        setting={undefined}
        previewCount={5}
        onApply={onApply}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^DJ$/i }))
    await userEvent.click(screen.getByRole('button', { name: /Indoor/i }))
    await userEvent.click(screen.getByRole('button', { name: /Applica/i }))
    expect(onApply).toHaveBeenCalledWith({ eventType: ['dj'], setting: 'indoor' })
  })

  it('Pulisci tutto resets local selection', async () => {
    render(
      <FilterDrawer
        open
        eventType={['dj']}
        setting="outdoor"
        previewCount={5}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Pulisci tutto/i }))
    const applyMock = jest.fn()
    render(
      <FilterDrawer
        open
        eventType={[]}
        setting={undefined}
        previewCount={5}
        onApply={applyMock}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getAllByRole('button', { name: /Applica/i })[1])
    expect(applyMock).toHaveBeenCalledWith({ eventType: [], setting: undefined })
  })
})
