import { CityBlocks } from './CityBlocks'
import { LotteTower } from './LotteTower'
import { SeokchonLake } from './SeokchonLake'
import { Streets } from './Streets'
import { Traffic } from './Traffic'

export function Surroundings() {
  return (
    <>
      <Streets />
      <Traffic />
      <SeokchonLake />
      <LotteTower />
      <CityBlocks />
    </>
  )
}
