import styled, { css } from "styled-components";

type Variant = "soft" | "solid" | "ghost" | "danger";

export const Button = styled.button<{ $variant?: Variant; $size?: "sm" | "md" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  border: ${({ theme }) => theme.border.stroke.thin} solid transparent;
  border-radius: ${({ theme }) => theme.border.radius.lg};
  padding: ${({ theme, $size }) => ($size === "sm"
    ? `${theme.sizes.space.sm} ${theme.sizes.space.lg}`
    : `${theme.sizes.space.lg} ${theme.sizes.space.xxl}`)};
  font-size: ${({ theme, $size }) => ($size === "sm" ? theme.fonts.size.xs : theme.fonts.size.md)};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
  white-space: nowrap;

  &:disabled { opacity: 0.5; cursor: default; }

  ${({ theme, $variant = "soft" }) => ({
    soft: css`
      background: ${theme.palette.primarySoft};
      color: ${theme.palette.onPrimarySoft};
      &:hover:not(:disabled) { background: ${theme.palette.primarySoftHover}; }
    `,
    solid: css`
      background: ${theme.palette.primary};
      color: ${theme.palette.surface};
      &:hover:not(:disabled) { background: ${theme.palette.primaryHover}; }
    `,
    ghost: css`
      background: ${theme.palette.surface};
      border-color: ${theme.palette.border};
      color: ${theme.palette.textSecondary};
      &:hover:not(:disabled) { border-color: ${theme.palette.borderStrong}; color: ${theme.palette.textPrimary}; }
    `,
    danger: css`
      background: ${theme.palette.surface};
      border-color: ${theme.palette.border};
      color: ${theme.palette.statusContradictory};
      &:hover:not(:disabled) { border-color: ${theme.palette.statusUnavailable}; }
    `,
  }[$variant])}
`;
