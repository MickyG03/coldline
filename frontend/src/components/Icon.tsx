import styled from "styled-components";
import { icons, type IconName } from "../theme/icons.ts";

const Svg = styled.svg`
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

export function Icon({ name, size = "md" }: { name: IconName; size?: keyof typeof icons.size }) {
  return (
    <Svg width={icons.size[size]} height={icons.size[size]} viewBox="0 0 24 24" aria-hidden>
      <path d={icons.paths[name]} />
    </Svg>
  );
}
