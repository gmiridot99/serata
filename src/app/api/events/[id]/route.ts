import { NextRequest, NextResponse } from 'next/server'
import { fetchEventById } from '@/lib/sources'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const event = await fetchEventById(id)
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    return NextResponse.json(event)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
