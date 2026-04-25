'use client'

import { useRouter } from 'next/navigation'
import CitySearch from './CitySearch'

export default function CitySearchWrapper() {
  const router = useRouter()
  return (
    <CitySearch
      onSearch={(city) => router.push(`/${encodeURIComponent(city)}`)}
    />
  )
}
