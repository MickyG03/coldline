import "styled-components";
import type { Theme } from "./index.ts";

// Types `props.theme` in every styled component.
declare module "styled-components" {
  export interface DefaultTheme extends Theme {}
}
