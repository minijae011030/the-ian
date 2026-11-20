import { CityBlocks } from './CityBlocks'
import { LotteTower } from './LotteTower'
import { SeokchonLake } from './SeokchonLake'
import { Streets } from './Streets'
import { StreetLife } from './traffic'

export function Surroundings() {
  return (
    <>
      <Streets />
      <StreetLife />
      <SeokchonLake />
      <LotteTower />
      <CityBlocks />
    </>
  )
}
