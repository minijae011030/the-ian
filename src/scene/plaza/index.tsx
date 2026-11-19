import { Paving } from './Paving'
import { RoadSign } from './RoadSign'
import { StreetFurniture } from './StreetFurniture'
import { Trees } from './Trees'

/** THE IAN 건물 앞 광장 */
export function Plaza() {
  return (
    <>
      <Paving />
      <Trees />
      <StreetFurniture />
      <RoadSign />
    </>
  )
}
