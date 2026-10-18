import styled, { css } from "styled-components";
import { pulse, statusColor, type StatusKey } from "../theme/index.ts";

export const StatusDot = styled.span<{ $status: StatusKey; $size?: number }>`
  display: inline-block;
  flex: none;
  width: ${({ $size = 6 }) => $size}px;
  height: ${({ $size = 6 }) => $size}px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme, $status }) => statusColor(theme, $status)};
  color: ${({ theme, $status }) => statusColor(theme, $status)};
  ${({ $status }) => $status === "calling" && css`animation: ${pulse} 1.4s ease-out infinite;`}
`;
