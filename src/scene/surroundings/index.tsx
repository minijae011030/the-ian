import { CityBlocks } from './CityBlocks'
import { LotteTower } from './LotteTower'
import { SeokchonLake } from './SeokchonLake'
import { Streets } from './Streets'

export function Surroundings() {
  return (
    <>
      <Streets />
      <SeokchonLake />
      <LotteTower />
      <CityBlocks />
    </>
  )
}
