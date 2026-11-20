import { Crosswalks } from './Crosswalks'
import { Pedestrians } from './Pedestrians'
import { Traffic } from './Traffic'
import { TrafficLights } from './TrafficLights'

/** 거리의 움직임: 차, 사람, 신호등, 횡단보도 */
export function StreetLife() {
  return (
    <>
      <Crosswalks />
      <TrafficLights />
      <Traffic />
      <Pedestrians />
    </>
  )
}
