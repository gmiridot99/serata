import { normalizePlaceToEvent } from '@/lib/sources/places'

const mockPlace = {
  id: 'ChIJtest123',
  displayName: { text: 'Bar Basso', languageCode: 'it' },
  formattedAddress: 'Via Plinio, 39, 20129 Milano MI, Italia',
  location: { latitude: 45.4654, longitude: 9.2083 },
  types: ['bar', 'food', 'point_of_interest'],
  photos: [{ name: 'places/ChIJtest123/photos/AXCi2Q', widthPx: 4032, heightPx: 3024 }],
  googleMapsUri: 'https://maps.google.com/?cid=123',
  priceLevel: 'PRICE_LEVEL_MODERATE',
}

describe('normalizePlaceToEvent', () => {
  it('maps id with places_ prefix', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.id).toBe('places_ChIJtest123')
  })

  it('maps displayName to title', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.title).toBe('Bar Basso')
  })

  it('maps location to venue lat/lng', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.venue.lat).toBe(45.4654)
    expect(event.venue.lng).toBe(9.2083)
  })

  it('maps formattedAddress to venue address', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.venue.address).toBe('Via Plinio, 39, 20129 Milano MI, Italia')
  })

  it('maps bar type to aperitivo category', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.category).toBe('aperitivo')
  })

  it('maps night_club type to club category', () => {
    const clubPlace = { ...mockPlace, types: ['night_club', 'establishment'] }
    const event = normalizePlaceToEvent(clubPlace, 'test-api-key')
    expect(event.category).toBe('club')
  })

  it('maps PRICE_LEVEL_MODERATE to price range', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.price).toEqual({ min: 15, max: 35, currency: 'EUR' })
  })

  it('maps PRICE_LEVEL_FREE to free', () => {
    const freePlace = { ...mockPlace, priceLevel: 'PRICE_LEVEL_FREE' }
    const event = normalizePlaceToEvent(freePlace, 'test-api-key')
    expect(event.price).toBe('free')
  })

  it('maps missing priceLevel to free', () => {
    const { priceLevel: _, ...noPrice } = mockPlace
    const event = normalizePlaceToEvent(noPrice, 'test-api-key')
    expect(event.price).toBe('free')
  })

  it('builds photo URL correctly', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.imageUrl).toBe(
      'https://places.googleapis.com/v1/places/ChIJtest123/photos/AXCi2Q/media?maxWidthPx=800&key=test-api-key'
    )
  })

  it('uses googleMapsUri as ticketUrl', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.ticketUrl).toBe('https://maps.google.com/?cid=123')
  })

  it('sets source to places', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.source).toBe('places')
  })
})
