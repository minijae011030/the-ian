import { MeshStandardMaterial } from 'three'

/** 시간대에 따라 바뀌는 값. 매 프레임 CityBlocks에서 갱신 */
export const cityUniforms = {
  uLitScale: { value: 1 }, // 불 켜진 창 비율 배수
  uGlow: { value: 1 }, // 창 밝기 (낮엔 덜 빛남)
}

/**
 * 주변 건물 재질. 텍스처 대신 월드 좌표로 창문을 그려서
 * 건물 크기가 제각각이어도 층 높이·창 크기가 일정하게 유지됨.
 * - 1층: 넓은 상가 유리, 대부분 불 켜짐
 * - 2층부터: 층·칸마다 해시로 불 켜짐 여부 결정 (건물마다 켜진 비율도 다름)
 * - 지붕 면이랑 맨 위 난간 부분엔 창문 없음
 */
export function createBuildingMaterial() {
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLitScale = cityUniforms.uLitScale
    shader.uniforms.uGlow = cityUniforms.uGlow
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCityPos;
        varying vec3 vCityNormal;
        varying vec3 vCitySeed; // xz: 건물 위치, y: 건물 꼭대기 높이`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        {
          vec4 cityPos = vec4(transformed, 1.0);
          vec3 cityNormal = objectNormal;
          vCitySeed = vec3(0.0);
          #ifdef USE_INSTANCING
            cityPos = instanceMatrix * cityPos;
            cityNormal = mat3(instanceMatrix) * cityNormal;
            vCitySeed = vec3(instanceMatrix[3].x, instanceMatrix[3].y + length(instanceMatrix[1].xyz), instanceMatrix[3].z);
          #endif
          cityPos = modelMatrix * cityPos;
          vCityPos = cityPos.xyz;
          vCityNormal = normalize(mat3(modelMatrix) * cityNormal);
        }`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCityPos;
        varying vec3 vCityNormal;
        varying vec3 vCitySeed;
        uniform float uLitScale;
        uniform float uGlow;

        float cityHash(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }

        const float FLOOR_H = 1.9;
        const float COL_W = 1.7;
        const float GROUND_Y = 0.2;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float windowMask = 0.0;
        vec3 windowGlow = vec3(0.0);
        {
          bool isWall = abs(vCityNormal.y) < 0.5;
          float y = vCityPos.y - GROUND_Y;
          float top = vCitySeed.y - GROUND_Y;
          float along = abs(vCityNormal.x) > 0.5 ? vCityPos.z : vCityPos.x;

          if (isWall && y > 0.0 && y < top - 0.7) {
            float floorIdx = floor(y / FLOOR_H);
            float fy = fract(y / FLOOR_H);
            // varying 보간 오차가 해시에서 증폭돼 창문이 지글거리지 않게 정수로 반올림
            vec2 seed = floor(vCitySeed.xz + 0.5);
            float litRatio = mix(0.12, 0.55, cityHash(vec3(seed, 1.0))) * uLitScale;

            if (floorIdx < 1.0) {
              // 1층 상가
              float fx = fract(along / 4.0);
              windowMask = step(0.06, fx) * step(fx, 0.94) * step(0.12, fy) * step(fy, 0.9);
              float on = step(cityHash(vec3(seed, floor(along / 4.0))), mix(0.25, 0.85, min(uLitScale, 1.0)));
              vec3 shop = mix(vec3(1.0, 0.9, 0.72), vec3(1.0, 0.7, 0.4), cityHash(vec3(seed, floor(along / 4.0) + 3.0)));
              windowGlow = shop * on * 1.1;
            } else {
              float col = floor(along / COL_W);
              float fx = fract(along / COL_W);
              windowMask = step(0.18, fx) * step(fx, 0.82) * step(0.22, fy) * step(fy, 0.82);
              float h = cityHash(vec3(seed + col * 0.37, floorIdx));
              float on = step(h, litRatio);
              vec3 warm = mix(vec3(1.0, 0.68, 0.32), vec3(1.0, 0.86, 0.6), cityHash(vec3(col, floorIdx, seed.x)));
              windowGlow = warm * on * 0.9;

              // 멀리서 창문 격자가 지글거리지 않게, 격자가 픽셀보다 작아지면 평균 밝기로 뭉갬
              float blur = clamp(max(fwidth(along / COL_W), fwidth(y / FLOOR_H)) * 1.5 - 0.5, 0.0, 1.0);
              windowMask = mix(windowMask, 0.38, blur);
              windowGlow = mix(windowGlow, vec3(1.0, 0.72, 0.4) * litRatio * 0.9, blur);
            }
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.08, 0.12), windowMask);
          windowGlow *= windowMask * uGlow;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += windowGlow;`,
      )
  }

  return material
}
