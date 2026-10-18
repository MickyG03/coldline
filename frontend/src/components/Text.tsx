import styled from "styled-components";

/** Small monospace uppercase label: "+ CARE IS A CONNECTED THING", "ACTIVE REQUEST". */
export const Overline = styled.div`
  font-family: ${({ theme }) => theme.fonts.family.mono};
  font-size: ${({ theme }) => theme.fonts.size.xxs};
  letter-spacing: ${({ theme }) => theme.fonts.tracking.overline};
  text-transform: uppercase;
  color: ${({ theme }) => theme.palette.textMuted};
`;

export const Mono = styled.span`
  font-family: ${({ theme }) => theme.fonts.family.mono};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textMuted};
`;

export const Muted = styled.span`
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textMuted};
`;

export const SectionTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fonts.size.md};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  color: ${({ theme }) => theme.palette.textPrimary};
`;
