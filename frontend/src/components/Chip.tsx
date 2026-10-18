import styled from "styled-components";

export const Chip = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  padding: ${({ theme }) => `${theme.sizes.space.sm} ${theme.sizes.space.md}`};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  border-radius: ${({ theme }) => theme.border.radius.md};
  background: ${({ theme, $active }) => ($active ? theme.palette.primaryTint : theme.palette.surface)};
  color: ${({ theme }) => theme.palette.textSecondary};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  white-space: nowrap;
`;

export const ChipButton = styled(Chip).attrs({ as: "button" as const })`
  cursor: pointer;
  &:hover { border-color: ${({ theme }) => theme.palette.borderStrong}; }
`;
